import { prisma } from "../src/lib/prisma";

async function main() {
  const allEvents = await prisma.classEvent.findMany({
    include: {
      direction: true,
      hall: true,
      bookings: { include: { client: true } },
    },
    orderBy: { startAt: "asc" },
  });

  console.log(`Total events in DB: ${allEvents.length}`);
  for (const e of allEvents) {
    const b = e.bookings[0];
    const clientName = b?.client ? `${b.client.firstName} ${b.client.lastName}` : "No client";
    console.log(`[${e.startAt.toISOString()}] (Local: ${e.startAt.toLocaleString("ru-RU")}) | Hall: ${e.hall.name} | Dir: ${e.direction.name} | Client: ${clientName} | Note: ${e.note}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
