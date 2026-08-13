import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month"); // "2026-07"

  let dateFrom: Date;
  let dateTo: Date;

  if (monthParam) {
    const [y, m] = monthParam.split("-").map(Number);
    dateFrom = new Date(y, m - 1, 1);
    dateTo   = new Date(y, m, 1);
  } else {
    const now = new Date();
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    dateTo   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const trainers = await prisma.trainer.findMany({
    include: {
      user: { select: { firstName: true, lastName: true, isActive: true } },
      classEvents: {
        where: {
          startAt: { gte: dateFrom, lt: dateTo },
          isCompleted: true,
        },
        include: {
          direction: { select: { name: true } },
          bookings: { select: { status: true } },
        },
        orderBy: { startAt: "asc" },
      },
      earnings: {
        where: {
          classEvent: {
            startAt: { gte: dateFrom, lt: dateTo },
          },
        },
      },
    },
    orderBy: { user: { lastName: "asc" } },
  });

  const result = trainers.map((t) => {
    const percentRate = Number(t.percentRate ?? 50);

    const eventsList = t.classEvents.map((ev) => {
      const sPrice = Number(ev.servicePrice || 0);
      const ePeople = Number(ev.extraPeopleFee || 0);
      const wFee = Number(ev.wardrobeFee || 0);
      const qualifyingBase = sPrice + ePeople; // Исключаем аренду гардероба
      const earned = (qualifyingBase * percentRate) / 100;

      const paidEarning = t.earnings.find((e) => e.classEventId === ev.id);
      const paidAmount = paidEarning ? Number(paidEarning.paidAmount) : 0;

      return {
        id: ev.id,
        classEventId: ev.id,
        startAt: ev.startAt,
        directionName: ev.direction.name,
        attendedCount: ev.bookings.filter(b => b.status === "ATTENDED").length,
        servicePrice: sPrice,
        extraPeopleFee: ePeople,
        wardrobeFee: wFee,
        qualifyingBase,
        percentRate,
        totalAmount: earned,
        paidAmount,
        paidAt: paidEarning?.paidAt || null,
      };
    });

    const eventsCount = eventsList.length;
    const totalClients = eventsList.reduce((s, e) => s + e.attendedCount, 0);
    const totalAmount = eventsList.reduce((s, e) => s + e.totalAmount, 0);
    const paidAmount = eventsList.reduce((s, e) => s + e.paidAmount, 0);
    const unpaid = totalAmount - paidAmount;

    return {
      trainerId: t.id,
      firstName: t.user.firstName,
      lastName: t.user.lastName,
      isActive: t.user.isActive,
      percentRate,
      eventsCount,
      totalClients,
      totalAmount,
      paidAmount,
      unpaid,
      events: eventsList,
    };
  });

  return NextResponse.json({ trainers: result, dateFrom, dateTo });
}
