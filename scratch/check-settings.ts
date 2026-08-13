import { prisma } from "../src/lib/prisma";

async function main() {
  const settings = await prisma.setting.findMany();
  console.log("Settings:", settings);
}

main().catch(console.error).finally(() => prisma.$disconnect());
