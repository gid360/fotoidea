import { prisma } from "../src/lib/prisma";

async function main() {
  const eventsCount = await prisma.classEvent.count();
  const bookingsCount = await prisma.booking.count();
  console.log(`Total ClassEvents in DB: ${eventsCount}`);
  console.log(`Total Bookings in DB:    ${bookingsCount}`);

  const sampleEvents = await prisma.classEvent.findMany({
    take: 20,
    orderBy: { startAt: "asc" },
    include: {
      bookings: {
        include: {
          client: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  console.log("\nEarliest 20 ClassEvents in DB:");
  for (const e of sampleEvents) {
    console.log(`Event ID: ${e.id} | startAt: ${e.startAt.toISOString()} | note: ${e.note}`);
    console.log(`  Bookings count: ${e.bookings.length}`);
    for (const b of e.bookings) {
      console.log(`    Client: ${b.client?.firstName} ${b.client?.lastName} | status: ${b.status}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
