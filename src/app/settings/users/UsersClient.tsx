"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, UserCog, Check, Shield, Archive, ArchiveRestore,
  Search, X, UserX, UserCheck, AlertCircle, RefreshCw,
} from "lucide-react";
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

const ROLE_LABELS = {
  ADMIN: "Администратор",
  SUPERADMIN: "Владелец",
  PHOTOGRAPHER: "Фотограф",
};

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  role: "ADMIN" as "ADMIN" | "SUPERADMIN" | "PHOTOGRAPHER",
  isActive: true,
};

type TabFilter = "active" | "archived" | "all";

export function UsersClient() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabFilter>("active");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const { data: users = [], isLoading, refetch } = useQuery<AppUser[]>({
    queryKey: ["users-settings"],
    queryFn: () => fetch("/api/settings/users").then((r) => r.json()),
  });

  const activeCount = useMemo(() => users.filter((u) => u.isActive).length, [users]);
  const archivedCount = useMemo(() => users.filter((u) => !u.isActive).length, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Tab filter
      if (tab === "active" && !u.isActive) return false;
      if (tab === "archived" && u.isActive) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
        const email = (u.email || "").toLowerCase();
        const phone = (u.phone || "").toLowerCase();
        const roleName = (ROLE_LABELS[u.role] || "").toLowerCase();
        if (
          !fullName.includes(q) &&
          !email.includes(q) &&
          !phone.includes(q) &&
          !roleName.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [users, tab, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, isActive: true });
    setOpen(true);
  }

  function openEdit(u: AppUser) {
    setEditing(u);
    setForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email ?? "",
      phone: u.phone ?? "",
      password: "",
      role: u.role,
      isActive: u.isActive,
    });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const payload = {
      ...form,
      ...(form.password ? {} : { password: undefined }),
    };
    const url = editing ? `/api/settings/users/${editing.id}` : "/api/settings/users";
    const method = editing ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Ошибка при сохранении");
      toast({ title: editing ? "Пользователь обновлён" : "Пользователь создан" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["users-settings"] });
    } catch {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(user: AppUser) {
    setActionUserId(user.id);
    try {
      const res = await fetch(`/api/settings/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (res.ok) {
        toast({ title: `Пользователь ${user.firstName} отправлен в архив` });
        qc.invalidateQueries({ queryKey: ["users-settings"] });
      } else {
        toast({ title: "Ошибка архивации", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка архивации", variant: "destructive" });
    } finally {
      setActionUserId(null);
    }
  }

  async function handleRestore(user: AppUser) {
    setActionUserId(user.id);
    try {
      const res = await fetch(`/api/settings/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (res.ok) {
        toast({ title: `Пользователь ${user.firstName} восстановлен из архива` });
        qc.invalidateQueries({ queryKey: ["users-settings"] });
      } else {
        toast({ title: "Ошибка восстановления", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка восстановления", variant: "destructive" });
    } finally {
      setActionUserId(null);
    }
  }

  return (
    <div className="flex flex-col h-full bg-background space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Пользователи системы</h1>
          <p className="text-xs text-muted-foreground">
            Управление администраторами, владельцами и фотографами студии
          </p>
        </div>
        <Button onClick={openCreate} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-1.5" /> Добавить пользователя
        </Button>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs */}
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
              {users.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Поиск по имени, email, роли…"
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

      {/* Users List */}
      <div className="flex-1 overflow-auto space-y-2.5 min-h-[300px]">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border rounded-2xl border-dashed bg-slate-50/50">
            {tab === "archived" ? (
              <>
                <Archive className="h-10 w-10 text-amber-400 mb-2 opacity-80" />
                <h3 className="font-bold text-sm text-slate-800">В архиве нет пользователей</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  При необходимости вы можете отправлять неактивных сотрудников в архив кнопкой «В архив».
                </p>
              </>
            ) : tab === "active" ? (
              <>
                <UserCheck className="h-10 w-10 text-emerald-400 mb-2 opacity-80" />
                <h3 className="font-bold text-sm text-slate-800">Активные пользователи не найдены</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {search ? "Попробуйте изменить поисковый запрос" : "Добавьте первого пользователя по кнопке выше"}
                </p>
              </>
            ) : (
              <>
                <UserX className="h-10 w-10 text-slate-400 mb-2 opacity-80" />
                <h3 className="font-bold text-sm text-slate-800">Пользователи не найдены</h3>
                <p className="text-xs text-muted-foreground mt-1">Попробуйте изменить параметры поиска</p>
              </>
            )}
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isActing = actionUserId === user.id;
            return (
              <div
                key={user.id}
                className={cn(
                  "border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all",
                  user.isActive
                    ? "bg-white hover:border-slate-300 shadow-2xs"
                    : "bg-slate-50/80 border-slate-200/80 opacity-75"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                      user.isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {user.firstName?.[0] || ""}
                    {user.lastName?.[0] || ""}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-slate-900 truncate">
                        {user.lastName} {user.firstName}
                      </p>
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                          user.role === "SUPERADMIN"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : user.role === "PHOTOGRAPHER"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-teal-100 text-teal-800 border border-teal-200"
                        )}
                      >
                        {ROLE_LABELS[user.role]}
                      </span>

                      {!user.isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Archive className="h-2.5 w-2.5" /> В архиве
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {user.email || "Без email"} {user.phone && `· ${user.phone}`} · создан {formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(user)}
                    className="h-8 text-xs font-medium cursor-pointer"
                  >
                    <Pencil className="h-3 w-3 mr-1.5" /> Изменить
                  </Button>

                  {user.isActive ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isActing}
                      onClick={() => handleArchive(user)}
                      className="h-8 text-xs font-medium border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 cursor-pointer"
                      title="Отправить пользователя в архив"
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
                      onClick={() => handleRestore(user)}
                      className="h-8 text-xs font-medium border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer"
                      title="Восстановить пользователя из архива"
                    >
                      {isActing ? (
                        <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
                      ) : (
                        <ArchiveRestore className="h-3 w-3 mr-1.5 text-emerald-600" />
                      )}
                      Восстановить
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Редактировать пользователя" : "Новый пользователь"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Фамилия</Label>
                <Input
                  className="mt-1"
                  placeholder="Иванов"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Имя</Label>
                <Input
                  className="mt-1"
                  placeholder="Иван"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Email (логин)</Label>
              <Input
                className="mt-1"
                type="email"
                placeholder="user@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div>
              <Label>Телефон</Label>
              <Input
                className="mt-1"
                placeholder="+7 777 123 4567"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>

            <div>
              <Label>
                {editing
                  ? "Новый пароль (оставьте пустым чтобы не менять)"
                  : "Пароль"}
              </Label>
              <Input
                className="mt-1"
                type="password"
                placeholder={editing ? "••••••••" : "Минимум 6 символов"}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>

            <div>
              <Label>Роль</Label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    role: v as "ADMIN" | "SUPERADMIN" | "PHOTOGRAPHER",
                  }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Администратор</SelectItem>
                  <SelectItem value="PHOTOGRAPHER">
                    Фотограф (съёмки и расписание)
                  </SelectItem>
                  <SelectItem value="SUPERADMIN">
                    Владелец (полный доступ)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Archive switch in edit mode */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/70">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Статус аккаунта</Label>
                <p className="text-[11px] text-muted-foreground">
                  {form.isActive ? "Активен — может входить в систему" : "В архиве — доступ заблокирован"}
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(val) => setForm((f) => ({ ...f, isActive: val }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={save}
              disabled={
                saving ||
                !form.firstName ||
                !form.lastName ||
                (!editing && !form.password)
              }
            >
              {saving ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1.5" />
              )}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
