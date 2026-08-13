import { prisma } from "../src/lib/prisma";
import { normalizePhone } from "../src/lib/utils";
import { BookingStatus } from "@prisma/client";

export {};

const companyId = "773942";
const userToken = "b0a9b87010cf11775bda76899adaa7cd";
const partnerToken = "fndrrbjmb5m5bb5rt4gf";

const headers = {
  "Content-Type": "application/json",
  "Accept": "application/vnd.api.v2+json",
  "Authorization": `Bearer ${partnerToken}, User ${userToken}`,
};

async function altegioFetch(endpointPath: string): Promise<any> {
  const url = `https://api.alteg.io/api/v1${endpointPath}${endpointPath.includes("?") ? "&" : "?"}partner_token=${partnerToken}`;
  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function parseDurationMin(rawVal: any, fallbackVal = 60): number {
  if (rawVal === undefined || rawVal === null || rawVal === "") return fallbackVal;
  if (typeof rawVal === "number") {
    if (rawVal > 500) return Math.max(15, Math.round(rawVal / 60));
    if (rawVal > 0) return rawVal;
  }
  const str = String(rawVal).trim().toLowerCase();
  const digitsOnly = str.replace(/\D/g, "");
  if (digitsOnly) {
    const val = parseInt(digitsOnly, 10);
    if (val > 500) return Math.max(15, Math.round(val / 60));
    if (val > 0) return val;
  }
  return fallbackVal;
}

async function main() {
  console.log("=== ЗАПУСК ОПТИМИЗИРОВАННОГО ИМПОРТА ИЗ ALTEGIO ===");

  // 1. Предзагрузка залов и направлений
  const allHalls = await prisma.hall.findMany();
  const bigHall = allHalls.find(h => h.name.toLowerCase().includes("большой")) || allHalls[0];
  const smallHall = allHalls.find(h => h.name.toLowerCase().includes("малый")) || allHalls[0];

  const allDirections = await prisma.trainingDirection.findMany();
  const directionMap = new Map(allDirections.map(d => [d.name.toLowerCase(), d]));

  async function getOrCreateDirection(name: string) {
    const cleanName = (name || "Индивидуальная съёмка").trim();
    const lower = cleanName.toLowerCase();
    let found = directionMap.get(lower);
    if (!found) {
      found = await prisma.trainingDirection.create({
        data: {
          name: cleanName,
          colorHex: lower.includes("аренда") ? "#3B82F6" : lower.includes("фото") ? "#8B5CF6" : "#EC4899",
        },
      });
      directionMap.set(lower, found);
    }
    return found;
  }

  // 2. Кэширование всех клиентов в памяти
  console.log("Загрузка списка клиентов из базы CRM...");
  const allDbClients = await prisma.client.findMany();
  const clientMap = new Map<string, any>();
  for (const c of allDbClients) {
    const norm = normalizePhone(c.phone);
    if (norm) clientMap.set(norm, c);
  }

  // 3. Кэширование существующих событий по маркеру Altegio
  console.log("Загрузка существующих событий из базы CRM...");
  const allEvents = await prisma.classEvent.findMany({
    where: { note: { contains: "Altegio #" } },
    include: { bookings: true },
  });

  const eventMap = new Map<string, any>();
  for (const e of allEvents) {
    const match = e.note?.match(/Altegio #(\d+)/);
    if (match && match[1]) {
      eventMap.set(match[1], e);
    }
  }

  let page = 1;
  const count = 250;
  let hasMore = true;
  let stats = { clientsCreated: 0, bookingsImported: 0, bookingsUpdated: 0 };

  while (hasMore && page <= 50) {
    try {
      console.log(`Загрузка страницы ${page} из Altegio...`);
      const json = await altegioFetch(`/records/${companyId}?start_date=2024-01-01&end_date=2026-12-31&page=${page}&count=${count}`);
      const recordsList = json.data || [];
      if (recordsList.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`Обработка ${recordsList.length} записей страницы ${page}...`);

      for (const rec of recordsList) {
        if (rec.deleted) continue;

        const recClient = rec.client;
        if (!recClient || (!recClient.phone && !recClient.mobile)) continue;

        const phone = normalizePhone(recClient.phone || recClient.mobile);
        if (!phone) continue;

        let client = clientMap.get(phone);

        if (!client) {
          const fullName = (recClient.name || "Клиент").trim();
          const nameParts = fullName.split(" ");
          client = await prisma.client.create({
            data: {
              firstName: nameParts[0] || "Клиент",
              lastName: nameParts.slice(1).join(" ") || "",
              phone,
              email: recClient.email || null,
              note: "Создан при импорте записи Altegio",
            },
          });
          clientMap.set(phone, client);
          stats.clientsCreated++;
        }

        const startAt = new Date(rec.datetime || rec.date);
        if (isNaN(startAt.getTime())) continue;

        const rawDuration = rec.seance_length || rec.services?.[0]?.duration || rec.duration;
        const serviceName = rec.services?.[0]?.title || rec.service?.title || "Индивидуальная съёмка";
        const durationMin = parseDurationMin(rawDuration || serviceName, 60);
        const targetDirection = await getOrCreateDirection(serviceName);

        // Sum service costs
        const price = rec.services?.reduce((sum: number, s: any) => sum + Number(s.cost || 0), 0) || 0;
        const comment = rec.comment ? ` (${rec.comment})` : "";
        const noteText = `Altegio #${rec.id}: ${serviceName}${comment}`;

        // Determine hall
        let targetHall = bigHall;
        const combinedText = `${(rec.staff?.name || "").toLowerCase()} ${serviceName.toLowerCase()} ${(rec.comment || "").toLowerCase()}`;
        if (combinedText.includes("малый") || combinedText.includes("малы")) {
          targetHall = smallHall;
        }

        let status: BookingStatus = BookingStatus.CONFIRMED;
        if (rec.attendance === 2 || rec.attendance === 1) status = BookingStatus.ATTENDED;
        else if (rec.attendance === -1) status = BookingStatus.CANCELLED;
        else if (rec.attendance === -2) status = BookingStatus.ABSENT;

        // Check in-memory events cache
        const existingEvent = eventMap.get(String(rec.id));

        if (existingEvent) {
          // If status or price changed, update
          const existingPrice = Number(existingEvent.servicePrice) || 0;
          const firstBooking = existingEvent.bookings?.[0];
          const statusChanged = firstBooking ? firstBooking.status !== status : false;

          if (existingPrice !== price || statusChanged) {
            if (firstBooking) {
              await prisma.booking.update({
                where: { id: firstBooking.id },
                data: { status },
              });
            }
            await prisma.classEvent.update({
              where: { id: existingEvent.id },
              data: { servicePrice: price, totalPrice: price },
            });
            stats.bookingsUpdated++;
          }
        } else {
          // Create new event & booking
          const classEvent = await prisma.classEvent.create({
            data: {
              startAt,
              durationMin,
              hallId: targetHall.id,
              directionId: targetDirection.id,
              servicePrice: price,
              totalPrice: price,
              note: noteText,
            },
          });

          await prisma.booking.create({
            data: {
              clientId: client.id,
              classEventId: classEvent.id,
              status,
              note: "Запись из Altegio",
            },
          });

          stats.bookingsImported++;
        }
      }

      if (recordsList.length < count) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (e: any) {
      console.error(`Ошибка импорта на стр. ${page}: ${e.message}`);
      break;
    }
  }

  console.log(`\n==================================================`);
  console.log(`ИМПОРТ ЗАВЕРШЕН УСПЕШНО!`);
  console.log(`Создано новых клиентов: ${stats.clientsCreated}`);
  console.log(`Импортировано новых записей: ${stats.bookingsImported}`);
  console.log(`Обновлено существующих записей с ценами: ${stats.bookingsUpdated}`);
  console.log(`==================================================`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
