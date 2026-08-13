import { prisma } from "../src/lib/prisma";

export {};

async function verifyBookings() {
  const client = await prisma.client.findFirst({
    where: { phone: { contains: "7079083703" } },
    include: {
      bookings: {
        include: { classEvent: { include: { hall: true, direction: true } } },
        orderBy: { classEvent: { startAt: "desc" } },
      },
    },
  });

  if (!client) {
    console.log("Client not found!");
    return;
  }

  console.log(`=== ПРОВЕРКА КАРТОЧКИ КЛИЕНТА В CRM ===`);
  console.log(`Имя: ${client.firstName} ${client.lastName}`);
  console.log(`Телефон: ${client.phone}`);
  console.log(`Всего записей в базе CRM: ${client.bookings.length}`);
  console.log(`Всего визитов (не отменённых): ${client.bookings.filter(b => b.status !== "CANCELLED").length}\n`);

  client.bookings.forEach((b, idx) => {
    console.log(`${idx + 1}. [${b.classEvent.startAt.toISOString().slice(0, 16)}] Status: ${b.status} | Note: ${b.classEvent.note}`);
  });
}

verifyBookings().catch(console.error).finally(() => prisma.$disconnect());
