import { PrismaClient } from "@prisma/client";
import { addDays } from "date-fns";

const prisma = new PrismaClient();

const LATIN_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function genLatinCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += LATIN_CODE_CHARS.charAt(Math.floor(Math.random() * LATIN_CODE_CHARS.length));
  }
  return code;
}

async function main() {
  const certs = await prisma.certificate.findMany({
    include: { client: true },
  });

  console.log(`Regenerating data for ${certs.length} existing certificates...`);

  for (const cert of certs) {
    let updateData: any = {};

    // 1. Ensure 6-character Latin code
    const isLatin6 = /^[A-Z0-9]{6}$/.test(cert.code);
    if (!isLatin6) {
      let newCode = genLatinCode();
      while (await prisma.certificate.findFirst({ where: { code: newCode, id: { not: cert.id } } })) {
        newCode = genLatinCode();
      }
      updateData.code = newCode;
    }

    // 2. Ensure valid expiresAt date (90 days from createdAt if null)
    if (!cert.expiresAt) {
      updateData.expiresAt = addDays(new Date(cert.createdAt), 90);
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.certificate.update({
        where: { id: cert.id },
        data: updateData,
      });
      console.log(`Updated cert ${cert.id}:`, updateData);
    } else {
      console.log(`Cert ${cert.id} (${cert.code}) is up to date.`);
    }
  }

  console.log("All existing certificates successfully regenerated!");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
