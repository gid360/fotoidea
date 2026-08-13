import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const txSchema = z.object({
  shiftId:       z.string().optional(),
  type:          z.enum(["INCOME", "EXPENSE"]),
  category:      z.enum([
    "SUBSCRIPTION_SALE", "CERTIFICATE_SALE", "DEPOSIT_TOPUP", "OTHER_INCOME",
    "TRAINER_SALARY", "HOUSEHOLD", "CLIENT_REFUND", "OTHER_EXPENSE",
  ]),
  paymentMethod: z.enum(["CASH", "CARD", "DEPOSIT"]).default("CASH"),
  amount:        z.number().positive(),
  description:   z.string().optional(),
  clientId:      z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const shiftId  = searchParams.get("shiftId");
  const type     = searchParams.get("type");
  const dateFrom = searchParams.get("from");
  const dateTo   = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (shiftId) where.shiftId = shiftId;
  if (type)    where.type    = type;
  if (dateFrom || dateTo) {
    where.date = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo   ? { lte: new Date(dateTo + "T23:59:59") } : {}),
    };
  }

  const txs = await prisma.cashTransaction.findMany({
    where,
    orderBy: { date: "desc" },
    take: 200,
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });
  return NextResponse.json(txs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = txSchema.parse(await req.json());

  let shiftId = body.shiftId;
  if (!shiftId) {
    let openShift = await prisma.cashShift.findFirst({ where: { closedAt: null }, orderBy: { openedAt: "desc" } });
    if (!openShift) {
      openShift = await prisma.cashShift.create({
        data: {
          openedById: session.user.id,
          openingBalance: 0,
        },
      });
    }
    shiftId = openShift.id;
  }

  const tx = await prisma.cashTransaction.create({
    data: {
      shiftId,
      type: body.type,
      category: body.category,
      paymentMethod: body.paymentMethod,
      amount: body.amount,
      description: body.description,
      clientId: body.clientId,
      createdById: session.user.id,
    },
    include: { createdBy: { select: { firstName: true, lastName: true } } },
  });
  return NextResponse.json(tx, { status: 201 });
}
