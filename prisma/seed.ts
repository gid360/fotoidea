import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Суперадмин
  const passwordHash = await bcrypt.hash("admin123", 10);

  const superadmin = await prisma.user.upsert({
    where: { email: "admin@fotoidea.kz" },
    update: {},
    create: {
      email: "admin@fotoidea.kz",
      firstName: "Владелец",
      lastName: "Fotoidea",
      role: UserRole.SUPERADMIN,
      passwordHash,
      isActive: true,
    },
  });

  console.log("Суперадмин создан:", superadmin.email);

  // Настройки по умолчанию
  await prisma.setting.upsert({ where: { key: "studioName" },       update: { value: "Fotoidea" }, create: { key: "studioName",       value: "Fotoidea" } });
  await prisma.setting.upsert({ where: { key: "logoUrl" },          update: { value: "/logo.svg" },           create: { key: "logoUrl",          value: "/logo.svg" } });
  await prisma.setting.upsert({ where: { key: "reminderHours" },    update: {}, create: { key: "reminderHours",    value: "8" } });
  await prisma.setting.upsert({ where: { key: "quietHoursStart" },  update: {}, create: { key: "quietHoursStart",  value: "22" } });
  await prisma.setting.upsert({ where: { key: "quietHoursEnd" },    update: {}, create: { key: "quietHoursEnd",    value: "9" } });

  // Дефолтные залы
  const defaultHalls = [
    { name: "Большой", capacity: 15, colorHex: "#3B82F6" },
    { name: "Малый", capacity: 8, colorHex: "#EC4899" },
  ];
  for (const h of defaultHalls) {
    const existing = await prisma.hall.findFirst({ where: { name: h.name } });
    if (!existing) {
      await prisma.hall.create({ data: h });
    }
  }

  // Дефолтные направления съёмок
  const defaultDirections = [
    { name: "Индивидуальная съёмка", colorHex: "#8B5CF6" },
    { name: "Семейная / Парная съёмка", colorHex: "#EC4899" },
    { name: "Fashion / Контент", colorHex: "#F59E0B" },
    { name: "Предметная съёмка", colorHex: "#EF4444" },
    { name: "Портфолио / Модельная", colorHex: "#3B82F6" },
    { name: "Аренда зала", colorHex: "#10B981" },
  ];
  for (const d of defaultDirections) {
    const existing = await prisma.trainingDirection.findFirst({ where: { name: d.name } });
    if (!existing) {
      await prisma.trainingDirection.create({ data: d });
    }
  }

  // Удаляем устаревшие шаблоны пакетов
  await prisma.notificationTemplate.deleteMany({
    where: { id: { in: ["subscription_bought", "subscription_low"] } },
  });

  // Шаблоны уведомлений
  const templates = [
    {
      id: "booking_confirm",
      name: "Подтверждение записи",
      body: "Привет, {{client_name}}! Ваша запись «{{direction}}» подтверждена на {{class_date}} в {{class_time}}. Зал: {{hall_name}}. Специалист: {{trainer_name}}. Ждём вас в Fotoidea! 📸",
    },
    {
      id: "booking_changed",
      name: "Изменение записи",
      body: "Здравствуйте, {{client_name}}! Ваша запись «{{direction}}» изменена: новая дата {{class_date}} в {{class_time}}, зал: {{hall_name}}. Ждём вас в Fotoidea! 📸",
    },
    {
      id: "booking_cancelled",
      name: "Отмена записи",
      body: "Здравствуйте, {{client_name}}. Ваша запись «{{direction}}» на {{class_date}} в {{class_time}} отменена. Будем рады видеть вас снова в Fotoidea!",
    },
    {
      id: "reminder",
      name: "Напоминание о съёмке/аренде",
      body: "{{client_name}}, напоминаем о вашей съёмке/аренде {{direction}} сегодня в {{class_time}}. Зал: {{hall_name}}. До встречи в Fotoidea!",
    },
    {
      id: "review_request",
      name: "Запрос отзыва после визита",
      body: "{{client_name}}, спасибо, что посетили Fotoidea! Поделитесь, пожалуйста, вашими впечатлениями о съёмке «{{direction}}»: 🌟",
    },
    {
      id: "print_discount",
      name: "Скидка на печать (через 12 дней)",
      body: "{{client_name}}, ваши фотографии готовы заиграть на бумаге! ✨ Дарим вам скидку 15% на печать фотохолстов и альбомов в Fotoidea!",
    },
    {
      id: "birthday",
      name: "День рождения",
      body: "🎂 {{client_name}}, поздравляем с Днём рождения! Желаем вдохновения, отличных кадров и ярких съёмок! 🎉",
    },
  ];

  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: { id: t.id },
      update: { name: t.name, body: t.body },
      create: { ...t, isActive: true },
    });
  }

  // WhatsApp сессия (синглтон)
  await prisma.whatsAppSession.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", isOnline: false },
  });

  console.log("Seed завершён");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
