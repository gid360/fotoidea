import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, subDays, subMonths } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now      = new Date();
  const todayStart = startOfDay(now);
  const todayEnd   = endOfDay(now);
  const monthStart = startOfMonth(now);
  const day30ago   = subDays(now, 30);
  const prevMonth  = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = startOfMonth(now);

  const [
    totalClients,
    newClientsThisMonth,
    todayEvents,
    todayBookings,
    monthIncome,
    prevMonthIncome,
    openShift,
    upcomingEvents,
    recentClients,
    birthdaysToday,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.classEvent.count({ where: { startAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.booking.count({
      where: { classEvent: { startAt: { gte: todayStart, lte: todayEnd } } },
    }),
    prisma.cashTransaction.aggregate({
      where: { type: "INCOME", date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.cashTransaction.aggregate({
      where: { type: "INCOME", date: { gte: prevMonth, lt: prevMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.cashShift.findFirst({ where: { closedAt: null } }),
    // Ближайшие занятия сегодня
    prisma.classEvent.findMany({
      where: { startAt: { gte: now, lte: todayEnd } },
      orderBy: { startAt: "asc" },
      take: 5,
      include: {
        direction: { select: { name: true, colorHex: true } },
        trainer:   { select: { user: { select: { firstName: true, lastName: true } } } },
        hall:      { select: { name: true } },
        _count:    { select: { bookings: true } },
      },
    }),
    // Новые клиенты за 7 дней
    prisma.client.findMany({
      where: { createdAt: { gte: subDays(now, 7) } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, firstName: true, lastName: true, createdAt: true, loyaltyTag: true },
    }),
    // Дни рождения сегодня
    prisma.$queryRaw<{ id: string; firstName: string; lastName: string; birthDate: Date }[]>`
      SELECT id, "firstName", "lastName", "birthDate"
      FROM clients
      WHERE "birthDate" IS NOT NULL
        AND EXTRACT(MONTH FROM "birthDate") = EXTRACT(MONTH FROM NOW())
        AND EXTRACT(DAY   FROM "birthDate") = EXTRACT(DAY   FROM NOW())
    `,
  ]);

  const monthIncomeVal     = Number(monthIncome._sum.amount ?? 0);
  const prevMonthIncomeVal = Number(prevMonthIncome._sum.amount ?? 0);
  const incomeChange = prevMonthIncomeVal > 0
    ? Math.round(((monthIncomeVal - prevMonthIncomeVal) / prevMonthIncomeVal) * 100)
    : null;

  return NextResponse.json({
    stats: {
      totalClients,
      newClientsThisMonth,
      todayEvents,
      todayBookings,
      monthIncome: monthIncomeVal,
      incomeChange,
      shiftOpen: !!openShift,
    },
    upcomingEvents,
    recentClients,
    birthdaysToday,
  });
}
