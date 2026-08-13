import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.client.deleteMany({ where: { phone: '+77071112233' } });
}
main().finally(() => prisma.$disconnect());
