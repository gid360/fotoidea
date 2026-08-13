export {};

const companyId = "773942";
const userToken = "b0a9b87010cf11775bda76899adaa7cd";
const partnerToken = "fndrrbjmb5m5bb5rt4gf";

const headers = {
  "Content-Type": "application/json",
  "Accept": "application/vnd.api.v2+json",
  "Authorization": `Bearer ${partnerToken}, User ${userToken}`,
};

async function checkSampleRecord() {
  const url = `https://api.alteg.io/api/v1/records/${companyId}?start_date=2026-08-01&end_date=2026-08-05&partner_token=${partnerToken}&count=5`;
  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) {
    console.log("Error status:", res.status);
    return;
  }
  const json = await res.json();
  if (json.data && json.data.length > 0) {
    console.log("Sample Record Structure:");
    console.dir(json.data[0], { depth: 4 });
  } else {
    console.log("No records found in range.");
  }
}

checkSampleRecord().catch(console.error);
