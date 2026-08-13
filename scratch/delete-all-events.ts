import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const deletedBookings = await prisma.booking.deleteMany({});
  const deletedEvents = await prisma.classEvent.deleteMany({});
  console.log(`DELETED_BOOKINGS_COUNT: ${deletedBookings.count}`);
  console.log(`DELETED_EVENTS_COUNT: ${deletedEvents.count}`);
}

main().finally(() => prisma.$disconnect());
