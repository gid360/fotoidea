import { PrismaClient, LoyaltyTag } from "@prisma/client";

const prisma = new PrismaClient();

const clients = [
  { firstName: "Айгерим",  lastName: "Сейткали",   phone: "+7 701 234 5601", email: "aigеrim@mail.ru",     birthDate: "1992-03-15", loyaltyTag: LoyaltyTag.REGULAR, depositBalance: 5000,  note: "Предпочитает утренние занятия" },
  { firstName: "Дана",     lastName: "Нурланова",   phone: "+7 702 234 5602", email: "dana.n@gmail.com",    birthDate: "1988-07-22", loyaltyTag: LoyaltyTag.REGULAR, depositBalance: 12000, note: null },
  { firstName: "Мадина",   lastName: "Жаксыбекова", phone: "+7 705 234 5603", email: null,                  birthDate: "1995-11-30", loyaltyTag: LoyaltyTag.NEW,     depositBalance: 0,     note: "Пришла по рекомендации" },
  { firstName: "Асель",    lastName: "Бекова",      phone: "+7 707 234 5604", email: "asel.b@mail.ru",      birthDate: "1990-05-14", loyaltyTag: LoyaltyTag.LOST,    depositBalance: 500,   note: "Была активна до апреля" },
  { firstName: "Жансая",   lastName: "Умирова",     phone: "+7 771 234 5605", email: null,                  birthDate: "1997-09-08", loyaltyTag: LoyaltyTag.NEW,     depositBalance: 3000,  note: null },
  { firstName: "Арман",    lastName: "Касымов",     phone: "+7 777 234 5606", email: "arman.k@gmail.com",   birthDate: "1985-01-20", loyaltyTag: LoyaltyTag.REGULAR, depositBalance: 8500,  note: "Тренируется 3 раза в неделю" },
  { firstName: "Нурлан",   lastName: "Ахметов",     phone: "+7 700 234 5607", email: "nurlan.a@mail.ru",    birthDate: "1993-06-03", loyaltyTag: LoyaltyTag.REGULAR, depositBalance: 0,     note: null },
  { firstName: "Санжар",   lastName: "Дюсенов",     phone: "+7 701 234 5608", email: null,                  birthDate: "2000-12-25", loyaltyTag: LoyaltyTag.NEW,     depositBalance: 2000,  note: "Студент, скидка 10%" },
  { firstName: "Алия",     lastName: "Маратова",    phone: "+7 702 234 5609", email: "aliya.m@gmail.com",   birthDate: "1991-04-17", loyaltyTag: LoyaltyTag.LOST,    depositBalance: 0,     note: "Не приходит с февраля" },
  { firstName: "Камила",   lastName: "Рахимова",    phone: "+7 705 234 5610", email: "kamila.r@mail.ru",    birthDate: "1996-08-12", loyaltyTag: LoyaltyTag.REGULAR, depositBalance: 15000, note: "VIP клиент" },
];

async function main() {
  // Удаляем старые демо-клиенты чтобы не дублировать
  await prisma.client.deleteMany({
    where: { phone: { in: clients.map(c => c.phone) } },
  });

  await prisma.client.createMany({
    data: clients.map(c => ({
      ...c,
      birthDate: new Date(c.birthDate),
    })),
  });

  console.log(`Добавлено ${clients.length} демо-клиентов`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
