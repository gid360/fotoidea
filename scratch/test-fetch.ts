const companyId = "773942";
const userToken = "b0a9b87010cf11775bda76899adaa7cd";
const partnerToken = "fndrrbjmb5m5bb5rt4gf";

const headers = {
  "Content-Type": "application/json",
  "Accept": "application/vnd.api.v2+json",
  "Authorization": `Bearer ${partnerToken}, User ${userToken}`,
};

async function testFetch() {
  console.log("Fetching page 1...");
  const t0 = Date.now();
  const url = `https://api.alteg.io/api/v1/records/${companyId}?start_date=2024-01-01&end_date=2026-12-31&page=1&count=250&partner_token=${partnerToken}`;
  const res = await fetch(url, { method: "GET", headers });
  console.log(`Status: ${res.status} in ${Date.now() - t0}ms`);
  const json = await res.json();
  console.log(`Records fetched: ${json.data?.length || 0}`);
}

testFetch().catch(console.error);
