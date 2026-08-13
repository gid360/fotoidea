import { prisma } from "../src/lib/prisma";

export {};

const companyId = "773942";
const userToken = "b0a9b87010cf11775bda76899adaa7cd";
const partnerToken = "fndrrbjmb5m5bb5rt4gf";

const headers = {
  "Content-Type": "application/json",
  "Accept": "application/vnd.api.v2+json",
  "Authorization": `Bearer ${partnerToken}, User ${userToken}`,
};

async function syncAll37Records() {
  console.log("=== СИНХРОНИЗАЦИЯ ВСЕХ 37 ЗАПИСЕЙ ДЛЯ ИРЫ ИЗ ALTEGIOВ CRM ===");

  const phone = "+77079083703";
  let client = await prisma.client.findFirst({
    where: { phone: { contains: "7079083703" } },
  });

  if (!client) {
    client = await prisma.client.create({
      data: { firstName: "Ира", lastName: "", phone },
    });
  }

  // Clear previous sample bookings for clean 1-to-1 sync of all 37 records
  await prisma.booking.deleteMany({ where: { clientId: client.id } });

  const halls = await prisma.hall.findMany();
  const directions = await prisma.trainingDirection.findMany();
  const defaultHall = halls[0];
  const defaultDir = directions[0];

  // Fetch all 37 records from Altegio API
  let allRecords: any[] = [];
  let page = 1;
  while (page <= 20) {
    const url = `https://api.alteg.io/api/v1/records/${companyId}?start_date=2020-01-01&end_date=2030-12-31&partner_token=${partnerToken}&page=${page}&count=250`;
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) break;
    const json = await res.json();
    if (!Array.isArray(json.data) || json.data.length === 0) break;

    for (const r of json.data) {
      const p = (r.client?.phone || "").replace(/\D/g, "");
      const e = (r.client?.email || "").toLowerCase();
      if (p.includes("7079083703") || p.includes("9083703") || e.includes("panama_cloud")) {
        allRecords.push(r);
      }
    }
    if (json.data.length < 250) break;
    page++;
  }

  console.log(`Получено ${allRecords.length} записей из Altegio API.`);

  for (const r of allRecords) {
    const startAt = new Date(r.date);
    const serviceName = r.services?.[0]?.title || "Услуга съёмки";
    const comment = r.comment ? ` (${r.comment})` : "";
    const noteText = `Altegio #${r.id}: ${serviceName}${comment}`;

    const hall = halls.find(h => r.services?.[0]?.title?.toLowerCase().includes("малый") ? h.name.includes("Малый") : h.name.includes("Большой")) || defaultHall;

    const actualPrice = r.services?.reduce((sum: number, s: any) => sum + Number(s.cost || 0), 0) || 0;

    const classEvent = await prisma.classEvent.create({
      data: {
        startAt,
        durationMin: 60,
        hallId: hall.id,
        directionId: defaultDir.id,
        servicePrice: actualPrice,
        totalPrice: actualPrice,
        note: noteText,
      },
    });

    const status = r.attendance === -1 ? "CANCELLED" : "CONFIRMED";

    await prisma.booking.create({
      data: {
        classEventId: classEvent.id,
        clientId: client.id,
        status,
      },
    });
  }

  const updatedClient = await prisma.client.findUnique({
    where: { id: client.id },
    include: { bookings: true },
  });

  console.log(`\n🎉 СИНХРОНИЗИРОВАНО В CRM: ${updatedClient?.bookings.length} записей для клиента Ира (+77079083703)!`);
}

syncAll37Records().catch(console.error).finally(() => prisma.$disconnect());
