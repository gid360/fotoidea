import { PDFDocument, rgb } from "pdf-lib";
import fs from "fs";

async function testFrame() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([283.5, 425.2]);
  const { width, height } = page.getSize();

  const borderColor = rgb(0.84, 0.77, 0.65);
  const bgColor = rgb(0.98, 0.97, 0.96);

  // Background
  page.drawRectangle({ x: 0, y: 0, width, height, color: bgColor });

  // Outer Rounded 15px Border Frame (10px thickness, 15px radius)
  const r = 15;
  const frameWidth = 10;
  const margin = frameWidth / 2 + 1;

  const x = margin;
  const y = margin;
  const w = width - margin * 2;
  const h = height - margin * 2;
  const k = r * 0.55228475;

  const x0 = (x).toFixed(2);
  const x0r = (x + r).toFixed(2);
  const x1r = (x + w - r).toFixed(2);
  const x1 = (x + w).toFixed(2);

  const y0 = (y).toFixed(2);
  const y0r = (y + r).toFixed(2);
  const y1r = (y + h - r).toFixed(2);
  const y1 = (y + h).toFixed(2);

  const x0rk = (x + r - k).toFixed(2);
  const x1rk = (x + w - r + k).toFixed(2);
  const y0rk = (y + r - k).toFixed(2);
  const y1rk = (y + h - r + k).toFixed(2);

  const pathData = `M ${x0r} ${y0} L ${x1r} ${y0} C ${x1rk} ${y0} ${x1} ${y0rk} ${x1} ${y0r} L ${x1} ${y1r} C ${x1} ${y1rk} ${x1rk} ${y1} ${x1r} ${y1} L ${x0r} ${y1} C ${x0rk} ${y1} ${x0} ${y1rk} ${x0} ${y1r} L ${x0} ${y0r} C ${x0} ${y0rk} ${x0rk} ${y0} ${x0r} ${y0} Z`;

  page.drawSvgPath(pathData, {
    borderColor: borderColor,
    borderWidth: frameWidth,
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync("scratch/test-frame-15.pdf", pdfBytes);
  console.log("Saved test-frame-15.pdf. Bytes:", pdfBytes.length);
}

testFrame().catch(e => console.error(e));
