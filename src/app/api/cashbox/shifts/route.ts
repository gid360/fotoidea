import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shifts = await prisma.cashShift.findMany({
    orderBy: { openedAt: "desc" },
    take: 50,
    include: {
      openedBy: { select: { firstName: true, lastName: true } },
      _count:   { select: { transactions: true } },
      transactions: {
        select: { type: true, amount: true },
      },
    },
  });

  return NextResponse.json(shifts.map(s => {
    const income  = s.transactions.filter(t => t.type === "INCOME").reduce((a, t) => a + Number(t.amount), 0);
    const expense = s.transactions.filter(t => t.type === "EXPENSE").reduce((a, t) => a + Number(t.amount), 0);
    return { ...s, transactions: undefined, income, expense, txCount: s._count.transactions };
  }));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = z.object({ openingBalance: z.number().default(0) }).parse(await req.json());

  // Проверим — нет ли уже открытой смены
  const open = await prisma.cashShift.findFirst({ where: { closedAt: null } });
  if (open) return NextResponse.json({ error: "Смена уже открыта" }, { status: 400 });

  const shift = await prisma.cashShift.create({
    data: { openingBalance: body.openingBalance, openedById: session.user.id },
    include: { openedBy: { select: { firstName: true, lastName: true } } },
  });
  return NextResponse.json(shift, { status: 201 });
}
