"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Users, Dumbbell, Wallet, CalendarDays, UserCog } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface AnalyticsData {
  summary: { totalIncome: number; totalExpense: number; profit: number; totalClients: number; totalSubs: number };
  revenueChart:  { month: string; income: number; expense: number; profit: number }[];
  clientsChart:  { month: string; count: number }[];
  subsChart:     { month: string; count: number; revenue: number }[];
  dirChart:      { name: string; colorHex: string; count: number }[];
  topClients:    { id: string; firstName: string; lastName: string; phone: string; visits: number }[];
  trainerStats:  { id: string; name: string; events: number; clients: number }[];
}

type PeriodMode = 1 | 3 | 6 | 12 | "custom";

const PERIODS: { label: string; value: PeriodMode }[] = [
  { label: "1 мес.",  value: 1  },
  { label: "3 мес.",  value: 3  },
  { label: "6 мес.",  value: 6  },
  { label: "12 мес.", value: 12 },
  { label: "Период",  value: "custom" },
];

function todayStr()    { return format(new Date(), "yyyy-MM-dd"); }
function monthAgoStr() { const d = new Date(); d.setMonth(d.getMonth() - 1); return format(d, "yyyy-MM-dd"); }

function StatCard({ label, value, sub, icon: Icon, positive }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; positive?: boolean;
}) {
  return (
    <div className="border rounded-xl p-4 bg-background">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {sub && (
        <p className={cn("text-xs mt-1", positive === true ? "text-green-600" : positive === false ? "text-red-500" : "text-muted-foreground")}>
          {sub}
        </p>
      )}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 },
  labelStyle:   { fontWeight: 600 },
};

