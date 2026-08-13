import { prisma } from "../src/lib/prisma";

async function main() {
  const clientsWithVisits = await prisma.client.findMany({
    where: { firstVisit: { not: null } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      firstVisit: true,
      lastVisit: true,
      bookings: {
        select: {
          note: true,
          classEvent: { select: { startAt: true, note: true } },
        },
      },
    },
    take: 30,
    orderBy: { firstVisit: "asc" },
  });

  console.log(`Found ${clientsWithVisits.length} sample clients with firstVisit NOT null:`);
  for (const c of clientsWithVisits) {
    console.log(`Client: ${c.firstName} ${c.lastName}`);
    console.log(`  firstVisit in DB: ${c.firstVisit?.toISOString()}`);
    console.log(`  lastVisit in DB:  ${c.lastVisit?.toISOString()}`);
    console.log(`  Bookings count: ${c.bookings.length}`);
    for (const b of c.bookings.slice(0, 3)) {
      console.log(`    Booking event startAt: ${b.classEvent?.startAt?.toISOString()} | Note: ${b.classEvent?.note}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
