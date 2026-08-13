import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval, format, parseISO } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const ru = require("date-fns/locale/ru").ru;
  const now = new Date();

  let periodStart: Date;
  let periodEnd: Date;

  const fromParam = searchParams.get("from");
  const toParam   = searchParams.get("to");

  if (fromParam && toParam) {
    periodStart = startOfDay(parseISO(fromParam));
    periodEnd   = endOfDay(parseISO(toParam));
  } else {
    const months = Number(searchParams.get("months") ?? "6");
    periodStart  = startOfMonth(subMonths(now, months - 1));
    periodEnd    = endOfMonth(now);
  }

  const monthRange = eachMonthOfInterval({ start: startOfMonth(periodStart), end: endOfMonth(periodEnd) });

  // Revenue
  const [incomeRaw, expenseRaw] = await Promise.all([
    prisma.cashTransaction.groupBy({
      by:    ["date"],
      where: { type: "INCOME",  date: { gte: periodStart, lte: periodEnd } },
      _sum:  { amount: true },
    }),
    prisma.cashTransaction.groupBy({
      by:    ["date"],
      where: { type: "EXPENSE", date: { gte: periodStart, lte: periodEnd } },
      _sum:  { amount: true },
    }),
  ]);

  const incomeByMonth:  Record<string, number> = {};
  const expenseByMonth: Record<string, number> = {};
  incomeRaw.forEach(r  => { const m = format(r.date, "yyyy-MM"); incomeByMonth[m]  = (incomeByMonth[m]  ?? 0) + Number(r._sum.amount ?? 0); });
  expenseRaw.forEach(r => { const m = format(r.date, "yyyy-MM"); expenseByMonth[m] = (expenseByMonth[m] ?? 0) + Number(r._sum.amount ?? 0); });

  const revenueChart = monthRange.map(d => {
    const key = format(d, "yyyy-MM");
    return {
      month:   format(d, "MMM yy", { locale: ru }),
      income:  incomeByMonth[key]  ?? 0,
      expense: expenseByMonth[key] ?? 0,
      profit:  (incomeByMonth[key] ?? 0) - (expenseByMonth[key] ?? 0),
    };
  });

  // New clients
  const clientsRaw = await prisma.client.findMany({
    where:  { createdAt: { gte: periodStart, lte: periodEnd } },
    select: { createdAt: true },
  });
  const clientsByMonth: Record<string, number> = {};
  clientsRaw.forEach(c => { const m = format(c.createdAt, "yyyy-MM"); clientsByMonth[m] = (clientsByMonth[m] ?? 0) + 1; });
  const clientsChart = monthRange.map(d => ({
    month: format(d, "MMM yy", { locale: ru }),
    count: clientsByMonth[format(d, "yyyy-MM")] ?? 0,
  }));

  // Income chart by month
  const subsChart = monthRange.map(d => ({
    month:   format(d, "MMM yy", { locale: ru }),
    revenue: incomeByMonth[format(d, "yyyy-MM")] ?? 0,
  }));

  // Attendance by direction
  const attendanceByDir = await prisma.booking.groupBy({
    by:    ["classEventId"],
    where: { status: "ATTENDED", createdAt: { gte: periodStart, lte: periodEnd } },
    _count: true,
  });
  const eventIds = attendanceByDir.map(a => a.classEventId);
  const events = await prisma.classEvent.findMany({
    where:  { id: { in: eventIds } },
    select: { id: true, direction: { select: { name: true, colorHex: true } } },
  });
  const dirMap: Record<string, { name: string; colorHex: string; count: number }> = {};
  attendanceByDir.forEach(a => {
    const ev = events.find(e => e.id === a.classEventId);
    if (!ev) return;
    const key = ev.direction.name;
    if (!dirMap[key]) dirMap[key] = { name: key, colorHex: ev.direction.colorHex, count: 0 };
    dirMap[key].count += a._count;
  });
  const dirChart = Object.values(dirMap).sort((a, b) => b.count - a.count).slice(0, 8);

  // Trainers stats
  const trainerEvents = await prisma.classEvent.findMany({
    where: { startAt: { gte: periodStart, lte: periodEnd }, isCompleted: true },
    select: {
      id: true,
      trainer: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
      bookings: { where: { status: "ATTENDED" }, select: { id: true } },
    },
  });
  const trainerMap: Record<string, { id: string; name: string; events: number; clients: number }> = {};
  trainerEvents.forEach(ev => {
    const t = ev.trainer;
    if (!t) return;
    if (!trainerMap[t.id]) trainerMap[t.id] = { id: t.id, name: `${t.user.lastName} ${t.user.firstName}`, events: 0, clients: 0 };
    trainerMap[t.id].events++;
    trainerMap[t.id].clients += ev.bookings.length;
  });
  const trainerStats = Object.values(trainerMap).sort((a, b) => b.clients - a.clients);

  // Top clients
  const topClientsGrouped = await prisma.booking.groupBy({
    by:      ["clientId"],
    where:   { status: "ATTENDED", createdAt: { gte: periodStart, lte: periodEnd } },
    _count:  true,
    orderBy: { _count: { clientId: "desc" } },
    take:    10,
  });
  const topClientIds  = topClientsGrouped.map(t => t.clientId);
  const topClientData = await prisma.client.findMany({
    where:  { id: { in: topClientIds } },
    select: { id: true, firstName: true, lastName: true, phone: true },
  });
  const topClients = topClientsGrouped.map(t => ({
    ...topClientData.find(x => x.id === t.clientId),
    visits: t._count,
  }));

  const totalIncome  = Object.values(incomeByMonth).reduce((a, b) => a + b, 0);
  const totalExpense = Object.values(expenseByMonth).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    summary:      { totalIncome, totalExpense, profit: totalIncome - totalExpense, totalClients: clientsRaw.length, totalSubs: 0 },
    revenueChart, clientsChart, subsChart, dirChart, topClients, trainerStats,
    periodStart,  periodEnd,
  });
}
