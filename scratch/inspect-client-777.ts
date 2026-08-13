import { prisma } from "../src/lib/prisma";

export {};

async function main() {
  const clients = await prisma.client.findMany({
    where: {
      phone: { contains: "7717888" },
    },
  });

  console.log(`Found ${clients.length} clients in DB:`);
  for (const c of clients) {
    console.log(`ID: ${c.id}`);
    console.log(`firstName: "${c.firstName}"`);
    console.log(`lastName: "${c.lastName}"`);
    console.log(`phone: "${c.phone}"`);
    console.log(`note: "${c.note}"`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
