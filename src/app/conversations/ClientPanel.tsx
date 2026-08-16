"use client";

import { useState } from "react";
import {
  User, Phone, Mail, Calendar, MessageCircle, Tag, Plus, Edit2, Check, X,
  Clock, Shield, Award, Camera, RefreshCw, AlertCircle, ShoppingBag, FileText, ChevronRight, CheckCircle2, ChevronDown, Trash2, ArrowLeft, ExternalLink,
  Instagram, Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { Avatar } from "./Avatar";
import { AvatarLightbox } from "./AvatarLightbox";
import { ChannelBadge } from "./ChannelBadge";
import type { ConversationDetailDto } from "./types";
import { SEGMENT_LABEL, SEGMENT_COLOR, clientDisplayName, formatPhonePretty } from "./types";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface ClientPanelProps {
  conversation: ConversationDetailDto;
  onClose?: () => void;
  onBack?: () => void;
  onChanged: () => void;
}

export function ClientPanel({
  conversation,
  onClose,
  onBack,
  onChanged,
}: ClientPanelProps) {
  const client = conversation.client;
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(client.name || "");
  const [savingName, setSavingName] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Instagram linking state
  const [instaModalOpen, setInstaModalOpen] = useState(false);
  const [instaInput, setInstaInput] = useState(client.instagramUsername || "");
  const [savingInsta, setSavingInsta] = useState(false);

  const visitedCount = client.visitedCount ?? 0;
  const upcomingBookings = client.upcomingBookings ?? [];

  async function handleSaveName() {
    if (!nameInput.trim()) return;
    setSavingName(true);
    try {
      await fetch(`/api/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim(), phone: client.phone }),
      });
      setEditingName(false);
      if (onChanged) onChanged();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingName(false);
    }
  }

  async function handleLinkInstagram() {
    const handle = instaInput.trim().replace(/^@/, "");
    setSavingInsta(true);
    try {
      let res: Response;
      if (client.dbClientId || (client.id && !client.id.includes("@"))) {
        res = await fetch(`/api/clients/${client.dbClientId || client.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instagramUsername: handle || null }),
        });
      } else {
        res = await fetch(`/api/conversations/${conversation.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instagramUsername: handle || null, phone: client.phone }),
        });
      }
      if (res && res.ok) {
        client.instagramUsername = handle || null;
        toast({ title: handle ? "Instagram аккаунт привязан" : "Instagram аккаунт отвязан" });
      } else {
        toast({ title: "Ошибка при сохранении", variant: "destructive" });
      }
      setInstaModalOpen(false);
      if (onChanged) onChanged();
    } catch (e) {
      console.error(e);
      toast({ title: "Ошибка связывания", variant: "destructive" });
    } finally {
      setSavingInsta(false);
    }
  }

  function handleInstagramClick() {
    const handle = client.instagramUsername?.trim().replace(/^@/, "");
    if (!handle) return;
    // Check if there is an Instagram dialogue in current window / cache or open profile
    window.open(`https://instagram.com/${handle}`, "_blank");
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await fetch(`/api/conversations/${conversation.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: noteText.trim(), phone: client.phone }),
      });
      setNoteText("");
      if (onChanged) onChanged();
    } catch (e) {
      console.error(e);
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    try {
      const phoneParam = client.phone ? `&phone=${encodeURIComponent(client.phone)}` : "";
      const res = await fetch(`/api/conversations/${conversation.id}/notes?noteId=${noteId}${phoneParam}`, {
        method: "DELETE",
      });
      if (res.ok && onChanged) onChanged();
    } catch (e) {
      console.error("Error deleting note:", e);
    }
  }

  return (
    <div className="w-full md:w-80 border-l bg-background flex flex-col h-full shrink-0 overflow-y-auto min-h-0 text-xs">
      {/* Lightbox for Avatar */}
      {lightboxOpen && client.avatarUrl && (
        <AvatarLightbox
          src={client.avatarUrl}
          alt={clientDisplayName(client)}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 -ml-1 rounded-lg text-slate-600 hover:bg-slate-200/60 md:hidden flex items-center justify-center"
              title="Назад к чату"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <span className="font-semibold text-slate-700">Карточка клиента</span>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 md:hidden text-slate-500 hover:text-slate-700"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Profile Card - Horizontal (Avatar left, details right) */}
        <div className="flex items-start gap-3 pb-3 border-b">
          <div
            className="relative cursor-pointer hover:opacity-90 transition-opacity shrink-0"
            onClick={() => client.avatarUrl && setLightboxOpen(true)}
          >
            <Avatar src={client.avatarUrl} name={clientDisplayName(client)} size="lg" />
            <ChannelBadge channel={client.channel} className="absolute bottom-0 right-0 h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1">
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="h-7 text-xs"
                  placeholder="Имя клиента"
                />
                <Button size="icon" className="h-7 w-7" onClick={handleSaveName} disabled={savingName}>
                  {savingName ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingName(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 group">
                <h3 className="font-bold text-sm text-slate-900 truncate">{clientDisplayName(client)}</h3>
                <button onClick={() => setEditingName(true)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 shrink-0">
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
            )}

            {client.dbClientId || (client.id && !client.id.includes("@")) ? (
              <a
                href={`/clients/${client.dbClientId || client.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:underline font-mono text-xs mt-0.5 font-medium cursor-pointer"
                title="Открыть карточку клиента в базе"
              >
                <Phone className="h-3 w-3 text-slate-400" />
                {formatPhonePretty(client.phone)}
                <ExternalLink className="h-3 w-3 text-indigo-400" />
              </a>
            ) : (
              <a
                href={`/clients?search=${encodeURIComponent((client.phone || "").slice(-10))}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 hover:underline font-mono text-xs mt-0.5 cursor-pointer"
                title="Поиск клиента в базе"
              >
                <Phone className="h-3 w-3 text-slate-400" />
                {formatPhonePretty(client.phone)}
              </a>
            )}

            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span
                className="px-2 py-0.5 rounded-full font-medium text-[10px] text-white"
                style={{ backgroundColor: SEGMENT_COLOR[client.segment] || "#94a3b8" }}
              >
                {SEGMENT_LABEL[client.segment] || "Клиент"}
              </span>

              {client.dbClientId || (client.id && !client.id.includes("@")) ? (
                <a
                  href={`/clients/${client.dbClientId || client.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-0.5 rounded-full font-semibold text-[10px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 flex items-center gap-1 cursor-pointer transition-all hover:shadow-xs active:scale-95"
                  title="Открыть карточку клиента с историей посещений"
                >
                  <CheckCircle2 className="h-3 w-3 text-indigo-600" />
                  Визитов: {visitedCount}
                </a>
              ) : (
                <a
                  href={`/clients?search=${encodeURIComponent((client.phone || "").slice(-10))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-0.5 rounded-full font-semibold text-[10px] text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center gap-1 cursor-pointer transition-all"
                  title="Поиск клиента в базе"
                >
                  <CheckCircle2 className="h-3 w-3 text-slate-500" />
                  Визитов: {visitedCount}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Instagram Account Section */}
        <div className="space-y-1.5 pt-1">
          <label className="font-semibold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Instagram className="h-3.5 w-3.5 text-pink-600" />
              Instagram
            </span>
          </label>
          {client.instagramUsername ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleInstagramClick}
                className="flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-pink-200 bg-pink-50/80 hover:bg-pink-100/90 text-pink-700 font-semibold text-xs transition-colors group cursor-pointer"
                title="Открыть профиль Instagram"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Instagram className="h-3.5 w-3.5 text-pink-600 shrink-0" />
                  @{client.instagramUsername.replace(/^@/, "")}
                </span>
                <ExternalLink className="h-3 w-3 text-pink-500 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-slate-700 shrink-0"
                onClick={() => {
                  setInstaInput(client.instagramUsername || "");
                  setInstaModalOpen(true);
                }}
                title="Изменить Instagram"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setInstaInput("");
                setInstaModalOpen(true);
              }}
              className="w-full h-8 text-xs gap-1.5 border-pink-200 text-pink-700 hover:bg-pink-50 hover:border-pink-300 font-medium"
            >
              <Instagram className="h-3.5 w-3.5 text-pink-600" />
              <Link2 className="h-3 w-3" />
              Связать с Instagram
            </Button>
          )}
        </div>

        {/* Modal: Link with Instagram */}
        {instaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-background border rounded-xl p-5 max-w-sm w-full space-y-4 shadow-xl animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-sm flex items-center gap-2 text-pink-600">
                  <Instagram className="h-4 w-4" /> Связать с Instagram
                </h3>
                <button onClick={() => setInstaModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Укажите имя пользователя Instagram (handle) клиента для связывания профиля:
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
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setInstaModalOpen(false)}>Отмена</Button>
                <Button size="sm" onClick={handleLinkInstagram} disabled={savingInsta} className="bg-pink-600 hover:bg-pink-700 text-white">
                  {savingInsta ? "Сохраняем..." : "Связать"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Bookings */}
        <div className="space-y-1.5 pt-2 border-t">
          <label className="font-semibold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              Предстоящие записи
            </span>
          </label>
          {upcomingBookings.length > 0 ? (
            <div className="space-y-1.5">
              {upcomingBookings.map((b) => {
                const dateStr = b.startAt ? b.startAt.split("T")[0] : "";
                const scheduleHref = dateStr ? `/schedule?date=${dateStr}&eventId=${b.id}` : "/schedule";
                return (
                  <a
                    key={b.id}
                    href={scheduleHref}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-blue-50/80 hover:bg-blue-100/90 border border-blue-100 hover:border-blue-200 text-xs space-y-0.5 block transition-all hover:shadow-xs group cursor-pointer"
                    title="Перейти к записи в расписании"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 group-hover:text-blue-700 truncate">{b.directionName}</span>
                      <span className="text-[10px] font-semibold text-blue-700 group-hover:underline flex items-center gap-0.5">
                        {formatDateTime(b.startAt)}
                        <ChevronRight className="h-3 w-3 inline opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 py-1">Предстоящих записей нет</p>
          )}
        </div>

        {/* Notes Section */}
        <div className="space-y-2 pt-2 border-t">
          <label className="font-semibold text-slate-700 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            Заметки ({conversation.notes?.length || 0})
          </label>

          <div className="space-y-1.5">
            <Textarea
              placeholder="Добавить заметку о клиенте…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="text-xs min-h-[50px] resize-none"
            />
            <Button onClick={handleAddNote} disabled={addingNote || !noteText.trim()} size="sm" className="w-full text-xs h-7">
              {addingNote ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
              Добавить заметку
            </Button>
          </div>

          <div className="space-y-2 mt-3">
            {conversation.notes && conversation.notes.length > 0 ? (
              conversation.notes.map((n) => (
                <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 border text-xs space-y-1 group">
                  <div className="flex items-start justify-between gap-1.5">
                    <p className="text-slate-800 whitespace-pre-wrap flex-1 min-w-0">{n.text}</p>
                    <button
                      onClick={() => handleDeleteNote(n.id)}
                      className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                      title="Удалить заметку"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    <span>{n.author?.name || "Менеджер"}</span>
                    <span>{format(new Date(n.createdAt), "dd.MM HH:mm", { locale: ru })}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-400 text-center py-2">Заметок пока нет</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
