import { PDFDocument, rgb, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";

async function testSmartFont() {
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

  const page = pdfDoc.addPage([283.5, 425.2]);
  const { width } = page.getSize();

  // Smart text drawer function
  function getChunks(text: string) {
    const chunks: { text: string; isCyrillic: boolean }[] = [];
    let currentChunk = "";
    let currentIsCyrillic: boolean | null = null;

    for (const char of text) {
      const isCyr = /[\u0400-\u04FF]/.test(char);
      if (currentIsCyrillic === null) {
        currentIsCyrillic = isCyr;
        currentChunk = char;
      } else if (currentIsCyrillic === isCyr) {
        currentChunk += char;
      } else {
        chunks.push({ text: currentChunk, isCyrillic: currentIsCyrillic });
        currentIsCyrillic = isCyr;
        currentChunk = char;
      }
    }
    if (currentChunk) {
      chunks.push({ text: currentChunk, isCyrillic: !!currentIsCyrillic });
    }
    return chunks;
  }

  function measureSmartText(text: string, isBold: boolean, size: number) {
    const chunks = getChunks(text);
    let totalWidth = 0;
    for (const chunk of chunks) {
      const font = chunk.isCyrillic
        ? (isBold ? fontCyrillicBold : fontCyrillic)
        : (isBold ? fontLatinBold : fontLatin);
      totalWidth += font.widthOfTextAtSize(chunk.text, size);
    }
    return totalWidth;
  }

  function drawSmartText(text: string, isBold: boolean, size: number, y: number, color: any, isCentered = true) {
    if (!text) return;
    const totalWidth = measureSmartText(text, isBold, size);
    let currentX = isCentered ? (width - totalWidth) / 2 : 20;

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
  }

  const black = rgb(0.2, 0.2, 0.2);

  drawSmartText("Fotoidea.kz", true, 16, 380, black);
  drawSmartText("С Е Р Т И Ф И К А Т", true, 13, 360, black);
  drawSmartText("НА ПРОФЕССИОНАЛЬНУЮ ФОТОСЕССИЮ", false, 6.5, 345, black);
  drawSmartText("№ 29EP2G", true, 17, 300, black);
  drawSmartText("Фотосессия 30 минут", true, 10, 260, black);
  drawSmartText("Продолжительность 1 час", false, 8, 240, black);
  drawSmartText("100 обработанных фотографий", false, 8, 225, black);
  drawSmartText("Количество участников до 4 человек", false, 8, 210, black);
  drawSmartText("Помощь в позировании", false, 8, 195, black);
  drawSmartText("+7 777 79 79 888   |   fotoideakz", true, 9, 64, black);
  drawSmartText("Действителен до 05.11.2026", true, 8.5, 48, black);
  drawSmartText("г. Уральск, пр. Абулхаир хана 147, ЖК Азимут, 1 этаж", false, 7, 34, black);

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync("scratch/smart-font-test.pdf", pdfBytes);
  console.log("Smart font PDF generated successfully! Saved to scratch/smart-font-test.pdf. Bytes:", pdfBytes.length);
}

testSmartFont().catch(e => console.error(e));
