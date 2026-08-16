"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/use-toast";
import { formatDate, formatTime, formatMoney } from "@/lib/utils";
import { BookingStatus } from "@prisma/client";
import { UserPlus, Trash2, Check, X, Clock, Users, Percent, DollarSign } from "lucide-react";

interface Client { id: string; firstName: string; lastName: string; phone?: string }
interface Trainer { id: string; percentRate?: number; user: { firstName: string; lastName: string } }
interface Booking {
  id: string;
  status: BookingStatus;
  client: Client;
}
interface ClassEvent {
  id: string;
  startAt: string;
  durationMin: number;
  isCompleted: boolean;
  note?: string;
  servicePrice?: number | string;
  extraPeopleFee?: number | string;
  wardrobeFee?: number | string;
  prepayment?: number | string;
  totalPrice?: number | string;
  direction: { name: string; colorHex: string };
  trainer?: { id: string; percentRate?: number; user: { firstName: string; lastName: string } } | null;
  hall: { name: string };
  bookings: Booking[];
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string }> = {
  UNCONFIRMED: { label: "Забронирован", color: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "Подтвержден", color: "bg-blue-100 text-blue-800" },
  ATTENDED:  { label: "Пришел",      color: "bg-green-100 text-green-800" },
  ABSENT:    { label: "Не пришел",   color: "bg-red-100 text-red-800" },
  CANCELLED: { label: "Отмена",      color: "bg-gray-100 text-gray-600" },
};

interface Props {
  eventId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function ClassDetailDialog({ eventId, onClose, onUpdated }: Props) {
  const [event, setEvent] = useState<ClassEvent | null>(null);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [addingClient, setAddingClient] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);

  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [isEditingPrepayment, setIsEditingPrepayment] = useState(false);
  const [newPrepayment, setNewPrepayment] = useState("");

