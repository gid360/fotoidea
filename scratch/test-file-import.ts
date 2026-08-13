import { PrismaClient, BookingStatus } from "@prisma/client";
import { normalizePhone } from "@/lib/utils";

const prisma = new PrismaClient();

async function testSampleFileImport() {
  console.log("=== ТЕСТИРОВАНИЕ ИМПОРТА ИЗ ФАЙЛА ALTEGIO ===");

  const csvClients = `Имя;Телефон;Email;Примечание
Айгерим Сейткали;+77012345601;aigerim@mail.ru;Утреннее время
Дана Нурланова;+77022345602;dana@gmail.com;Постоянный клиент
Мадина Жаксыбекова;+77052345603;;Новый клиент из Altegio`;

  const lines = csvClients.split("\n");
  let created = 0;

  for (let i = 1; i < lines.length; i++) {
    const [name, rawPhone, email, note] = lines[i].split(";");
    if (!rawPhone) continue;

    const phone = normalizePhone(rawPhone);
    const nameParts = name.trim().split(" ");

    await prisma.client.create({
      data: {
        firstName: nameParts[0] || "Клиент",
        lastName: nameParts.slice(1).join(" ") || "",
        phone,
        email: email || null,
        note: note || "Импортирован из Altegio CSV",
      }
    });
    created++;
  }

  console.log(`✅ Мгновенно создано ${created} клиентов из файла CSV Altegio!`);
}

testSampleFileImport()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
