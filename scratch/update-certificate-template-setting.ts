import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_TEMPLATE = {
  bgType: "COLOR",
  bgColor: "#FAF8F5",
  bgGradientFrom: "#FAF8F5",
  bgGradientTo: "#FAF8F5",
  bgImageUrl: "",
  accentColor: "#3D352E",
  textColor: "#3D352E",
  subtextColor: "#7D7265",
  fontFamily: "Roboto",
  titleText: "С Е Р Т И Ф И К А Т",
  subtitleText: "НА ПРОФЕССИОНАЛЬНУЮ ФОТОСЕССИЮ",
  rulesText: "Продолжительность 1 час\n100 обработанных фотографий\nКоличество участников до 6 человек\nПомощь в позировании",
  studioPhone: "+7 777 79 79 888",
  studioInstagram: "fotoideakz",
  studioAddress: "г. Уральск, пр. Абулхаир хана 147, ЖК Азимут, 1 этаж",
  studioWebsite: "WWW.FOTOIDEA.KZ",
  showBorder: true,
  borderColor: "#D6C4A5",
  titlePosY: 20,
  codePosY: 35,
  detailsPosY: 50,
  rulesPosY: 75,
};

async function main() {
  await prisma.setting.upsert({
    where: { key: "certificate_template" },
    update: { value: JSON.stringify(DEFAULT_TEMPLATE) },
    create: { key: "certificate_template", value: JSON.stringify(DEFAULT_TEMPLATE) },
  });

  console.log("Certificate template settings saved successfully!");

  // Also verify existing certificate records
  const certs = await prisma.certificate.findMany();
  console.log(`Found ${certs.length} certificates in database.`);

  const CYRILLIC_CODE_CHARS = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ0123456789";
  function genCode() {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += CYRILLIC_CODE_CHARS.charAt(Math.floor(Math.random() * CYRILLIC_CODE_CHARS.length));
    }
    return code;
  }

  for (const cert of certs) {
    const isCyrillic6 = /^[А-Я0-9]{6}$/.test(cert.code);
    if (!isCyrillic6) {
      let newCode = genCode();
      while (await prisma.certificate.findFirst({ where: { code: newCode, id: { not: cert.id } } })) {
        newCode = genCode();
      }
      await prisma.certificate.update({
        where: { id: cert.id },
        data: { code: newCode },
      });
      console.log(`Updated cert ${cert.id}: ${cert.code} -> ${newCode}`);
    }
  }

  console.log("All existing certificates are updated to the vertical template format!");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
