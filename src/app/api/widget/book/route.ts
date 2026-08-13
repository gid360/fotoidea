import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { normalizePhone, calcExtraPeopleFee } from "@/lib/utils";

const schema = z.object({
  hallId:      z.string().min(1),
  serviceId:   z.string().optional(),
  date:        z.string().min(1), // YYYY-MM-DD
  time:        z.string().min(1), // HH:mm
  peopleCount: z.number().int().min(1).optional().default(1),
  firstName:   z.string().min(1),
  lastName:    z.string().optional().default(""),
  phone:       z.string().min(7),
  email:       z.string().email().optional().nullable(),
  note:        z.string().optional(),
});

export async function POST(req: NextRequest) {
  const raw  = schema.parse(await req.json());
  const body = { ...raw, phone: normalizePhone(raw.phone) };

  const startAt = new Date(`${body.date}T${body.time}:00`);
  if (isNaN(startAt.getTime())) {
    return NextResponse.json({ error: "Некорректная дата или время" }, { status: 400 });
  }

  // 1. Check if hall exists and is active
  const hall = await prisma.hall.findUnique({ where: { id: body.hallId } });
  if (!hall || !hall.isActive) {
    return NextResponse.json({ error: "Зал не найден или недоступен" }, { status: 404 });
  }

  // 2. Determine service details
  let serviceName = "Аренда зала";
  let servicePrice = 15000;
  let durationMin = 60;
  let includedPeople: number | undefined = undefined;
  let directionId: string | null = null;

  let isPerPerson = false;
  let priceTiers: any = null;
  if (body.serviceId) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: body.serviceId } });
    if (plan) {
      serviceName = plan.name;
      servicePrice = Number(plan.price);
      durationMin = plan.durationMin || 60;
      includedPeople = plan.peopleCount;
      isPerPerson = plan.isPerPerson;
      priceTiers = plan.priceTiers;
    }
  }

  // Find a matching training direction or default first
  const firstDir = await prisma.trainingDirection.findFirst({ where: { isActive: true } });
  if (firstDir) {
    directionId = firstDir.id;
  } else {
    const newDir = await prisma.trainingDirection.create({
      data: { name: "Фотосессия", colorHex: "#3B82F6" },
    });
    directionId = newDir.id;
  }

  // 3. Collision check: check if hall is already occupied at startAt
  const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);
  const existingEvents = await prisma.classEvent.findMany({
    where: {
      hallId: body.hallId,
      startAt: { gte: new Date(startAt.getTime() - 24 * 60 * 60 * 1000), lt: new Date(startAt.getTime() + 24 * 60 * 60 * 1000) },
    },
  });

  const isCollision = existingEvents.some(e => {
    const evStart = new Date(e.startAt);
    const evEnd = new Date(evStart.getTime() + (e.durationMin || 60) * 60 * 1000);
    return startAt < evEnd && endAt > evStart;
  });

  if (isCollision) {
    return NextResponse.json({ error: "К сожалению, этот слот времени уже забронирован" }, { status: 409 });
  }

  // 4. Calculate extra people fee
  const isRent = serviceName.toLowerCase().includes("аренда");
  const { fee: extraPeopleFee } = calcExtraPeopleFee(
    serviceName,
    body.peopleCount,
    isRent,
    hall.name,
    includedPeople,
    isPerPerson,
    servicePrice,
    priceTiers
  );
  const totalPrice = servicePrice + extraPeopleFee;

  // 5. Create ClassEvent for this online booking
  const classEvent = await prisma.classEvent.create({
    data: {
      startAt,
      durationMin,
      directionId,
      hallId: body.hallId,
      servicePrice,
      extraPeopleFee,
      totalPrice,
      note: `Онлайн-бронирование: ${serviceName} (${body.peopleCount} чел.)${body.note ? ` · ${body.note}` : ""}`,
    },
  });

  // 6. Find or create Client by phone
  let client = await prisma.client.findFirst({
    where: { phone: body.phone },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        firstName: body.firstName,
        lastName:  body.lastName,
        phone:     body.phone,
        email:     body.email,
      },
    });
  }

  // 7. Create Booking
  const booking = await prisma.booking.create({
    data: {
      clientId:    client.id,
      classEventId: classEvent.id,
      status:      "CONFIRMED",
    },
  });

  // 8. Create Lead for CRM tracking
  await prisma.lead.create({
    data: {
      source:   "WIDGET",
      name:     body.lastName ? `${body.firstName} ${body.lastName}`.trim() : body.firstName,
      phone:    body.phone,
      clientId: client.id,
      note:     `Онлайн-запись в ${hall.name}: ${serviceName} на ${startAt.toLocaleDateString("ru-KZ")} ${body.time}`,
    },
  }).catch(() => null);

  return NextResponse.json({ ok: true, bookingId: booking.id, classEventId: classEvent.id });
}
