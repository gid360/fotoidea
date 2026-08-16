"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { TaskDto, TaskCategoryDto } from "./types";
import {
  Plus, Search, CheckCircle2, Clock, Calendar as CalendarIcon,
  Archive, LayoutGrid, CheckSquare, ArrowUpRight, MessageSquare,
  Paperclip, User, Users, ChevronLeft, ChevronRight, X, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type View = "mine" | "assigned" | "board" | "calendar" | "archive";
type BoardGroup = "category" | "status";

const SCOPE_PARAM: Partial<Record<View, string>> = {
  mine: "scope=mine",
  assigned: "scope=assigned",
  archive: "status=ARCHIVED",
};

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthGridDays(monthAnchor: Date): Date[] {
  const first = startOfMonth(monthAnchor);
  const firstWeekday = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTH_LABELS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function TaskBoardCard({
  task,
  category,
  onOpen,
  onToggleDone,
}: {
  task: TaskDto;
  category?: TaskCategoryDto;
  onOpen: () => void;
  onToggleDone: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const isDone = task.status === "DONE";
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const isOverdue = due && due < new Date() && !isDone;

  const dateStr = due
    ? due.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const assigneeStr =
    task.assignedTo.length > 0
      ? task.assignedTo.map((u) => u.name.split(" ")[0]).join(", ")
      : null;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`cursor-grab rounded-lg border bg-white dark:bg-slate-900 p-2.5 text-xs shadow-2xs hover:border-violet-400 hover:shadow-xs transition-all active:cursor-grabbing flex flex-col gap-1.5 ${
        isOverdue
          ? "border-red-200 bg-red-50/20 dark:border-red-900/50"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
          {category && (
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-white truncate max-w-[110px]"
              style={{ backgroundColor: category.color }}
            >
              {category.name}
            </span>
          )}
          <p
            className={`text-xs font-semibold truncate ${
              isDone ? "text-slate-400 line-through" : "text-slate-900 dark:text-slate-100"
            }`}
          >
            {task.title}
          </p>
        </div>
        <input
          type="checkbox"
          checked={isDone}
          onChange={(e) => {
            e.stopPropagation();
            onToggleDone();
          }}
          className="h-4 w-4 shrink-0 accent-violet-700 cursor-pointer mt-0.5"
        />
      </div>

      {task.client && (
        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 truncate">
          👤 {task.client.name || task.client.phone}
        </p>
      )}

      <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 mt-0.5">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {dateStr && (
            <span
              className={
                isOverdue
                  ? "font-bold text-red-600 shrink-0"
                  : "text-slate-500 shrink-0"
              }
            >
              📅 {dateStr}
            </span>
          )}
          {assigneeStr && <span className="truncate text-slate-400">• {assigneeStr}</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          {(task.commentsCount ?? 0) > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" />
              {task.commentsCount}
            </span>
          )}
          {task.attachments.length > 0 && (
            <span className="flex items-center gap-0.5" title={`Файлов: ${task.attachments.length}`}>
              <Paperclip className="h-3 w-3" />
              {task.attachments.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function BoardColumn({
  id,
  title,
  color,
  tasks,
  categoriesMap,
  onOpenTask,
  onToggleDone,
}: {
  id: string;
  title: string;
  color?: string;
  tasks: TaskDto[];
  categoriesMap: Record<string, TaskCategoryDto>;
  onOpenTask: (id: string) => void;
  onToggleDone: (t: TaskDto) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[260px] max-w-[320px] flex-1 rounded-xl border p-2.5 transition-colors ${
        isOver
          ? "border-violet-500 bg-violet-50/40 dark:bg-violet-950/20"
          : "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40"
      }`}
    >
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2">
          {color && (
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
          )}
          <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">
            {title}
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-[120px] max-h-[calc(100vh-250px)] pr-1">
        {tasks.map((task) => (
          <TaskBoardCard
            key={task.id}
            task={task}
            category={categoriesMap[task.category || "general"]}
            onOpen={() => onOpenTask(task.id)}
            onToggleDone={() => onToggleDone(task)}
          />
        ))}
        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-4 border border-dashed rounded-lg border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 text-center">
            Пусто
          </div>
        )}
      </div>
    </div>
  );
}

