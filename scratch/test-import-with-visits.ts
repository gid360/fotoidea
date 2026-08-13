import { PrismaClient } from "@prisma/client";
import { normalizePhone } from "@/lib/utils";

const prisma = new PrismaClient();

async function testImportWithVisits() {
  console.log("=== ТЕСТ ИМПОРТА КЛИЕНТОВ С ВИЗИТАМИ И ДАТАМИ ===");

  // Cleanup test client if exists
  await prisma.client.deleteMany({ where: { phone: "+77071112233" } });

  const testClientData = {
    firstName: "Алия",
    lastName: "Ахметова",
    phone: normalizePhone("+77071112233"),
    firstVisit: new Date("2023-03-15T10:00:00Z"),
    lastVisit: new Date("2024-11-20T16:30:00Z"),
    visitsCount: 6,
  };

  const client = await prisma.client.create({
    data: {
      firstName: testClientData.firstName,
      lastName: testClientData.lastName,
      phone: testClientData.phone,
      createdAt: testClientData.firstVisit,
    },
  });

  const defaultHall = await prisma.hall.findFirst({ where: { isActive: true } }) ||
    await prisma.hall.create({ data: { name: "Основной зал", colorHex: "#3B82F6" } });
  const defaultDirection = await prisma.trainingDirection.findFirst({ where: { isActive: true } }) ||
    await prisma.trainingDirection.create({ data: { name: "Съёмка", colorHex: "#8B5CF6" } });

  const startMs = testClientData.firstVisit.getTime();
  const endMs = testClientData.lastVisit.getTime();
  const count = testClientData.visitsCount;

  for (let v = 0; v < count; v++) {
    const progress = v / (count - 1);
    const visitDate = new Date(startMs + progress * (endMs - startMs));

    const event = await prisma.classEvent.create({
      data: {
        startAt: visitDate,
        durationMin: 60,
        hallId: defaultHall.id,
        directionId: defaultDirection.id,
      },
    });

    await prisma.booking.create({
      data: {
        clientId: client.id,
        classEventId: event.id,
        status: "ATTENDED",
      },
    });
  }

  // Fetch client via query logic
  const fetched = await prisma.client.findUnique({
    where: { id: client.id },
    include: {
      _count: { select: { bookings: true } },
      bookings: {
        select: { createdAt: true, classEvent: { select: { startAt: true } } },
        orderBy: { classEvent: { startAt: "asc" } },
      },
    },
  });

  if (fetched) {
    const firstB = fetched.bookings[0];
    const lastB = fetched.bookings[fetched.bookings.length - 1];
    console.log("Клиент:", fetched.lastName, fetched.firstName);
    console.log("Количество посещений в БД:", fetched._count.bookings);
    console.log("Первый визит в БД:", firstB?.classEvent?.startAt);
    console.log("Последний визит в БД:", lastB?.classEvent?.startAt);
  }
}

testImportWithVisits()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
