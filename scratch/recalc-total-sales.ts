import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Recalculating totalSales for all clients...");

  const clients = await prisma.client.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      bookings: {
        where: { status: { not: "CANCELLED" } },
        select: {
          classEvent: {
            select: {
              totalPrice: true,
              servicePrice: true,
              extraPeopleFee: true,
              wardrobeFee: true,
            },
          },
        },
      },
    },
  });

  console.log(`Found ${clients.length} clients to process.`);

  let updatedCount = 0;
  let totalRevenueCalculated = 0;

  for (const client of clients) {
    const bookingSum = client.bookings.reduce((sum, b) => {
      const ev = b.classEvent;
      if (!ev) return sum;
      const tot = Number(ev.totalPrice) > 0
        ? Number(ev.totalPrice)
        : (Number(ev.servicePrice || 0) + Number(ev.extraPeopleFee || 0) + Number(ev.wardrobeFee || 0));
      return sum + tot;
    }, 0);

    await prisma.client.update({
      where: { id: client.id },
      data: { totalSales: bookingSum },
    });

    if (bookingSum > 0) {
      updatedCount++;
      totalRevenueCalculated += bookingSum;
    }
  }

  console.log(`Successfully recalculated totalSales for ${clients.length} clients.`);
  console.log(`Clients with > 0 sales: ${updatedCount}. Total calculated revenue: ${totalRevenueCalculated} KZT.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
