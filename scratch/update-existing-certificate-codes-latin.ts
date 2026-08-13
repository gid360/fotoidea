import { PrismaClient } from "@prisma/client";

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
  const certs = await prisma.certificate.findMany();
  console.log(`Found ${certs.length} existing certificates.`);

  for (const cert of certs) {
    let newCode = genLatinCode();

    // Guarantee uniqueness
    while (await prisma.certificate.findFirst({ where: { code: newCode, id: { not: cert.id } } })) {
      newCode = genLatinCode();
    }

    await prisma.certificate.update({
      where: { id: cert.id },
      data: { code: newCode },
    });

    console.log(`Updated cert ${cert.id}: ${cert.code} -> ${newCode}`);
  }

  console.log(`Finished! Successfully updated all certificate codes back to Latin.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
