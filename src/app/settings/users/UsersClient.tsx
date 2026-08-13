"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, UserCog, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

interface AppUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: "ADMIN" | "SUPERADMIN" | "PHOTOGRAPHER";
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS = { ADMIN: "Администратор", SUPERADMIN: "Владелец", PHOTOGRAPHER: "Фотограф" };
const EMPTY = { firstName: "", lastName: "", email: "", phone: "", password: "", role: "ADMIN" as "ADMIN" | "SUPERADMIN" | "PHOTOGRAPHER" };

export function UsersClient() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const { data: users = [] } = useQuery<AppUser[]>({
    queryKey: ["users-settings"],
    queryFn: () => fetch("/api/settings/users").then(r => r.json()),
  });

  function openCreate() { setEditing(null); setForm({ ...EMPTY }); setOpen(true); }
  function openEdit(u: AppUser) {
    setEditing(u);
    setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email ?? "", phone: u.phone ?? "", password: "", role: u.role });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const payload = { ...form, ...(form.password ? {} : { password: undefined }) };
    const url    = editing ? `/api/settings/users/${editing.id}` : "/api/settings/users";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (!res.ok) { toast({ title: "Ошибка", variant: "destructive" }); return; }
    toast({ title: editing ? "Пользователь обновлён" : "Пользователь создан" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["users-settings"] });
  }

  async function toggleActive(user: AppUser) {
    await fetch(`/api/settings/users/${user.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    qc.invalidateQueries({ queryKey: ["users-settings"] });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-background shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Пользователи системы</h1>
          <p className="text-sm text-muted-foreground">Администраторы и владельцы</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> Добавить пользователя</Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-2">
        {users.map(user => (
          <div key={user.id} className={cn("border rounded-xl p-4 flex items-center gap-4", !user.isActive && "opacity-60")}>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium">{user.lastName} {user.firstName}</p>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  user.role === "SUPERADMIN" ? "bg-emerald-100 text-emerald-800" : "bg-teal-100 text-teal-700"
                )}>
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {user.email} {user.phone && `· ${user.phone}`} · с {formatDate(user.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch checked={user.isActive} onCheckedChange={() => toggleActive(user)} />
              <Button size="sm" variant="outline" onClick={() => openEdit(user)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Изменить
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={v => !v && setOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Редактировать пользователя" : "Новый пользователь"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Фамилия</Label><Input className="mt-1" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
              <div><Label>Имя</Label><Input className="mt-1" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
            </div>
            <div><Label>Email (логин)</Label><Input className="mt-1" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Телефон</Label><Input className="mt-1" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div>
              <Label>{editing ? "Новый пароль (оставьте пустым чтобы не менять)" : "Пароль"}</Label>
              <Input className="mt-1" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
              <Label>Роль</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as "ADMIN" | "SUPERADMIN" | "PHOTOGRAPHER" }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Администратор</SelectItem>
                  <SelectItem value="PHOTOGRAPHER">Фотограф (расписание, без клиентов)</SelectItem>
                  <SelectItem value="SUPERADMIN">Владелец (полный доступ)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button onClick={save} disabled={saving || !form.firstName || !form.lastName || (!editing && !form.password)}>
              <Check className="h-3.5 w-3.5 mr-1.5" /> Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
