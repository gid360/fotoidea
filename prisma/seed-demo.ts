/**
 * DEMO DATA — не удалять, используется для демонстрации системы
 */
import { PrismaClient, UserRole, LoyaltyTag, BookingStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, setHours, setMinutes } from "date-fns";

const prisma = new PrismaClient();

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function day(offset: number, hour: number, minute = 0) {
  return setMinutes(setHours(addDays(TODAY, offset), hour), minute);
}

async function main() {
  // ─── 1. Демо-клиенты ──────────────────────────────────────────
  const clientsData = [
    { firstName: "Айгерим",  lastName: "Сейткали",   phone: "+7 701 234 5601", email: "aigеrim@mail.ru",   birthDate: "1992-03-15", loyaltyTag: LoyaltyTag.REGULAR, depositBalance: 5000 },
    { firstName: "Дана",     lastName: "Нурланова",   phone: "+7 702 234 5602", email: "dana.n@gmail.com",  birthDate: "1988-07-22", loyaltyTag: LoyaltyTag.REGULAR, depositBalance: 12000 },
    { firstName: "Мадина",   lastName: "Жаксыбекова", phone: "+7 705 234 5603", email: null,                birthDate: "1995-11-30", loyaltyTag: LoyaltyTag.NEW,     depositBalance: 0 },
    { firstName: "Асель",    lastName: "Бекова",      phone: "+7 707 234 5604", email: "asel.b@mail.ru",    birthDate: "1990-05-14", loyaltyTag: LoyaltyTag.LOST,    depositBalance: 500 },
    { firstName: "Жансая",   lastName: "Умирова",     phone: "+7 771 234 5605", email: null,                birthDate: "1997-09-08", loyaltyTag: LoyaltyTag.NEW,     depositBalance: 3000 },
    { firstName: "Арман",    lastName: "Касымов",     phone: "+7 777 234 5606", email: "arman.k@gmail.com", birthDate: "1985-01-20", loyaltyTag: LoyaltyTag.REGULAR, depositBalance: 8500 },
    { firstName: "Нурлан",   lastName: "Ахметов",     phone: "+7 700 234 5607", email: "nurlan.a@mail.ru",  birthDate: "1993-06-03", loyaltyTag: LoyaltyTag.REGULAR, depositBalance: 0 },
    { firstName: "Санжар",   lastName: "Дюсенов",     phone: "+7 701 234 5608", email: null,                birthDate: "2000-12-25", loyaltyTag: LoyaltyTag.NEW,     depositBalance: 2000 },
    { firstName: "Алия",     lastName: "Маратова",    phone: "+7 702 234 5609", email: "aliya.m@gmail.com", birthDate: "1991-04-17", loyaltyTag: LoyaltyTag.LOST,    depositBalance: 0 },
    { firstName: "Камила",   lastName: "Рахимова",    phone: "+7 705 234 5610", email: "kamila.r@mail.ru",  birthDate: "1996-08-12", loyaltyTag: LoyaltyTag.REGULAR, depositBalance: 15000 },
  ];

  // Удалим и пересоздадим по телефону
  await prisma.client.deleteMany({ where: { phone: { in: clientsData.map(c => c.phone) } } });
  const clients = await Promise.all(
    clientsData.map(c =>
      prisma.client.create({
        data: { ...c, birthDate: new Date(c.birthDate), note: null },
      })
    )
  );
  console.log(`✓ Клиенты: ${clients.length}`);

  // ─── 2. Демо-специалисты / Фотографы ──────────────────────────
  const passwordHash = await bcrypt.hash("trainer123", 10);

  const trainerUsersData = [
    { firstName: "Гульнара", lastName: "Ахметова", email: "photographer1@fotoidea.kz", specializations: ["Индивидуальная съёмка", "Fashion / Контент"] },
    { firstName: "Максат",   lastName: "Бердиев",  email: "photographer2@fotoidea.kz", specializations: ["Предметная съёмка", "Семейная / Парная съёмка"] },
  ];

  const trainers: { id: string }[] = [];
  for (const t of trainerUsersData) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        email: t.email,
        firstName: t.firstName,
        lastName: t.lastName,
        role: UserRole.TRAINER,
        passwordHash,
        isActive: true,
      },
    });
    const trainer = await prisma.trainer.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        specializations: t.specializations,
        payType: "HYBRID",
        fixedRate: 3000,
        perClientRate: 500,
      },
    });
    trainers.push(trainer);
  }
  console.log(`✓ Фотографы/Специалисты: ${trainers.length}`);

  // ─── 3. Залы и направления ────────────────────────────────────
  const halls = await prisma.hall.findMany({ where: { isActive: true } });
  const directions = await prisma.trainingDirection.findMany({ where: { isActive: true } });

  if (!halls.length || !directions.length) {
    console.error("Нет залов или направлений! Сначала запусти seed.ts");
    process.exit(1);
  }

  const hallBig   = halls.find(h => h.name === "Большой") ?? halls[0];
  const hallSmall = halls.find(h => h.name === "Малый")   ?? halls[1] ?? halls[0];

  const indiv   = directions.find(d => d.name.includes("Индивидуальная")) ?? directions[0];
  const family  = directions.find(d => d.name.includes("Семейная"))      ?? directions[1] ?? directions[0];
  const fashion = directions.find(d => d.name.includes("Fashion"))        ?? directions[2] ?? directions[0];
  const item    = directions.find(d => d.name.includes("Предметная"))    ?? directions[3] ?? directions[0];
  const portf   = directions.find(d => d.name.includes("Портфолио"))    ?? directions[4] ?? directions[0];
  const rent    = directions.find(d => d.name.includes("Аренда"))        ?? directions[5] ?? directions[0];

  const [trainer1, trainer2] = trainers;

  // ─── 3b. Демо-услуги ─────────────────────────────────────────
  const plansData = [
    { name: "Индивидуальная съёмка (1 час)",     durationMin: 60,  price: 15000 },
    { name: "Семейная съёмка (2 часа)",          durationMin: 120, price: 25000 },
    { name: "Fashion / Контент съёмка",          durationMin: 60,  price: 20000 },
    { name: "Предметная съёмка",                 durationMin: 90,  price: 30000 },
    { name: "Час аренды зала",                   durationMin: 60,  price: 8000  },
  ] as const;

  for (const p of plansData) {
    const exists = await prisma.subscriptionPlan.findFirst({ where: { name: p.name } });
    if (!exists) await prisma.subscriptionPlan.create({ data: p });
  }
  console.log(`✓ Тарифы: ${plansData.length}`);

  // ─── 4. Занятия / Съёмки (10 шт.) ─────────────────────────────────────
  await prisma.classEvent.deleteMany({
    where: { note: "DEMO" },
  });

  const eventsData = [
    // Прошедшие (для истории)
    { startAt: day(-3, 10), dur: 60,  cap: 15, dir: indiv,   trainer: trainer1, hall: hallBig,   note: "DEMO" },
    { startAt: day(-2, 14), dur: 120, cap: 8,  dir: family,  trainer: trainer2, hall: hallSmall, note: "DEMO" },
    { startAt: day(-1, 12), dur: 60,  cap: 15, dir: fashion, trainer: trainer1, hall: hallBig,   note: "DEMO" },
    { startAt: day(-1, 16), dur: 120, cap: 8,  dir: rent,    trainer: trainer2, hall: hallSmall, note: "DEMO" },
    // Сегодня
    { startAt: day(0, 10),  dur: 60,  cap: 15, dir: indiv,   trainer: trainer1, hall: hallBig,   note: "DEMO" },
    { startAt: day(0, 12),  dur: 120, cap: 8,  dir: item,    trainer: trainer2, hall: hallSmall, note: "DEMO" },
    { startAt: day(0, 15),  dur: 60,  cap: 15, dir: portf,   trainer: trainer1, hall: hallBig,   note: "DEMO" },
    { startAt: day(0, 17),  dur: 120, cap: 8,  dir: rent,    trainer: trainer2, hall: hallSmall, note: "DEMO" },
    // Завтра и послезавтра
    { startAt: day(1, 11),  dur: 60,  cap: 15, dir: fashion, trainer: trainer1, hall: hallBig,   note: "DEMO" },
    { startAt: day(2, 14),  dur: 120, cap: 8,  dir: family,  trainer: trainer2, hall: hallSmall, note: "DEMO" },
  ];

  const events = await Promise.all(
    eventsData.map(e =>
      prisma.classEvent.create({
        data: {
          startAt:     e.startAt,
          durationMin: e.dur,
          directionId: e.dir.id,
          trainerId:   e.trainer.id,
          hallId:      e.hall.id,
          note:        e.note,
          isCompleted: e.startAt < new Date(),
        },
      })
    )
  );
  console.log(`✓ Занятия: ${events.length}`);

  // ─── 5. Записи клиентов на занятия ───────────────────────────
  const bookingPlan: { eventIdx: number; clientIdx: number; status: BookingStatus }[] = [
    // Прошедшее занятие 0 (йога -3 дня)
    { eventIdx: 0, clientIdx: 0, status: BookingStatus.ATTENDED },
    { eventIdx: 0, clientIdx: 1, status: BookingStatus.ATTENDED },
    { eventIdx: 0, clientIdx: 5, status: BookingStatus.ABSENT },
    // Прошедшее занятие 1 (пилатес -2 дня)
    { eventIdx: 1, clientIdx: 0, status: BookingStatus.ATTENDED },
    { eventIdx: 1, clientIdx: 2, status: BookingStatus.ATTENDED },
    { eventIdx: 1, clientIdx: 6, status: BookingStatus.ATTENDED },
    { eventIdx: 1, clientIdx: 3, status: BookingStatus.ABSENT },
    // Прошедшее занятие 2 (растяжка -1 день)
    { eventIdx: 2, clientIdx: 1, status: BookingStatus.ATTENDED },
    { eventIdx: 2, clientIdx: 4, status: BookingStatus.ATTENDED },
    { eventIdx: 2, clientIdx: 9, status: BookingStatus.ATTENDED },
    // Прошедшее занятие 3 (кардио -1 день)
    { eventIdx: 3, clientIdx: 5, status: BookingStatus.ATTENDED },
    { eventIdx: 3, clientIdx: 6, status: BookingStatus.ATTENDED },
    { eventIdx: 3, clientIdx: 7, status: BookingStatus.ABSENT },
    // Сегодня занятие 4 (йога утро)
    { eventIdx: 4, clientIdx: 0, status: BookingStatus.CONFIRMED },
    { eventIdx: 4, clientIdx: 8, status: BookingStatus.CONFIRMED },
    { eventIdx: 4, clientIdx: 9, status: BookingStatus.CONFIRMED },
    // Сегодня занятие 5 (TRX)
    { eventIdx: 5, clientIdx: 5, status: BookingStatus.CONFIRMED },
    { eventIdx: 5, clientIdx: 6, status: BookingStatus.CONFIRMED },
    // Сегодня занятие 6 (пилатес вечер)
    { eventIdx: 6, clientIdx: 1, status: BookingStatus.CONFIRMED },
    { eventIdx: 6, clientIdx: 2, status: BookingStatus.CONFIRMED },
    { eventIdx: 6, clientIdx: 3, status: BookingStatus.CONFIRMED },
    // Сегодня занятие 7 (растяжка вечер)
    { eventIdx: 7, clientIdx: 4, status: BookingStatus.CONFIRMED },
    { eventIdx: 7, clientIdx: 7, status: BookingStatus.CONFIRMED },
    // Завтра занятие 8 (силовая)
    { eventIdx: 8, clientIdx: 0, status: BookingStatus.CONFIRMED },
    { eventIdx: 8, clientIdx: 1, status: BookingStatus.CONFIRMED },
    { eventIdx: 8, clientIdx: 5, status: BookingStatus.CONFIRMED },
    // Послезавтра занятие 9 (йога)
    { eventIdx: 9, clientIdx: 9, status: BookingStatus.CONFIRMED },
    { eventIdx: 9, clientIdx: 0, status: BookingStatus.CONFIRMED },
  ];

  let bookingCount = 0;
  for (const b of bookingPlan) {
    try {
      await prisma.booking.create({
        data: {
          clientId:     clients[b.clientIdx].id,
          classEventId: events[b.eventIdx].id,
          status:       b.status,
        },
      });
      bookingCount++;
    } catch {
      // пропускаем дубликаты
    }
  }
  console.log(`✓ Записи: ${bookingCount}`);
  console.log("\n🎉 Демо-данные загружены!");
  console.log("   Тренеры: trainer1@fitnes.kz / trainer2@fitnes.kz (пароль: trainer123)");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
