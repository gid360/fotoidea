"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { TaskDto, TaskCategoryDto, CommentItem, TreeCommentNode } from "./types";
import {
  ArrowLeft, Check, Trash2, Calendar as CalendarIcon, Clock,
  Paperclip, Plus, Send, X, User, Users, CheckSquare, MessageSquare,
  Upload, AlertCircle, FileText, Search, ChevronDown, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AssignableUser {
  id: string;
  name: string;
  role?: string;
  avatarUrl?: string | null;
}

interface ClientOption {
  id: string;
  name: string;
  phone: string;
}

const ALLOWED_HOURS = [
  "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23",
];
const ALLOWED_MINUTES = ["00", "15", "30", "45"];

function clampHourToWorkHours(h: number): number {
  if (h < 7) return 7;
  if (h > 23) return 23;
  return h;
}

function roundTo15Minutes(m: number): number {
  const rounded = Math.round(m / 15) * 15;
  if (rounded === 60) return 45;
  return rounded;
}

function getRounded15MinDateTimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = clampHourToWorkHours(d.getHours());
  const m = roundTo15Minutes(d.getMinutes());
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}`;
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return getRounded15MinDateTimeLocal();
  const d = new Date(iso);
  if (isNaN(d.getTime())) return getRounded15MinDateTimeLocal();
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = clampHourToWorkHours(d.getHours());
  const m = roundTo15Minutes(d.getMinutes());
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}`;
}

function TaskDateTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const parts = (value || "").split("T");
  const dateVal = parts[0] || new Date().toISOString().split("T")[0];
  const timePart = parts[1] || "09:00";
  const [hVal, mVal] = timePart.split(":");

  const hourVal = ALLOWED_HOURS.includes(hVal) ? hVal : "09";
  const minVal = ALLOWED_MINUTES.includes(mVal) ? mVal : "00";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={dateVal}
        onChange={(e) => onChange(`${e.target.value || dateVal}T${hourVal}:${minVal}`)}
        className="flex-1 min-w-[130px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-violet-500 cursor-pointer shadow-2xs"
      />
      <div className="flex items-center gap-1">
        <select
          value={hourVal}
          onChange={(e) => onChange(`${dateVal}T${e.target.value}:${minVal}`)}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-bold text-violet-800 dark:text-violet-300 outline-none focus:border-violet-500 cursor-pointer shadow-2xs"
        >
          {ALLOWED_HOURS.map((h) => (
            <option key={h} value={h}>
              {h}:00
            </option>
          ))}
        </select>
        <span className="font-bold text-slate-400 text-xs">:</span>
        <select
          value={minVal}
          onChange={(e) => onChange(`${dateVal}T${hourVal}:${e.target.value}`)}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-bold text-violet-800 dark:text-violet-300 outline-none focus:border-violet-500 cursor-pointer shadow-2xs"
        >
          {ALLOWED_MINUTES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function CommentNodeView({
  node,
  onReply,
  onDelete,
}: {
  node: TreeCommentNode;
  onReply: (node: TreeCommentNode) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-3 text-xs space-y-1.5 group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {node.authorName}
            </span>
            <span className="text-[10px] text-slate-400">
              {new Date(node.createdAt).toLocaleString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onReply(node)}
              className="text-[11px] text-violet-600 hover:underline font-semibold cursor-pointer"
            >
              Ответить
            </button>
            <button
              type="button"
              onClick={() => onDelete(node.id)}
              className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
              title="Удалить"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
          {node.text}
        </p>
      </div>

      {node.children && node.children.length > 0 && (
        <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-800 space-y-2">
          {node.children.map((child) => (
            <CommentNodeView
              key={child.id}
              node={child}
              onReply={onReply}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskFormPage({ taskId }: { taskId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isEditing = Boolean(taskId);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState<string>(getRounded15MinDateTimeLocal());
  const [category, setCategory] = useState("general");
  const [status, setStatus] = useState<"PENDING" | "DONE" | "OVERDUE" | "ARCHIVED">("PENDING");
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);

  const [categories, setCategories] = useState<TaskCategoryDto[]>([]);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [searchingClients, setSearchingClients] = useState(false);

  // Assignee dropdown & search
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  // Comments
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<TreeCommentNode | null>(null);
  const [sendingComment, setSendingComment] = useState(false);

  // Click outside to close assignee dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        assigneeDropdownRef.current &&
        !assigneeDropdownRef.current.contains(event.target as Node)
      ) {
        setAssigneeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Pre-fill assignee with creator by default when creating new task
  useEffect(() => {
    if (!isEditing && session?.user?.id && assignedToIds.length === 0) {
      setAssignedToIds([session.user.id]);
    }
  }, [isEditing, session?.user?.id, assignedToIds.length]);

  // Pre-fill clientId from URL query parameter
  useEffect(() => {
    const cid = searchParams.get("clientId");
    if (cid && !clientId) {
      setClientId(cid);
      fetch(`/api/clients/${cid}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.client) {
            const opt: ClientOption = {
              id: d.client.id,
              name: `${d.client.firstName} ${d.client.lastName}`.trim(),
              phone: d.client.phone,
            };
            setClients((prev) => [opt, ...prev.filter((p) => p.id !== opt.id)]);
          }
        })
        .catch(console.error);
    }
  }, [searchParams, clientId]);

  // Dynamic server-side client search
  useEffect(() => {
    if (!clientSearch.trim()) return;
    const timer = setTimeout(() => {
      setSearchingClients(true);
      fetch(`/api/clients?q=${encodeURIComponent(clientSearch.trim())}&limit=30`)
        .then((r) => r.json())
        .then((d) => {
          const list = (d.clients || []).map((c: any) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`.trim(),
            phone: c.phone,
          }));
          setClients((prev) => {
            const map = new Map<string, ClientOption>();
            list.forEach((item: ClientOption) => map.set(item.id, item));
            prev.forEach((item: ClientOption) => {
              if (!map.has(item.id)) map.set(item.id, item);
            });
            return Array.from(map.values());
          });
        })
        .catch(console.error)
        .finally(() => setSearchingClients(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [clientSearch]);

  useEffect(() => {
    // Load categories, users, initial clients
    fetch("/api/tasks/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(console.error);

    fetch("/api/users/assignable")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(console.error);

    fetch("/api/clients?limit=50")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.clients || []).map((c: any) => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`.trim(),
          phone: c.phone,
        }));
        setClients((prev) => {
          const map = new Map<string, ClientOption>();
          list.forEach((item: ClientOption) => map.set(item.id, item));
          prev.forEach((item: ClientOption) => {
            if (!map.has(item.id)) map.set(item.id, item);
          });
          return Array.from(map.values());
        });
      })
      .catch(console.error);

    if (taskId) {
      fetch(`/api/tasks/${taskId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.task) {
            setTitle(d.task.title);
            setDescription(d.task.description || "");
            setDueAt(toLocalInputValue(d.task.dueAt));
            setCategory(d.task.category || "general");
            setStatus(d.task.status || "PENDING");
            setAssignedToIds(d.task.assignedToIds || []);
            setClientId(d.task.clientId || null);
            setAttachments(d.task.attachments || []);
            if (d.task.client) {
              const opt: ClientOption = {
                id: d.task.client.id,
                name: d.task.client.name,
                phone: d.task.client.phone,
              };
              setClients((prev) => [opt, ...prev.filter((p) => p.id !== opt.id)]);
            }
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));

      loadComments(taskId);
    }
  }, [taskId]);

  async function loadComments(id: string) {
    try {
      const res = await fetch(`/api/tasks/${id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const commentTree = useMemo(() => {
    const nodes: Record<string, TreeCommentNode> = {};
    const rootNodes: TreeCommentNode[] = [];

    comments.forEach((c) => {
      nodes[c.id] = { ...c, children: [] };
    });

    comments.forEach((c) => {
      if (c.parentId && nodes[c.parentId]) {
        nodes[c.parentId].children.push(nodes[c.id]);
      } else {
        rootNodes.push(nodes[c.id]);
      }
    });

    return rootNodes;
  }, [comments]);

  async function handleSave() {
    if (!title.trim()) {
      alert("Укажите название задачи");
      return;
    }

    setSaving(true);
    try {
      // Auto-compute overdue status
      let finalStatus = status;
      if (status === "PENDING" && dueAt && new Date(dueAt) < new Date()) {
        finalStatus = "OVERDUE";
      }

      const payload = {
        title: title.trim(),
        description,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        category,
        status: finalStatus,
        assignedToIds: assignedToIds.length > 0 ? assignedToIds : (session?.user?.id ? [session.user.id] : []),
        clientId,
        attachments,
      };

      const url = isEditing ? `/api/tasks/${taskId}` : "/api/tasks";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save task");
      router.push("/tasks");
    } catch (e) {
      console.error(e);
      alert("Ошибка при сохранении задачи");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Вы уверены, что хотите удалить эту задачу?")) return;
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      router.push("/tasks");
    } catch (e) {
      console.error(e);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/tasks/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          setAttachments((prev) => [...prev, { name: data.name, url: data.url }]);
        }
      } catch (err) {
        console.error("Upload error:", err);
      }
    }
  }

  async function handleSendComment() {
    if (!commentText.trim() || !taskId) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: commentText.trim(),
          parentId: replyingTo?.id || null,
        }),
      });
      if (res.ok) {
        setCommentText("");
        setReplyingTo(null);
        loadComments(taskId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("Удалить комментарий?")) return;
    try {
      await fetch(`/api/tasks/${taskId}/comments?commentId=${commentId}`, {
        method: "DELETE",
      });
      loadComments(taskId!);
    } catch (e) {
      console.error(e);
    }
  }

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 15);
    const q = clientSearch.toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (qDigits.length >= 2 && c.phone.replace(/\D/g, "").includes(qDigits))
    );
  }, [clients, clientSearch]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clients, clientId]
  );

  const filteredUsers = useMemo(() => {
    if (!assigneeSearch.trim()) return users;
    const q = assigneeSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.role && u.role.toLowerCase().includes(q))
    );
  }, [users, assigneeSearch]);

  const selectedUsers = useMemo(
    () => users.filter((u) => assignedToIds.includes(u.id)),
    [users, assignedToIds]
  );

  const isCurrentDueOverdue = useMemo(() => {
    if (!dueAt || status === "DONE" || status === "ARCHIVED") return false;
    return new Date(dueAt) < new Date();
  }, [dueAt, status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-muted-foreground">
        Загрузка задачи…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Top action header */}
      <div className="p-3 sm:p-4 border-b bg-background sticky top-0 z-20 flex items-center justify-between gap-2 backdrop-blur-sm bg-white/90 dark:bg-slate-900/90">
        <div className="flex items-center gap-2">
          <Link
            href="/tasks"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            {isEditing ? "Редактирование задачи" : "Новая задача"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Удалить
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="h-8 px-4 text-xs bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-xs cursor-pointer"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </div>

      {/* Main form container */}
      <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Title & Status */}
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Название задачи *
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Что нужно сделать?"
              className="mt-1 text-sm font-semibold h-10"
              autoFocus={!isEditing}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Категория
              </Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-violet-500 cursor-pointer shadow-2xs h-9"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Статус</span>
                {isCurrentDueOverdue && (
                  <span className="text-[10px] font-bold text-red-600 animate-pulse">
                    Просрочено по дедлайну
                  </span>
                )}
              </Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className={cn(
                  "mt-1 w-full rounded-lg border px-3 py-2 text-xs font-semibold outline-none focus:border-violet-500 cursor-pointer shadow-2xs h-9",
                  status === "OVERDUE" || isCurrentDueOverdue
                    ? "border-red-300 bg-red-50/50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                )}
              >
                <option value="PENDING">
                  {isCurrentDueOverdue ? "К выполнению (Просрочено по времени)" : "К выполнению (В работе)"}
                </option>
                <option value="DONE">Выполнено</option>
                <option value="OVERDUE">Просрочено</option>
                <option value="ARCHIVED">В архиве</option>
              </select>
            </div>

            {/* Due Date & Time */}
            <div className="sm:col-span-2 md:col-span-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Дедлайн (дата и время)
              </Label>
              <div className="mt-1">
                <TaskDateTimePicker value={dueAt} onChange={setDueAt} />
              </div>
            </div>
          </div>
        </div>

        {/* Searchable Assignee Selector */}
        <div className="space-y-2 border-t pt-4" ref={assigneeDropdownRef}>
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-violet-600" />
            Исполнители
          </Label>

          <div className="space-y-2 max-w-xl">
            {/* Selected Assignees Chips */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {selectedUsers.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 dark:bg-violet-950/70 dark:text-violet-300 border border-violet-200 dark:border-violet-800 shadow-2xs"
                >
                  <User className="h-3 w-3 opacity-70" />
                  {u.name}
                  <button
                    type="button"
                    onClick={() => setAssignedToIds((prev) => prev.filter((id) => id !== u.id))}
                    className="hover:text-red-600 p-0.5 rounded-full cursor-pointer ml-0.5"
                    title="Удалить"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)}
                className="h-7 text-xs border-dashed border-slate-300 hover:border-violet-500 hover:bg-violet-50/50 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                {selectedUsers.length === 0 ? "Назначить исполнителя" : "Добавить"}
                <ChevronDown className="h-3 w-3 ml-0.5 opacity-50" />
              </Button>
            </div>

            {/* Assignee Search Dropdown Popover */}
            {assigneeDropdownOpen && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-lg p-2.5 space-y-2 z-30 relative animate-in fade-in-50 zoom-in-95">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Поиск сотрудника по имени..."
                    value={assigneeSearch}
                    onChange={(e) => setAssigneeSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                    autoFocus
                  />
                  {assigneeSearch && (
                    <button
                      type="button"
                      onClick={() => setAssigneeSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <p className="p-3 text-center text-xs text-slate-400">Сотрудник не найден</p>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelected = assignedToIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            setAssignedToIds((prev) =>
                              prev.includes(u.id)
                                ? prev.filter((id) => id !== u.id)
                                : [...prev, u.id]
                            );
                          }}
                          className={cn(
                            "p-2 text-xs rounded-lg flex items-center justify-between cursor-pointer transition-colors",
                            isSelected
                              ? "bg-violet-50 text-violet-900 font-semibold dark:bg-violet-950/40 dark:text-violet-200"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-600">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium leading-tight">{u.name}</p>
                              {u.role && (
                                <p className="text-[10px] text-slate-400 capitalize">{u.role}</p>
                              )}
                            </div>
                          </div>
                          <div
                            className={cn(
                              "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                              isSelected
                                ? "bg-violet-600 border-violet-600 text-white"
                                : "border-slate-300 dark:border-slate-600"
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Client attachment */}
        <div className="space-y-2 border-t pt-4">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-indigo-600" />
            Привязать клиента
          </Label>
          {selectedClient ? (
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/30 max-w-md">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center font-bold text-xs">
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    {selectedClient.name}
                  </p>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">
                    {selectedClient.phone}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-indigo-700 hover:text-indigo-900 cursor-pointer"
                onClick={() => {
                  setClientId(null);
                  setClientSearch("");
                }}
                title="Отвязать клиента"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-w-md">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Поиск по имени (например, Рома) или номеру (4 цифры)…"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="text-xs h-9 pl-8 pr-8"
                />
                {clientSearch && (
                  <button
                    type="button"
                    onClick={() => setClientSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {searchingClients && (
                <p className="text-[11px] text-slate-400 px-1">Поиск в базе клиентов…</p>
              )}

              {clientSearch && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 shadow-md">
                  {filteredClients.length === 0 ? (
                    <p className="p-3 text-center text-xs text-slate-400">Клиент не найден</p>
                  ) : (
                    filteredClients.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setClientId(c.id);
                          setClientSearch("");
                        }}
                        className="p-2.5 text-xs hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] text-indigo-700">
                            {c.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {c.name}
                          </span>
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {c.phone}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2 border-t pt-4">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            Описание задачи
          </Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Подробное описание задачи, инструкции, ссылки..."
            className="min-h-[140px] text-xs font-normal"
          />
        </div>

        {/* Attachments */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-slate-500" />
              Вложения ({attachments.length})
            </Label>
            <label className="cursor-pointer inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors">
              <Upload className="h-3 w-3" />
              Загрузить файл
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-50 dark:bg-slate-900 text-xs group"
              >
                <a
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-violet-600 hover:underline max-w-[200px] truncate"
                >
                  {att.name}
                </a>
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="text-slate-400 hover:text-red-600 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Comments Section (Only for existing tasks) */}
        {isEditing && taskId && (
          <div className="space-y-4 border-t pt-6">
            <Label className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-violet-600" />
              Комментарии ({comments.length})
            </Label>

            {/* Comments tree */}
            <div className="space-y-3">
              {commentTree.map((node) => (
                <CommentNodeView
                  key={node.id}
                  node={node}
                  onReply={(target) => setReplyingTo(target)}
                  onDelete={handleDeleteComment}
                />
              ))}
            </div>

            {/* Comment input form */}
            <div className="space-y-2 pt-2">
              {replyingTo && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-xs text-violet-800 dark:text-violet-300">
                  <span>
                    Ответ на комментарий <b>{replyingTo.authorName}</b>: «
                    {replyingTo.text.slice(0, 40)}…»
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="text-violet-600 hover:text-violet-900 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Написать комментарий..."
                  className="text-xs min-h-[60px]"
                />
                <Button
                  onClick={handleSendComment}
                  disabled={sendingComment || !commentText.trim()}
                  className="h-auto px-4 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
