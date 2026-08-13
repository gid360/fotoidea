import { prisma } from "../src/lib/prisma";

export {};

async function main() {
  const client = await prisma.client.findFirst({
    where: { phone: { contains: "7079083703" } },
    include: {
      bookings: {
        include: { classEvent: true }
      }
    }
  });

  if (!client) return;

  console.log("Inspection of synced prices:");
  client.bookings.forEach((b, idx) => {
    console.log(`${idx + 1}. [${b.classEvent.startAt.toISOString().slice(0, 10)}] Note: "${b.classEvent.note}" | servicePrice: ${b.classEvent.servicePrice} | totalPrice: ${b.classEvent.totalPrice}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
