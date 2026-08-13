import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = await prisma.classEvent.findUnique({
    where: { id },
    include: {
      direction: true,
      trainer: { include: { user: { select: { firstName: true, lastName: true } } } },
      hall: true,
      bookings: {
        include: { client: { select: { id: true, firstName: true, lastName: true, phone: true } } },
        orderBy: { createdAt: "asc" },
      },
      auditLogs: {
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!event) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  if (body.servicePrice !== undefined || body.extraPeopleFee !== undefined || body.wardrobeFee !== undefined || body.prepayment !== undefined) {
    const existing = await prisma.classEvent.findUnique({ where: { id } });
    if (existing) {
      const sPrice = body.servicePrice !== undefined ? Number(body.servicePrice) : Number(existing.servicePrice);
      const ePeople = body.extraPeopleFee !== undefined ? Number(body.extraPeopleFee) : Number(existing.extraPeopleFee);
      const wFee = body.wardrobeFee !== undefined ? Number(body.wardrobeFee) : Number(existing.wardrobeFee);
      if (body.prepayment !== undefined) {
        const pVal = Number(body.prepayment);
        body.prepayment = pVal;
        if (pVal > 0) {
          await prisma.booking.updateMany({
            where: { classEventId: id, status: "UNCONFIRMED" },
            data: { status: "CONFIRMED" },
          });
        }
      }
      body.servicePrice = sPrice;
      body.extraPeopleFee = ePeople;
      body.wardrobeFee = wFee;
      body.totalPrice = sPrice + ePeople + wFee;
    }
  }

  const event = await prisma.classEvent.update({
    where: { id },
    data: body,
    include: {
      direction: true,
      trainer: { include: { user: { select: { firstName: true, lastName: true } } } },
      hall: true,
      bookings: { include: { client: { select: { id: true, firstName: true, lastName: true } } } },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: `Обновил занятие: ${event.direction.name}`,
      userId: session.user.id,
      classEventId: event.id,
    },
  });

  return NextResponse.json(event);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.classEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
