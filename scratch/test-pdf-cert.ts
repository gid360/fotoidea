import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";

export {};

async function generateTestPdf() {
  console.log("Loading local Roboto font from node_modules...");
  const filesDir = path.join(process.cwd(), "node_modules", "@fontsource", "roboto", "files");
  
  const fontBytes = fs.readFileSync(path.join(filesDir, "roboto-cyrillic-400-normal.woff"));
  const fontBoldBytes = fs.readFileSync(path.join(filesDir, "roboto-cyrillic-700-normal.woff"));

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const customFont = await pdfDoc.embedFont(fontBytes);
  const customBoldFont = await pdfDoc.embedFont(fontBoldBytes);

  // A5 Landscape: 595.28 x 419.53
  const page = pdfDoc.addPage([595.28, 419.53]);
  const { width, height } = page.getSize();

  // Background - Dark Elegant Slate
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.06, 0.09, 0.16), // #0F172A
  });

  // Gold Inner Border
  page.drawRectangle({
    x: 15,
    y: 15,
    width: width - 30,
    height: height - 30,
    borderColor: rgb(0.85, 0.65, 0.13), // Gold
    borderWidth: 2,
  });

  // Title
  page.drawText("FOTOIDEA STUDIO", {
    x: width / 2 - 70,
    y: height - 55,
    size: 14,
    font: customBoldFont,
    color: rgb(0.85, 0.65, 0.13),
  });

  page.drawText("ПОДАРОЧНЫЙ СЕРТИФИКАТ", {
    x: width / 2 - 130,
    y: height - 90,
    size: 20,
    font: customBoldFont,
    color: rgb(1, 1, 1),
  });

  // Code Box
  page.drawRectangle({
    x: width / 2 - 100,
    y: height - 150,
    width: 200,
    height: 40,
    color: rgb(0.12, 0.16, 0.23),
    borderColor: rgb(0.85, 0.65, 0.13),
    borderWidth: 1,
  });

  page.drawText("КОД: CERT-999999", {
    x: width / 2 - 65,
    y: height - 136,
    size: 14,
    font: customBoldFont,
    color: rgb(1, 1, 1),
  });

  // Details
  page.drawText("Номинал: 50 000 ₸", {
    x: 40,
    y: height - 200,
    size: 14,
    font: customFont,
    color: rgb(0.9, 0.9, 0.9),
  });

  page.drawText("Покупатель: Иван Иванов", {
    x: 40,
    y: height - 230,
    size: 12,
    font: customFont,
    color: rgb(0.7, 0.7, 0.7),
  });

  page.drawText("Срок действия: до 05.11.2026", {
    x: 40,
    y: height - 260,
    size: 12,
    font: customFont,
    color: rgb(0.7, 0.7, 0.7),
  });

  // Footer
  page.drawText("Сертификат дает право на услуги фотостудии Fotoidea. Предъявите код при бронировании.", {
    x: 40,
    y: 35,
    size: 9,
    font: customFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync("scratch/test_cert.pdf", Buffer.from(pdfBytes));
  console.log("PDF created successfully: scratch/test_cert.pdf, size:", pdfBytes.length);
}

generateTestPdf().catch(console.error);
