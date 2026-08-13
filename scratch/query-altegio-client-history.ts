export {};

const companyId = "773942";
const userToken = "b0a9b87010cf11775bda76899adaa7cd";
const partnerToken = "fndrrbjmb5m5bb5rt4gf";

const headers = {
  "Content-Type": "application/json",
  "Accept": "application/vnd.api.v2+json",
  "Authorization": `Bearer ${partnerToken}, User ${userToken}`,
};

async function checkClientHistory() {
  console.log("=== ТАРГЕТИРОВАННАЯ ПРОВЕРКА ИСТОРИИ ALTEGIO ДЛЯ +77079083703 ===");

  // 1. Ищем ID клиента по точному номеру телефона
  const clientRes = await fetch(`https://api.alteg.io/api/v1/company/${companyId}/clients/search?partner_token=${partnerToken}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      partner_token: partnerToken,
      fields: ["id", "name", "phone", "email", "visits", "spent", "paid"],
      filters: [{ fieldName: "phone", value: "7079083703", compareType: "equal" }]
    })
  });

  const clientData = await clientRes.json();
  console.log("Точный результат поиска клиента:", JSON.stringify(clientData, null, 2));

  // 2. Также ищем с фильтром panama_cloud
  const emailRes = await fetch(`https://api.alteg.io/api/v1/company/${companyId}/clients/search?partner_token=${partnerToken}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      partner_token: partnerToken,
      fields: ["id", "name", "phone", "email", "visits", "spent", "paid"],
      filters: [{ fieldName: "email", value: "panama_cloud", compareType: "like" }]
    })
  });
  console.log("Результат поиска по email:", JSON.stringify(await emailRes.json(), null, 2));

  // 3. Пробуем получить карточку отдельного клиента если id известен
  if (clientData.data && clientData.data[0]) {
    const clientId = clientData.data[0].id;
    const profileRes = await fetch(`https://api.alteg.io/api/v1/client/${companyId}/${clientId}?partner_token=${partnerToken}`, {
      method: "GET",
      headers,
    });
    console.log(`Профиль клиента #${clientId}:`, JSON.stringify(await profileRes.json(), null, 2));
  }
}

checkClientHistory().catch(console.error);