export function AnalyticsClient() {
  const [mode, setMode] = useState<PeriodMode>(6);
  const [from, setFrom] = useState(monthAgoStr);
  const [to,   setTo]   = useState(todayStr);

  const queryParams = mode === "custom"
    ? `from=${from}&to=${to}`
    : `months=${mode}`;

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["analytics", queryParams],
    queryFn:  () => fetch(`/api/analytics?${queryParams}`).then(r => r.json()),
    enabled:  mode !== "custom" || (!!from && !!to && from <= to),
  });

  const s = data?.summary;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-4 border-b bg-background shrink-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">Аналитика</h1>
            <p className="text-sm text-muted-foreground">Финансы, клиенты, посещаемость</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {PERIODS.map(p => (
                <button key={String(p.value)}
                  onClick={() => setMode(p.value)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md border transition-colors flex items-center gap-1.5",
                    mode === p.value ? "bg-foreground text-background border-foreground" : "hover:bg-muted"
                  )}>
                  {p.value === "custom" && <CalendarDays className="h-3.5 w-3.5" />}
                  {p.label}
                </button>
              ))}
            </div>
            {mode === "custom" && (
              <div className="flex items-center gap-2">
                <Input type="date" value={from} onChange={e => setFrom(e.target.value)}
                  className="w-36 text-sm h-8" max={to} />
                <span className="text-muted-foreground text-sm">—</span>
                <Input type="date" value={to} onChange={e => setTo(e.target.value)}
                  className="w-36 text-sm h-8" min={from} max={todayStr()} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-6xl mx-auto w-full">

        {/* Сводка */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Доходы"           value={s ? `${formatMoney(s.totalIncome)} ₸`  : "—"} icon={TrendingUp}   positive={true} />
          <StatCard label="Расходы"          value={s ? `${formatMoney(s.totalExpense)} ₸` : "—"} icon={TrendingDown}  positive={false} />
          <StatCard label="Прибыль"          value={s ? `${formatMoney(s.profit)} ₸`       : "—"} icon={Wallet}        positive={s ? s.profit >= 0 : undefined} />
          <StatCard label="Новых клиентов"   value={s ? String(s.totalClients)             : "—"} icon={Users} />
          <StatCard label="Продано абон."    value={s ? String(s.totalSubs)                : "—"} icon={Dumbbell} />
        </div>

        {/* Доходы / расходы */}
        <div className="border rounded-xl p-4">
          <h2 className="font-semibold mb-4">Доходы и расходы по месяцам</h2>
          {isLoading ? <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Загрузка...</div> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.revenueChart} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}к`} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${formatMoney(v)} ₸`]} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income"  name="Доход"   fill="#16a34a" radius={[4,4,0,0]} />
                <Bar dataKey="expense" name="Расход"  fill="#f87171" radius={[4,4,0,0]} />
                <Bar dataKey="profit"  name="Прибыль" fill="#0d9488" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Новые клиенты */}
          <div className="border rounded-xl p-4">
            <h2 className="font-semibold mb-4">Новые клиенты по месяцам</h2>
            {isLoading ? <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">Загрузка...</div> : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={data?.clientsChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Line dataKey="count" name="Клиентов" stroke="#059669" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Абонементы */}
          <div className="border rounded-xl p-4">
            <h2 className="font-semibold mb-4">Продажи абонементов</h2>
            {isLoading ? <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">Загрузка...</div> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data?.subsChart} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left"  tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}к`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [name === "Выручка" ? `${formatMoney(v)} ₸` : v, name]} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left"  dataKey="count"   name="Кол-во"  fill="#4ade80" radius={[4,4,0,0]} />
                  <Bar yAxisId="right" dataKey="revenue" name="Выручка" fill="#34d399" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Посещаемость по направлениям */}
          <div className="border rounded-xl p-4">
            <h2 className="font-semibold mb-4">Посещаемость по направлениям</h2>
            {isLoading ? <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">Загрузка...</div> : !data?.dirChart?.length ? (
              <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">Нет данных</div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={data.dirChart} dataKey="count" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                      {data.dirChart.map((d, i) => (
                        <Cell key={i} fill={d.colorHex} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v} посещ.`]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {data.dirChart.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.colorHex }} />
                      <span className="text-sm flex-1 min-w-0 truncate">{d.name}</span>
                      <span className="text-sm font-semibold">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Топ клиентов */}
          <div className="border rounded-xl p-4">
            <h2 className="font-semibold mb-4">Топ клиентов по посещениям</h2>
            {isLoading ? <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">Загрузка...</div> : !data?.topClients?.length ? (
              <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">Нет данных</div>
            ) : (
              <div className="space-y-2">
                {data.topClients.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-5 text-right">{i + 1}</span>
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {c.firstName?.[0]}{c.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.lastName} {c.firstName}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 rounded-full bg-primary/20 w-16 overflow-hidden">
                        <div className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.round((c.visits / (data.topClients[0]?.visits || 1)) * 100)}%` }} />
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{c.visits}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Фотографы */}
        <div className="border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <UserCog className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Статистика фотографов</h2>
          </div>
          {isLoading ? (
            <div className="h-20 flex items-center justify-center text-muted-foreground text-sm">Загрузка...</div>
          ) : !data?.trainerStats?.length ? (
            <div className="h-20 flex items-center justify-center text-muted-foreground text-sm">Нет завершённых съёмок за период</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b">
                    <th className="text-left py-2 font-medium">Фотограф</th>
                    <th className="text-right py-2 font-medium">Съёмок</th>
                    <th className="text-right py-2 font-medium">Клиентов</th>
                    <th className="text-right py-2 font-medium w-40">Нагрузка</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.trainerStats.map(t => {
                    const maxClients = data.trainerStats[0]?.clients || 1;
                    return (
                      <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                              {t.name[0]}
                            </div>
                            <span className="font-medium">{t.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-semibold">{t.events}</td>
                        <td className="py-2.5 text-right font-semibold">{t.clients}</td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 rounded-full bg-primary/15 w-24 overflow-hidden">
                              <div className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${Math.round((t.clients / maxClients) * 100)}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">
                              {Math.round((t.clients / maxClients) * 100)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
