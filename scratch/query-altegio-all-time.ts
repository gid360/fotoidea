export {};

const companyId = "773942";
const userToken = "b0a9b87010cf11775bda76899adaa7cd";
const partnerToken = "fndrrbjmb5m5bb5rt4gf";

const headers = {
  "Content-Type": "application/json",
  "Accept": "application/vnd.api.v2+json",
  "Authorization": `Bearer ${partnerToken}, User ${userToken}`,
};

async function checkAllTimeAltegio() {
  console.log("=== ПРОВЕРКА ЗАПИСЕЙ ЗА ВСЁ ВРЕМЯ В ALTEGIO ДЛЯ +77079083703 ===");

  // 1. Поиск клиентов в Altegio по номеру 7079083703 или panama_cloud
  const searchUrl = `https://api.alteg.io/api/v1/company/${companyId}/clients/search?partner_token=${partnerToken}`;
  const searchRes = await fetch(searchUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      partner_token: partnerToken,
      fields: ["id", "name", "phone", "email", "visits", "spent", "paid"],
      filters: [{ fieldName: "phone", value: "7079083703", compareType: "like" }]
    }),
  });

  const searchJson = await searchRes.json();
  console.log("Результат поиска клиента по телефону:");
  console.dir(searchJson, { depth: 5 });

  // 2. Листаем ВСЕ страницы /records за 2020 - 2030 годы
  let allMatchingRecords: any[] = [];
  let page = 1;
  const count = 250;
  let totalProcessedRecords = 0;

  while (page <= 20) {
    const url = `https://api.alteg.io/api/v1/records/${companyId}?start_date=2020-01-01&end_date=2030-12-31&partner_token=${partnerToken}&page=${page}&count=${count}`;
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) {
      console.log(`[Page ${page}] HTTP Error: ${res.status}`);
      break;
    }

    const json = await res.json();
    const data = json.data;
    if (!Array.isArray(data) || data.length === 0) {
      break;
    }

    totalProcessedRecords += data.length;

    for (const r of data) {
      const phone = (r.client?.phone || r.client?.mobile || "").replace(/\D/g, "");
      const email = (r.client?.email || "").toLowerCase();
      const name = (r.client?.name || "").toLowerCase();
      const comment = (r.comment || "").toLowerCase();

      if (
        phone.includes("7079083703") ||
        phone.includes("9083703") ||
        email.includes("panama_cloud")
      ) {
        allMatchingRecords.push(r);
      }
    }

    if (data.length < count) break;
    page++;
  }

  console.log(`\n==================================================`);
  console.log(`Просканировано записей в Altegio: ${totalProcessedRecords}`);
  console.log(`🎉 ВСЕГО НАЙДЕНО ЗАПИСЕЙ ЗА ВСЁ ВРЕМЯ ДЛЯ +77079083703: ${allMatchingRecords.length}`);
  console.log(`==================================================\n`);

  for (const r of allMatchingRecords) {
    console.log(`Record #${r.id} | Date: ${r.date} | Status: ${r.attendance} | Service: ${r.services?.[0]?.title || "Нет названия"} | Client Name: ${r.client?.name} | Phone: ${r.client?.phone} | Comment: ${r.comment}`);
  }
}

checkAllTimeAltegio().catch(console.error);
