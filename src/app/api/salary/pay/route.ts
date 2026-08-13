import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  trainerId: z.string(),
  month: z.string(), // "2026-06"
});

// Mark all unpaid earnings for a trainer in a month as paid
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trainerId, month } = schema.parse(await req.json());

  const [y, m] = month.split("-").map(Number);
  const dateFrom = new Date(y, m - 1, 1);
  const dateTo   = new Date(y, m, 1);

  // Find unpaid earnings for this trainer in this month
  const earnings = await prisma.trainerEarning.findMany({
    where: {
      trainerId,
      classEvent: {
        startAt: { gte: dateFrom, lt: dateTo },
        isCompleted: true,
      },
      paidAt: null,
    },
  });

  if (!earnings.length) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  const now = new Date();
  await Promise.all(
    earnings.map((e) =>
      prisma.trainerEarning.update({
        where: { id: e.id },
        data: { paidAmount: e.totalAmount, paidAt: now },
      })
    )
  );

  const totalPaid = earnings.reduce((s, e) => s + Number(e.totalAmount), 0);

  // Записываем расход в кассу если есть открытая смена
  if (totalPaid > 0) {
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    const openShift = await prisma.cashShift.findFirst({
      where: { closedAt: null },
      orderBy: { openedAt: "desc" },
    });
    if (openShift && trainer) {
      await prisma.cashTransaction.create({
        data: {
          shiftId:       openShift.id,
          type:          "EXPENSE",
          category:      "TRAINER_SALARY",
          paymentMethod: "CASH",
          amount:        totalPaid,
          description:   `Зарплата: ${trainer.user.lastName} ${trainer.user.firstName} (${month})`,
          createdById:   session.user.id,
        },
      });
    }
  }

  return NextResponse.json({ ok: true, updated: earnings.length, totalPaid });
}
