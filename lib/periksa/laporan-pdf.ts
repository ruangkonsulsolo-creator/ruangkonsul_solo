import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { BRAND } from "@/lib/brand";
import { pdfSafe } from "@/lib/receipt/pdf";
import type { HasilPeriksa } from "./types";
import { labelAi, labelKemiripan } from "./persen-berubah";

const MERAH = rgb(0x8b / 255, 0, 0);
const GELAP = rgb(0.06, 0.09, 0.16);
const REDUP = rgb(0.42, 0.45, 0.5);
const GARIS = rgb(0.89, 0.91, 0.94);
const KUNING_BG = rgb(1, 0.97, 0.88);
const KUNING = rgb(0.6, 0.4, 0.05);

const W = 595.28;
const H = 841.89;
const L = 50;
const R = W - 50;

type Ctx = { doc: PDFDocument; page: PDFPage; y: number; font: PDFFont; bold: PDFFont };

function wrap(s: string, font: PDFFont, size: number, max: number): string[] {
  const out: string[] = [];
  for (const para of pdfSafe(s).split(/\n+/)) {
    let cur = "";
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const next = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) > max && cur) {
        out.push(cur);
        cur = w;
      } else cur = next;
    }
    if (cur) out.push(cur);
  }
  return out;
}

function butuh(c: Ctx, tinggi: number) {
  if (c.y - tinggi < 70) {
    c.page = c.doc.addPage([W, H]);
    c.y = H - 60;
  }
}

function tulis(c: Ctx, s: string, opt: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number; max?: number; jarak?: number } = {}) {
  const size = opt.size ?? 10;
  const f = opt.bold ? c.bold : c.font;
  const x = opt.x ?? L;
  const baris = wrap(s, f, size, opt.max ?? R - x);
  for (const b of baris) {
    butuh(c, size + 4);
    c.page.drawText(b, { x, y: c.y, size, font: f, color: opt.color ?? GELAP });
    c.y -= size + (opt.jarak ?? 4);
  }
}

function garis(c: Ctx, jarak = 10) {
  butuh(c, jarak * 2);
  c.y -= jarak / 2;
  c.page.drawLine({ start: { x: L, y: c.y }, end: { x: R, y: c.y }, thickness: 1, color: GARIS });
  c.y -= jarak;
}

