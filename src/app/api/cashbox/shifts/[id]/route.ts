import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const closeSchema = z.object({
  closingBalance: z.number(),
  note:           z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const shift = await prisma.cashShift.findUniqueOrThrow({
    where: { id },
    include: {
      openedBy:     { select: { firstName: true, lastName: true } },
      transactions: {
        orderBy: { date: "desc" },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  return NextResponse.json(shift);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = closeSchema.parse(await req.json());

  // Считаем системный баланс
  const shift = await prisma.cashShift.findUniqueOrThrow({
    where: { id },
    include: { transactions: { select: { type: true, amount: true } } },
  });
  const income  = shift.transactions.filter(t => t.type === "INCOME").reduce((a, t) => a + Number(t.amount), 0);
  const expense = shift.transactions.filter(t => t.type === "EXPENSE").reduce((a, t) => a + Number(t.amount), 0);
  const systemBalance = Number(shift.openingBalance) + income - expense;
  const difference    = body.closingBalance - systemBalance;

  const updated = await prisma.cashShift.update({
    where: { id },
    data: {
      closedAt:       new Date(),
      closingBalance: body.closingBalance,
      systemBalance,
      difference,
      note: body.note,
    },
  });
  return NextResponse.json(updated);
}