export function TasksClient() {
  const router = useRouter();
  const [view, setView] = useState<View>("mine");
  const [boardGroup, setBoardGroup] = useState<BoardGroup>("category");
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [categories, setCategories] = useState<TaskCategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [monthAnchor, setMonthAnchor] = useState(new Date());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  async function loadCategories() {
    try {
      const res = await fetch("/api/tasks/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadTasks() {
    setLoading(true);
    try {
      const queryParam = SCOPE_PARAM[view] ? `?${SCOPE_PARAM[view]}` : "";
      const res = await fetch(`/api/tasks${queryParam}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [view]);

  const categoriesMap = useMemo(() => {
    const map: Record<string, TaskCategoryDto> = {};
    categories.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [categories]);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.client?.name?.toLowerCase().includes(q) ||
          t.client?.phone?.includes(q)
      );
    }
    if (categoryFilter !== "ALL") {
      list = list.filter((t) => (t.category || "general") === categoryFilter);
    }
    return list;
  }, [tasks, search, categoryFilter]);

  async function handleToggleDone(task: TaskDto) {
    const newStatus = task.status === "DONE" ? "PENDING" : "DONE";
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (e) {
      console.error("Error toggling task status:", e);
      loadTasks();
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const taskId = String(active.id);
    const targetColId = String(over.id);

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (boardGroup === "category") {
      if (task.category === targetColId) return;
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, category: targetColId } : t))
      );
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: targetColId }),
        });
      } catch (e) {
        console.error(e);
        loadTasks();
      }
    } else {
      if (task.status === targetColId) return;
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: targetColId as any } : t))
      );
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: targetColId }),
        });
      } catch (e) {
        console.error(e);
        loadTasks();
      }
    }
  }

  // Calendar days grid
  const daysGrid = useMemo(() => monthGridDays(monthAnchor), [monthAnchor]);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Top Header */}
      <div className="p-3 sm:p-4 border-b bg-background shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-violet-600" />
              Задачи
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => router.push("/tasks/new")}
              className="h-8 px-3 text-xs bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1" />
              Новая задача
            </Button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center justify-between gap-2 flex-wrap border-b pb-2">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {(
              [
                { id: "mine", label: "Мои задачи", icon: CheckSquare },
                { id: "assigned", label: "Поручил", icon: Users },
                { id: "board", label: "Канбан", icon: LayoutGrid },
                { id: "calendar", label: "Календарь", icon: CalendarIcon },
                { id: "archive", label: "Архив", icon: Archive },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = view === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                    isActive
                      ? "bg-violet-600 text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {view === "board" && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setBoardGroup("category")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-semibold transition-all",
                  boardGroup === "category"
                    ? "bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-2xs"
                    : "text-slate-500"
                )}
              >
                По категориям
              </button>
              <button
                onClick={() => setBoardGroup("status")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-semibold transition-all",
                  boardGroup === "status"
                    ? "bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-2xs"
                    : "text-slate-500"
                )}
              >
                По статусам
              </button>
            </div>
          )}
        </div>

        {/* Filter / Search bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию или клиенту…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-8 h-8 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground p-0.5"
                title="Очистить"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setCategoryFilter("ALL")}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold transition-all shrink-0 border",
                categoryFilter === "ALL"
                  ? "bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900"
                  : "bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              )}
            >
              Все категории
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-semibold transition-all shrink-0 border flex items-center gap-1.5",
                  categoryFilter === cat.id
                    ? "text-white border-transparent shadow-2xs"
                    : "bg-white dark:bg-slate-900 text-slate-700 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                )}
                style={categoryFilter === cat.id ? { backgroundColor: cat.color } : {}}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-xs text-muted-foreground">
            Загрузка задач…
          </div>
        ) : view === "board" ? (
          /* Kanban Board View with dnd-kit */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-3 overflow-x-auto pb-4 min-h-full items-start">
              {boardGroup === "category" ? (
                categories.map((cat) => {
                  const colTasks = filteredTasks.filter(
                    (t) => (t.category || "general") === cat.id
                  );
                  return (
                    <BoardColumn
                      key={cat.id}
                      id={cat.id}
                      title={cat.name}
                      color={cat.color}
                      tasks={colTasks}
                      categoriesMap={categoriesMap}
                      onOpenTask={(id) => router.push(`/tasks/${id}`)}
                      onToggleDone={handleToggleDone}
                    />
                  );
                })
              ) : (
                [
                  { id: "PENDING", title: "К выполнению", color: "#3b82f6" },
                  { id: "OVERDUE", title: "Просрочено", color: "#ef4444" },
                  { id: "DONE", title: "Выполнено", color: "#10b981" },
                ].map((st) => {
                  const colTasks = filteredTasks.filter((t) => t.status === st.id);
                  return (
                    <BoardColumn
                      key={st.id}
                      id={st.id}
                      title={st.title}
                      color={st.color}
                      tasks={colTasks}
                      categoriesMap={categoriesMap}
                      onOpenTask={(id) => router.push(`/tasks/${id}`)}
                      onToggleDone={handleToggleDone}
                    />
                  );
                })
              )}
            </div>
          </DndContext>
        ) : view === "calendar" ? (
          /* Monthly Calendar View */
          <div className="space-y-3 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() =>
                    setMonthAnchor(
                      new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1)
                    )
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-sm font-bold capitalize">
                  {MONTH_LABELS[monthAnchor.getMonth()]} {monthAnchor.getFullYear()}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() =>
                    setMonthAnchor(
                      new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1)
                    )
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setMonthAnchor(new Date())}
              >
                Сегодня
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-px rounded-xl border bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-2xs">
              {WEEKDAY_LABELS.map((w) => (
                <div
                  key={w}
                  className="bg-slate-50 dark:bg-slate-900 py-1.5 text-center text-[11px] font-bold text-slate-500"
                >
                  {w}
                </div>
              ))}
              {daysGrid.map((day, idx) => {
                const isCurrentMonth = day.getMonth() === monthAnchor.getMonth();
                const isToday = isSameDay(day, new Date());
                const dayTasks = filteredTasks.filter(
                  (t) => t.dueAt && isSameDay(new Date(t.dueAt), day)
                );

                return (
                  <div
                    key={idx}
                    className={cn(
                      "min-h-[100px] p-1.5 flex flex-col gap-1 transition-colors",
                      isCurrentMonth
                        ? "bg-white dark:bg-slate-900"
                        : "bg-slate-50/60 dark:bg-slate-950/40 opacity-50",
                      isToday && "ring-1 ring-violet-500 font-bold"
                    )}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span
                        className={cn(
                          "h-5 w-5 rounded-full flex items-center justify-center font-bold",
                          isToday ? "bg-violet-600 text-white" : "text-slate-700 dark:text-slate-300"
                        )}
                      >
                        {day.getDate()}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {dayTasks.length}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 space-y-1 overflow-y-auto max-h-[80px]">
                      {dayTasks.map((t) => {
                        const isDone = t.status === "DONE";
                        const cat = categoriesMap[t.category || "general"];
                        return (
                          <div
                            key={t.id}
                            onClick={() => router.push(`/tasks/${t.id}`)}
                            className={cn(
                              "p-1 rounded text-[10px] font-medium border cursor-pointer truncate transition-all hover:scale-102",
                              isDone
                                ? "bg-slate-100 text-slate-400 line-through border-slate-200 dark:bg-slate-800"
                                : "bg-violet-50 text-violet-900 border-violet-200 hover:border-violet-400 dark:bg-violet-950/40 dark:text-violet-200"
                            )}
                            title={t.title}
                          >
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                              style={{ backgroundColor: cat?.color || "#8b5cf6" }}
                            />
                            {t.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* List View (Mine, Assigned, Archive) */
          <div className="space-y-2 max-w-4xl mx-auto">
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground border rounded-xl bg-slate-50 dark:bg-slate-900">
                Задачи не найдены
              </div>
            ) : (
              filteredTasks.map((t) => {
                const isDone = t.status === "DONE";
                const cat = categoriesMap[t.category || "general"];
                const due = t.dueAt ? new Date(t.dueAt) : null;
                const isOverdue = due && due < new Date() && !isDone;

                return (
                  <div
                    key={t.id}
                    onClick={() => router.push(`/tasks/${t.id}`)}
                    className={cn(
                      "p-3 rounded-xl border bg-white dark:bg-slate-900 flex items-center justify-between gap-3 transition-all hover:border-violet-300 hover:shadow-xs cursor-pointer",
                      isOverdue
                        ? "border-red-200 bg-red-50/20 dark:border-red-900/40"
                        : "border-slate-200 dark:border-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleDone(t);
                        }}
                        className="h-4 w-4 rounded shrink-0 accent-violet-600 cursor-pointer"
                      />

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {cat && (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold text-white shrink-0"
                              style={{ backgroundColor: cat.color }}
                            >
                              {cat.name}
                            </span>
                          )}
                          <p
                            className={cn(
                              "text-xs font-semibold truncate",
                              isDone
                                ? "text-slate-400 line-through"
                                : "text-slate-900 dark:text-slate-100"
                            )}
                          >
                            {t.title}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                          {t.client && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                              👤 {t.client.name || t.client.phone}
                            </span>
                          )}
                          {due && (
                            <span className={isOverdue ? "text-red-600 font-bold" : ""}>
                              📅{" "}
                              {due.toLocaleString("ru-RU", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                          {t.assignedTo.length > 0 && (
                            <span>
                              👥 {t.assignedTo.map((u) => u.name).join(", ")}
                            </span>
                          )}
                          {t.createdBy && (
                            <span>Создал: {t.createdBy.name}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-slate-400">
                      {(t.commentsCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-xs">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {t.commentsCount}
                        </span>
                      )}
                      {t.attachments.length > 0 && (
                        <span className="flex items-center gap-1 text-xs">
                          <Paperclip className="h-3.5 w-3.5" />
                          {t.attachments.length}
                        </span>
                      )}
                      <ArrowUpRight className="h-4 w-4 text-slate-300 hover:text-violet-600 transition-colors" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
