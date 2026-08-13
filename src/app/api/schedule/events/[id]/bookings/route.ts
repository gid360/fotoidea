import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: classEventId } = await params;
  const { clientId } = await req.json();

  const event = await prisma.classEvent.findUnique({
    where: { id: classEventId },
    include: { _count: { select: { bookings: true } }, direction: true, hall: true },
  });
  if (!event) return NextResponse.json({ error: "Занятие не найдено" }, { status: 404 });

  if (event._count.bookings >= 1) {
    return NextResponse.json({ error: "На эту услугу уже записан клиент. Можно записать только 1 клиента." }, { status: 400 });
  }

  const existing = await prisma.booking.findUnique({
    where: { clientId_classEventId: { clientId, classEventId } },
  });
  if (existing) return NextResponse.json({ error: "Клиент уже записан" }, { status: 409 });

  const pPayment = Number(event.prepayment || 0);
  const bookingStatus = pPayment > 0 ? BookingStatus.CONFIRMED : BookingStatus.UNCONFIRMED;

  const booking = await prisma.booking.create({
    data: { clientId, classEventId, status: bookingStatus },
    include: { client: { select: { id: true, firstName: true, lastName: true } } },
  });

  await prisma.auditLog.create({
    data: {
      action: `Записал клиента на занятие: ${event.direction.name} в ${event.hall.name}`,
      userId: session.user.id,
      classEventId,
      clientId,
    },
  });

  return NextResponse.json(booking, { status: 201 });
}
