import { prisma } from "../src/lib/prisma";

async function main() {
  const clientsWithAug6 = await prisma.client.findMany({
    where: {
      OR: [
        { note: { contains: "06.08" } },
        { note: { contains: "6 авг" } },
        { note: { contains: "06.08.2026" } },
        { note: { contains: "Altegio" } },
      ],
    },
    include: {
      bookings: { include: { classEvent: { include: { hall: true, direction: true } } } },
    },
  });

  console.log(`Found ${clientsWithAug6.length} clients with potential August 6 notes`);
  for (const c of clientsWithAug6) {
    if (c.note?.includes("06.08") || c.note?.includes("6 авг") || c.note?.includes("16:00")) {
      console.log(`Client: ${c.firstName} ${c.lastName} (${c.phone}) | Note: ${c.note}`);
    }
  }

  const allBookingsAug6 = await prisma.booking.findMany({
    where: {
      classEvent: {
        startAt: {
          gte: new Date("2026-08-06T00:00:00.000Z"),
          lte: new Date("2026-08-06T23:59:59.999Z"),
        },
      },
    },
    include: { client: true, classEvent: true },
  });

  console.log(`Bookings strictly on August 6 UTC: ${allBookingsAug6.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
