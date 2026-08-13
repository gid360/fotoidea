import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CYRILLIC_CODE_CHARS = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ0123456789";

function genCyrillicCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CYRILLIC_CODE_CHARS.charAt(Math.floor(Math.random() * CYRILLIC_CODE_CHARS.length));
  }
  return code;
}

async function main() {
  const certs = await prisma.certificate.findMany();
  console.log(`Found ${certs.length} existing certificates.`);

  for (const cert of certs) {
    let newCode = genCyrillicCode();

    // Guarantee uniqueness
    while (await prisma.certificate.findFirst({ where: { code: newCode, id: { not: cert.id } } })) {
      newCode = genCyrillicCode();
    }

    await prisma.certificate.update({
      where: { id: cert.id },
      data: { code: newCode },
    });

    console.log(`Updated cert ${cert.id}: ${cert.code} -> ${newCode}`);
  }

  console.log(`Finished! Successfully updated all certificate codes to Cyrillic.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
