import { prisma } from "../src/lib/prisma";

export {};

async function main() {
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { firstName: { contains: "Fotoidea", mode: "insensitive" } },
        { lastName: { contains: "Fotoidea", mode: "insensitive" } },
        { phone: { contains: "775" } },
        { phone: { contains: "815" } },
      ],
    },
  });

  console.log("=== CLIENTS ===");
  for (const c of clients) {
    console.log(`ID: ${c.id} | Name: "${c.firstName}" "${c.lastName}" | Phone: "${c.phone}"`);
  }

  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { name: { contains: "Fotoidea", mode: "insensitive" } },
        { phone: { contains: "775" } },
        { phone: { contains: "815" } },
      ],
    },
  });

  console.log("=== LEADS ===");
  for (const l of leads) {
    console.log(`ID: ${l.id} | Name: "${l.name}" | Phone: "${l.phone}"`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
