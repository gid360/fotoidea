import { prisma } from "../src/lib/prisma";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";
import { format } from "date-fns";
import QRCode from "qrcode";

const DEFAULT_TEMPLATE = {
  bgColor: "#FAF8F5",
  borderColor: "#D6C4A5",
  accentColor: "#3D352E",
  textColor: "#3D352E",
  subtextColor: "#7D7265",
  titleText: "С Е Р Т И Ф И К А Т",
  subtitleText: "НА ПРОФЕССИОНАЛЬНУЮ ФОТОСЕССИЮ",
  rulesText: "Продолжительность 1 час\n100 обработанных фотографий\nКоличество участников до 6 человек\nПомощь в позировании",
  studioPhone: "+7 777 79 79 888",
  studioInstagram: "fotoideakz",
  studioAddress: "г. Уральск, пр. Абулхаир хана 147, ЖК Азимут, 1 этаж",
  studioWebsite: "WWW.FOTOIDEA.KZ",
  showBorder: true,
  titlePosY: 20,
  codePosY: 35,
  detailsPosY: 50,
  rulesPosY: 75,
};

function hexToRgb(hex: string, fallback = rgb(0.24, 0.21, 0.18)) {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return fallback;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) return fallback;
  return rgb(r, g, b);
}

async function testPdf() {
  try {
    const cert = await prisma.certificate.findFirst();
    if (!cert) {
      console.error("No certificate found in database.");
      return;
    }
    console.log("Found cert:", cert.code, cert.id);

    let planName = "";
    if (cert.planId) {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: cert.planId },
      });
      if (plan) planName = plan.name;
    }
    console.log("Plan name:", planName);

    let t = { ...DEFAULT_TEMPLATE };
    try {
      const setting = await prisma.setting.findUnique({
        where: { key: "certificate_template" },
      });
      if (setting && setting.value) {
        t = { ...t, ...JSON.parse(setting.value) };
      }
    } catch (e) {
      console.error("Error loading setting:", e);
    }
    console.log("Template:", t);

    const filesDir = path.join(process.cwd(), "node_modules", "@fontsource", "roboto", "files");
    const fontBytes = fs.readFileSync(path.join(filesDir, "roboto-cyrillic-400-normal.woff"));
    const fontBoldBytes = fs.readFileSync(path.join(filesDir, "roboto-cyrillic-700-normal.woff"));

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const fontRegular = await pdfDoc.embedFont(fontBytes);
    const fontBold = await pdfDoc.embedFont(fontBoldBytes);

    const page = pdfDoc.addPage([283.5, 425.2]);
    const { width, height } = page.getSize();

    const bgColor = hexToRgb(t.bgColor, rgb(0.98, 0.97, 0.96));
    const borderColor = hexToRgb(t.borderColor, rgb(0.84, 0.77, 0.65));
    const textColor = hexToRgb(t.textColor, rgb(0.24, 0.21, 0.18));
    const subtextColor = hexToRgb(t.subtextColor, rgb(0.49, 0.45, 0.40));

    const centerText = (text: string, font: any, size: number, y: number, color: any) => {
      if (!text) return;
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: (width - textWidth) / 2,
        y,
        size,
        font,
        color,
      });
    };

    const getY = (percent: number) => height - (height * percent) / 100;

    page.drawRectangle({ x: 0, y: 0, width, height, color: bgColor });

    if (t.showBorder !== false) {
      const frameSize = 12;
      page.drawRectangle({ x: 0, y: 0, width, height: frameSize, color: borderColor });
      page.drawRectangle({ x: 0, y: height - frameSize, width, height: frameSize, color: borderColor });
      page.drawRectangle({ x: 0, y: 0, width: frameSize, height, color: borderColor });
      page.drawRectangle({ x: width - frameSize, y: 0, width: frameSize, height, color: borderColor });

      page.drawRectangle({
        x: frameSize,
        y: frameSize,
        width: width - frameSize * 2,
        height: height - frameSize * 2,
        borderColor: borderColor,
        borderWidth: 1,
      });

      const drawCornerOrnament = (cx: number, cy: number) => {
        page.drawSquare({
          x: cx,
          y: cy,
          size: 4.5,
          color: borderColor,
          rotate: degrees(45),
        });
      };

      drawCornerOrnament(16, height - 16);
      drawCornerOrnament(width - 19, height - 16);
      drawCornerOrnament(16, 19);
      drawCornerOrnament(width - 19, 19);
    }

    const titleY = t.titlePosY ? getY(t.titlePosY) : height - 60;

    const logoPath = path.join(process.cwd(), "public", "fotoidea-logo.png");
    if (fs.existsSync(logoPath)) {
      try {
        const logoBytes = fs.readFileSync(logoPath);
        const logoImage = await pdfDoc.embedPng(logoBytes);
        const logoSize = 32;
        page.drawImage(logoImage, {
          x: (width - logoSize) / 2,
          y: titleY + 22,
          width: logoSize,
          height: logoSize,
        });
      } catch (e) {
        console.error("Error embedding logo PNG:", e);
      }
    }

    centerText("Fotoidea.kz", fontBold, 16, titleY + 4, textColor);
    centerText(t.titleText || "С Е Р Т И Ф И К А Т", fontBold, 13, titleY - 12, textColor);
    if (t.subtitleText) {
      centerText(t.subtitleText, fontRegular, 6.5, titleY - 22, subtextColor);
    }

    page.drawLine({
      start: { x: 30, y: titleY - 30 },
      end: { x: width - 30, y: titleY - 30 },
      thickness: 0.8,
      color: borderColor,
    });

    const codeY = t.codePosY ? getY(t.codePosY) : height - 130;
    const codeText = `№ ${cert.code}`;
    centerText(codeText, fontBold, 17, codeY, textColor);

    let mainServiceTitle = "Фотосессия в фотостудии FOTOIDEA";
    if (cert.type === "NOMINAL") {
      const amount = cert.nominalAmount ? Number(cert.nominalAmount).toLocaleString("ru-RU") : "0";
      mainServiceTitle = `Сертификат на сумму ${amount} ₸`;
    } else if (planName) {
      mainServiceTitle = planName;
    }

    const detailsY = t.detailsPosY ? getY(t.detailsPosY) : height - 165;
    centerText(mainServiceTitle, fontBold, 10, detailsY, textColor);

    let currentY = detailsY - 14;

    const lines = (t.rulesText || "").split("\n").filter(Boolean);
    if (cert.peopleCount) {
      const idx = lines.findIndex(l => l.toLowerCase().includes("участник") || l.toLowerCase().includes("человек"));
      if (idx !== -1) {
        lines[idx] = `Количество участников до ${cert.peopleCount} человек`;
      }
    }

    lines.forEach((line) => {
      centerText(line.trim(), fontRegular, 8, currentY, subtextColor);
      currentY -= 13;
    });

    const qrSectionY = t.rulesPosY ? getY(t.rulesPosY) : height - 295;

    const origin = "https://fotoidea.kz";
    const publicUrl = `${origin}/c/${cert.code}`;

    const qrDataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 120 });
    const qrImage = await pdfDoc.embedPng(qrDataUrl);
    const qrSize = 54;

    page.drawImage(qrImage, {
      x: (width - qrSize) / 2,
      y: qrSectionY - 20,
      width: qrSize,
      height: qrSize,
    });

    centerText("Электронная версия сертификата", fontRegular, 6.5, qrSectionY - 30, subtextColor);

    const phone = t.studioPhone || "+7 777 79 79 888";
    const insta = t.studioInstagram ? `@${t.studioInstagram.replace(/^@/, "")}` : "fotoideakz";
    centerText(`${phone}   |   ${insta}`, fontBold, 9, 64, textColor);

    const expiresStr = cert.expiresAt ? format(new Date(cert.expiresAt), "dd.MM.yyyy") : "Бессрочно";
    centerText(`Действителен до ${expiresStr}`, fontBold, 8.5, 48, textColor);

    const address = t.studioAddress || "г. Уральск, пр. Абулхаир хана 147, ЖК Азимут, 1 этаж";
    centerText(address, fontRegular, 7, 34, subtextColor);

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync("scratch/test-cert.pdf", pdfBytes);
    console.log("PDF generated successfully! Saved to scratch/test-cert.pdf. Bytes:", pdfBytes.length);
  } catch (err: any) {
    console.error("PDF test error:", err);
  }
}

testPdf().finally(() => prisma.$disconnect());
