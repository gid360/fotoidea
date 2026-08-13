"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, Check, RefreshCw, GripVertical,
  Sparkles, Camera, Heart, User, Users, GraduationCap, Building,
  Gift, Crown, Sun, Smile, Star, Image as ImageIcon, Film, Sliders
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

export const CATEGORY_ICONS = [
  { id: "Sparkles", label: "Искры", Icon: Sparkles },
  { id: "Camera", label: "Камера", Icon: Camera },
  { id: "Heart", label: "Сердце", Icon: Heart },
  { id: "User", label: "Индивидуальная", Icon: User },
  { id: "Users", label: "Группа / Семья", Icon: Users },
  { id: "GraduationCap", label: "Школа", Icon: GraduationCap },
  { id: "Building", label: "Аренда зала", Icon: Building },
  { id: "Gift", label: "Подарок", Icon: Gift },
  { id: "Crown", label: "VIP / Премиум", Icon: Crown },
  { id: "Sun", label: "Улица / Свет", Icon: Sun },
  { id: "Smile", label: "Детская", Icon: Smile },
  { id: "Star", label: "Портфолио", Icon: Star },
  { id: "ImageIcon", label: "Фотография", Icon: ImageIcon },
  { id: "Film", label: "Видеосъемка", Icon: Film },
  { id: "Sliders", label: "Настройка", Icon: Sliders },
];

export function CategoryIconRenderer({ iconName, className = "h-4 w-4" }: { iconName?: string | null; className?: string }) {
  const match = CATEGORY_ICONS.find(i => i.id === iconName);
  const IconComp = match ? match.Icon : Sparkles;
  return <IconComp className={className} />;
}

interface Direction {
  id: string;
  name: string;
  description: string | null;
  colorHex: string;
  icon?: string | null;
  isActive: boolean;
  sortOrder?: number;
  _count: { classEvents: number };
}

const EMPTY = { name: "", description: "", colorHex: "#8B5CF6", icon: "Sparkles", isActive: true };

export function DirectionsClient() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Direction | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const { data: dirs = [] } = useQuery<Direction[]>({
    queryKey: ["directions-settings"],
    queryFn: () => fetch("/api/settings/directions").then(r => r.json()),
  });

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const list = [...dirs];
    const [moved] = list.splice(draggedIndex, 1);
    list.splice(targetIndex, 0, moved);

    setDraggedIndex(null);
    qc.setQueryData(["directions-settings"], list);

    try {
      const res = await fetch("/api/directions/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: list.map(d => d.id) }),
      });

      if (res.ok) {
        toast({ title: "Порядок категорий сохранён" });
        qc.invalidateQueries({ queryKey: ["directions"] });
        qc.invalidateQueries({ queryKey: ["plans"] });
      } else {
        toast({ title: "Ошибка сохранения порядка", variant: "destructive" });
        qc.invalidateQueries({ queryKey: ["directions-settings"] });
      }
    } catch {
      toast({ title: "Ошибка отправки данных", variant: "destructive" });
      qc.invalidateQueries({ queryKey: ["directions-settings"] });
    }
  }

  function openCreate() { setEditing(null); setForm({ ...EMPTY }); setOpen(true); }
  function openEdit(d: Direction) {
    setEditing(d);
    setForm({ name: d.name, description: d.description ?? "", colorHex: d.colorHex, icon: d.icon || "Sparkles", isActive: d.isActive });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const url    = editing ? `/api/settings/directions/${editing.id}` : "/api/settings/directions";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (!res.ok) { toast({ title: "Ошибка", variant: "destructive" }); return; }
    toast({ title: editing ? "Категория обновлена" : "Категория добавлена" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["directions-settings"] });
    qc.invalidateQueries({ queryKey: ["directions"] });
  }

  async function archive(dir: Direction) {
    await fetch(`/api/settings/directions/${dir.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    toast({ title: "Категория деактивирована" });
    qc.invalidateQueries({ queryKey: ["directions-settings"] });
    qc.invalidateQueries({ queryKey: ["directions"] });
  }

  async function restore(dir: Direction) {
    await fetch(`/api/settings/directions/${dir.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    toast({ title: "Категория активирована" });
    qc.invalidateQueries({ queryKey: ["directions-settings"] });
    qc.invalidateQueries({ queryKey: ["directions"] });
  }

  async function deletePermanently(dir: Direction) {
    if (!confirm(`Вы действительно хотите окончательно удалить категорию "${dir.name}"?`)) return;
    const res = await fetch(`/api/settings/directions/${dir.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Категория окончательно удалена" });
      qc.invalidateQueries({ queryKey: ["directions-settings"] });
      qc.invalidateQueries({ queryKey: ["directions"] });
    } else {
      toast({ title: "Ошибка при удалении", variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-background shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Категории услуг</h1>
          <p className="text-sm text-muted-foreground">
            {dirs.filter(d => d.isActive).length} активных категорий · Перетягивайте мышкой для изменения порядка
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> Добавить категорию</Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {dirs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Camera className="h-10 w-10 mb-2 opacity-30" />
            <p>Категорий услуг пока нет</p>
            <Button className="mt-3" variant="outline" size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Создать первую
            </Button>
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-3 w-10 text-center"></th>
                  <th className="px-4 py-3 w-16 text-center">Иконка</th>
                  <th className="px-4 py-3">Название</th>
                  <th className="px-4 py-3">Описание</th>
                  <th className="px-4 py-3">Записи</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dirs.map((dir, index) => (
                  <tr
                    key={dir.id}
                    draggable={true}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    className={cn(
                      "hover:bg-muted/40 transition-colors select-none",
                      !dir.isActive && "opacity-60 bg-muted/20",
                      draggedIndex === index && "opacity-30 bg-muted/50 border-dashed border-2 border-primary"
                    )}
                  >
                    <td className="px-3 py-3 text-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                      <GripVertical className="h-4 w-4 mx-auto" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg border shadow-xs" style={{ background: `${dir.colorHex}15`, borderColor: dir.colorHex, color: dir.colorHex }}>
                        <CategoryIconRenderer iconName={dir.icon} className="h-4 w-4" />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {dir.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {dir.description || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {dir._count.classEvents} записей
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {dir.isActive ? (
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Активна
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Деактивирована
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(dir)} title="Редактировать">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {dir.isActive ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => archive(dir)}
                            title="Деактивировать"
                          >
                            Деактивировать
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => restore(dir)}
                              title="Восстановить (активировать)"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-red-50"
                              onClick={() => deletePermanently(dir)}
                              title="Окончательно удалить"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={v => !v && setOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Редактировать категорию" : "Новая категория"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название категории</Label>
              <Input className="mt-1" placeholder="Индивидуальная съёмка, Аренда..." value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div>
              <Label className="block mb-1.5">Иконка категории</Label>
              <div className="grid grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1 border rounded-lg bg-muted/20">
                {CATEGORY_ICONS.map(({ id, label, Icon }) => {
                  const isSelected = form.icon === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, icon: id }))}
                      title={label}
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-xs",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                          : "hover:bg-accent border-transparent text-muted-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Описание (необязательно)</Label>
              <Input className="mt-1" placeholder="Короткое описание"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div>
              <Label>Цвет метки</Label>
              <div className="mt-1 flex items-center gap-2">
                <input type="color" value={form.colorHex} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))}
                  className="h-9 w-14 cursor-pointer rounded border p-0.5" />
                <Input value={form.colorHex} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))}
                  className="font-mono text-sm" />
              </div>
            </div>

            {editing && (
              <div className="flex items-center gap-3">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                <Label>Активно</Label>
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
