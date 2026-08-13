import { PDFDocument, rgb } from "pdf-lib";
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

  // 1. Draw Page Background
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: bgColor,
  });

  // 2. Draw Thick Rounded Border Frame (4 rectangle strips with rounded inner outline)
  const frameSize = 12;
  page.drawRectangle({ x: 0, y: 0, width, height: frameSize, color: borderColor });
  page.drawRectangle({ x: 0, y: height - frameSize, width, height: frameSize, color: borderColor });
  page.drawRectangle({ x: 0, y: 0, width: frameSize, height, color: borderColor });
  page.drawRectangle({ x: width - frameSize, y: 0, width: frameSize, height, color: borderColor });

  // Draw 4 corner curves/rects for 15px rounded corners
  const r = 15;
  const innerPath = getRoundedRectPath(frameSize, frameSize, width - frameSize * 2, height - frameSize * 2, r);
  page.drawSvgPath(innerPath, {
    color: bgColor,
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync("scratch/test-frame-fixed.pdf", pdfBytes);
  console.log("Saved scratch/test-frame-fixed.pdf. Bytes:", pdfBytes.length);
}

main();
