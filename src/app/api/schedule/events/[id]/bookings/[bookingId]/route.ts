import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";

const STATUS_LABELS: Record<BookingStatus, string> = {
  UNCONFIRMED: "Забронирован",
  CONFIRMED: "Подтвержден",
  ATTENDED: "Пришел",
  ABSENT: "Не пришел",
  CANCELLED: "Отмена записи",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bookingId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: classEventId, bookingId } = await params;
  const { status } = await req.json();

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status },
    include: { client: { select: { id: true, firstName: true, lastName: true } } },
  });


  // Лог изменения статуса
  const userName = `${session.user.name}`;
  const now = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  await prisma.auditLog.create({
    data: {
      action: `Администратор ${userName} изменил статус на '${STATUS_LABELS[status as BookingStatus]}' в ${now}`,
      userId: session.user.id,
      classEventId,
      clientId: booking.clientId,
    },
  });

  return NextResponse.json(booking);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; bookingId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId } = await params;
  await prisma.booking.delete({ where: { id: bookingId } });
  return NextResponse.json({ ok: true });
}
