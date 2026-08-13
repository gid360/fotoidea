import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Очистка всех клиентов и записей расписания...");

  // 1. Удаление бронирований клиентов
  const deletedBookings = await prisma.booking.deleteMany({});
  console.log(`Удалено бронирований: ${deletedBookings.count}`);

  // 2. Удаление начислений зарплат по занятиям
  const deletedEarnings = await prisma.trainerEarning.deleteMany({});
  console.log(`Удалено начислений зарплаты: ${deletedEarnings.count}`);

  // 3. Удаление занятий/съемок расписания (ClassEvent)
  const deletedEvents = await prisma.classEvent.deleteMany({});
  console.log(`Удалено записей расписания: ${deletedEvents.count}`);

  // 4. Удаление аудит-логов по клиентам и занятиям
  const deletedAudit = await prisma.auditLog.deleteMany({
    where: { OR: [{ clientId: { not: null } }, { classEventId: { not: null } }] },
  });
  console.log(`Удалено аудит-логов: ${deletedAudit.count}`);

  // 5. Удаление кассовых транзакций по клиентам
  const deletedTransactions = await prisma.cashTransaction.deleteMany({
    where: { clientId: { not: null } },
  });
  console.log(`Удалено кассовых транзакций клиентов: ${deletedTransactions.count}`);

  // 6. Удаление клиентов
  const deletedClients = await prisma.client.deleteMany({});
  console.log(`Удалено клиентов: ${deletedClients.count}`);

  console.log("База данных успешно очищена!");
}

main()
  .catch((e) => {
    console.error("Ошибка очистки:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
