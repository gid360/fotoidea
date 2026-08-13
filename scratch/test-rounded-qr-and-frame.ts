import { PDFDocument, rgb } from "pdf-lib";
import QRCode from "qrcode";
import fs from "fs";

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

async function main() {
  const pdfDoc = await PDFDocument.create();
  const width = 283.5;
  const height = 425.2;
  const page = pdfDoc.addPage([width, height]);

  const bgColor = rgb(0.98, 0.97, 0.94);
  const borderColor = rgb(0.83, 0.74, 0.61);

  // 1. Base card background with 15px rounded corners
  const outerPath = getRoundedRectPath(0, 0, width, height, 16);
  page.drawSvgPath(outerPath, {
    color: borderColor,
  });

  // 2. Inner card area (creates 10pt thick border with rounded inner & outer corners)
  const borderWidth = 10;
  const innerPath = getRoundedRectPath(borderWidth, borderWidth, width - borderWidth * 2, height - borderWidth * 2, 10);
  page.drawSvgPath(innerPath, {
    color: bgColor,
  });

  // 3. Dark Rounded Container for QR Code (10px rounded corners)
  const boxSize = 54;
  const boxX = (width - boxSize) / 2;
  const boxY = height / 2 - 40;
  const qrBoxPath = getRoundedRectPath(boxX, boxY, boxSize, boxSize, 10);

  const darkColor = rgb(0.11, 0.11, 0.11);
  page.drawSvgPath(qrBoxPath, {
    color: darkColor,
  });

  // White QR code on matching dark background
  const qrDataUrl = await QRCode.toDataURL("https://fotoidea.kz/c/29EP2G", {
    margin: 1,
    width: 160,
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

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync("scratch/test-rounded-qr.pdf", pdfBytes);
  console.log("Saved scratch/test-rounded-qr.pdf. Bytes:", pdfBytes.length);
}

main();
