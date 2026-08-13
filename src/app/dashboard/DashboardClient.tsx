"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Users, Dumbbell, CalendarDays, TrendingUp, TrendingDown,
  Wallet, Gift, ArrowRight, Clock, Cake,
} from "lucide-react";
import { cn, formatMoney, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface DashboardData {
  stats: {
    totalClients: number;
    newClientsThisMonth: number;
    todayEvents: number;
    todayBookings: number;
    monthIncome: number;
    incomeChange: number | null;
    shiftOpen: boolean;
  };
  upcomingEvents: {
    id: string;
    startAt: string;
    durationMin: number;
    direction: { name: string; colorHex: string };
    trainer: { user: { firstName: string; lastName: string } } | null;
    hall: { name: string };
    _count: { bookings: number };
  }[];
  recentClients: { id: string; firstName: string; lastName: string; createdAt: string; loyaltyTag: string }[];
  birthdaysToday: { id: string; firstName: string; lastName: string }[];
}

const LOYALTY_COLOR: Record<string, string> = {
  NEW:     "bg-blue-100 text-blue-700",
  REGULAR: "bg-green-100 text-green-700",
  LOST:    "bg-red-100 text-red-700",
};
const LOYALTY_LABEL: Record<string, string> = { NEW: "Новый", REGULAR: "Постоянный", LOST: "Потерянный" };

export function DashboardClient() {
  const { data: session } = useSession();
  const router = useRouter();
  const now = new Date();

  const { data } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then(r => r.json()),
    refetchInterval: 60_000,
  });

  const stats = data?.stats;
  const greeting = now.getHours() < 12 ? "Доброе утро" : now.getHours() < 18 ? "Добрый день" : "Добрый вечер";

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-6 space-y-6 max-w-6xl w-full mx-auto">

        {/* Приветствие */}
        <div>
          <h1 className="text-2xl font-bold">
            {greeting}, {session?.user?.name?.split(" ")[0] ?? ""}!
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {format(now, "EEEE, d MMMM yyyy", { locale: ru })}
            {stats?.shiftOpen && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Смена открыта
              </span>
            )}
          </p>
        </div>

        {/* KPI-карточки */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Клиентов",
              value: stats?.totalClients ?? "—",
              sub: stats ? `+${stats.newClientsThisMonth} за месяц` : "",
              icon: Users, color: "text-blue-600", bg: "bg-blue-50",
              href: "/clients",
            },
            {
              label: "Выручка за месяц",
              value: stats ? `${formatMoney(stats.monthIncome)} ₸` : "—",
              sub: stats?.incomeChange !== null && stats?.incomeChange !== undefined ? `${stats.incomeChange >= 0 ? "+" : ""}${stats.incomeChange}% к пред. месяцу` : "за текущий месяц",
              icon: Wallet, color: "text-emerald-700", bg: "bg-emerald-50",
              href: "/cashbox/shifts",
            },
            {
              label: "Записей сегодня",
              value: stats?.todayEvents ?? "—",
              sub: stats ? `${stats.todayBookings} мест брони` : "",
              icon: CalendarDays, color: "text-orange-600", bg: "bg-orange-50",
              href: "/schedule",
            },
            {
              label: "Доход за месяц",
              value: stats ? `${formatMoney(stats.monthIncome)} ₸` : "—",
              sub: stats?.incomeChange !== null && stats?.incomeChange !== undefined
                ? `${stats.incomeChange >= 0 ? "+" : ""}${stats.incomeChange}% к прошлому месяцу`
                : "данных за прошлый месяц нет",
              icon: Wallet,
              color: stats?.incomeChange !== undefined && stats?.incomeChange !== null && stats.incomeChange >= 0
                ? "text-green-600" : "text-red-500",
              bg: "bg-green-50",
              href: "/cashbox/transactions",
            },
          ].map(card => (
            <button key={card.label}
              onClick={() => router.push(card.href)}
              className="border rounded-xl p-4 text-left hover:shadow-md transition-shadow bg-background group">
              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center mb-3", card.bg)}>
                <card.icon className={cn("h-5 w-5", card.color)} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
              {card.sub && <p className="text-xs text-muted-foreground/70 mt-1">{card.sub}</p>}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Ближайшие записи */}
          <div className="border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Записи сегодня (предстоящие)
              </div>
              <button onClick={() => router.push("/schedule")}
                className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Расписание <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="divide-y">
              {!data?.upcomingEvents?.length ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Записей до конца дня нет
                </div>
              ) : data.upcomingEvents.map(ev => {
                const start = new Date(ev.startAt);
                const filled = ev._count.bookings;
                return (
                  <div key={ev.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="text-sm font-mono font-semibold w-11 shrink-0 text-muted-foreground">
                      {format(start, "HH:mm")}
                    </div>
                    <div
                      className="w-1 self-stretch rounded-full shrink-0"
                      style={{ background: ev.direction.colorHex }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{ev.direction.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ev.hall.name} · {ev.trainer ? `${ev.trainer.user.firstName} ${ev.trainer.user.lastName}` : "Аренда"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-primary">
                        {filled} {filled === 1 ? "клиент" : "клиентов"}
                      </p>
                      <p className="text-xs text-muted-foreground">{ev.durationMin} мин</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Правая колонка: новые клиенты + дни рождения */}
          <div className="space-y-4">

            {/* Дни рождения */}
            {!!data?.birthdaysToday?.length && (
              <div className="border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b bg-pink-50/50 font-semibold text-sm">
                  <Cake className="h-4 w-4 text-pink-500" />
                  Дни рождения сегодня 🎂
                </div>
                <div className="divide-y">
                  {data.birthdaysToday.map(c => (
                    <button key={c.id} onClick={() => router.push(`/clients/${c.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left">
                      <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm shrink-0">
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <p className="text-sm font-medium">{c.lastName} {c.firstName}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Новые клиенты */}
            <div className="border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Новые клиенты (7 дней)
                </div>
                <button onClick={() => router.push("/clients")}
                  className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  Все клиенты <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="divide-y">
                {!data?.recentClients?.length ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Новых клиентов нет
                  </div>
                ) : data.recentClients.map(c => (
                  <button key={c.id} onClick={() => router.push(`/clients/${c.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {c.firstName[0]}{c.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{c.lastName} {c.firstName}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</p>
                    </div>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", LOYALTY_COLOR[c.loyaltyTag])}>
                      {LOYALTY_LABEL[c.loyaltyTag]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
