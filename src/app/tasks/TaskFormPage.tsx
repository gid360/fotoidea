"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { TaskDto, TaskCategoryDto, CommentItem, TreeCommentNode } from "./types";
import {
  ArrowLeft, Check, Trash2, Calendar as CalendarIcon, Clock,
  Paperclip, Plus, Send, X, User, Users, CheckSquare, MessageSquare,
  Upload, AlertCircle, FileText,
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
              className="text-[11px] text-violet-600 hover:underline font-semibold"
            >
              Ответить
            </button>
            <button
              type="button"
              onClick={() => onDelete(node.id)}
              className="text-slate-400 hover:text-red-600 p-1"
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

  // Comments
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<TreeCommentNode | null>(null);
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    // Load categories, users, clients
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
        setClients(list);
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
      const payload = {
        title: title.trim(),
        description,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        category,
        status,
        assignedToIds,
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
    if (!clientSearch.trim()) return clients.slice(0, 10);
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [clients, clientSearch]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clients, clientId]
  );

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
              className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Удалить
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="h-8 px-4 text-xs bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-xs"
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
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Статус
              </Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-violet-500 cursor-pointer shadow-2xs h-9"
              >
                <option value="PENDING">К выполнению (В работе)</option>
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

        {/* Assignees */}
        <div className="space-y-2 border-t pt-4">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-violet-600" />
            Исполнители
          </Label>
          <div className="flex flex-wrap gap-2 pt-1">
            {users.map((u) => {
              const isSelected = assignedToIds.includes(u.id);
              return (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => {
                    setAssignedToIds((prev) =>
                      prev.includes(u.id)
                        ? prev.filter((id) => id !== u.id)
                        : [...prev, u.id]
                    );
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer",
                    isSelected
                      ? "bg-violet-600 text-white border-violet-600 shadow-2xs"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  )}
                >
                  <User className="h-3.5 w-3.5 opacity-70" />
                  {u.name}
                  {isSelected && <Check className="h-3.5 w-3.5 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Client attachment */}
        <div className="space-y-2 border-t pt-4">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-indigo-600" />
            Привязать клиента
          </Label>
          {selectedClient ? (
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/30 max-w-sm">
              <div>
                <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  {selectedClient.name}
                </p>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">
                  {selectedClient.phone}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-indigo-700 hover:text-indigo-900"
                onClick={() => setClientId(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-w-md">
              <Input
                placeholder="Поиск клиента по имени или номеру…"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="text-xs h-8"
              />
              {clientSearch && (
                <div className="border rounded-lg max-h-36 overflow-y-auto divide-y bg-white dark:bg-slate-900 shadow-sm">
                  {filteredClients.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setClientId(c.id);
                        setClientSearch("");
                      }}
                      className="p-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                    >
                      <span className="font-semibold">{c.name}</span>
                      <span className="text-slate-400 font-mono">{c.phone}</span>
                    </div>
                  ))}
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
                  className="font-medium text-violet-600 hover:underline truncate max-w-[200px]"
                >
                  {att.name}
                </a>
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="text-slate-400 hover:text-red-600 p-0.5"
                  title="Удалить файл"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Discussion / Comments (when editing) */}
        {isEditing && (
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-violet-600" />
              Обсуждение задачи ({comments.length})
            </h3>

            {/* Replying banner */}
            {replyingTo && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-200 text-xs">
                <span className="text-violet-800 dark:text-violet-200 font-medium">
                  Ответ на комментарий <strong>{replyingTo.authorName}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="text-violet-500 hover:text-violet-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Add comment box */}
            <div className="flex gap-2">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Напишите комментарий..."
                className="text-xs min-h-[60px]"
              />
              <Button
                onClick={handleSendComment}
                disabled={sendingComment || !commentText.trim()}
                className="self-end h-9 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs shrink-0"
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                Отправить
              </Button>
            </div>

            {/* Comment list */}
            <div className="space-y-3 pt-2">
              {commentTree.map((node) => (
                <CommentNodeView
                  key={node.id}
                  node={node}
                  onReply={setReplyingTo}
                  onDelete={handleDeleteComment}
                />
              ))}
              {comments.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">
                  Комментариев пока нет. Напишите первый комментарий!
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
