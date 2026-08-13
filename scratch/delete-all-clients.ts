import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.client.deleteMany({});
  console.log('DELETED_CLIENTS_COUNT:', result.count);
}

main()
  .catch((e) => {
    console.error('Error deleting clients:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
