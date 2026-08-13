import { prisma } from "../src/lib/prisma";

async function main() {
  const phone = "77079083703";

  // Search clients
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { phone: { contains: "7079083703" } },
        { firstName: { contains: "Ира" } },
        { lastName: { contains: "Ира" } },
      ],
    },
    include: { bookings: { include: { classEvent: true } } },
  });

  console.log("=== CLIENTS ===");
  console.dir(clients, { depth: 5 });

  // Search leads
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { phone: { contains: "7079083703" } },
        { name: { contains: "Ира" } },
      ],
    },
  });
  console.log("=== LEADS ===");
  console.dir(leads, { depth: 5 });

  // Search class events note
  const events = await prisma.classEvent.findMany({
    where: {
      OR: [
        { note: { contains: "7079083703" } },
        { note: { contains: "Ира" } },
        { note: { contains: "Иру" } },
      ],
    },
    include: { bookings: { include: { client: true } }, direction: true, hall: true },
  });

  console.log("=== CLASS EVENTS WITH NOTE (Ира / Иру / phone) ===");
  for (const e of events) {
    console.log(`Event ID: ${e.id} | StartAt: ${e.startAt.toISOString()} | Note: ${e.note} | Bookings: ${e.bookings.length}`);
    for (const b of e.bookings) {
      console.log(`   Client: ${b.client?.firstName} ${b.client?.lastName} (${b.client?.phone})`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
