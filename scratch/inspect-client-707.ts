import { prisma } from "../src/lib/prisma";

async function main() {
  const phone = "77079083703";
  const clients = await prisma.client.findMany({
    where: {
      phone: { contains: "7079083703" },
    },
    include: {
      bookings: {
        include: {
          classEvent: {
            include: { direction: true, hall: true },
          },
        },
      },
    },
  });

  console.log(`Found ${clients.length} clients for ${phone}:`);
  for (const c of clients) {
    console.log(`ID: ${c.id} | Name: ${c.firstName} ${c.lastName} | Phone: ${c.phone} | Note: ${c.note}`);
    console.log(`Total Bookings in DB: ${c.bookings.length}`);
    for (const b of c.bookings) {
      console.log(` - Booking ID: ${b.id} | Status: ${b.status} | StartAt: ${b.classEvent.startAt.toISOString()} | Dir: ${b.classEvent.direction.name}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
