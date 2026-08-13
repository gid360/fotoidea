import { prisma } from "../src/lib/prisma";

export {};

async function main() {
  const phone = "7758156856";

  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { phone: { contains: "8156856" } },
        { phone: { contains: "775815" } },
        { note: { contains: "8156856" } },
      ],
    },
  });

  console.log(`Found ${clients.length} clients in DB:`);
  for (const c of clients) {
    console.log(`Client ID: ${c.id} | Name: "${c.firstName}" "${c.lastName}" | Phone: "${c.phone}" | Note: "${c.note}"`);
  }

  // Check GET /api/conversations detail logic for phone 77758156856@c.us or 77758156856
  const lead = await prisma.lead.findFirst({
    where: { phone: { contains: "8156856" } },
  });
  console.log("Lead matching 8156856:", lead);
}

main().catch(console.error).finally(() => prisma.$disconnect());