/** Laporan pemeriksaan (indikasi AI atau kemiripan) sebagai PDF A4. */
export async function renderLaporanPdf(h: HasilPeriksa, opsi: { nama?: string | null; cuplikanAwal?: string | null; appUrl: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const judulDok = h.jenis === "ai" ? "Laporan Deteksi Tulisan AI" : "Laporan Cek Kemiripan (Plagiarisme)";
  doc.setTitle(`${judulDok} - ${BRAND.name}`);
  doc.setAuthor(BRAND.name);
  doc.setCreator(BRAND.name);

  const c: Ctx = { doc, page: doc.addPage([W, H]), y: H - 50, font, bold };

  // Kop
  c.page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: MERAH });
  c.page.drawText(pdfSafe(BRAND.name), { x: L, y: c.y - 6, size: 13, font: bold, color: MERAH });
  const idTeks = `ID ${h.id.slice(0, 8).toUpperCase()}`;
  c.page.drawText(idTeks, { x: R - font.widthOfTextAtSize(idTeks, 9), y: c.y - 4, size: 9, font, color: REDUP });
  c.y -= 34;
  tulis(c, judulDok, { size: 20, bold: true });
  const tgl = new Date(h.diperiksaPada).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" });
  tulis(c, `Diperiksa ${tgl} WIB  |  ${h.jumlahKata.toLocaleString("id-ID")} kata  |  Mesin pemeriksa: ${h.penyedia}`, { size: 9, color: REDUP });
  if (opsi.nama) tulis(c, `Pemilik naskah: ${opsi.nama}`, { size: 9, color: REDUP });
  garis(c, 14);

  // Skor utama
  const skor = h.jenis === "ai" ? h.ai?.skor ?? 0 : h.kemiripan?.persen ?? 0;
  const labelSkor = h.jenis === "ai" ? "Probabilitas tulisan AI" : "Tingkat kemiripan";
  const vonis = h.jenis === "ai" ? labelAi(skor) : labelKemiripan(skor);
  butuh(c, 110);
  c.page.drawRectangle({ x: L, y: c.y - 92, width: R - L, height: 92, color: rgb(0.99, 0.95, 0.95), borderColor: rgb(0.96, 0.84, 0.84), borderWidth: 1 });
  c.page.drawText(labelSkor, { x: L + 18, y: c.y - 24, size: 10, font, color: REDUP });
  c.page.drawText(`${skor}%`, { x: L + 18, y: c.y - 74, size: 44, font: bold, color: MERAH });
  c.page.drawText(pdfSafe(vonis), { x: L + 170, y: c.y - 50, size: 13, font: bold, color: GELAP });
  // Bilah
  const bx = L + 170, by = c.y - 72, bw = R - L - 190;
  c.page.drawRectangle({ x: bx, y: by, width: bw, height: 8, color: GARIS });
  c.page.drawRectangle({ x: bx, y: by, width: Math.max(2, (bw * Math.min(100, skor)) / 100), height: 8, color: MERAH });
  c.y -= 110;

  if (h.jenis === "ai" && h.ai) {
    // Peringatan
    const baris = wrap(h.ai.peringatan, font, 9, R - L - 24);
    const tinggi = baris.length * 13 + 16;
    butuh(c, tinggi + 8);
    c.page.drawRectangle({ x: L, y: c.y - tinggi + 10, width: R - L, height: tinggi, color: KUNING_BG });
    for (const b of baris) {
      c.page.drawText(b, { x: L + 12, y: c.y - 4, size: 9, font, color: KUNING });
      c.y -= 13;
    }
    c.y -= 18;
    if (h.ai.bagianDitandai.length) {
      tulis(c, "Kalimat yang paling memicu skor", { size: 12, bold: true, jarak: 8 });
      h.ai.bagianDitandai.slice(0, 15).forEach((b, i) => {
        tulis(c, `${i + 1}. (${Math.round(b.skor)}%)  ${b.teks}`, { size: 9.5, x: L + 6, jarak: 4 });
        c.y -= 4;
      });
    }
  }

  if (h.jenis === "kemiripan" && h.kemiripan) {
    if (h.kemiripan.persenBersitasi > 0) {
      tulis(c, `${h.kemiripan.persenBersitasi}% dari kemiripan berasal dari kutipan yang sudah bersitasi (wajar).`, { size: 9.5, color: REDUP });
      c.y -= 6;
    }
    if (h.kemiripan.sumber.length) {
      tulis(c, "Sumber yang cocok", { size: 12, bold: true, jarak: 8 });
      h.kemiripan.sumber.slice(0, 20).forEach((s, i) => {
        tulis(c, `${i + 1}. ${s.judul}  -  ${s.persen}%`, { size: 10, bold: true, jarak: 3 });
        if (s.url) tulis(c, s.url, { size: 8.5, color: REDUP, x: L + 12, jarak: 3 });
        if (s.cuplikan) tulis(c, `"${s.cuplikan}"`, { size: 9, color: GELAP, x: L + 12, jarak: 3 });
        c.y -= 6;
      });
    } else {
      tulis(c, "Tidak ditemukan sumber yang cocok.", { size: 10 });
    }
  }

  if (h.saran.length) {
    garis(c, 14);
    tulis(c, "Saran perbaikan", { size: 12, bold: true, jarak: 8 });
    for (const s of h.saran) tulis(c, `- ${s}`, { size: 9.5, x: L + 6 });
  }

  // Kaki di setiap halaman
  const halaman = doc.getPages();
  halaman.forEach((pg, i) => {
    const kaki = pdfSafe(`${BRAND.name}  |  Verifikasi: ${opsi.appUrl}/periksa/laporan/${h.id}  |  Hal. ${i + 1}/${halaman.length}`);
    pg.drawText(kaki, { x: L, y: 32, size: 7.5, font, color: REDUP });
  });

  return doc.save();
}
