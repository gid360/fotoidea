"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { format, startOfWeek, startOfMonth, parseISO, isWithinInterval, endOfDay, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import {
  ArrowLeft, Pencil, Save, X, Camera, Video, Upload, Trash2, Eye,
  Phone, Mail, Calendar, Wallet, CreditCard, FileText, Clock, User, ZoomIn, ScanLine, Instagram, Link2, CheckCircle2, ChevronDown, Check
} from "lucide-react";
import { WebcamDialog } from "./WebcamDialog";
import { DocScanDialog } from "./DocScanDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn, formatMoney, formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { LoyaltyTag, BookingStatus } from "@prisma/client";
import { LOYALTY_CONFIG } from "@/lib/loyalty";

const FUNNEL_STAGE_CONFIG: Record<string, { label: string; className: string }> = {
  NEW:          { label: "Новый",           className: "bg-slate-100 text-slate-800 dark:bg-slate-900/60 dark:text-slate-300 border border-slate-200 dark:border-slate-800" },
  CONVERSATION: { label: "Переписка",      className: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900" },
  BOUGHT:       { label: "Купил",           className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900" },
  VISITED:      { label: "Посетил",         className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900" },
  REPEAT_BUYER: { label: "Повторно купил", className: "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-900 font-semibold" },
};

const FUNNEL_STAGE_COLOR: Record<string, string> = {
  NEW:          "#6b7280",
  CONVERSATION: "#3b82f6",
  BOUGHT:       "#144d37",
  VISITED:      "#0d9488",
  REPEAT_BUYER: "#8b5cf6",
};

const BOOKING_STATUS: Record<BookingStatus, { label: string; color: string }> = {
  UNCONFIRMED: { label: "Забронирован", color: "text-amber-600" },
  CONFIRMED: { label: "Подтвержден", color: "text-blue-600" },
  ATTENDED:  { label: "Пришел",      color: "text-green-600" },
  ABSENT:    { label: "Не пришел",   color: "text-red-500" },
  CANCELLED: { label: "Отмена",      color: "text-gray-400" },
};

interface ClientData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  birthDate?: string;
  photoUrl?: string;
  instagramUsername?: string;
  note?: string;
  loyaltyTag: LoyaltyTag;
  funnelStage?: string;
  depositBalance: string | number;
  notifyAll: boolean;
  notifyReminders: boolean;
  notifyMarketing: boolean;
  subscriptions: {
    id: string;
    sessionsLeft: number | null;
    activatedAt?: string;
    expiresAt?: string;
    pricePaid: string | number;
    paymentMethod: string;
    plan: { name: string; validDays: number };
  }[];
  bookings: {
    id: string;
    status: BookingStatus;
    createdAt: string;
    classEvent: {
      startAt: string;
      durationMin: number;
      servicePrice?: string | number;
      totalPrice?: string | number;
      extraPeopleFee?: string | number;
      wardrobeFee?: string | number;
      note?: string;
      direction: { name: string; colorHex: string };
      trainer: { user: { firstName: string; lastName: string } };
      hall: { name: string };
    };
  }[];
  createdAt: string;
  documents: { id: string; originalName: string; url: string; createdAt: string }[];
  auditLogs: {
    id: string;
    action: string;
    createdAt: string;
    user?: { firstName: string; lastName: string };
  }[];
}

export function ClientDetail({ clientId }: { clientId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [visitFilter, setVisitFilter] = useState<"all" | "week" | "month" | "custom">("all");
  const [visitFrom, setVisitFrom] = useState("");
  const [visitTo,   setVisitTo]   = useState("");
  const [form, setForm] = useState<Partial<ClientData>>({});
  const [saving, setSaving] = useState(false);
  const [instaInput, setInstaInput] = useState("");
  const [linkingInsta, setLinkingInsta] = useState(false);
  const [instaModalOpen, setInstaModalOpen] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);

  const [webcamOpen, setWebcamOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [docScanOpen, setDocScanOpen] = useState(false);
  const [docLightbox, setDocLightbox] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

  const { data: client, refetch } = useQuery<ClientData>({
    queryKey: ["client", clientId],
    queryFn: () => fetch(`/api/clients/${clientId}`).then(r => r.json()),
  });

  const { data: accountData, refetch: refetchAccount } = useQuery<{
    depositBalance: number;
    cashTxns: {
      id: string; type: string; category: string; paymentMethod: string;
      amount: string | number; description?: string; date: string; subscriptionId?: string;
    }[];
    subscriptions: {
      id: string; pricePaid: string | number; paymentMethod: string;
      depositPart?: string | number; createdAt: string;
      plan: { name: string };
    }[];
  }>({
    queryKey: ["client-account", clientId],
    queryFn: () => fetch(`/api/clients/${clientId}/account`).then(r => r.json()),
  });

  if (!client) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">Загрузка...</div>
  );

  const tag = LOYALTY_CONFIG[client.loyaltyTag];
  const activeSubs = (client.subscriptions ?? []).filter(s =>
    (!s.expiresAt || new Date(s.expiresAt) >= new Date()) && (s.sessionsLeft === null || s.sessionsLeft > 0)
  );

  const totalSales = (client.bookings ?? []).reduce((sum, b) => {
    if (b.status === "CANCELLED") return sum;
    const ev = b.classEvent;
    if (!ev) return sum;
    const tot = Number((ev as any).totalPrice) > 0
      ? Number((ev as any).totalPrice)
      : (Number((ev as any).servicePrice || 0) + Number((ev as any).extraPeopleFee || 0) + Number((ev as any).wardrobeFee || 0));
    return sum + tot;
  }, 0);

  const visitedBookings = (client.bookings ?? []).filter(b => b.status !== "CANCELLED");
  const visitedCount = visitedBookings.length;
  const now = new Date();
  const upcomingBookings = (client.bookings ?? [])
    .filter(b => b.classEvent && new Date(b.classEvent.startAt) >= now && b.status !== "CANCELLED")
    .sort((a, b) => new Date(a.classEvent.startAt).getTime() - new Date(b.classEvent.startAt).getTime());

  function startEdit() {
    setForm({
      firstName: client!.firstName,
      lastName: client!.lastName,
      phone: client!.phone,
      email: client!.email,
      birthDate: client!.birthDate ? format(new Date(client!.birthDate), "yyyy-MM-dd") : undefined,
      note: client!.note,
      instagramUsername: client!.instagramUsername || "",
      notifyAll: client!.notifyAll,
      notifyReminders: client!.notifyReminders,
      notifyMarketing: client!.notifyMarketing,
    });
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { toast({ title: "Ошибка", variant: "destructive" }); return; }
    toast({ title: "Данные сохранены" });
    setEditing(false);
    refetch();
    qc.invalidateQueries({ queryKey: ["clients"] });
  }

  async function handleLinkInstagram() {
    const handle = instaInput.replace(/^@/, "").trim();
    if (!handle) return;
    setLinkingInsta(true);
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instagramUsername: handle }),
    });
    setLinkingInsta(false);
    if (!res.ok) { toast({ title: "Ошибка связывания", variant: "destructive" }); return; }
    toast({ title: "Instagram аккаунт привязан" });
    setInstaModalOpen(false);
    setInstaInput("");
    refetch();
  }

  async function handleDeleteBooking(bookingId: string) {
    if (!confirm("Вы уверены, что хотите полностью удалить эту запись?")) return;
    const res = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Запись удалена" });
      refetch();
      qc.invalidateQueries({ queryKey: ["client", clientId] });
    } else {
      toast({ title: "Ошибка удаления записи", variant: "destructive" });
    }
  }

  async function handleStageChange(newStage: string) {
    setUpdatingStage(true);
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ funnelStageId: newStage }),
    });
    setUpdatingStage(false);
    if (res.ok) {
      toast({ title: "Этап воронки обновлен" });
      refetch();
    }
  }

  async function uploadPhotoBlob(blob: Blob, ext = "jpg") {
    const fd = new FormData();
    fd.append("file", new File([blob], `photo.${ext}`, { type: blob.type || "image/jpeg" }));
    fd.append("clientId", clientId);
    const res = await fetch("/api/upload/client-photo", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...client, photoUrl: url }),
      });
      refetch();
      toast({ title: "Фото обновлено" });
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadPhotoBlob(file, file.name.endsWith(".png") ? "png" : "jpg");
  }

  async function uploadDocument(file: File) {
    setUploadingDoc(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/clients/${clientId}/documents`, { method: "POST", body: fd });
    setUploadingDoc(false);
    if (res.ok) { toast({ title: "Документ загружен" }); refetch(); }
    else toast({ title: "Ошибка загрузки", variant: "destructive" });
  }

  async function handleDocScan(blob: Blob, name: string) {
    await uploadDocument(new File([blob], name, { type: "image/jpeg" }));
  }

  async function handleDocFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadDocument(file);
    e.target.value = "";
  }

  async function deleteDocument(docId: string) {
    const res = await fetch(`/api/clients/${clientId}/documents`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId }),
    });
    if (res.ok) { toast({ title: "Документ удалён" }); refetch(); }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Навигация */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Назад к клиентам
      </button>

      {/* Шапка профиля */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 md:p-6 border rounded-xl bg-card shadow-sm">
        {/* Аватар */}
        <div className="relative shrink-0">
          {client.photoUrl ? (
            <img
              src={client.photoUrl}
              alt=""
              className="h-20 w-20 rounded-full object-cover border-2 border-primary/20 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setLightboxOpen(true)}
            />
          ) : (
            <div
              className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary border-2 border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {client.firstName[0]}{client.lastName[0]}
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background border shadow flex items-center justify-center hover:bg-muted transition-colors"
            title="Загрузить фото с диска"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setWebcamOpen(true)}
            className="absolute -bottom-1 -left-1 h-7 w-7 rounded-full bg-primary text-primary-foreground border shadow flex items-center justify-center hover:bg-primary/90 transition-colors"
            title="Снять с веб-камеры"
          >
            <Video className="h-3.5 w-3.5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>

        {/* Основная инфо */}
        <div className="flex-1 w-full">
          {!editing ? (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{client.lastName} {client.firstName}</h1>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", tag.className)}>
                      {tag.label}
                    </span>

                    {/* Выпадающий список этапа воронки продаж */}
                    <div className="relative inline-flex items-center">
                      <select
                        value={client.funnelStage || "NEW"}
                        onChange={(e) => handleStageChange(e.target.value)}
                        disabled={updatingStage}
                        className="text-xs px-2.5 py-1 rounded-full font-semibold border shadow-xs cursor-pointer appearance-none pr-6 focus:outline-none transition-all"
                        style={{
                          backgroundColor: (FUNNEL_STAGE_COLOR[client.funnelStage || "NEW"] || "#6b7280") + "15",
                          color: FUNNEL_STAGE_COLOR[client.funnelStage || "NEW"] || "#6b7280",
                          borderColor: (FUNNEL_STAGE_COLOR[client.funnelStage || "NEW"] || "#6b7280") + "40",
                        }}
                      >
                        {Object.entries(FUNNEL_STAGE_CONFIG).map(([stKey, stCfg]) => (
                          <option key={stKey} value={stKey} className="bg-background text-foreground font-medium">
                            Этап: {stCfg.label}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2 text-current text-[9px]">▼</span>
                    </div>

                    {/* Инстаграм кнопка Объединить */}
                    {client.instagramUsername ? (
                      <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold text-pink-700 bg-pink-100 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200">
                        <Instagram className="h-3.5 w-3.5" />
                        @{client.instagramUsername}
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInstaModalOpen(true)}
                        className="h-6 text-xs gap-1 border-pink-300 text-pink-700 hover:bg-pink-50"
                      >
                        <Instagram className="h-3 w-3" />
                        <Link2 className="h-3 w-3" />
                        Объединить с Instagram
                      </Button>
                    )}

                    <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <Wallet className="h-3.5 w-3.5" />
                      Продано: {formatMoney(totalSales)} ₸
                    </span>
                    <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold text-indigo-700 bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Визитов: {visitedCount}
                    </span>
                    {client.phone && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />{client.phone}
                      </span>
                    )}
                    {client.email && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />{client.email}
                      </span>
                    )}
                    {client.birthDate && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(client.birthDate), "d MMMM yyyy", { locale: ru })}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      В студии с {format(new Date(client.createdAt), "d MMMM yyyy", { locale: ru })}
                    </span>
                  </div>
                  {client.note && <p className="text-sm text-muted-foreground mt-1">{client.note}</p>}

                  {/* Блок предстоящих записей */}
                  {upcomingBookings.length > 0 && (
                    <div className="mt-3 p-2.5 rounded-lg bg-blue-50/80 border border-blue-100 text-xs space-y-1">
                      <p className="font-semibold text-blue-900 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-blue-600" />
                        Предстоящие записи:
                      </p>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {upcomingBookings.map(b => (
                          <div key={b.id} className="bg-white border rounded px-2.5 py-1 flex items-center gap-2 shadow-2xs">
                            <span className="font-medium text-slate-800">{b.classEvent.direction.name}:</span>
                            <span className="text-blue-700 font-semibold">{formatDateTime(b.classEvent.startAt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={startEdit}>
                    <Pencil className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Редактировать</span>
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Фамилия</Label>
                  <Input className="mt-1" value={form.lastName || ""} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
                <div>
                  <Label>Имя</Label>
                  <Input className="mt-1" value={form.firstName || ""} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div>
                  <Label>Телефон</Label>
                  <Input className="mt-1" value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input className="mt-1" value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <Label>Instagram (@username)</Label>
                  <Input className="mt-1" placeholder="username" value={form.instagramUsername || ""} onChange={e => setForm(f => ({ ...f, instagramUsername: e.target.value }))} />
                </div>
                <div>
                  <Label>Дата рождения</Label>
                  <Input className="mt-1" type="date" value={form.birthDate || ""} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <Label>Примечание</Label>
                  <Input className="mt-1" value={form.note || ""} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} disabled={saving}>
                  <Save className="h-3.5 w-3.5 mr-1.5" />{saving ? "Сохраняем..." : "Сохранить"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                  <X className="h-3.5 w-3.5 mr-1.5" />Отмена
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модалка объединения с Instagram */}
      {instaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border rounded-xl p-5 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm flex items-center gap-2 text-pink-600">
                <Instagram className="h-4 w-4" /> Объединить с Instagram
              </h3>
              <button onClick={() => setInstaModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Укажите имя пользователя Instagram (handle) клиента для связывания диалогов из Instagram Direct с этим профилем:
            </p>
            <div>
              <Label className="text-xs">Instagram Username</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold">@</span>
                <Input
                  value={instaInput}
                  onChange={(e) => setInstaInput(e.target.value)}
                  placeholder="username"
                  className="pl-7 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setInstaModalOpen(false)}>Отмена</Button>
              <Button size="sm" onClick={handleLinkInstagram} disabled={linkingInsta || !instaInput.trim()} className="bg-pink-600 hover:bg-pink-700 text-white">
                {linkingInsta ? "Связываем..." : "Привязать"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Вкладки */}
      <Tabs defaultValue="visits">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="visits">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Посещения
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <User className="h-3.5 w-3.5 mr-1.5" />
            Настройки
          </TabsTrigger>
          <TabsTrigger value="audit">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            История
          </TabsTrigger>
        </TabsList>


        {/* Посещения */}
        <TabsContent value="visits" className="mt-4">
          {(client.bookings ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Записей пока нет</p>
          ) : (
            <div className="space-y-1.5">
              {(client.bookings ?? []).map(b => {
                const statusCfg = BOOKING_STATUS[b.status];
                const ev = b.classEvent;
                const price = Number((ev as any).totalPrice) > 0
                  ? Number((ev as any).totalPrice)
                  : (Number((ev as any).servicePrice || 0) + Number((ev as any).extraPeopleFee || 0) + Number((ev as any).wardrobeFee || 0));

                const rawNoteTitle = ev.note ? ev.note.replace(/^Altegio #\d+:\s*/, "").trim() : "";
                const isRent = !ev.trainer || ev.direction.name.toLowerCase().includes("аренда") || rawNoteTitle.toLowerCase().includes("аренда");

                let titleName = rawNoteTitle || ev.direction.name;
                if (titleName === "Дополнения" || !titleName) {
                  titleName = isRent ? "Аренда" : "Услуга съёмки";
                }

                return (
                  <div key={b.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card shadow-sm hover:border-slate-300 transition-colors">
                    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ev.direction.colorHex }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{titleName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(ev.startAt)} · {ev.hall.name} · {ev.trainer ? `${ev.trainer.user.firstName} ${ev.trainer.user.lastName}` : "Аренда"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono shrink-0">
                      {formatMoney(price)} ₸
                    </span>
                    <span className={cn("text-xs font-medium shrink-0 mr-1", statusCfg.color)}>
                      {statusCfg.label}
                    </span>
                    <button
                      onClick={() => handleDeleteBooking(b.id)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                      title="Удалить запись"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Настройки уведомлений */}
        <TabsContent value="notifications" className="mt-4">
          <div className="border rounded-xl divide-y max-w-sm">
            {[
              { key: "notifyAll",        label: "Все уведомления",        desc: "Мастер-переключатель" },
              { key: "notifyReminders",  label: "Напоминания о записях",   desc: "За 2 часа до тренировки" },
              { key: "notifyMarketing",  label: "Информационные рассылки", desc: "Акции, новости студии" },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={!!(editing ? form : client)[item.key as keyof ClientData]}
                  onCheckedChange={async (val) => {
                    await fetch(`/api/clients/${clientId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ...client, [item.key]: val }),
                    });
                    refetch();
                  }}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Аудит-лог */}
        <TabsContent value="audit" className="mt-4">
          {client.auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">История действий пуста</p>
          ) : (
            <div className="space-y-1.5">
              {client.auditLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{log.action}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateTime(log.createdAt)}
                      {log.user && ` · ${log.user.firstName} ${log.user.lastName}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <WebcamDialog
        open={webcamOpen}
        onClose={() => setWebcamOpen(false)}
        onCapture={blob => uploadPhotoBlob(blob)}
      />

      {/* Лайтбокс фото */}
      {lightboxOpen && client.photoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-2xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img
              src={client.photoUrl}
              alt={`${client.firstName} ${client.lastName}`}
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-background border shadow flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-center text-white/70 text-sm mt-2">
              {client.firstName} {client.lastName}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