  useEffect(() => {
    fetch("/api/trainers")
      .then((r) => r.json())
      .then((t) => {
        const sorted = Array.isArray(t)
          ? [...t].sort((a, b) => {
              const nameA = `${a.user.firstName || ""} ${a.user.lastName || ""}`.trim();
              const nameB = `${b.user.firstName || ""} ${b.user.lastName || ""}`.trim();
              return nameA.localeCompare(nameB, "ru", { sensitivity: "base" });
            })
          : [];
        setTrainers(sorted);
      });
  }, []);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    const res = await fetch(`/api/schedule/events/${eventId}`);
    if (res.ok) {
      const data = await res.json();
      setEvent(data);
      setNoteText(data.note || "");
    }
  }, [eventId]);

  useEffect(() => { loadEvent(); }, [loadEvent]);

  async function updateTrainer(trainerId: string) {
    if (!eventId) return;
    setLoading(true);
    const targetTrainerId = trainerId === "none" ? null : trainerId;
    const res = await fetch(`/api/schedule/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainerId: targetTrainerId }),
    });
    setLoading(false);
    if (res.ok) {
      toast({ title: "Фотограф обновлен" });
      await loadEvent();
      onUpdated();
    } else {
      toast({ title: "Ошибка обновления", variant: "destructive" });
    }
  }

  async function saveNote() {
    if (!eventId) return;
    setSavingNote(true);
    const res = await fetch(`/api/schedule/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteText }),
    });
    setSavingNote(false);
    if (res.ok) {
      toast({ title: "Примечание сохранено" });
      await loadEvent();
      onUpdated();
    } else {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    }
  }

  useEffect(() => {
    if (!clientSearch.trim()) { setClientResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/clients?q=${encodeURIComponent(clientSearch)}`);
      if (res.ok) {
        const data = await res.json();
        setClientResults(Array.isArray(data) ? data : (data.clients || []));
      }
    }, 300);
    return () => clearTimeout(t);
  }, [clientSearch]);

  async function updateStatus(bookingId: string, status: BookingStatus) {
    if (!eventId) return;
    setLoading(true);
    const res = await fetch(`/api/schedule/events/${eventId}/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    if (res.ok) {
      await loadEvent();
      onUpdated();
      if (status === "ATTENDED") toast({ title: "Отметка поставлена" });
    }
  }

  async function removeBooking(bookingId: string) {
    if (!eventId) return;
    await fetch(`/api/schedule/events/${eventId}/bookings/${bookingId}`, { method: "DELETE" });
    await loadEvent();
    onUpdated();
  }

  async function addClient(client: Client) {
    if (!eventId) return;
    setAddingClient(true);
    const res = await fetch(`/api/schedule/events/${eventId}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id }),
    });
    const json = await res.json();
    setAddingClient(false);
    if (!res.ok) { toast({ title: "Ошибка", description: json.error, variant: "destructive" }); return; }
    toast({ title: `${client.firstName} ${client.lastName} записан(а)` });
    setClientSearch("");
    setClientResults([]);
    setShowAddClient(false);
    await loadEvent();
    onUpdated();
  }

  async function markCompleted() {
    if (!eventId) return;
    await fetch(`/api/schedule/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: true }),
    });
    await loadEvent();
    onUpdated();
    toast({ title: "Запись завершена" });
  }

  if (!event) return null;

  const bookedCount = event.bookings.filter(b => b.status !== "CANCELLED").length;
  const attendedCount = event.bookings.filter(b => b.status === "ATTENDED").length;

  const sPrice = Number(event.servicePrice || 0);
  const ePeople = Number(event.extraPeopleFee || 0);
  const wFee = Number(event.wardrobeFee || 0);
  const pPayment = Number(event.prepayment ?? 5000);
  const totPrice = Number(event.totalPrice || (sPrice + ePeople + wFee));
  const remainingToPay = Math.max(0, totPrice - pPayment);
  const qualBase = sPrice + ePeople;

  const trainerPercent = event.trainer?.percentRate ? Number(event.trainer.percentRate) : 50;
  const trainerEarning = (qualBase * trainerPercent) / 100;

  async function updatePrepayment(val: number) {
    if (!eventId) return;
    setLoading(true);
    const res = await fetch(`/api/schedule/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prepayment: val }),
    });
    setLoading(false);
    if (res.ok) {
      toast({ title: "Предоплата обновлена" });
      setIsEditingPrepayment(false);
      await loadEvent();
      onUpdated();
    }
  }

  return (
    <Dialog open={!!eventId} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ background: event.direction.colorHex }} />
            {event.direction.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Метаинфо */}
          <div className="grid grid-cols-2 gap-2 text-sm bg-muted/40 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(event.startAt)}, {formatTime(event.startAt)} · {event.durationMin} мин
            </div>
            <div className="text-muted-foreground flex items-center justify-end">
              Зал: <span className="text-foreground font-medium ml-1">{event.hall.name}</span>
            </div>
            <div className="col-span-2 pt-2 border-t flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Фотограф:</span>
              <Select
                value={event.trainer ? event.trainer.id : "none"}
                onValueChange={(val) => updateTrainer(val)}
                disabled={loading}
              >
                <SelectTrigger className="h-8 text-xs w-60 bg-background font-medium">
                  <SelectValue placeholder="Не назначен" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не назначен</SelectItem>
                  {trainers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.user.firstName} {t.user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Финансовая детализация */}
          <div className="p-3 border rounded-lg bg-card space-y-2 text-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-1 font-semibold uppercase tracking-wider">
              <span>Финансовые детали</span>
              <DollarSign className="h-3.5 w-3.5" />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Стоимость услуги:</span>
              <span className="font-medium">{formatMoney(sPrice)} ₸</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Доплата за человека:</span>
              <span className="font-medium">{formatMoney(ePeople)} ₸</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Аренда гардероба:</span>
              <span className="font-medium">{formatMoney(wFee)} ₸</span>
            </div>
            <div className="flex justify-between text-xs border-t pt-1 font-semibold text-foreground">
              <span>Итого общая стоимость:</span>
              <span>{formatMoney(totPrice)} ₸</span>
            </div>

            {/* Блок предоплаты с возможностью изменения вручную */}
            <div className="flex items-center justify-between text-xs pt-1 border-t text-emerald-600 font-medium">
              <span>Предоплата:</span>
              {isEditingPrepayment ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className="h-6 w-24 text-xs font-semibold bg-background"
                    value={newPrepayment}
                    onChange={e => setNewPrepayment(e.target.value)}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="h-6 text-[10px] px-2 font-bold"
                    onClick={() => updatePrepayment(Number(newPrepayment || 0))}
                  >
                    ОК
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-1.5 text-muted-foreground"
                    onClick={() => setIsEditingPrepayment(false)}
                  >
                    ✕
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">{formatMoney(pPayment)} ₸</span>
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground hover:text-primary underline"
                    onClick={() => {
                      setNewPrepayment(String(pPayment));
                      setIsEditingPrepayment(true);
                    }}
                  >
                    Изм.
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-between font-bold text-sm border-t pt-1 text-primary">
              <span>Остаток к оплате при визите:</span>
              <span className="text-base font-bold">{formatMoney(remainingToPay)} ₸</span>
            </div>

            {event.trainer && (
              <div className="mt-2 pt-2 border-t text-xs bg-primary/5 p-2 rounded flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Percent className="h-3 w-3 text-primary" />
                  Зарплата фотографа ({trainerPercent}% от {formatMoney(qualBase)} ₸):
                </span>
                <span className="font-bold text-primary">{formatMoney(trainerEarning)} ₸</span>
              </div>
            )}
          </div>

          {/* Список клиентов */}
          <div className="space-y-2">
            {event.bookings.map((booking) => {
              return (
                <div key={booking.id} className="p-3 rounded-lg border bg-card flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">
                      {booking.client.firstName} {booking.client.lastName}
                    </p>
                    {booking.client.phone && (
                      <p className="text-xs text-muted-foreground">{booking.client.phone}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {booking.status !== "ATTENDED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 transition-colors"
                        onClick={() => updateStatus(booking.id, "ATTENDED")}
                        disabled={loading}
                      >
                        <Check className="h-4 w-4 mr-1 text-emerald-600" />
                        Пришел
                      </Button>
                    )}
                    {booking.status !== "ABSENT" && booking.status !== "ATTENDED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-300 transition-colors"
                        onClick={() => updateStatus(booking.id, "ABSENT")}
                        disabled={loading}
                      >
                        <X className="h-4 w-4 mr-1 text-rose-600" />
                        Не пришел
                      </Button>
                    )}
                    {booking.status === "ATTENDED" && (
                      <span className="text-xs px-2.5 py-1 rounded-md font-semibold bg-green-100 text-green-800">
                        Пришел
                      </span>
                    )}
                    {booking.status === "ABSENT" && (
                      <span className="text-xs px-2.5 py-1 rounded-md font-semibold bg-red-100 text-red-800">
                        Не пришел
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 border-destructive/30 transition-colors"
                      onClick={() => removeBooking(booking.id)}
                      title="Удалить запись"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Удалить
                    </Button>
                  </div>
                </div>
              );
            })}

            {event.bookings.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">Нет клиентов в записи</p>
            )}
          </div>

          {/* Записать клиента (только если клиент ещё не записан) */}
          {event.bookings.length === 0 && (
            <div>
              {!showAddClient ? (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAddClient(true)}>
                  <UserPlus className="h-3.5 w-3.5 mr-2" /> Записать клиента
                </Button>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Поиск клиента по имени или телефону..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    autoFocus
                  />
                  {clientResults.length > 0 && (
                    <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                      {clientResults.map(c => (
                        <button
                          key={c.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex justify-between"
                          onClick={() => addClient(c)}
                          disabled={addingClient}
                        >
                          <span>{c.firstName} {c.lastName}</span>
                          <span className="text-muted-foreground">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setShowAddClient(false)}>Отмена</Button>
                </div>
              )}
            </div>
          )}

          {/* Редактируемое примечание */}
          <div className="pt-3 border-t space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Примечание</span>
              {noteText !== (event.note || "") && (
                <Button
                  size="sm"
                  className="h-6 text-[11px] px-2.5 font-semibold"
                  onClick={saveNote}
                  disabled={savingNote}
                >
                  {savingNote ? "Сохранение..." : "Сохранить примечание"}
                </Button>
              )}
            </div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Добавьте примечание или комментарий к записи..."
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
