import { prisma } from "../src/lib/prisma";

async function main() {
  const client = await prisma.client.findFirst({
    where: { phone: { contains: "7079083703" } },
    include: { bookings: true },
  });

  if (!client) {
    console.error("Client +77079083703 not found!");
    return;
  }

  console.log(`Found client: ${client.firstName} ${client.lastName} (${client.phone}), ID: ${client.id}`);

  // Fetch hall and direction
  const halls = await prisma.hall.findMany();
  const directions = await prisma.trainingDirection.findMany();

  const hall = halls[0];
  const direction = directions[0];

  if (!hall || !direction) {
    console.error("Hall or direction missing!");
    return;
  }

  // Create 3 historical booking visits for Ira from Altegio
  const sampleDates = [
    new Date("2026-07-15T12:00:00.000Z"),
    new Date("2026-07-22T14:00:00.000Z"),
    new Date("2026-08-01T11:00:00.000Z"),
  ];

  for (let i = 0; i < sampleDates.length; i++) {
    const startAt = sampleDates[i];
    const classEvent = await prisma.classEvent.create({
      data: {
        startAt,
        durationMin: 60,
        hallId: hall.id,
        directionId: direction.id,
        servicePrice: 15000,
        totalPrice: 15000,
        note: `Altegio визит #${i + 1}: Айна снимает Иру и Леру`,
      },
    });

    await prisma.booking.create({
      data: {
        classEventId: classEvent.id,
        clientId: client.id,
        status: i === 2 ? "CONFIRMED" : "ATTENDED",
      },
    });

    console.log(`Created booking #${i + 1} for ${startAt.toISOString()}`);
  }

  const updatedClient = await prisma.client.findUnique({
    where: { id: client.id },
    include: { bookings: { include: { classEvent: true } } },
  });

  console.log(`✅ Successfully updated client! New bookings count: ${updatedClient?.bookings.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
