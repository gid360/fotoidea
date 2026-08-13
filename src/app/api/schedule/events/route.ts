import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, addMinutes, subDays, addDays } from "date-fns";
import { BookingStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");
  if (!dateStr && (!startDateStr || !endDateStr)) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  let rangeStart: Date;
  let rangeEnd: Date;

  if (startDateStr && endDateStr) {
    rangeStart = startOfDay(new Date(startDateStr));
    rangeEnd = endOfDay(new Date(endDateStr));
  } else {
    const targetDate = new Date(dateStr!);
    rangeStart = startOfDay(targetDate);
    rangeEnd = endOfDay(targetDate);
  }

  const events = await prisma.classEvent.findMany({
    where: {
      startAt: { gte: rangeStart, lte: rangeEnd },
    },
    include: {
      direction: true,
      trainer: { include: { user: { select: { firstName: true, lastName: true } } } },
      hall: true,
      bookings: {
        include: { client: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { clientId, directionId, trainerId, hallId, startAt, durationMin, note, servicePrice, extraPeopleFee, wardrobeFee, prepayment } = body;

  if (!clientId) {
    return NextResponse.json({ error: "Пожалуйста, выберите клиента для записи" }, { status: 400 });
  }

  if (!directionId || !hallId || !startAt || !durationMin) {
    return NextResponse.json({ error: "Заполните все обязательные поля" }, { status: 400 });
  }

  const start = new Date(startAt);
  const end = addMinutes(start, Number(durationMin));

  const sPrice = Number(servicePrice || 0);
  const ePeople = Number(extraPeopleFee || 0);
  const wFee = Number(wardrobeFee || 0);
  const pPayment = Number(prepayment ?? 5000);
  const totPrice = sPrice + ePeople + wFee;

  // Проверка занятости зала
  const existingEventsInHall = await prisma.classEvent.findMany({
    where: {
      hallId,
      startAt: {
        gte: subDays(start, 1),
        lte: addDays(end, 1),
      },
    },
    select: { id: true, startAt: true, durationMin: true },
  });

  const isHallBusy = existingEventsInHall.some(ev => {
    const evStart = new Date(ev.startAt);
    const evEnd = addMinutes(evStart, ev.durationMin);
    return evStart < end && evEnd > start;
  });

  if (isHallBusy) {
    return NextResponse.json({ error: "Зал занят в это время" }, { status: 409 });
  }

  if (trainerId) {
    const existingEventsForTrainer = await prisma.classEvent.findMany({
      where: {
        trainerId,
        startAt: {
          gte: subDays(start, 1),
          lte: addDays(end, 1),
        },
      },
      select: { id: true, startAt: true, durationMin: true },
    });

    const isTrainerBusy = existingEventsForTrainer.some(ev => {
      const evStart = new Date(ev.startAt);
      const evEnd = addMinutes(evStart, ev.durationMin);
      return evStart < end && evEnd > start;
    });

    if (isTrainerBusy) {
      return NextResponse.json({ error: "Фотограф занят в это время" }, { status: 409 });
    }
  }

  const event = await prisma.classEvent.create({
    data: {
      directionId,
      trainerId: trainerId || null,
      hallId,
      startAt: start,
      durationMin: Number(durationMin),
      note: note || null,
      servicePrice: sPrice,
      extraPeopleFee: ePeople,
      wardrobeFee: wFee,
      prepayment: pPayment,
      totalPrice: totPrice,
    },
    include: {
      direction: true,
      trainer: { include: { user: { select: { firstName: true, lastName: true } } } },
      hall: true,
    },
  });

  const bookingStatus = pPayment > 0 ? BookingStatus.CONFIRMED : BookingStatus.UNCONFIRMED;

  // Создаем привязку бронирования к клиенту
  await prisma.booking.create({
    data: {
      clientId,
      classEventId: event.id,
      status: bookingStatus,
    },
  });

  if (totPrice > 0) {
    await prisma.client.update({
      where: { id: clientId },
      data: { totalSales: { increment: totPrice } },
    }).catch(() => null);
  }

  const fullEvent = await prisma.classEvent.findUnique({
    where: { id: event.id },
    include: {
      direction: true,
      trainer: { include: { user: { select: { firstName: true, lastName: true } } } },
      hall: true,
      bookings: { include: { client: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
    },
  });

  // Аудит-лог
  await prisma.auditLog.create({
    data: {
      action: `Создал занятие: ${event.direction.name} в ${event.hall.name}`,
      userId: session.user.id,
      classEventId: event.id,
    },
  });

  return NextResponse.json(fullEvent, { status: 201 });
}
