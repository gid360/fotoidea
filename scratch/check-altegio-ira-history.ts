import { prisma } from "../src/lib/prisma";

async function main() {
  const client = await prisma.client.findFirst({
    where: { phone: { contains: "7079083703" } },
  });

  if (!client) {
    console.log("Client not found!");
    return;
  }

  console.log("Client details:");
  console.log(`ID: ${client.id}`);
  console.log(`Name: ${client.firstName} ${client.lastName}`);
  console.log(`Phone: ${client.phone}`);
  console.log(`Email: ${client.email}`);
  console.log(`First Visit: ${client.firstVisit?.toISOString() || "None"}`);
  console.log(`Last Visit: ${client.lastVisit?.toISOString() || "None"}`);
  console.log(`Note: \n${client.note}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
