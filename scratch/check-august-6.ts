import { prisma } from "../src/lib/prisma";

async function main() {
  const start = new Date("2026-08-06T00:00:00.000Z");
  const end = new Date("2026-08-06T23:59:59.999Z");

  const events = await prisma.classEvent.findMany({
    where: {
      startAt: {
        gte: new Date("2026-08-05T00:00:00.000Z"),
        lte: new Date("2026-08-07T23:59:59.999Z"),
      },
    },
    include: {
      direction: true,
      hall: true,
      trainer: { include: { user: true } },
      bookings: { include: { client: true } },
    },
    orderBy: { startAt: "asc" },
  });

  console.log(`Found ${events.length} events around Aug 6:`);
  for (const e of events) {
    const b = e.bookings[0];
    const client = b?.client ? `${b.client.firstName} ${b.client.lastName}` : "No client";
    console.log(`ID: ${e.id} | StartAt: ${e.startAt.toISOString()} | Local: ${e.startAt.toLocaleString("ru-RU")} | Hall: ${e.hall?.name} | Dir: ${e.direction?.name} | Client: ${client}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
