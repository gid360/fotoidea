import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, rgb } from "pdf-lib";
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
  rulesText: "Готовые интерьерные фотозоны\nПрофессиональный фотограф\nКоличество участников до 4 человек\nОбработанные фотографии на облаке",
  studioPhone: "+7 777 79 79 888",
  studioInstagram: "fotoideakz",
  studioAddress: "г. Уральск, пр. Абулхаир хана 147, ЖК Азимут",
  studioWebsite: "WWW.FOTOIDEA.KZ",
  showBorder: true,
  titlePosY: 20,
  codePosY: 35,
  detailsPosY: 50,
  rulesPosY: 75,
  bgImageUrl: "",
};

function hexToRgb(hex: string, fallback = rgb(0.24, 0.21, 0.18)) {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return fallback;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) return fallback;
  return rgb(r, g, b);
}

function getRoundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const k = r * 0.55228475;
  const x0 = Number(x.toFixed(2));
  const x0r = Number((x + r).toFixed(2));
  const x1r = Number((x + w - r).toFixed(2));
  const x1 = Number((x + w).toFixed(2));

  const y0 = Number(y.toFixed(2));
  const y0r = Number((y + r).toFixed(2));
  const y1r = Number((y + h - r).toFixed(2));
  const y1 = Number((y + h).toFixed(2));

  const x0rk = Number((x + r - k).toFixed(2));
  const x1rk = Number((x + w - r + k).toFixed(2));
  const y0rk = Number((y + r - k).toFixed(2));
  const y1rk = Number((y + h - r + k).toFixed(2));

  return [
    `M ${x0r} ${y0}`,
    `L ${x1r} ${y0}`,
    `C ${x1rk} ${y0} ${x1} ${y0rk} ${x1} ${y0r}`,
    `L ${x1} ${y1r}`,
    `C ${x1} ${y1rk} ${x1rk} ${y1} ${x1r} ${y1}`,
    `L ${x0r} ${y1}`,
    `C ${x0rk} ${y1} ${x0} ${y1rk} ${x0} ${y1r}`,
    `L ${x0} ${y0r}`,
    `C ${x0} ${y0rk} ${x0rk} ${y0} ${x0r} ${y0}`,
    `Z`
  ].join(" ");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cert = await prisma.certificate.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
    });

    if (!cert) {
      return NextResponse.json({ error: "Сертификат не найден" }, { status: 404 });
    }

    let planName = "";
    let planDescription = "";
    if (cert.planId) {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: cert.planId },
      });
      if (plan) {
        planName = plan.name;
        if (plan.description) planDescription = plan.description;
      }
    }

    // Load template settings
    let t = { ...DEFAULT_TEMPLATE };
    try {
      const setting = await prisma.setting.findUnique({
        where: { key: "certificate_template" },
      });
      if (setting && setting.value) {
        t = { ...t, ...JSON.parse(setting.value) };
      }
    } catch (e) {
      console.error("Error loading certificate template setting:", e);
    }

    // Load Full Unicode TTF Fonts (with complete Latin + Cyrillic + Digits + Symbols support)
    const fontRegularPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
    const fontBoldPath = path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf");
    const fontMediumPath = path.join(process.cwd(), "public", "fonts", "Roboto-Medium.ttf");

    let fontRegularBytes: Buffer;
    let fontBoldBytes: Buffer;
    let fontMediumBytes: Buffer;

    if (fs.existsSync(fontRegularPath) && fs.existsSync(fontBoldPath)) {
      fontRegularBytes = fs.readFileSync(fontRegularPath);
      fontBoldBytes = fs.readFileSync(fontBoldPath);
      fontMediumBytes = fs.existsSync(fontMediumPath) ? fs.readFileSync(fontMediumPath) : fontBoldBytes;
    } else {
      // Fallback
      const filesDir = path.join(process.cwd(), "node_modules", "@fontsource", "roboto", "files");
      fontRegularBytes = fs.readFileSync(path.join(filesDir, "roboto-latin-400-normal.woff"));
      fontBoldBytes = fs.readFileSync(path.join(filesDir, "roboto-latin-700-normal.woff"));
      fontMediumBytes = fontBoldBytes;
    }

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const fontRegular = await pdfDoc.embedFont(fontRegularBytes);
    const fontBold = await pdfDoc.embedFont(fontBoldBytes);
    const fontMedium = await pdfDoc.embedFont(fontMediumBytes);

    // Standard 10x15 cm Portrait Printable Dimensions: 283.5 x 425.2 pt
    const page = pdfDoc.addPage([283.5, 425.2]);
    const { width, height } = page.getSize();

    const bgColor = hexToRgb(t.bgColor, rgb(0.98, 0.97, 0.96)); // #FAF8F5
    const borderColor = hexToRgb(t.borderColor, rgb(0.84, 0.77, 0.65)); // #D6C4A5
    const textColor = hexToRgb(t.textColor, rgb(0.24, 0.21, 0.18)); // #3D352E
    const subtextColor = hexToRgb(t.subtextColor, rgb(0.49, 0.45, 0.40)); // #7D7265

    const drawCenteredText = (text: string, font: any, size: number, y: number, color: any) => {
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

    // 1. Background Fill / PNG Background Image
    let hasBgImage = false;
    if (t.bgImageUrl) {
      try {
        const bgPath = t.bgImageUrl.startsWith("/")
          ? path.join(process.cwd(), "public", t.bgImageUrl)
          : t.bgImageUrl;
        if (fs.existsSync(bgPath)) {
          const bgBytes = fs.readFileSync(bgPath);
          const bgImage = bgPath.endsWith(".jpg") || bgPath.endsWith(".jpeg")
            ? await pdfDoc.embedJpg(bgBytes)
            : await pdfDoc.embedPng(bgBytes);
          page.drawImage(bgImage, { x: 0, y: 0, width, height });
          hasBgImage = true;
        }
      } catch (bgErr) {
        console.error("Error drawing background image:", bgErr);
      }
    }

    if (!hasBgImage) {
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: bgColor,
      });

      if (t.showBorder !== false) {
        const frameSize = 10;
        page.drawRectangle({ x: 0, y: 0, width, height: frameSize, color: borderColor });
        page.drawRectangle({ x: 0, y: height - frameSize, width, height: frameSize, color: borderColor });
        page.drawRectangle({ x: 0, y: 0, width: frameSize, height, color: borderColor });
        page.drawRectangle({ x: width - frameSize, y: 0, width: frameSize, height, color: borderColor });

        const innerPath = getRoundedRectPath(frameSize, frameSize, width - frameSize * 2, height - frameSize * 2, 14);
        page.drawSvgPath(innerPath, { color: bgColor });
      }
    }

    // 2. Top Header Section
    const logoTop = height - 16;
    let logoW = 28;
    let logoH = 28;
    const logoY = logoTop - logoH; // bottom of logo

    // Logo image with preserved aspect ratio
    const logoPath = path.join(process.cwd(), "public", "fotoidea-logo.png");
    if (fs.existsSync(logoPath)) {
      try {
        const logoBytes = fs.readFileSync(logoPath);
        const logoImage = await pdfDoc.embedPng(logoBytes);
        const aspect = logoImage.width / logoImage.height;
        logoW = 28;
        logoH = logoW / (aspect || 1);
        if (logoH > 28) {
          logoH = 28;
          logoW = logoH * aspect;
        }
        page.drawImage(logoImage, {
          x: (width - logoW) / 2,
          y: logoY,
          width: logoW,
          height: logoH,
        });
      } catch (e) {
        console.error("Error embedding logo PNG:", e);
      }
    }

    // 25px margin under the logo before the brand title
    const brandY = logoY - 25;

    // Brand Name: Fotoidea.kz
    drawCenteredText("Fotoidea.kz", fontBold, 14, brandY, textColor);

    // Title: С Е Р Т И Ф И К А Т
    drawCenteredText(t.titleText || "С Е Р Т И Ф И К А Т", fontBold, 11.5, brandY - 14, textColor);

    // Subtitle: НА ПРОФЕССИОНАЛЬНУЮ ФОТОСЕССИЮ
    if (t.subtitleText) {
      drawCenteredText(t.subtitleText, fontMedium, 6.5, brandY - 23, subtextColor);
    }

    // Divider Line Top
    page.drawLine({
      start: { x: 30, y: brandY - 30 },
      end: { x: width - 30, y: brandY - 30 },
      thickness: 0.7,
      color: borderColor,
    });

    // Helper function to split long description text into wrapped lines
    const wrapTextLines = (rawText: string, maxCharsPerLine = 48): string[] => {
      const output: string[] = [];
      const paragraphs = rawText.split("\n");
      for (const p of paragraphs) {
        const trimmed = p.trim();
        if (!trimmed) continue;
        if (trimmed.length <= maxCharsPerLine) {
          output.push(trimmed);
        } else {
          const words = trimmed.split(/\s+/);
          let current = "";
          for (const w of words) {
            if (!current) {
              current = w;
            } else if ((current + " " + w).length <= maxCharsPerLine) {
              current += " " + w;
            } else {
              output.push(current);
              current = w;
            }
          }
          if (current) output.push(current);
        }
      }
      return output;
    };

    // 3. Recipient Field & Certificate Code
    const codeY = 296;

    if (cert.recipientText) {
      drawCenteredText(cert.recipientText, fontRegular, 8.5, codeY + 18, textColor);
    }

    const codeText = `№ ${cert.code}`;
    drawCenteredText(codeText, fontBold, 17, codeY, textColor);

    // Expiration date directly below Certificate Number
    const expiresStr = cert.expiresAt ? format(new Date(cert.expiresAt), "dd.MM.yyyy") : "Бессрочно";
    drawCenteredText(`Действителен до ${expiresStr}`, fontMedium, 8, codeY - 14, subtextColor);

    // 4. Main Service Title & Included Items
    let mainServiceTitle = "Фотосессия в фотостудии FOTOIDEA";
    if (cert.type === "NOMINAL") {
      const amount = cert.nominalAmount ? Number(cert.nominalAmount).toLocaleString("ru-RU") : "0";
      mainServiceTitle = `Сертификат на сумму ${amount} ₸`;
    } else if (planName) {
      mainServiceTitle = planName;
    }

    const detailsY = 264;
    drawCenteredText(mainServiceTitle, fontBold, 10.5, detailsY, textColor);

    let rawRules = "";
    if (cert.type === "NOMINAL") {
      rawRules = t.rulesText || "Сертификат на любые услуги фотостудии\nДействует на аренду залов и фотосессии";
    } else if (planDescription) {
      rawRules = planDescription;
    } else {
      rawRules = t.rulesText || "Готовые интерьерные фотозоны\nПрофессиональный фотограф\nКоличество участников до 4 человек\nОбработанные фотографии на облаке";
    }

    // Wrap and process ALL description lines
    let lines: string[] = wrapTextLines(rawRules, 50);

    if (cert.peopleCount) {
      const idx = lines.findIndex(l => l.toLowerCase().includes("участник") || l.toLowerCase().includes("человек"));
      if (idx !== -1) {
        lines[idx] = `Количество участников до ${cert.peopleCount} человек`;
      }
    }

    const lineCount = lines.length;
    let descFontSize = 7.5;
    let lineSpacing = 11.5;
    if (lineCount > 7) {
      descFontSize = 6.2;
      lineSpacing = 8.5;
    } else if (lineCount > 4) {
      descFontSize = 7.0;
      lineSpacing = 10.0;
    }

    let currentY = detailsY - 13;
    lines.forEach((line) => {
      drawCenteredText(line.trim(), fontRegular, descFontSize, currentY, subtextColor);
      currentY -= lineSpacing;
    });

    // 5. QR Code Generation (Centered White Rounded Card with subtle border)
    const boxSize = 54;
    const boxX = (width - boxSize) / 2;
    const boxY = 82;
    const qrBoxPath = getRoundedRectPath(boxX, boxY, boxSize, boxSize, 8);

    // Draw white background
    page.drawSvgPath(qrBoxPath, {
      color: rgb(1, 1, 1),
    });

    // Draw subtle border around white rounded box
    const qrBorderPath = getRoundedRectPath(boxX, boxY, boxSize, boxSize, 8);
    page.drawSvgPath(qrBorderPath, {
      borderColor: borderColor,
      borderWidth: 0.8,
    });

    // Correct public URL for electronic certificate (ensuring https://crm.fotoidea.kz)
    const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    let publicUrl = `https://crm.fotoidea.kz/c/${cert.code}`;
    if (hostHeader && !hostHeader.includes("localhost") && !hostHeader.includes("127.0.0.1") && !hostHeader.includes("0.0.0.0")) {
      const proto = req.headers.get("x-forwarded-proto") || "https";
      publicUrl = `${proto}://${hostHeader}/c/${cert.code}`;
    }

    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      margin: 0,
      width: 180,
      color: {
        dark: "#1C1B18",
        light: "#FFFFFF",
      },
    });
    const qrImage = await pdfDoc.embedPng(qrDataUrl);
    const qrImageSize = 44;

    page.drawImage(qrImage, {
      x: (width - qrImageSize) / 2,
      y: boxY + (boxSize - qrImageSize) / 2,
      width: qrImageSize,
      height: qrImageSize,
    });

    drawCenteredText("Электронная версия сертификата", fontMedium, 6.5, boxY - 11, subtextColor);

    // 6. Contacts & Address (Bottom Section)
    const phone = t.studioPhone || "+7 777 79 79 888";
    const insta = t.studioInstagram ? `@${t.studioInstagram.replace(/^@/, "")}` : "fotoideakz";
    drawCenteredText(`${phone}   ·   ${insta}`, fontBold, 8.5, 48, textColor);

    const address = t.studioAddress || "г. Уральск, пр. Абулхаир хана 147, ЖК Азимут";
    drawCenteredText(address, fontRegular, 7, 34, subtextColor);

    const pdfBytes = await pdfDoc.save();

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="certificate-${cert.code}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка генерации PDF" },
      { status: 500 }
    );
  }
}
