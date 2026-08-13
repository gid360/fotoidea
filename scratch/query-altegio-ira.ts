export {};
const companyId = "773942";
const userToken = "b0a9b87010cf11775bda76899adaa7cd";
const partnerToken = "fndrrbjmb5m5bb5rt4gf";

async function queryAltegioIra() {
  console.log("=== ЗАПРОС К ALTEGIO API ДЛЯ КЛИЕНТА 77079083703 ===");

  const pToken = partnerToken;
  const uToken = userToken;

  const authHeader = `Bearer ${pToken}, User ${uToken}`;
  const acceptHeader = "application/vnd.api.v2+json";

  const headers = {
    "Content-Type": "application/json",
    "Accept": acceptHeader,
    "Authorization": authHeader,
  };

  try {
    // 1. Поиск в клиентах Altegio
    const clientUrl = `https://api.alteg.io/api/v1/company/${companyId}/clients/search?partner_token=${pToken}`;
    const res = await fetch(clientUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        partner_token: pToken,
        fields: ["id", "name", "phone", "email", "visits"],
        filters: [{ fieldName: "phone", value: "7079083703", compareType: "like" }]
      }),
    });

    console.log(`POST /clients/search Status: ${res.status}`);
    const clientData = await res.json();
    console.log("Client search result from Altegio API:\n", JSON.stringify(clientData, null, 2));

    // 2. Получение записей (records) из Altegio API за всё время
    const recordsUrl = `https://api.alteg.io/api/v1/records/${companyId}?start_date=2024-01-01&end_date=2026-12-31&partner_token=${pToken}&count=250`;
    const recRes = await fetch(recordsUrl, { method: "GET", headers });
    console.log(`GET /records Status: ${recRes.status}`);
    const recData = await recRes.json();

    if (recData && Array.isArray(recData.data)) {
      console.log(`Всего записей в компании в Altegio: ${recData.data.length}`);
      const iraRecords = recData.data.filter((r: any) => {
        const phone = (r.client?.phone || r.client?.mobile || "").replace(/\D/g, "");
        const name = (r.client?.name || "").toLowerCase();
        return phone.includes("7079083703") || phone.includes("9083703") || name.includes("ира");
      });
      console.log(`\n🎉 Найдено ${iraRecords.length} записей для Иры в Altegio API:`);
      for (const r of iraRecords) {
        console.log(` - Record ID: ${r.id} | Date: ${r.date} | Status: ${r.attendance} | Service: ${r.services?.[0]?.title} | Comment: ${r.comment}`);
      }
    } else {
      console.log("Records raw result:", JSON.stringify(recData, null, 2).slice(0, 500));
    }
  } catch (e: any) {
    console.error("Error querying Altegio:", e.message);
  }
}

queryAltegioIra();
