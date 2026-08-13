import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function inspect() {
  const certs = await prisma.certificate.findMany();
  console.log("Certs in DB:");
  for (const c of certs) {
    console.log({
      id: c.id,
      code: c.code,
      type: c.type,
      nominalAmount: c.nominalAmount,
      planId: c.planId,
      buyerName: c.buyerName,
      buyerPhone: c.buyerPhone,
      peopleCount: c.peopleCount,
      expiresAt: c.expiresAt,
    });
  }

  const plans = await prisma.subscriptionPlan.findMany();
  console.log("Plans in DB:", plans.map(p => ({ id: p.id, name: p.name, price: p.price })));
}

inspect().finally(() => prisma.$disconnect());
