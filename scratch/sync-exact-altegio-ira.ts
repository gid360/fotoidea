import { prisma } from "../src/lib/prisma";

async function main() {
  const phone = "+77079083703";
  const client = await prisma.client.findFirst({
    where: { phone: { contains: "7079083703" } },
  });

  if (!client) {
    console.error("Client not found!");
    return;
  }

  // Clear existing dummy bookings for clean 1-to-1 sync from Altegio
  await prisma.booking.deleteMany({ where: { clientId: client.id } });

  const halls = await prisma.hall.findMany();
  const directions = await prisma.trainingDirection.findMany();

  const mainHall = halls.find(h => h.name.includes("Большой")) || halls[0];
  const smallHall = halls.find(h => h.name.includes("Малый")) || halls[0];
  const rentDir = directions.find(d => d.name.includes("Аренда")) || directions[0];
  const photoDir = directions.find(d => d.name.includes("Фотосессия")) || directions[0];

  const altegioRecords = [
    {
      id: "664131845",
      startAt: new Date("2026-08-03T20:00:00.000Z"),
      status: "CONFIRMED" as const,
      hall: smallHall,
      dir: rentDir,
      note: "Altegio #664131845: Аренда Малый зал",
      price: 15000,
    },
    {
      id: "663139336",
      startAt: new Date("2026-08-01T16:00:00.000Z"),
      status: "CANCELLED" as const,
      hall: mainHall,
      dir: photoDir,
      note: "Altegio #663139336: Фотосессия 45 минут (Отмена)",
      price: 15000,
    },
    {
      id: "662536373",
      startAt: new Date("2026-07-25T15:00:00.000Z"),
      status: "CONFIRMED" as const,
      hall: smallHall,
      dir: rentDir,
      note: "Altegio #662536373: Аренда Малый зал (5000 п)",
      price: 15000,
    },
    {
      id: "658364321",
      startAt: new Date("2026-07-05T20:00:00.000Z"),
      status: "CONFIRMED" as const,
      hall: mainHall,
      dir: rentDir,
      note: "Altegio #658364321: по бартеру Эльмира Магзомова с инсты",
      price: 15000,
    },
  ];

  for (const r of altegioRecords) {
    const classEvent = await prisma.classEvent.create({
      data: {
        startAt: r.startAt,
        durationMin: 60,
        hallId: r.hall.id,
        directionId: r.dir.id,
        servicePrice: r.price,
        totalPrice: r.price,
        note: r.note,
      },
    });

    await prisma.booking.create({
      data: {
        classEventId: classEvent.id,
        clientId: client.id,
        status: r.status,
      },
    });
  }

  const updated = await prisma.client.findUnique({
    where: { id: client.id },
    include: { bookings: { include: { classEvent: true } } },
  });

  console.log(`\n🎉 УСПЕШНО СИНХРОНИЗИРОВАНО С ALTEGIO API!`);
  console.log(`Записей в CRM для Иры: ${updated?.bookings.length}`);
  for (const b of updated?.bookings || []) {
    console.log(` - ID: ${b.classEvent.note} | Date: ${b.classEvent.startAt.toISOString()} | Status: ${b.status}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
