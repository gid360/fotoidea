import { prisma } from "../src/lib/prisma";

async function main() {
  const clientsWithVisitAug6 = await prisma.client.findMany({
    where: {
      OR: [
        {
          firstVisit: {
            gte: new Date("2026-08-06T00:00:00.000Z"),
            lte: new Date("2026-08-06T23:59:59.999Z"),
          },
        },
        {
          lastVisit: {
            gte: new Date("2026-08-06T00:00:00.000Z"),
            lte: new Date("2026-08-06T23:59:59.999Z"),
          },
        },
      ],
    },
  });

  console.log(`Found ${clientsWithVisitAug6.length} clients with visit on August 6:`);
  for (const c of clientsWithVisitAug6) {
    console.log(`ID: ${c.id} | Name: ${c.firstName} ${c.lastName} | Phone: ${c.phone} | FirstVisit: ${c.firstVisit?.toISOString()} | LastVisit: ${c.lastVisit?.toISOString()}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
