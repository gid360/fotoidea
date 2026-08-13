import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clientsWithBookings = await prisma.client.findMany({
    where: { bookings: { some: {} } },
    take: 5,
    include: {
      bookings: {
        select: {
          createdAt: true,
          classEvent: { select: { startAt: true } },
        },
        orderBy: { classEvent: { startAt: "desc" } },
        take: 1,
      },
    },
  });

  console.log('Clients with bookings count:', clientsWithBookings.length);
  for (const c of clientsWithBookings) {
    const lastBooking = c.bookings[0];
    const lastVisit = lastBooking ? (lastBooking.classEvent?.startAt || lastBooking.createdAt) : null;
    console.log(`${c.lastName} ${c.firstName}: lastVisit = ${lastVisit}`);
  }
}

main().finally(() => prisma.$disconnect());
