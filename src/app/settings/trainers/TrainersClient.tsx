"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, UserCog, Check, Trash2, Percent, Upload, ImageIcon,
  Archive, ArchiveRestore, Search, X, UserCheck, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { PageTabs } from "@/components/PageTabs";

const TRAINER_TABS = [
  { label: "Фотографы", href: "/settings/trainers" },
  { label: "Зарплата", href: "/salary" },
];

interface Trainer {
  id: string;
  percentRate: string | number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    isActive: boolean;
    avatarUrl: string | null;
  };
  _count: { classEvents: number };
}

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  phone: "",
  password: "",
  avatarUrl: "",
  percentRate: 50,
};

type TabFilter = "active" | "archived" | "all";

export function TrainersClient() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabFilter>("active");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Trainer | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionTrainerId, setActionTrainerId] = useState<string | null>(null);

  const { data: trainers = [] } = useQuery<Trainer[]>({
    queryKey: ["trainers-settings"],
    queryFn: () => fetch("/api/settings/trainers").then((r) => r.json()),
  });

  const activeCount = useMemo(() => trainers.filter((t) => t.user.isActive).length, [trainers]);
  const archivedCount = useMemo(() => trainers.filter((t) => !t.user.isActive).length, [trainers]);

  const filteredTrainers = useMemo(() => {
    return trainers.filter((t) => {
      if (tab === "active" && !t.user.isActive) return false;
      if (tab === "archived" && t.user.isActive) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const fullName = `${t.user.firstName} ${t.user.lastName}`.toLowerCase();
        const phone = (t.user.phone || "").toLowerCase();
        if (!fullName.includes(q) && !phone.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [trainers, tab, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setOpen(true);
  }

  function openEdit(t: Trainer) {
    setEditing(t);
    setForm({
      firstName: t.user.firstName,
      lastName: t.user.lastName,
      phone: t.user.phone ?? "",
      password: "",
      avatarUrl: t.user.avatarUrl ?? "",
      percentRate: Number(t.percentRate ?? 50),
    });
    setOpen(true);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/service-photo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm((f) => ({ ...f, avatarUrl: data.url }));
        toast({ title: "Фото загружено" });
      } else {
        toast({ title: "Ошибка загрузки", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка загрузки файла", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    const payload = {
      ...form,
      percentRate: Number(form.percentRate),
      avatarUrl: form.avatarUrl || null,
    };

    if (editing) {
      const res = await fetch(`/api/settings/trainers/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSaving(false);
      if (!res.ok) {
        toast({ title: "Ошибка", variant: "destructive" });
        return;
      }
      toast({ title: "Фотограф обновлён" });
    } else {
      if (!form.password) {
        setSaving(false);
        toast({ title: "Введите пароль", variant: "destructive" });
        return;
      }
      const res = await fetch("/api/settings/trainers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSaving(false);
      if (!res.ok) {
        toast({ title: "Ошибка", variant: "destructive" });
        return;
      }
      toast({ title: "Фотограф добавлен" });
    }
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["trainers-settings"] });
  }

  async function handleArchive(trainer: Trainer) {
    setActionTrainerId(trainer.id);
    try {
      const res = await fetch(`/api/settings/trainers/${trainer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (res.ok) {
        toast({ title: `Фотограф ${trainer.user.firstName} отправлен в архив` });
        qc.invalidateQueries({ queryKey: ["trainers-settings"] });
      } else {
        toast({ title: "Ошибка архивации", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка архивации", variant: "destructive" });
    } finally {
      setActionTrainerId(null);
    }
  }

  async function handleRestore(trainer: Trainer) {
    setActionTrainerId(trainer.id);
    try {
      const res = await fetch(`/api/settings/trainers/${trainer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (res.ok) {
        toast({ title: `Фотограф ${trainer.user.firstName} восстановлен из архива` });
        qc.invalidateQueries({ queryKey: ["trainers-settings"] });
      } else {
        toast({ title: "Ошибка восстановления", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка восстановления", variant: "destructive" });
    } finally {
      setActionTrainerId(null);
    }
  }

  async function deleteTrainer(trainer: Trainer) {
    if (!confirm(`Удалить фотографа ${trainer.user.firstName} ${trainer.user.lastName}?`)) return;
    const res = await fetch(`/api/settings/trainers/${trainer.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Ошибка удаления", variant: "destructive" });
      return;
    }
    toast({ title: "Фотограф удалён" });
    qc.invalidateQueries({ queryKey: ["trainers-settings"] });
  }

  return (
    <div className="flex flex-col h-full bg-background space-y-4">
      <PageTabs tabs={TRAINER_TABS} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Фотографы</h1>
          <p className="text-xs text-muted-foreground">
            {activeCount} активных фотографов · расчёт зарплат и процент со съёмок
          </p>
        </div>
        <Button onClick={openCreate} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-1.5" /> Добавить фотографа
        </Button>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              tab === "active"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Активные</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                tab === "active"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600"
              )}
            >
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("archived")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              tab === "archived"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            <Archive className="h-3.5 w-3.5 text-amber-600" />
            <span>В архиве</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                tab === "archived"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600"
              )}
            >
              {archivedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              tab === "all"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            <span>Все</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                tab === "all"
                  ? "bg-indigo-100 text-indigo-800"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600"
              )}
            >
              {trainers.length}
            </span>
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Поиск по имени, телефону…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-8 h-8 text-xs rounded-lg"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Trainers List */}
      <div className="flex-1 overflow-auto space-y-3 min-h-[300px]">
        {filteredTrainers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border rounded-2xl border-dashed bg-slate-50/50">
            {tab === "archived" ? (
              <>
                <Archive className="h-10 w-10 text-amber-400 mb-2 opacity-80" />
                <h3 className="font-bold text-sm text-slate-800">В архиве нет фотографов</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Неактивные фотографы появятся здесь при отправке в архив.
                </p>
              </>
            ) : tab === "active" ? (
              <>
                <UserCheck className="h-10 w-10 text-emerald-400 mb-2 opacity-80" />
                <h3 className="font-bold text-sm text-slate-800">Активные фотографы не найдены</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {search ? "Попробуйте изменить поисковый запрос" : "Добавьте первого фотографа по кнопке выше"}
                </p>
              </>
            ) : (
              <>
                <UserCog className="h-10 w-10 text-slate-400 mb-2 opacity-80" />
                <h3 className="font-bold text-sm text-slate-800">Фотографы не найдены</h3>
                <p className="text-xs text-muted-foreground mt-1">Попробуйте изменить параметры поиска</p>
              </>
            )}
          </div>
        ) : (
          filteredTrainers.map((trainer) => {
            const isActing = actionTrainerId === trainer.id;
            return (
              <div
                key={trainer.id}
                className={cn(
                  "border rounded-xl p-4 transition-all",
                  trainer.user.isActive
                    ? "bg-white hover:border-slate-300 shadow-2xs"
                    : "bg-slate-50/80 border-slate-200/80 opacity-75"
                )}
              >
                <div className="flex items-start gap-4">
                  {trainer.user.avatarUrl ? (
                    <img
                      src={trainer.user.avatarUrl}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover shrink-0 border"
                    />
                  ) : (
                    <div
                      className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0",
                        trainer.user.isActive
                          ? "bg-primary/10 text-primary"
                          : "bg-amber-100 text-amber-800"
                      )}
                    >
                      {trainer.user.firstName?.[0] || ""}
                      {trainer.user.lastName?.[0] || ""}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-base text-slate-900">
                            {trainer.user.lastName} {trainer.user.firstName}
                          </p>
                          {!trainer.user.isActive && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Archive className="h-2.5 w-2.5" /> В архиве
                            </span>
                          )}
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {trainer.user.phone && <span>{trainer.user.phone}</span>}
                          <span>{trainer._count.classEvents} съёмок</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(trainer)}
                          className="h-8 text-xs font-medium cursor-pointer"
                        >
                          <Pencil className="h-3 w-3 mr-1.5" /> Редактировать
                        </Button>

                        {trainer.user.isActive ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isActing}
                            onClick={() => handleArchive(trainer)}
                            className="h-8 text-xs font-medium border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 cursor-pointer"
                            title="Отправить фотографа в архив"
                          >
                            {isActing ? (
                              <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
                            ) : (
                              <Archive className="h-3 w-3 mr-1.5 text-amber-600" />
                            )}
                            В архив
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isActing}
                            onClick={() => handleRestore(trainer)}
                            className="h-8 text-xs font-medium border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer"
                            title="Восстановить фотографа из архива"
                          >
                            {isActing ? (
                              <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
                            ) : (
                              <ArchiveRestore className="h-3 w-3 mr-1.5 text-emerald-600" />
                            )}
                            Восстановить
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-red-50 cursor-pointer"
                          onClick={() => deleteTrainer(trainer)}
                          title="Удалить фотографа"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2 text-xs font-semibold text-primary flex items-center gap-1.5">
                      <Percent className="h-3.5 w-3.5" />
                      <span>Процент со съёмки: {trainer.percentRate ?? 50}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Редактировать фотографа" : "Новый фотограф"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Аватарка фотографа */}
            <div>
              <Label>Фотография / Аватарка</Label>
              <div className="mt-1.5 flex items-center gap-3">
                {form.avatarUrl ? (
                  <img
                    src={form.avatarUrl}
                    alt="Предпросмотр"
                    className="h-16 w-16 object-cover rounded-full border"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-dashed shrink-0">
                    <ImageIcon className="h-6 w-6 opacity-40" />
                  </div>
                )}
                <div>
                  <label className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                      <span>
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        {uploading
                          ? "Загрузка..."
                          : form.avatarUrl
                          ? "Изменить фото"
                          : "Загрузить фото"}
                      </span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG до 5 МБ</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Фамилия</Label>
                <Input
                  className="mt-1"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Имя</Label>
                <Input
                  className="mt-1"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Телефон</Label>
              <Input
                className="mt-1"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            {!editing && (
              <div>
                <Label>Пароль для входа</Label>
                <Input
                  className="mt-1"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
            )}

            <div>
              <Label>Процент со съёмки (%)</Label>
              <Input
                className="mt-1 font-semibold"
                type="number"
                min="0"
                max="100"
                placeholder="50"
                value={form.percentRate}
                onChange={(e) => setForm((f) => ({ ...f, percentRate: Number(e.target.value) }))}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Начисляется со стоимости услуги и доплаты за кол-во человек (аренда гардероба исключается из расчёта)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={save} disabled={saving || !form.firstName || !form.lastName}>
              <Check className="h-3.5 w-3.5 mr-1.5" /> Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
