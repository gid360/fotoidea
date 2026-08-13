import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkAndClean() {
  const clients = await prisma.client.findMany();
  console.log("Клиенты в базе:", JSON.stringify(clients, null, 2));

  // Удаляем тестовые/демо записи
  const deleted = await prisma.client.deleteMany();
  console.log(`Удалено демо-клиентов: ${deleted.count}`);
}

checkAndClean()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
