"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, Check, X, Phone,
  Instagram, MessageCircle, MousePointer, User, Settings2,
  ArrowUp, ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

interface Lead {
  id: string;
  status: string;
  source: "INSTAGRAM" | "WHATSAPP" | "MANUAL" | "WIDGET";
  name:   string | null;
  phone:  string | null;
  note:   string | null;
  clientId: string | null;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

function isValidRealPhone(phoneStr: string | null | undefined): boolean {
  if (!phoneStr) return false;
  const digits = phoneStr.replace(/\D/g, "");
  // WhatsApp LID numbers / technical IDs start with 103... or are 14-16 digits
  if (digits.startsWith("103") || digits.length > 12 || digits.length < 10) {
    return false;
  }
  return true;
}

interface CrmStage {
  status: string;
  label:  string;
  color:  string;
  order:  number;
}

type SourceFilter = "ALL" | "INSTAGRAM" | "WHATSAPP" | "MANUAL" | "WIDGET";

const SOURCE_ICON: Record<string, React.ElementType> = {
  INSTAGRAM: Instagram,
  WHATSAPP:  MessageCircle,
  MANUAL:    MousePointer,
  WIDGET:    User,
};
const SOURCE_LABEL: Record<string, string> = {
  INSTAGRAM: "Instagram",
  WHATSAPP:  "WhatsApp",
  MANUAL:    "Вручную",
  WIDGET:    "Онлайн-запись",
};
const SOURCE_COLOR: Record<string, string> = {
  INSTAGRAM: "text-pink-500",
  WHATSAPP:  "text-green-500",
  MANUAL:    "text-muted-foreground",
  WIDGET:    "text-blue-500",
};

const SOURCE_FILTERS: { value: SourceFilter; label: string; icon?: React.ElementType; color?: string }[] = [
  { value: "ALL",       label: "Все" },
  { value: "INSTAGRAM", label: "Instagram", icon: Instagram,     color: "text-pink-500" },
  { value: "WHATSAPP",  label: "WhatsApp",  icon: MessageCircle, color: "text-green-500" },
  { value: "WIDGET",    label: "Виджет",    icon: User,          color: "text-blue-500" },
  { value: "MANUAL",    label: "Вручную",   icon: MousePointer },
];

const EMPTY = { name: "", phone: "", source: "MANUAL" as "INSTAGRAM" | "WHATSAPP" | "MANUAL" | "WIDGET", note: "" };

// ─── Stage settings dialog ────────────────────────────────────────────────────
const STAGE_COLORS = [
  "#6b7280","#3b82f6","#f97316","#0d9488","#144d37","#ef4444",
  "#ec4899","#16a34a","#f59e0b","#059669",
];

function slugify(label: string) {
  return label.trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "") || `STAGE_${Date.now()}`;
}

