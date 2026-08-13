"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, UserCog, Check, Trash2, Percent, Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  user: { id: string; firstName: string; lastName: string; phone: string | null; email: string | null; isActive: boolean; avatarUrl: string | null };
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

export function TrainersClient() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Trainer | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: trainers = [] } = useQuery<Trainer[]>({
    queryKey: ["trainers-settings"],
    queryFn: () => fetch("/api/settings/trainers").then(r => r.json()),
  });

  function openCreate() { setEditing(null); setForm({ ...EMPTY_FORM }); setOpen(true); }
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
        setForm(f => ({ ...f, avatarUrl: data.url }));
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
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      setSaving(false);
      if (!res.ok) { toast({ title: "Ошибка", variant: "destructive" }); return; }
      toast({ title: "Фотограф обновлён" });
    } else {
      if (!form.password) { setSaving(false); toast({ title: "Введите пароль", variant: "destructive" }); return; }
      const res = await fetch("/api/settings/trainers", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      setSaving(false);
      if (!res.ok) { toast({ title: "Ошибка", variant: "destructive" }); return; }
      toast({ title: "Фотограф добавлен" });
    }
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["trainers-settings"] });
  }

  async function toggleActive(trainer: Trainer) {
    await fetch(`/api/settings/trainers/${trainer.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !trainer.user.isActive }),
    });
    qc.invalidateQueries({ queryKey: ["trainers-settings"] });
  }

  async function deleteTrainer(trainer: Trainer) {
    if (!confirm(`Удалить фотографа ${trainer.user.firstName} ${trainer.user.lastName}?`)) return;
    const res = await fetch(`/api/settings/trainers/${trainer.id}`, { method: "DELETE" });
    if (!res.ok) { toast({ title: "Ошибка удаления", variant: "destructive" }); return; }
    toast({ title: "Фотограф удалён" });
    qc.invalidateQueries({ queryKey: ["trainers-settings"] });
  }

  return (
    <div className="flex flex-col h-full">
      <PageTabs tabs={TRAINER_TABS} />
      <div className="p-4 border-b bg-background shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Фотографы</h1>
          <p className="text-sm text-muted-foreground">{trainers.filter(t => t.user.isActive).length} активных фотографов</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> Добавить фотографа</Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {trainers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <UserCog className="h-10 w-10 mb-2 opacity-30" />
            <p>Фотографов пока нет</p>
          </div>
        ) : trainers.map(trainer => (
          <div key={trainer.id} className={cn("border rounded-xl p-4 bg-card shadow-sm", !trainer.user.isActive && "opacity-60")}>
            <div className="flex items-start gap-4">
              {trainer.user.avatarUrl ? (
                <img src={trainer.user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover shrink-0 border" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {trainer.user.firstName[0]}{trainer.user.lastName[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-base">{trainer.user.lastName} {trainer.user.firstName}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {trainer.user.phone && <span>{trainer.user.phone}</span>}
                      <span>{trainer._count.classEvents} съёмок</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={trainer.user.isActive} onCheckedChange={() => toggleActive(trainer)} />
                    <Button size="sm" variant="outline" onClick={() => openEdit(trainer)}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Редактировать
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-red-50" onClick={() => deleteTrainer(trainer)} title="Удалить фотографа">
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
        ))}
      </div>

      <Dialog open={open} onOpenChange={v => !v && setOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Редактировать фотографа" : "Новый фотограф"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Аватарка фотографа */}
            <div>
              <Label>Фотография / Аватарка</Label>
              <div className="mt-1.5 flex items-center gap-3">
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt="Предпросмотр" className="h-16 w-16 object-cover rounded-full border" />
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
                        {uploading ? "Загрузка..." : form.avatarUrl ? "Изменить фото" : "Загрузить фото"}
                      </span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG до 5 МБ</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Фамилия</Label><Input className="mt-1" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
              <div><Label>Имя</Label><Input className="mt-1" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
            </div>
            <div><Label>Телефон</Label><Input className="mt-1" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            {!editing && (
              <div><Label>Пароль для входа</Label><Input className="mt-1" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
            )}

            <div>
              <Label>Процент со съёмки (%)</Label>
              <Input className="mt-1 font-semibold" type="number" min="0" max="100" placeholder="50"
                value={form.percentRate} onChange={e => setForm(f => ({ ...f, percentRate: Number(e.target.value) }))} />
              <p className="text-[11px] text-muted-foreground mt-1">
                Начисляется со стоимости услуги и доплаты за кол-во человек (аренда гардероба исключается из расчёта)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button onClick={save} disabled={saving || !form.firstName || !form.lastName}>
              <Check className="h-3.5 w-3.5 mr-1.5" /> Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
