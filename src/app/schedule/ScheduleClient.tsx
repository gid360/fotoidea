"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, subDays, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, LayoutGrid, List, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CreateClassDialog } from "./CreateClassDialog";
import { ClassDetailDialog } from "./ClassDetailDialog";
import { BookingStatus } from "@prisma/client";

// ─── Константы сетки ─────────────────────────────────────────
const HOUR_START = 6;   // 06:00
const HOUR_END = 22;    // 22:00
const PX_PER_MIN_NORMAL  = 1.5; // пикселей на минуту (обычный режим)
const PX_PER_MIN_COMPACT = 0.75; // пикселей на минуту (компактный режим)

function minutesFromDayStart(date: Date) {
  return (date.getHours() - HOUR_START) * 60 + date.getMinutes();
}

// ─── Типы ────────────────────────────────────────────────────
interface Hall { id: string; name: string; colorHex: string }
interface ClassEvent {
  id: string;
  startAt: string;
  durationMin: number;
  isCompleted: boolean;
  direction: { name: string; colorHex: string };
  trainer?: { user: { firstName: string; lastName: string } } | null;
  hall: { id: string; name: string };
  bookings: { id: string; status: BookingStatus; client?: { id: string; firstName: string; lastName: string; phone?: string } }[];
}

// ─── Блок события ────────────────────────────────────────────
function EventBlock({
  event,
  compact,
  pxPerMin,
  onClick,
}: {
  event: ClassEvent;
  compact: boolean;
  pxPerMin: number;
  onClick: () => void;
}) {
  const start = new Date(event.startAt);
  const end = new Date(start.getTime() + event.durationMin * 60 * 1000);
  const now = new Date();

  const topMin = minutesFromDayStart(start);
  const heightPx = Math.max(event.durationMin * pxPerMin, 24);
  const topPx = topMin * pxPerMin;

  const isCancelled = event.bookings.length > 0 && event.bookings.every(b => b.status === "CANCELLED");
  const isPast = end < now || event.isCompleted;

  // Цветовое оформление по правилам:
  // 1. Отмененная запись -> Красный
  // 2. Прошедшая запись -> Серый
  // 3. Предстоящая запись -> Нежно-зеленый
  let bgColor = "#ecfdf5";
  let borderColor = "#10b981";
  let textColor = "#047857";
  let badgeBg = "#d1fae5";
  let badgeText = "#065f46";
  let statusText = "Предстоит";

  if (isCancelled) {
    bgColor = "#fee2e2";
    borderColor = "#ef4444";
    textColor = "#991b1b";
    badgeBg = "#fca5a5";
    badgeText = "#7f1d1d";
    statusText = "Отмена";
  } else if (isPast) {
    bgColor = "#f3f4f6";
    borderColor = "#9ca3af";
    textColor = "#374151";
    badgeBg = "#e5e7eb";
    badgeText = "#1f2937";
    statusText = "Прошла";
  }

  const activeBooking = event.bookings.find(b => b.status !== "CANCELLED") || event.bookings[0];
  const clientName = activeBooking?.client
    ? `${activeBooking.client.firstName} ${activeBooking.client.lastName}`.trim()
    : null;

  const timeStr = `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`;
  const trainerFullName = event.trainer
    ? `${event.trainer.user.firstName} ${event.trainer.user.lastName}`.trim()
    : null;

  return (
    <div
      className={cn(
        "absolute left-1 right-1 rounded-md cursor-pointer transition-all hover:brightness-95 hover:shadow-md overflow-hidden",
        isPast && "opacity-90"
      )}
      style={{
        top: topPx,
        height: heightPx,
        backgroundColor: bgColor,
        borderLeft: `4px solid ${borderColor}`,
      }}
      onClick={onClick}
    >
      {compact ? (
        <div className="px-1.5 py-0.5 h-full flex flex-col justify-center">
          <p className="text-[10px] font-bold leading-none truncate" style={{ color: textColor }}>
            {event.direction.name} {format(start, "HH:mm")}
          </p>
          {heightPx > 32 && clientName && (
            <p className="text-[10px] font-medium truncate mt-0.5" style={{ color: textColor }}>
              Клиент: {clientName}
            </p>
          )}
          {heightPx > 46 && trainerFullName && (
            <p className="text-[10px] font-medium truncate mt-0.5" style={{ color: textColor }}>
              Фотограф: {trainerFullName}
            </p>
          )}
        </div>
      ) : (
        <div className="px-2 py-1 h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <p className="text-[11px] font-bold truncate" style={{ color: textColor }}>
                {event.direction.name}
              </p>
              <span
                className="text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0"
                style={{ backgroundColor: badgeBg, color: badgeText }}
              >
                {statusText}
              </span>
            </div>
            <p className="text-[10px] font-semibold leading-tight mt-0.5 truncate" style={{ color: textColor }}>
              {timeStr}
            </p>
            {clientName && (
              <p className="text-[10px] font-bold mt-0.5 truncate" style={{ color: textColor }}>
                Клиент: {clientName}
              </p>
            )}
            {trainerFullName && (
              <p className="text-[10px] font-semibold truncate mt-0.5" style={{ color: textColor }}>
                Фотограф: {trainerFullName}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Мини-календарь ──────────────────────────────────────────
function MiniCalendar({ selected, onChange }: { selected: Date; onChange: (d: Date) => void }) {
  const [viewMonth, setViewMonth] = useState(startOfMonth(selected));
  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  // Добавляем пустые ячейки в начало (пн=0)
  const firstDow = (startOfMonth(viewMonth).getDay() + 6) % 7; // 0=пн

  return (
    <div className="w-64 select-none">
      {/* Навигация по месяцам */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewMonth(m => subMonths(m, 1))}
          className="p-1 rounded hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold capitalize">
          {format(viewMonth, "LLLL yyyy", { locale: ru })}
        </span>
        <button onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="p-1 rounded hover:bg-muted transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {/* Заголовки дней */}
      <div className="grid grid-cols-7 mb-1">
        {["пн","вт","ср","чт","пт","сб","вс"].map(d => (
          <div key={d} className="text-[10px] text-muted-foreground text-center py-0.5">{d}</div>
        ))}
      </div>
      {/* Ячейки */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
        {days.map(day => {
          const isSelected = isSameDay(day, selected);
          const isToday = isSameDay(day, new Date());
          const isOtherMonth = !isSameMonth(day, viewMonth);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onChange(day)}
              className={cn(
                "h-8 w-full rounded-md text-xs font-medium transition-colors",
                isSelected && "bg-primary text-primary-foreground",
                !isSelected && isToday && "border border-primary text-primary",
                !isSelected && !isToday && isOtherMonth && "text-muted-foreground/40",
                !isSelected && !isToday && !isOtherMonth && "hover:bg-muted"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
      {/* Кнопка "Сегодня" */}
      <button
        onClick={() => { onChange(new Date()); setViewMonth(startOfMonth(new Date())); }}
        className="mt-3 w-full text-xs text-center text-primary hover:underline"
      >
        Сегодня
      </button>
    </div>
  );
}

// ─── Основной компонент ───────────────────────────────────────
export function ScheduleClient({ initialHalls }: { initialHalls: Hall[] }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("schedule_compact_view");
      if (saved !== null) {
        setCompact(saved === "true");
      }
    } catch {
      // Игнорируем ошибки доступа к localStorage
    }
  }, []);

  function handleCompactChange(isCompact: boolean) {
    setCompact(isCompact);
    try {
      localStorage.setItem("schedule_compact_view", String(isCompact));
    } catch {
      // Игнорируем ошибки доступа к localStorage
    }
  }

  const pxPerMin = compact ? PX_PER_MIN_COMPACT : PX_PER_MIN_NORMAL;
  const hourPx   = 60 * pxPerMin;
  const totalH   = (HOUR_END - HOUR_START) * hourPx;
  const [selectedHalls, setSelectedHalls] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [createTime, setCreateTime] = useState<string | undefined>();
  const [createHallId, setCreateHallId] = useState<string | undefined>();
  const [detailEventId, setDetailEventId] = useState<string | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: events = [], refetch } = useQuery<ClassEvent[]>({
    queryKey: ["schedule", dateStr],
    queryFn: () => fetch(`/api/schedule/events?date=${dateStr}`).then(r => r.json()),
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData,
  });

  const { data: halls = initialHalls } = useQuery<Hall[]>({
    queryKey: ["halls"],
    queryFn: () => fetch("/api/halls").then(r => r.json()),
    initialData: initialHalls,
  });

  // Залы для отображения
  const visibleHalls = halls.filter(h =>
    selectedHalls.size === 0 || selectedHalls.has(h.id)
  );

  // Дни недели (для навигации по неделе)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function toggleHall(hallId: string) {
    setSelectedHalls(prev => {
      const next = new Set(prev);
      if (next.has(hallId)) next.delete(hallId);
      else next.add(hallId);
      return next;
    });
  }

  function handleCellClick(time: string, hallId: string) {
    setCreateTime(time);
    setCreateHallId(hallId);
    setCreateOpen(true);
  }

  // Временные метки по левому краю
  const timeLabels = Array.from(
    { length: HOUR_END - HOUR_START + 1 },
    (_, i) => `${String(HOUR_START + i).padStart(2, "0")}:00`
  );

  return (
    <div className="flex flex-col h-full">
      {/* ─ Шапка ─────────────────────────────────────────── */}
      <div className="p-4 border-b bg-background shrink-0 space-y-3">
        {/* Строка навигации */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(d => subDays(d, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
              Сегодня
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(d => addDays(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 ml-1 px-2 py-1 rounded-md hover:bg-muted transition-colors">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-base font-semibold capitalize">
                    {format(selectedDate, "EEEE, d MMMM yyyy", { locale: ru })}
                  </h2>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-3">
                <MiniCalendar selected={selectedDate} onChange={setSelectedDate} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            {/* Режим отображения */}
            <div className="flex rounded-md border overflow-hidden">
              <button
                className={cn("px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-colors",
                  compact ? "bg-background text-muted-foreground" : "bg-primary text-primary-foreground")}
                onClick={() => handleCompactChange(false)}
                title="Полный вид"
              >
                <List className="h-3.5 w-3.5" /> Полный
              </button>
              <button
                className={cn("px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-colors",
                  compact ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground")}
                onClick={() => handleCompactChange(true)}
                title="Компактный вид"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Компактный
              </button>
            </div>
            <Button size="sm" onClick={() => { setCreateTime(undefined); setCreateHallId(undefined); setCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Запись
            </Button>
          </div>
        </div>

        {/* Строка дней недели */}
        <div className="flex gap-1">
          {weekDays.map(day => {
            const isSelected = format(day, "yyyy-MM-dd") === dateStr;
            const dayEvents = events.filter(e =>
              format(new Date(e.startAt), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
            );
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex-1 flex flex-col items-center py-1 rounded-lg text-xs transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                <span className="capitalize">{format(day, "EEE", { locale: ru })}</span>
                <span className="font-bold">{format(day, "d")}</span>
                {dayEvents.length > 0 && (
                  <span className={cn("w-1 h-1 rounded-full mt-0.5", isSelected ? "bg-white" : "bg-primary")} />
                )}
              </button>
            );
          })}
        </div>

        {/* Фильтр по залам */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Залы:</span>
          <button
            onClick={() => setSelectedHalls(new Set())}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              selectedHalls.size === 0 ? "bg-foreground text-background border-foreground" : "hover:bg-muted"
            )}
          >
            Все
          </button>
          {initialHalls.map(hall => (
            <button
              key={hall.id}
              onClick={() => toggleHall(hall.id)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1.5",
                selectedHalls.has(hall.id) ? "text-white border-transparent" : "hover:bg-muted"
              )}
              style={selectedHalls.has(hall.id) ? { backgroundColor: hall.colorHex } : {}}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hall.colorHex }} />
              {hall.name}
            </button>
          ))}
        </div>
      </div>

      {/* ─ Сетка ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-full">
          {/* Временные метки */}
          <div className="w-14 shrink-0 relative" style={{ height: totalH + 40 }}>
            <div className="h-10" /> {/* отступ под заголовки залов */}
            {timeLabels.map((label, i) => (
              <div
                key={label}
                className="absolute left-0 right-0 flex items-center justify-end pr-2"
                style={{ top: 40 + i * hourPx - 8 }}
              >
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Колонки залов */}
          {visibleHalls.map(hall => {
            const isOutdoors = hall.name.toLowerCase().includes("выезд");
            const hallEvents = events.filter(e =>
              e.hall.id === hall.id && format(new Date(e.startAt), "yyyy-MM-dd") === dateStr
            );
            return (
              <div
                key={hall.id}
                className="border-l"
                style={isOutdoors ? { width: "15%", flex: "0 0 15%", minWidth: "100px" } : { flex: "1 1 0%", minWidth: "160px" }}
              >
                {/* Заголовок зала */}
                <div
                  className="h-10 flex items-center justify-center text-xs font-semibold border-b sticky top-0 bg-background z-10 px-2 text-center"
                  style={{ borderBottomColor: hall.colorHex, borderBottomWidth: 2 }}
                >
                  {hall.name}
                </div>

                {/* Тело колонки */}
                <div
                  className="relative"
                  style={{ height: totalH }}
                >
                  {/* Горизонтальные линии по часам */}
                  {timeLabels.map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-muted/60"
                      style={{ top: i * hourPx }}
                    />
                  ))}
                  {/* Линии по получасам */}
                  {timeLabels.map((_, i) => (
                    <div
                      key={`half-${i}`}
                      className="absolute left-0 right-0 border-t border-dashed border-muted/30"
                      style={{ top: i * hourPx + hourPx / 2 }}
                    />
                  ))}

                  {/* Прозрачные ячейки для клика (наведение и клик только на начало часа) */}
                  {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => {
                    const h = HOUR_START + i;
                    const time = `${String(h).padStart(2, "0")}:00`;
                    return (
                      <div
                        key={time}
                        className="absolute left-0 right-0 hover:bg-primary/5 cursor-pointer transition-colors"
                        style={{ top: i * hourPx, height: hourPx }}
                        onClick={() => handleCellClick(time, hall.id)}
                        title={`Создать запись в ${time}`}
                      />
                    );
                  })}

                  {/* События */}
                  {hallEvents.map(event => (
                    <EventBlock
                      key={event.id}
                      event={event}
                      compact={compact}
                      pxPerMin={pxPerMin}
                      onClick={() => setDetailEventId(event.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {visibleHalls.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Нет залов для отображения</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Диалоги */}
      <CreateClassDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => refetch()}
        selectedDate={selectedDate}
        selectedTime={createTime}
        selectedHallId={createHallId}
      />
      <ClassDetailDialog
        eventId={detailEventId}
        onClose={() => setDetailEventId(null)}
        onUpdated={() => refetch()}
      />
    </div>
  );
}
