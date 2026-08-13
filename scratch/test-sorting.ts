import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Testing lastVisit orderBy...");
  try {
    const res = await prisma.client.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc"
      }
    });
    console.log("res count:", res.length);
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

main().finally(() => prisma.$disconnect());
