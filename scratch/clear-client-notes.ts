import { prisma } from "../src/lib/prisma";

export {};

async function main() {
  console.log("=== ОЧИСТКА ПОЛЕЙ ПРИМЕЧАНИЙ (NOTE) У ВСЕХ КЛИЕНТОВ ===");

  const res = await prisma.client.updateMany({
    data: {
      note: null,
    },
  });

  console.log(`✅ Успешно очищены примечания у ${res.count} клиентов!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
