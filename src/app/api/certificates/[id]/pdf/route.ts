import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

    // Load Cyrillic & Latin Fonts from @fontsource/roboto
    const filesDir = path.join(process.cwd(), "node_modules", "@fontsource", "roboto", "files");
    const fontCyrillicBytes = fs.readFileSync(path.join(filesDir, "roboto-cyrillic-400-normal.woff"));
    const fontCyrillicBoldBytes = fs.readFileSync(path.join(filesDir, "roboto-cyrillic-700-normal.woff"));
    const fontLatinBytes = fs.readFileSync(path.join(filesDir, "roboto-latin-400-normal.woff"));
    const fontLatinBoldBytes = fs.readFileSync(path.join(filesDir, "roboto-latin-700-normal.woff"));

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const fontCyrillic = await pdfDoc.embedFont(fontCyrillicBytes);
    const fontCyrillicBold = await pdfDoc.embedFont(fontCyrillicBoldBytes);
    const fontLatin = await pdfDoc.embedFont(fontLatinBytes);
    const fontLatinBold = await pdfDoc.embedFont(fontLatinBoldBytes);

    // Standard 10x15 cm Portrait Printable Dimensions: 283.5 x 425.2 pt
    const page = pdfDoc.addPage([283.5, 425.2]);
    const { width, height } = page.getSize();

    const bgColor = hexToRgb(t.bgColor, rgb(0.98, 0.97, 0.96)); // #FAF8F5
    const borderColor = hexToRgb(t.borderColor, rgb(0.84, 0.77, 0.65)); // #D6C4A5
    const textColor = hexToRgb(t.textColor, rgb(0.24, 0.21, 0.18)); // #3D352E
    const subtextColor = hexToRgb(t.subtextColor, rgb(0.49, 0.45, 0.40)); // #7D7265

    // Helper function to split text into Cyrillic vs Latin chunks with neutral character inheriting
    const getChunks = (text: string) => {
      const chunks: { text: string; isCyrillic: boolean }[] = [];
      let currentChunk = "";
      let currentIsCyrillic: boolean | null = null;

      for (const char of text) {
        const isCyr = /[\u0400-\u04FF\u2116]/.test(char);
        const isLat = /[a-zA-Z]/.test(char);

        if (currentIsCyrillic === null) {
          currentIsCyrillic = isCyr || !isLat;
          currentChunk = char;
        } else if (isCyr) {
          if (currentIsCyrillic) {
            currentChunk += char;
          } else {
            chunks.push({ text: currentChunk, isCyrillic: false });
            currentIsCyrillic = true;
            currentChunk = char;
          }
        } else if (isLat) {
          if (!currentIsCyrillic) {
            currentChunk += char;
          } else {
            chunks.push({ text: currentChunk, isCyrillic: true });
            currentIsCyrillic = false;
            currentChunk = char;
          }
        } else {
          // Neutral char (digits, spaces, punctuation): inherit current font
          currentChunk += char;
        }
      }
      if (currentChunk) {
        chunks.push({ text: currentChunk, isCyrillic: !!currentIsCyrillic });
      }
      return chunks;
    };

    const measureSmartText = (text: string, isBold: boolean, size: number) => {
      const chunks = getChunks(text);
      let totalWidth = 0;
      for (const chunk of chunks) {
        const font = chunk.isCyrillic
          ? (isBold ? fontCyrillicBold : fontCyrillic)
          : (isBold ? fontLatinBold : fontLatin);
        totalWidth += font.widthOfTextAtSize(chunk.text, size);
      }
      return totalWidth;
    };

    const centerSmartText = (text: string, isBold: boolean, size: number, y: number, color: any) => {
      if (!text) return;
      const totalWidth = measureSmartText(text, isBold, size);
      let currentX = (width - totalWidth) / 2;

      const chunks = getChunks(text);
      for (const chunk of chunks) {
        const font = chunk.isCyrillic
          ? (isBold ? fontCyrillicBold : fontCyrillic)
          : (isBold ? fontLatinBold : fontLatin);

        page.drawText(chunk.text, {
          x: currentX,
          y,
          size,
          font,
          color,
        });
        currentX += font.widthOfTextAtSize(chunk.text, size);
      }
    };

    const getY = (percent: number) => height - (height * percent) / 100;

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
        const frameSize = 12;
        page.drawRectangle({ x: 0, y: 0, width, height: frameSize, color: borderColor });
        page.drawRectangle({ x: 0, y: height - frameSize, width, height: frameSize, color: borderColor });
        page.drawRectangle({ x: 0, y: 0, width: frameSize, height, color: borderColor });
        page.drawRectangle({ x: width - frameSize, y: 0, width: frameSize, height, color: borderColor });

        const innerPath = getRoundedRectPath(frameSize, frameSize, width - frameSize * 2, height - frameSize * 2, 15);
        page.drawSvgPath(innerPath, { color: bgColor });
      }
    }

    // 3. Top Header Section (Vertical Portrait)
    const titleY = t.titlePosY ? getY(t.titlePosY) : height - 60;

    // Logo image
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

    // Logo: Fotoidea.kz
    centerSmartText("Fotoidea.kz", true, 16, titleY + 4, textColor);

    // Title: С Е Р Т И Ф И К А Т
    centerSmartText(t.titleText || "С Е Р Т И Ф И К А Т", true, 13, titleY - 12, textColor);

    // Subtitle: НА ПРОФЕССИОНАЛЬНУЮ ФОТОСЕССИЮ
    if (t.subtitleText) {
      centerSmartText(t.subtitleText, false, 6.5, titleY - 22, subtextColor);
    }

    // Divider Line Top (Single Divider)
    page.drawLine({
      start: { x: 30, y: titleY - 30 },
      end: { x: width - 30, y: titleY - 30 },
      thickness: 0.8,
      color: borderColor,
    });

    // Helper function to split long description text into wrapped lines
    const wrapTextLines = (rawText: string, maxCharsPerLine = 46): string[] => {
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

    // 4. Custom Recipient Field ("Для кого / От кого") & Code Section (Lowered by 25px)
    const codeY = (t.codePosY ? getY(t.codePosY) : height - 130) - 25;

    if (cert.recipientText) {
      centerSmartText(cert.recipientText, false, 8.5, codeY + 26, textColor);
    }

    const codeText = `№ ${cert.code}`;
    centerSmartText(codeText, true, 17, codeY, textColor);

    // Expiration date directly below Certificate Number
    const expiresStr = cert.expiresAt ? format(new Date(cert.expiresAt), "dd.MM.yyyy") : "Бессрочно";
    centerSmartText(`Действителен до ${expiresStr}`, false, 8, codeY - 14, subtextColor);

    // 5. Main Service Title & Included Items
    let mainServiceTitle = "Фотосессия в фотостудии FOTOIDEA";
    if (cert.type === "NOMINAL") {
      const amount = cert.nominalAmount ? Number(cert.nominalAmount).toLocaleString("ru-RU") : "0";
      mainServiceTitle = `Сертификат на сумму ${amount} ₸`;
    } else if (planName) {
      mainServiceTitle = planName;
    }

    const detailsY = codeY - 54;
    centerSmartText(mainServiceTitle, true, 10, detailsY, textColor);

    let currentY = detailsY - 14;

    const rawRules = planDescription || t.rulesText || "";
    const lines = wrapTextLines(rawRules, 46);
    if (cert.peopleCount) {
      const idx = lines.findIndex(l => l.toLowerCase().includes("участник") || l.toLowerCase().includes("человек"));
      if (idx !== -1) {
        lines[idx] = `Количество участников до ${cert.peopleCount} человек`;
      }
    }

    lines.forEach((line) => {
      centerSmartText(line, false, 7.5, currentY, subtextColor);
      currentY -= 11.5;
    });

    // 6. QR Code Generation (Centered - Dark Rounded Box)
    const qrSectionY = t.rulesPosY ? getY(t.rulesPosY) : height - 295;

    const origin = req.nextUrl.origin || "https://fotoidea.kz";
    const publicUrl = `${origin}/c/${cert.code}`;

    // Dark Rounded Container for QR Code (10px rounded corners)
    const boxSize = 52;
    const boxX = (width - boxSize) / 2;
    const boxY = qrSectionY - 20;
    const qrBoxPath = getRoundedRectPath(boxX, boxY, boxSize, boxSize, 10);

    const darkColor = rgb(0.11, 0.11, 0.11);
    page.drawSvgPath(qrBoxPath, {
      color: darkColor,
    });

    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      margin: 1,
      width: 140,
      color: {
        dark: "#FFFFFF",
        light: "#1C1B18",
      },
    });
    const qrImage = await pdfDoc.embedPng(qrDataUrl);
    const qrImageSize = 42;

    page.drawImage(qrImage, {
      x: (width - qrImageSize) / 2,
      y: boxY + (boxSize - qrImageSize) / 2,
      width: qrImageSize,
      height: qrImageSize,
    });

    centerSmartText("Электронная версия сертификата", false, 6.5, qrSectionY - 30, subtextColor);

    // 7. Contacts (Bottom Section)
    const phone = t.studioPhone || "+7 777 79 79 888";
    const insta = t.studioInstagram ? `@${t.studioInstagram.replace(/^@/, "")}` : "fotoideakz";
    centerSmartText(`${phone}   |   ${insta}`, true, 9, 52, textColor);

    const address = t.studioAddress || "г. Уральск, пр. Абулхаир хана 147, ЖК Азимут, 1 этаж";
    centerSmartText(address, false, 7, 36, subtextColor);

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
