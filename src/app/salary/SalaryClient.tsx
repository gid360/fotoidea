"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown, ChevronRight, CheckCircle2, AlertCircle,
  Users, CalendarDays, TrendingUp, Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatMoney } from "@/lib/utils";
import { PageTabs } from "@/components/PageTabs";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const TRAINER_TABS = [
  { label: "Фотографы", href: "/settings/trainers" },
  { label: "Зарплата", href: "/salary" },
];

interface EventSalary {
  id: string;
  classEventId: string;
  startAt: string;
  directionName: string;
  attendedCount: number;
  servicePrice: number;
  extraPeopleFee: number;
  wardrobeFee: number;
  qualifyingBase: number;
  percentRate: number;
  totalAmount: number;
  paidAmount: number;
  paidAt: string | null;
}

interface TrainerSalary {
  trainerId: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  percentRate: number;
  eventsCount: number;
  totalClients: number;
  totalAmount: number;
  paidAmount: number;
  unpaid: number;
  events: EventSalary[];
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthOptions() {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: monthKey(d),
      label: format(d, "LLLL yyyy", { locale: ru }),
    });
  }
  return months;
}

const MONTHS = buildMonthOptions();

function TrainerRow({ t, month, onPay }: { t: TrainerSalary; month: string; onPay: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [paying, setPaying] = useState(false);
  const qc = useQueryClient();

  const isPaid = t.unpaid <= 0;

  async function handlePay() {
    setPaying(true);
    await fetch("/api/salary/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainerId: t.trainerId, month }),
    });
    qc.invalidateQueries({ queryKey: ["salary", month] });
    setPaying(false);
    onPay();
  }

  return (
    <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(x => !x)}
      >
        <button className="text-muted-foreground shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base">{t.lastName} {t.firstName}</span>
            <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary">
              {t.percentRate}% со съёмки
            </Badge>
            {!t.isActive && <Badge variant="secondary" className="text-xs">Неактивен</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.eventsCount} съёмок
          </p>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Начислено ({t.percentRate}%)</p>
            <p className="font-semibold">{formatMoney(t.totalAmount)} ₸</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Выплачено</p>
            <p className="font-semibold text-green-600">{formatMoney(t.paidAmount)} ₸</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">К выплате</p>
            <p className={cn("font-bold", t.unpaid > 0 ? "text-orange-600" : "text-muted-foreground")}>
              {formatMoney(t.unpaid)} ₸
            </p>
          </div>
        </div>

        {/* Pay button */}
        <div onClick={e => e.stopPropagation()}>
          {isPaid ? (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full border border-green-200">
              <CheckCircle2 className="h-4 w-4" /> Выплачено
            </span>
          ) : (
            <Button size="sm" onClick={handlePay} disabled={paying || t.totalAmount <= 0}>
              {paying ? "..." : `Выплатить ${formatMoney(t.unpaid)} ₸`}
            </Button>
          )}
        </div>
      </div>

      {/* Events detail */}
      {expanded && t.events.length > 0 && (
        <div className="border-t bg-muted/10 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase text-[11px] tracking-wider">
              <tr className="border-b">
                <th className="px-4 py-2.5">Дата съёмки</th>
                <th className="px-4 py-2.5">Категория</th>
                <th className="px-4 py-2.5 text-right">Услуга</th>
                <th className="px-4 py-2.5 text-right">Доплата за человека</th>
                <th className="px-4 py-2.5 text-right text-muted-foreground">Гардероб (не в %)</th>
                <th className="px-4 py-2.5 text-right font-bold">База для %</th>
                <th className="px-4 py-2.5 text-center">% фотографа</th>
                <th className="px-4 py-2.5 text-right font-bold text-primary">К начислению</th>
                <th className="px-4 py-2.5 text-center">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {t.events.map(ev => (
                <tr key={ev.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-muted-foreground font-medium">
                    {format(new Date(ev.startAt), "dd MMM HH:mm", { locale: ru })}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{ev.directionName}</td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(ev.servicePrice)} ₸</td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(ev.extraPeopleFee)} ₸</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{formatMoney(ev.wardrobeFee)} ₸</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{formatMoney(ev.qualifyingBase)} ₸</td>
                  <td className="px-4 py-2.5 text-center font-medium">{ev.percentRate}%</td>
                  <td className="px-4 py-2.5 text-right font-bold text-primary">{formatMoney(ev.totalAmount)} ₸</td>
                  <td className="px-4 py-2.5 text-center">
                    {ev.paidAt ? (
                      <span className="text-green-600 font-medium">✓ Выплачено</span>
                    ) : (
                      <span className="text-orange-500 font-medium">К выплате</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {expanded && t.events.length === 0 && (
        <div className="border-t px-4 py-4 text-sm text-muted-foreground">Нет завершённых съёмок за этот период</div>
      )}
    </div>
  );
}

export function SalaryClient() {
  const [month, setMonth] = useState(monthKey(new Date()));

  const { data, isLoading } = useQuery<{ trainers: TrainerSalary[] }>({
    queryKey: ["salary", month],
    queryFn: () => fetch(`/api/salary?month=${month}`).then(r => r.json()),
  });

  const qc = useQueryClient();

  const trainers = data?.trainers ?? [];
  const totalNominal = trainers.reduce((s, t) => s + t.totalAmount, 0);
  const totalPaid    = trainers.reduce((s, t) => s + t.paidAmount, 0);
  const totalUnpaid  = trainers.reduce((s, t) => s + t.unpaid, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageTabs tabs={TRAINER_TABS} />
      <div className="p-4 border-b bg-background shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Зарплата фотографов</h1>
          <p className="text-sm text-muted-foreground">Расчёт процента со съёмок (услуга + гости)</p>
        </div>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background font-medium"
        >
          {MONTHS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-5 max-w-6xl mx-auto w-full">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Фотографов", value: trainers.length, icon: Users, color: "text-foreground" },
            { label: "Начислено (% со съёмок)", value: `${formatMoney(totalNominal)} ₸`, icon: TrendingUp, color: "text-foreground" },
            { label: "Выплачено", value: `${formatMoney(totalPaid)} ₸`, icon: CheckCircle2, color: "text-green-600" },
            { label: "К выплате", value: `${formatMoney(totalUnpaid)} ₸`, icon: AlertCircle, color: totalUnpaid > 0 ? "text-orange-600" : "text-muted-foreground" },
          ].map(s => (
            <div key={s.label} className="border rounded-xl p-4 bg-card shadow-sm">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className={cn("text-xl font-bold mt-2", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Trainer rows */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : trainers.length === 0 ? (
          <div className="border rounded-xl flex flex-col items-center justify-center py-16 text-muted-foreground gap-2 bg-card">
            <CalendarDays className="h-8 w-8 opacity-40" />
            <p className="font-medium">Нет данных за выбранный месяц</p>
            <p className="text-xs">Завершайте съёмки в расписании для автоматического расчёта процента</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trainers.map(t => (
              <TrainerRow key={t.trainerId} t={t} month={month}
                onPay={() => qc.invalidateQueries({ queryKey: ["salary", month] })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
