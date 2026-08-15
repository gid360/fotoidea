"use client";

import { useState } from "react";
import {
  User, Phone, Mail, Calendar, MessageCircle, Tag, Plus, Edit2, Check, X,
  Clock, Shield, Award, Camera, RefreshCw, AlertCircle, ShoppingBag, FileText, ChevronRight, CheckCircle2, ChevronDown, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { AvatarLightbox } from "./AvatarLightbox";
import { ChannelBadge } from "./ChannelBadge";
import type { ConversationDetailDto, FunnelStageDto } from "./types";
import { SEGMENT_LABEL, SEGMENT_COLOR, clientDisplayName, formatPhonePretty } from "./types";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const DEFAULT_FUNNEL_STAGES: FunnelStageDto[] = [
  { id: "NEW",          name: "Новый",           order: 1, color: "#6b7280" },
  { id: "CONVERSATION", name: "Переписка",      order: 2, color: "#3b82f6" },
  { id: "BOUGHT",       name: "Купил",           order: 3, color: "#144d37" },
  { id: "VISITED",      name: "Посетил",         order: 4, color: "#0d9488" },
  { id: "REPEAT_BUYER", name: "Повторно купил", order: 5, color: "#8b5cf6" },
];

interface ClientPanelProps {
  conversation: ConversationDetailDto;
  onClose?: () => void;
  onBack?: () => void;
  onChanged: () => void;
  funnelStages?: FunnelStageDto[];
}

export function ClientPanel({
  conversation,
  onClose,
  onBack,
  onChanged,
  funnelStages = [],
}: ClientPanelProps) {
  const client = conversation.client;
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(client.name || "");
  const [savingName, setSavingName] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);

  const [currentStageId, setCurrentStageId] = useState(conversation.funnelStageId || "NEW");

  // Keep internal stage in sync with conversation updates
  if (conversation.funnelStageId && conversation.funnelStageId !== currentStageId && !updatingStage) {
    setCurrentStageId(conversation.funnelStageId);
  }

  const stagesList = funnelStages.length > 0 ? funnelStages : DEFAULT_FUNNEL_STAGES;
  const activeStageObj = stagesList.find((s) => s.id === currentStageId);
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

  async function handleStageChange(stageId: string) {
    setCurrentStageId(stageId);
    setUpdatingStage(true);
    try {
      await fetch(`/api/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funnelStageId: stageId, phone: client.phone }),
      });
      if (onChanged) onChanged();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStage(false);
    }
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

  async function handleDeleteBooking(bookingId: string) {
    if (!confirm("Удалить эту запись целиком?")) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
      if (res.ok && onChanged) onChanged();
    } catch (e) {
      console.error("Error deleting booking:", e);
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
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
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

            <p className="text-slate-500 font-mono text-xs mt-0.5">{formatPhonePretty(client.phone)}</p>

            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span
                className="px-2 py-0.5 rounded-full font-medium text-[10px] text-white"
                style={{ backgroundColor: SEGMENT_COLOR[client.segment] || "#94a3b8" }}
              >
                {SEGMENT_LABEL[client.segment] || "Клиент"}
              </span>

              <a
                href={`/clients/${conversation.clientId}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-0.5 rounded-full font-semibold text-[10px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 flex items-center gap-1 cursor-pointer transition-all hover:shadow-xs active:scale-95"
                title="Открыть карточку клиента с историей посещений"
              >
                <CheckCircle2 className="h-3 w-3 text-indigo-600" />
                Визитов: {visitedCount}
              </a>
            </div>
          </div>
        </div>

        {/* Funnel Stage Custom Colored Dropdown */}
        <div className="space-y-1.5 relative">
          <label className="font-semibold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-slate-500" />
              Этап воронки
            </span>
            {activeStageObj && (
              <span className="text-[10px] text-slate-400 font-normal">
                {activeStageObj.name}
              </span>
            )}
          </label>

          {/* Trigger button (Active stage colored row) */}
          {activeStageObj && (
            <button
              onClick={() => setIsStageDropdownOpen((prev) => !prev)}
              disabled={updatingStage}
              className="w-full text-left px-3 py-2 rounded-lg border text-xs font-semibold transition-all flex items-center justify-between shadow-2xs cursor-pointer hover:opacity-95"
              style={{
                backgroundColor: activeStageObj.color + "18",
                borderColor: activeStageObj.color + "60",
                color: activeStageObj.color,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: activeStageObj.color }}
                />
                <span className="font-medium text-slate-900 dark:text-slate-100">{activeStageObj.name}</span>
              </div>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isStageDropdownOpen && "rotate-180")} />
            </button>
          )}

          {/* Dropdown Menu of Colored Stage Rows */}
          {isStageDropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsStageDropdownOpen(false)}
              />

              <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-background border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 shadow-lg space-y-1 animate-in fade-in-50 zoom-in-95">
                {stagesList.map((stage) => {
                  const isActive = currentStageId === stage.id;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => {
                        handleStageChange(stage.id);
                        setIsStageDropdownOpen(false);
                      }}
                      disabled={updatingStage}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md border text-xs font-semibold transition-all flex items-center justify-between cursor-pointer",
                        isActive
                          ? "ring-1 font-bold shadow-2xs"
                          : "hover:opacity-90 opacity-85"
                      )}
                      style={{
                        backgroundColor: stage.color + (isActive ? "22" : "08"),
                        borderColor: stage.color + (isActive ? "80" : "25"),
                        color: stage.color,
                        outlineColor: stage.color,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="font-medium text-slate-900 dark:text-slate-100">{stage.name}</span>
                      </div>
                      {isActive && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded text-white font-bold flex items-center gap-0.5 shadow-2xs"
                          style={{ backgroundColor: stage.color }}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

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
