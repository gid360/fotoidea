import { prisma } from "../src/lib/prisma";

async function main() {
  const logs = await prisma.auditLog.findMany({
    where: {
      action: { contains: "Altegio" },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  console.log("Altegio Audit Logs:", logs);

  const eventsWithAltegio = await prisma.classEvent.findMany({
    where: {
      note: { contains: "Altegio #" },
    },
    include: {
      bookings: { include: { client: true } },
      hall: true,
      direction: true,
    },
    orderBy: { startAt: "desc" },
    take: 30,
  });

  console.log(`Found ${eventsWithAltegio.length} events with Altegio marker:`);
  for (const e of eventsWithAltegio) {
    console.log(`Note: ${e.note} | StartAt: ${e.startAt.toISOString()} | Local: ${e.startAt.toLocaleString("ru-RU")} | Client: ${e.bookings[0]?.client?.firstName} ${e.bookings[0]?.client?.lastName}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
