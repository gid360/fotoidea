import { prisma } from "../src/lib/prisma";

async function main() {
  const client = await prisma.client.findFirst({
    where: { phone: { contains: "7079083703" } },
    include: { bookings: { include: { classEvent: true } } },
  });

  if (!client) {
    console.error("Client +77079083703 not found!");
    return;
  }

  const halls = await prisma.hall.findMany();
  const directions = await prisma.trainingDirection.findMany();

  const hall = halls[0];
  const direction = directions[0];

  // Create an UNCONFIRMED booking visit for Ira
  const startAt = new Date("2026-08-10T15:00:00.000Z");
  const classEvent = await prisma.classEvent.create({
    data: {
      startAt,
      durationMin: 60,
      hallId: hall.id,
      directionId: direction.id,
      servicePrice: 15000,
      totalPrice: 15000,
      note: `Altegio неподтвержденный визит: Айна снимает Иру и Леру`,
    },
  });

  await prisma.booking.create({
    data: {
      classEventId: classEvent.id,
      clientId: client.id,
      status: "UNCONFIRMED",
    },
  });

  const updatedClient = await prisma.client.findUnique({
    where: { id: client.id },
    include: { bookings: { include: { classEvent: true } } },
  });

  console.log(`✅ Added UNCONFIRMED visit! Total bookings for Ira: ${updatedClient?.bookings.length}`);
  for (const b of updatedClient?.bookings || []) {
    console.log(` - Booking ID: ${b.id} | Status: ${b.status} | StartAt: ${b.classEvent.startAt.toISOString()}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
