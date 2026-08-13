"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, LayoutDashboard, GripVertical, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

interface Hall {
  id: string;
  name: string;
  description?: string | null;
  colorHex: string;
  isActive: boolean;
  showInSchedule: boolean;
  sortOrder?: number;
  openTime?: string;
  closeTime?: string;
  _count: { classEvents: number };
}

const EMPTY = {
  name: "",
  description: "",
  colorHex: "#8B5CF6",
  showInSchedule: true,
  openTime: "09:00",
  closeTime: "21:00",
  isActive: true,
};

export function HallsClient() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Hall | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const { data: halls = [] } = useQuery<Hall[]>({
    queryKey: ["halls-settings"],
    queryFn: () => fetch("/api/settings/halls").then(r => r.json()),
  });

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const list = [...halls];
    const [moved] = list.splice(draggedIndex, 1);
    list.splice(targetIndex, 0, moved);

    setDraggedIndex(null);
    qc.setQueryData(["halls-settings"], list);

    try {
      const res = await fetch("/api/settings/halls/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: list.map(h => h.id) }),
      });

      if (res.ok) {
        toast({ title: "Порядок залов сохранён" });
        qc.invalidateQueries({ queryKey: ["halls"] });
      } else {
        toast({ title: "Ошибка сохранения порядка", variant: "destructive" });
        qc.invalidateQueries({ queryKey: ["halls-settings"] });
      }
    } catch {
      toast({ title: "Ошибка отправки данных", variant: "destructive" });
      qc.invalidateQueries({ queryKey: ["halls-settings"] });
    }
  }

  function openCreate() { setEditing(null); setForm({ ...EMPTY }); setOpen(true); }
  function openEdit(h: Hall) {
    setEditing(h);
    setForm({
      name: h.name,
      description: h.description ?? "",
      colorHex: h.colorHex,
      showInSchedule: h.showInSchedule ?? true,
      openTime: h.openTime ?? "09:00",
      closeTime: h.closeTime ?? "21:00",
      isActive: h.isActive,
    });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const url    = editing ? `/api/settings/halls/${editing.id}` : "/api/settings/halls";
    const method = editing ? "PATCH" : "POST";
    const payload = {
      ...form,
      description: form.description || null,
    };
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (!res.ok) { toast({ title: "Ошибка", variant: "destructive" }); return; }
    toast({ title: editing ? "Зал обновлён" : "Зал добавлен" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["halls-settings"] });
    qc.invalidateQueries({ queryKey: ["halls"] });
  }

  async function archive(hall: Hall) {
    await fetch(`/api/settings/halls/${hall.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: false }) });
    toast({ title: "Зал деактивирован" });
    qc.invalidateQueries({ queryKey: ["halls-settings"] });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-background shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Залы</h1>
          <p className="text-sm text-muted-foreground">
            {halls.filter(h => h.isActive).length} активных залов · Перетягивайте для смены порядка
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> Добавить зал</Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {halls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <LayoutDashboard className="h-10 w-10 mb-2 opacity-30" />
            <p>Залов пока нет</p>
          </div>
        ) : (
          <div className="space-y-2">
            {halls.map((hall, index) => (
              <div
                key={hall.id}
                draggable={true}
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                className={cn(
                  "border rounded-xl p-4 flex items-center gap-4 bg-card shadow-sm transition-colors select-none cursor-grab active:cursor-grabbing",
                  !hall.isActive && "opacity-50",
                  draggedIndex === index && "opacity-30 border-dashed border-2 border-primary"
                )}
              >
                <div className="text-muted-foreground hover:text-foreground shrink-0">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="h-10 w-10 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: hall.colorHex }}>
                  {hall.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{hall.name}</p>
                    {hall.showInSchedule ? (
                      <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">
                        В расписании
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Скрыт в расписании
                      </Badge>
                    )}
                  </div>
                  {hall.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{hall.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>Часы приема: <strong>{hall.openTime || "09:00"} – {hall.closeTime || "21:00"}</strong></span>
                    <span>· {hall._count.classEvents} записей</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(hall)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {hall.isActive && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => archive(hall)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={v => !v && setOpen(false)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Редактировать зал" : "Новый зал"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input className="mt-1" placeholder="Большой зал" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div>
              <Label>Описание зала (выводится при онлайн-бронировании)</Label>
              <Textarea
                className="mt-1 text-sm min-h-[90px]"
                placeholder="Подробное описание зала, интерьера, оборудования... Ссылки (https://...) кликабельны"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Ссылки, начинающиеся с http:// или https://, преобразуются в кликабельные кнопки</p>
            </div>

            <div>
              <Label>Цвет маркера</Label>
              <div className="mt-1 flex items-center gap-2">
                <input type="color" value={form.colorHex} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))}
                  className="h-9 w-14 cursor-pointer rounded border p-0.5" />
                <Input value={form.colorHex} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))}
                  className="font-mono text-sm" />
              </div>
            </div>

            <div>
              <Label>Часы приема (время работы)</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <span className="text-[11px] text-muted-foreground">От (начало):</span>
                  <Input
                    type="time"
                    value={form.openTime}
                    onChange={e => setForm(f => ({ ...f, openTime: e.target.value }))}
                    className="mt-0.5 text-sm font-semibold"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">До (конец):</span>
                  <Input
                    type="time"
                    value={form.closeTime}
                    onChange={e => setForm(f => ({ ...f, closeTime: e.target.value }))}
                    className="mt-0.5 text-sm font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
              <Switch checked={form.showInSchedule} onCheckedChange={v => setForm(f => ({ ...f, showInSchedule: v }))} />
              <div>
                <p className="text-sm font-medium">Отображать в расписании</p>
                <p className="text-xs text-muted-foreground">Зал показывается в сетке календаря</p>
              </div>
            </div>

            {editing && (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                <div>
                  <p className="text-sm font-medium">Зал активен</p>
                  <p className="text-xs text-muted-foreground">Неактивные залы скрываются из списков</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button onClick={save} disabled={saving || !form.name}>
              <Check className="h-3.5 w-3.5 mr-1.5" /> Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
