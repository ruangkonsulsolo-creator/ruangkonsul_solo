import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { BRAND } from "@/lib/brand";
import { formatRupiah } from "@/lib/utils/format-currency";
import { formatWhatsApp } from "@/lib/validators/whatsapp";
import { formatDateTimeWIB, type ReceiptData } from "./data";

const BRAND_RGB = rgb(0x8b / 255, 0, 0);
const MUTED = rgb(0.42, 0.45, 0.5);
const DARK = rgb(0.06, 0.09, 0.16);
const LINE = rgb(0.89, 0.91, 0.94);

/** Font standar PDF hanya mendukung WinAnsi → buang karakter di luar itu (emoji dll). */
export function pdfSafe(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/—/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2192\u21B3]/g, "->")
    .replace(/\u2264/g, "<=")
    .replace(/\u2265/g, ">=")
    .replace(/[^\x20-\x7E -ÿ–]/g, "");
}

function text(page: PDFPage, s: string, x: number, y: number, font: PDFFont, size = 10, color = DARK) {
  page.drawText(pdfSafe(s), { x, y, size, font, color });
}

function rightText(page: PDFPage, s: string, xRight: number, y: number, font: PDFFont, size = 10, color = DARK) {
  const safe = pdfSafe(s);
  page.drawText(safe, { x: xRight - font.widthOfTextAtSize(safe, size), y, size, font, color });
}

function wrap(s: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = pdfSafe(s).split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function renderReceiptPdf(r: ReceiptData, appUrl: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Receipt ${r.receiptNumber ?? r.midtransOrderId}`);
  doc.setAuthor(BRAND.name);
  doc.setCreator(BRAND.name);

  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const L = 50;
  const R = 545;
  let y = 790;

  // Header
  page.drawRectangle({ x: 0, y: 770, width: 595.28, height: 72, color: BRAND_RGB });
  text(page, BRAND.name, L, 805, bold, 18, rgb(1, 1, 1));
  text(page, BRAND.domain, L, 788, font, 9, rgb(1, 0.85, 0.85));
  rightText(page, "RECEIPT / KWITANSI", R, 805, bold, 14, rgb(1, 1, 1));
  rightText(page, r.status === "paid" ? "LUNAS" : r.status.toUpperCase(), R, 788, bold, 10, rgb(1, 0.85, 0.85));

  y = 735;
  text(page, "No. Receipt", L, y, font, 9, MUTED);
  text(page, r.receiptNumber ?? "(belum lunas)", L, y - 16, mono, 14, DARK);
  rightText(page, "Tanggal Bayar", R, y, font, 9, MUTED);
  rightText(page, formatDateTimeWIB(r.paidAt), R, y - 16, bold, 11);

  // Info grid
  y = 680;
  page.drawLine({ start: { x: L, y: y + 12 }, end: { x: R, y: y + 12 }, thickness: 1, color: LINE });
  const rows: [string, string][] = [
    ["Nama Customer", r.customer.name],
    ["Email", r.customer.email ?? "-"],
    ["WhatsApp", formatWhatsApp(r.customer.whatsapp)],
    ["Jenis Transaksi", r.purposeLabel],
    ["No. Referensi", r.referenceLabel ?? "-"],
    ["Order ID Midtrans", r.midtransOrderId],
    ["ID Transaksi", r.transactionId ?? "-"],
    ["Metode Pembayaran", r.paymentType ?? "-"],
  ];
  rows.forEach(([k, v], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? L : 310;
    const yy = y - row * 34;
    text(page, k, x, yy, font, 8, MUTED);
    const shown = wrap(v, bold, 10, 230)[0] ?? "-";
    text(page, shown, x, yy - 13, k.includes("ID") ? mono : bold, k.includes("ID") ? 9 : 10);
  });

  // Items table
  y = 680 - 4 * 34 - 10;
  page.drawRectangle({ x: L, y: y - 6, width: R - L, height: 22, color: rgb(0.97, 0.97, 0.98) });
  text(page, "Item", L + 8, y, bold, 9, MUTED);
  rightText(page, "Qty", 370, y, bold, 9, MUTED);
  rightText(page, "Harga", 455, y, bold, 9, MUTED);
  rightText(page, "Subtotal", R - 8, y, bold, 9, MUTED);
  y -= 26;

  let total = 0;
  for (const it of r.items) {
    const lines = wrap(it.name, font, 10, 270);
    lines.forEach((ln, i) => text(page, ln, L + 8, y - i * 13, font, 10));
    rightText(page, String(it.quantity), 370, y, font, 10);
    rightText(page, formatRupiah(it.price), 455, y, font, 10);
    rightText(page, formatRupiah(it.price * it.quantity), R - 8, y, font, 10);
    total += it.price * it.quantity;
    y -= Math.max(lines.length, 1) * 13 + 10;
    page.drawLine({ start: { x: L, y: y + 4 }, end: { x: R, y: y + 4 }, thickness: 0.5, color: LINE });
  }

  y -= 10;
  rightText(page, "TOTAL DIBAYAR", 455, y, bold, 11, MUTED);
  rightText(page, formatRupiah(r.amountIdr || total), R - 8, y, bold, 14, BRAND_RGB);

  // Verifikasi
  y -= 60;
  page.drawRectangle({ x: L, y: y - 40, width: R - L, height: 58, borderColor: LINE, borderWidth: 1, color: rgb(0.99, 0.98, 0.98) });
  text(page, "Verifikasi keaslian receipt ini:", L + 12, y, bold, 9);
  if (r.receiptNumber) {
    text(page, `${appUrl.replace(/\/$/, "")}/verify/${r.receiptNumber}`, L + 12, y - 15, mono, 9, BRAND_RGB);
  }
  text(page, "Pembayaran diproses oleh Midtrans (PT Midtrans). Simpan receipt ini sebagai bukti transaksi yang sah.", L + 12, y - 30, font, 8, MUTED);

  // Footer
  text(page, `${BRAND.name} · ${BRAND.domain}`, L, 40, font, 8, MUTED);
  rightText(page, `Dicetak ${formatDateTimeWIB(new Date().toISOString())}`, R, 40, font, 8, MUTED);

  return doc.save();
}
