import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Populating firstVisit and lastVisit (past visits only)...");

  const now = new Date();

  const clients = await prisma.client.findMany({
    select: {
      id: true,
      createdAt: true,
      bookings: {
        where: {
          status: { not: "CANCELLED" },
          classEvent: { startAt: { lte: now } },
        },
        select: {
          createdAt: true,
          classEvent: { select: { startAt: true } },
        },
        orderBy: { classEvent: { startAt: "asc" } },
      },
    },
  });

  console.log(`Found ${clients.length} clients to process.`);

  let countWithVisits = 0;
  for (const c of clients) {
    let firstVisit: Date | null = null;
    let lastVisit: Date | null = null;

    if (c.bookings.length > 0) {
      const firstB = c.bookings[0];
      const lastB = c.bookings[c.bookings.length - 1];

      firstVisit = firstB.classEvent?.startAt || firstB.createdAt || null;
      lastVisit = lastB.classEvent?.startAt || lastB.createdAt || null;
      countWithVisits++;
    }

    await prisma.client.update({
      where: { id: c.id },
      data: {
        firstVisit,
        lastVisit,
      },
    });
  }

  console.log(`Successfully updated firstVisit and lastVisit for ${clients.length} clients.`);
  console.log(`Clients with past visits: ${countWithVisits}.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
