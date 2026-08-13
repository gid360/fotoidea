export {};
const companyId = "773942";
const userToken = "b0a9b87010cf11775bda76899adaa7cd";
const partnerToken = "fndrrbjmb5m5bb5rt4gf";
const partnerAppId = "2146";

const candidatePartners = [
  partnerToken,
  partnerAppId,
  "mp_2146_wa_intgr",
  "2371"
];

const domains = [
  "https://api.alteg.io/api/v1",
  "https://api.yclients.com/api/v1"
];

async function runImportTest() {
  console.log("=== ТЕСТИРОВАНИЕ ПОДКЛЮЧЕНИЯ ПОСЛЕ ПОДКЛЮЧЕНИЯ ПРИЛОЖЕНИЯ В ALTEGIO ===");

  for (const domain of domains) {
    for (const pToken of candidatePartners) {
      const authVariants = [
        `Bearer ${userToken}, Partner ${pToken}`,
        `User ${userToken}, Partner ${pToken}`,
        `Partner ${pToken}, Bearer ${userToken}`,
        `Partner ${pToken}, User ${userToken}`,
        `Bearer ${userToken}`,
        `Partner ${pToken}`
      ];

      for (const authStr of authVariants) {
        try {
          // Пробуем эндпоинт клиентов и записей
          const url = `${domain}/company/${companyId}/clients/search`;
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/vnd.altegio.v2+json, application/vnd.yclients.v2+json, application/json",
              "Authorization": authStr,
              "X-Partner-Token": pToken
            },
            body: JSON.stringify({ page: 1, count: 10 })
          });

          const status = res.status;
          const text = await res.text();

          if (status === 200) {
            console.log(`\n🎉 🎉 🎉 ПОДКЛЮЧЕНИЕ УСПЕШНО (200 OK)! 🎉 🎉 🎉`);
            console.log(` Домен: ${domain}`);
            console.log(` Partner Token: "${pToken}"`);
            console.log(` Auth Header: "${authStr}"`);
            console.log(` Ответ API Altegio:\n`, text.slice(0, 500));
            return;
          } else {
            console.log(`[Status ${status}] ${domain} | PT: "${pToken}" | Auth: "${authStr}" => ${text.slice(0, 100)}`);
          }
        } catch (e: any) {
          console.log(`Error: ${e.message}`);
        }
      }
    }
  }

  // Также проверяем GET /records/773942
  for (const domain of domains) {
    for (const pToken of candidatePartners) {
      try {
        const url = `${domain}/records/${companyId}?start_date=2026-07-27&end_date=2026-12-31`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/vnd.altegio.v2+json, application/json",
            "Authorization": `Bearer ${userToken}, Partner ${pToken}`,
            "X-Partner-Token": pToken
          }
        });
        const status = res.status;
        const text = await res.text();
        if (status === 200) {
          console.log(`\n🎉 🎉 🎉 УСПЕХ НА GET /records/773942 (200 OK)! 🎉 🎉 🎉`);
          console.log(` Partner Token: "${pToken}"`);
          console.log(` Ответ API Altegio:\n`, text.slice(0, 500));
          return;
        } else {
          console.log(`GET records [${status}] PT: "${pToken}" => ${text.slice(0, 100)}`);
        }
      } catch (e: any) {
        console.log(`Err: ${e.message}`);
      }
    }
  }
}

runImportTest();