function StageSettingsDialog({
  open, onClose, stages, onSaved,
}: {
  open: boolean; onClose: () => void;
  stages: CrmStage[]; onSaved: () => void;
}) {
  const [local, setLocal]   = useState<CrmStage[]>([]);
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  // Init local copy when opened
  if (open && local.length === 0 && stages.length > 0) {
    setLocal([...stages].sort((a, b) => a.order - b.order));
  }

  function updateStage(status: string, patch: Partial<CrmStage>) {
    setLocal(prev => prev.map(s => s.status === status ? { ...s, ...patch } : s));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setLocal(prev => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr.map((s, i) => ({ ...s, order: i }));
    });
  }

  function moveDown(idx: number) {
    setLocal(prev => {
      if (idx >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr.map((s, i) => ({ ...s, order: i }));
    });
  }

  function addStage() {
    if (!newLabel.trim()) return;
    const status = slugify(newLabel);
    if (local.some(s => s.status === status)) return;
    const color = STAGE_COLORS[local.length % STAGE_COLORS.length];
    setLocal(prev => [...prev, { status, label: newLabel.trim(), color, order: prev.length }]);
    setNewLabel("");
  }

  function removeStage(status: string) {
    setLocal(prev => prev.filter(s => s.status !== status).map((s, i) => ({ ...s, order: i })));
  }

  async function save() {
    if (local.length === 0) return;
    setSaving(true);
    await fetch("/api/settings/crm-stages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(local.map((s, i) => ({ ...s, order: i }))),
    });
    setSaving(false);
    onSaved();
    onClose();
    setLocal([]);
  }

  function handleClose() { setLocal([]); setNewLabel(""); onClose(); }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Настройка этапов воронки</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-muted-foreground mb-3">
            Добавляйте, удаляйте и переупорядочивайте этапы. Лиды без удалённого этапа переходят в первый этап.
          </p>

          {local.map((stage, idx) => (
            <div key={stage.status} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/20">
              {/* Order arrows */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => moveUp(idx)} disabled={idx === 0}
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-20">
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button onClick={() => moveDown(idx)} disabled={idx === local.length - 1}
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-20">
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>

              {/* Color picker */}
              <div className="relative shrink-0">
                <div className="h-7 w-7 rounded-md border cursor-pointer overflow-hidden"
                  style={{ background: stage.color }}>
                  <input type="color" value={stage.color}
                    onChange={e => updateStage(stage.status, { color: e.target.value })}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </div>
              </div>

              {/* Label */}
              <Input
                value={stage.label}
                onChange={e => updateStage(stage.status, { label: e.target.value })}
                className="flex-1 h-8 text-sm"
              />

              {/* Delete */}
              <button onClick={() => removeStage(stage.status)}
                className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Add new stage */}
          <div className="flex items-center gap-2 pt-2 border-t mt-3">
            <Input
              placeholder="Название нового этапа…"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addStage()}
              className="flex-1 h-8 text-sm"
            />
            <Button size="sm" variant="outline" onClick={addStage} disabled={!newLabel.trim()}>
              <Plus className="h-4 w-4 mr-1" />Добавить
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Отмена</Button>
          <Button onClick={save} disabled={saving || local.length === 0}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export function CrmClient() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen]     = useState(false);
  const [editLead, setEditLead]         = useState<Lead | null>(null);
  const [stagesOpen, setStagesOpen]     = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");
  const [form, setForm]                 = useState({ ...EMPTY });
  const [saving, setSaving]             = useState(false);
  const dragId = useRef<string | null>(null);

  const { data: leads = [], refetch } = useQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: () => fetch("/api/crm").then(r => r.json()),
  });

  const { data: stages = [], refetch: refetchStages } = useQuery<CrmStage[]>({
    queryKey: ["crm-stages"],
    queryFn: () => fetch("/api/settings/crm-stages").then(r => r.json()),
    staleTime: 1000 * 60 * 5,
  });

  const columns = [...stages].sort((a, b) => a.order - b.order);

  const filteredLeads = sourceFilter === "ALL" ? leads : leads.filter(l => l.source === sourceFilter);
  const byStatus = (status: string) => filteredLeads.filter(l => l.status === status);

  const totalActive = leads.filter(l => l.status !== "WON" && l.status !== "LOST").length;

  // Counts per source for badges
  const sourceCounts: Record<string, number> = {};
  leads.forEach(l => { sourceCounts[l.source] = (sourceCounts[l.source] ?? 0) + 1; });

  async function create() {
    setSaving(true);
    const res = await fetch("/api/crm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { toast({ title: "Ошибка", variant: "destructive" }); return; }
    toast({ title: "Лид добавлен" });
    setCreateOpen(false);
    refetch();
  }

  async function update(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/crm/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    refetch();
  }

  async function saveEdit() {
    if (!editLead) return;
    setSaving(true);
    await update(editLead.id, {
      name:   form.name   || undefined,
      phone:  form.phone  || undefined,
      note:   form.note   || undefined,
      source: form.source,
    });
    setSaving(false);
    toast({ title: "Лид обновлён" });
    setEditLead(null);
  }

  async function deleteLead(id: string) {
    if (!confirm("Удалить лид?")) return;
    await fetch(`/api/crm/${id}`, { method: "DELETE" });
    refetch();
  }

  function onDragStart(id: string) { dragId.current = id; }
  function onDrop(status: string) {
    if (!dragId.current) return;
    update(dragId.current, { status });
    dragId.current = null;
  }

  const LeadForm = ({ submitLabel, onSubmit }: { submitLabel: string; onSubmit: () => void }) => (
    <div className="space-y-4">
      <div><Label>Имя</Label>
        <Input className="mt-1" placeholder="Имя клиента" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div><Label>Телефон</Label>
        <Input className="mt-1" placeholder="+7 700 000 0000" value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
      </div>
      <div>
        <Label>Источник</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {(["MANUAL", "INSTAGRAM", "WHATSAPP", "WIDGET"] as const).map(src => {
            const Icon = SOURCE_ICON[src];
            const active = form.source === src;
            return (
              <button key={src} onClick={() => setForm(f => ({ ...f, source: src }))}
                className={cn(
                  "flex items-center gap-2 border rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                )}>
                <Icon className={cn("h-4 w-4", active ? SOURCE_COLOR[src] : "text-muted-foreground")} />
                {SOURCE_LABEL[src]}
                {active && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
              </button>
            );
          })}
        </div>
      </div>
      <div><Label>Заметка</Label>
        <Input className="mt-1" placeholder="Необязательно" value={form.note}
          onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
      </div>
      <Button className="w-full" onClick={onSubmit} disabled={saving}>
        <Check className="h-3.5 w-3.5 mr-1.5" /> {submitLabel}
      </Button>
    </div>
  );

  const [mobileStage, setMobileStage] = useState<string>("ALL");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b bg-background shrink-0 space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Воронка продаж</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{totalActive} активных · {leads.length} всего</p>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setStagesOpen(true)}>
              <Settings2 className="h-3.5 w-3.5 mr-1" />Этапы
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={() => { setForm({ ...EMPTY }); setCreateOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" />Новый лид
            </Button>
          </div>
        </div>

        {/* Source filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {SOURCE_FILTERS.map(sf => {
            const Icon = sf.icon;
            const cnt  = sf.value === "ALL" ? leads.length : (sourceCounts[sf.value] ?? 0);
            return (
              <button key={sf.value}
                onClick={() => setSourceFilter(sf.value)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0",
                  sourceFilter === sf.value
                    ? "bg-foreground text-background border-foreground font-semibold"
                    : "hover:bg-muted border-transparent bg-slate-50 dark:bg-slate-800"
                )}>
                {Icon && <Icon className={cn("h-3.5 w-3.5", sourceFilter !== sf.value && sf.color)} />}
                {sf.label}
                {cnt > 0 && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                    sourceFilter === sf.value ? "bg-white/20" : "bg-muted"
                  )}>{cnt}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile Stage Selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 md:hidden no-scrollbar">
          <button
            onClick={() => setMobileStage("ALL")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0",
              mobileStage === "ALL" ? "bg-primary text-white font-semibold" : "bg-slate-100 dark:bg-slate-800 text-slate-600"
            )}
          >
            Все ({filteredLeads.length})
          </button>
          {columns.map(col => {
            const count = byStatus(col.status).length;
            const active = mobileStage === col.status;
            return (
              <button
                key={col.status}
                onClick={() => setMobileStage(col.status)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0",
                  active ? "text-white font-semibold shadow-2xs" : "bg-slate-100 dark:bg-slate-800 text-slate-700"
                )}
                style={active ? { backgroundColor: col.color } : {}}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                {col.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 p-3 sm:p-4 h-full" style={{ minWidth: mobileStage === "ALL" ? `${columns.length * 240}px` : "100%" }}>
          {columns.filter(col => mobileStage === "ALL" || col.status === mobileStage).map(col => {
            const colLeads = byStatus(col.status);
            const bg = `${col.color}18`;

            return (
              <div key={col.status}
                className={cn(
                  "flex flex-col h-full",
                  mobileStage !== "ALL" ? "w-full md:w-56" : "w-56 shrink-0"
                )}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(col.status)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg mb-2 shadow-2xs"
                  style={{ background: bg }}>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: col.color }} />
                    <span className="text-xs font-semibold" style={{ color: col.color }}>{col.label}</span>
                  </div>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/80 shadow-2xs"
                    style={{ color: col.color }}>
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                  {colLeads.map(lead => {
                    const SrcIcon = SOURCE_ICON[lead.source] ?? User;
                    const clientFullName = lead.client ? `${lead.client.firstName} ${lead.client.lastName}`.trim() : "";
                    const isNameTechnical = !lead.name || lead.name === lead.phone || /^\+?\d+$/.test((lead.name || "").trim());
                    const displayName = clientFullName || (!isNameTechnical ? lead.name : (lead.source === "WHATSAPP" ? "Клиент WhatsApp" : "Клиент CRM"));

                    // Determine real phone number (ignore technical IDs like 103049267835113)
                    const rawPhone = (lead.client && isValidRealPhone(lead.client.phone))
                      ? lead.client.phone
                      : (isValidRealPhone(lead.phone) ? lead.phone : "");

                    let formattedPhone = "";
                    if (rawPhone) {
                      const digits = rawPhone.replace(/\D/g, "");
                      if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
                        formattedPhone = `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
                      } else if (digits.length > 5) {
                        formattedPhone = `+${digits}`;
                      }
                    }

                    return (
                      <div key={lead.id}
                        draggable
                        onDragStart={() => onDragStart(lead.id)}
                        className="bg-background border rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{displayName}</p>
                            {formattedPhone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                                <Phone className="h-3 w-3 text-emerald-600 shrink-0" />{formattedPhone}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => {
                              setEditLead(lead);
                              setForm({ name: lead.name ?? "", phone: lead.phone ?? "", source: lead.source, note: lead.note ?? "" });
                            }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => deleteLead(lead.id)}
                              className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {lead.note && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{lead.note}</p>
                        )}

                        <div className="flex items-center justify-between mt-2 pt-2 border-t">
                          <div className={cn("flex items-center gap-1 text-xs", SOURCE_COLOR[lead.source])}>
                            <SrcIcon className="h-3 w-3" />
                            <span className="text-muted-foreground">{SOURCE_LABEL[lead.source]}</span>
                          </div>
                          {/* Quick status change */}
                          <Select value={lead.status} onValueChange={v => update(lead.id, { status: v })}>
                            <SelectTrigger className="h-5 w-auto border-0 p-0 text-xs text-muted-foreground focus:ring-0 [&>svg]:hidden">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {columns.map(c => (
                                <SelectItem key={c.status} value={c.status} className="text-xs">{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}

                  {colLeads.length === 0 && (
                    <div className="h-20 border-2 border-dashed border-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                      Перетащите сюда
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={v => !v && setCreateOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Новый лид</DialogTitle></DialogHeader>
          <LeadForm submitLabel="Добавить" onSubmit={create} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editLead} onOpenChange={v => !v && setEditLead(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Редактировать лид</DialogTitle></DialogHeader>
          <LeadForm submitLabel="Сохранить" onSubmit={saveEdit} />
        </DialogContent>
      </Dialog>

      {/* Stage settings dialog */}
      <StageSettingsDialog
        open={stagesOpen}
        onClose={() => setStagesOpen(false)}
        stages={stages}
        onSaved={() => { refetchStages(); qc.invalidateQueries({ queryKey: ["crm-stages"] }); }}
      />
    </div>
  );
}
