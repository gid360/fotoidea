import { prisma } from "../src/lib/prisma";

async function main() {
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { email: { contains: "panama_cloud@mail.ru" } },
        { phone: { contains: "7079083703" } },
      ],
    },
    include: { bookings: true },
  });

  console.log(`Found ${clients.length} matching client records:`);
  for (const c of clients) {
    console.log(`ID: ${c.id} | Name: ${c.firstName} ${c.lastName} | Phone: ${c.phone} | Email: ${c.email} | Bookings: ${c.bookings.length}`);
    console.log(`Note:\n${c.note}\n---`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
