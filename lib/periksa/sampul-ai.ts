import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { BRAND } from "@/lib/brand";
import { pdfSafe } from "@/lib/receipt/pdf";
import type { HasilPeriksa } from "./types";
import { labelAi } from "./persen-berubah";

/**
 * Halaman ringkasan di depan laporan asli ZeroGPT.
 *
 * Laporan resmi ZeroGPT mencetak seluruh naskah apa adanya (puluhan halaman)
 * dan, bila naskah dipecah, satu laporan per bagian dengan skor masing-masing.
 * Halaman ini merangkum yang penting dalam satu lembar: skor keseluruhan,
 * proporsi AI vs manusia, skor per bagian, dan kalimat yang paling
 * terindikasi. Halaman ZeroGPT dilampirkan sesudahnya TANPA diubah.
 *
 * Ukuran Letter (612×792) agar sama dengan halaman ZeroGPT.
 */
const W = 612;
const H = 792;
const L = 48;
const R = W - 48;

const MERAH = rgb(0x8b / 255, 0, 0);
const GELAP = rgb(0.06, 0.09, 0.16);
const TEKS = rgb(0.2, 0.25, 0.33);
const REDUP = rgb(0.45, 0.49, 0.55);
const GARIS = rgb(0.89, 0.91, 0.94);
const LATAR = rgb(0.97, 0.98, 0.99);
const HIJAU = rgb(0.06, 0.6, 0.42);
const AMBER = rgb(0.85, 0.55, 0.05);
const PUTIH = rgb(1, 1, 1);

function warnaSkor(p: number): RGB {
  return p < 20 ? HIJAU : p < 50 ? AMBER : MERAH;
}

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

function teksKanan(page: PDFPage, s: string, xKanan: number, y: number, size: number, font: PDFFont, color: RGB) {
  const t = pdfSafe(s);
  page.drawText(t, { x: xKanan - font.widthOfTextAtSize(t, size), y, size, font, color });
}

function teksTengah(page: PDFPage, s: string, cx: number, y: number, size: number, font: PDFFont, color: RGB) {
  const t = pdfSafe(s);
  page.drawText(t, { x: cx - font.widthOfTextAtSize(t, size) / 2, y, size, font, color });
}

/** Cincin skor: lingkaran abu-abu + busur berwarna searah jarum jam dari atas. */
function cincin(page: PDFPage, cx: number, cy: number, r: number, tebal: number, persen: number, warna: RGB) {
  page.drawCircle({ x: cx, y: cy, size: r, borderColor: GARIS, borderWidth: tebal });
  const p = Math.max(0, Math.min(100, persen)) / 100;
  if (p <= 0.001) return;
  if (p >= 0.999) {
    page.drawCircle({ x: cx, y: cy, size: r, borderColor: warna, borderWidth: tebal });
    return;
  }
  const sudut = 2 * Math.PI * p;
  // Koordinat SVG (sumbu y ke bawah) dengan titik asal di pusat lingkaran.
  const x1 = r * Math.sin(sudut);
  const y1 = -r * Math.cos(sudut);
  const besar = p > 0.5 ? 1 : 0;
  page.drawSvgPath(`M 0 ${-r} A ${r} ${r} 0 ${besar} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`, {
    x: cx,
    y: cy,
    borderColor: warna,
    borderWidth: tebal,
    borderLineCap: 1, // ujung membulat
  });
}

function kotak(page: PDFPage, x: number, y: number, w: number, h: number, warna: RGB, garis?: RGB) {
  page.drawRectangle({ x, y, width: w, height: h, color: warna, borderColor: garis, borderWidth: garis ? 1 : 0 });
}

export async function renderSampulAi(
  h: HasilPeriksa,
  opsi: { kode: string; nama?: string | null; appUrl: string; jumlahHalamanLampiran: number }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Laporan Deteksi AI ${opsi.kode} — ${BRAND.name}`);
  doc.setAuthor(BRAND.name);
  const page = doc.addPage([W, H]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const skor = Math.round(h.ai?.skor ?? 0);
  const manusia = 100 - skor;
  const warna = warnaSkor(skor);
  const bagian = h.ai?.bagian ?? [];
  const tanggal = new Date(h.diperiksaPada).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  // ── Kepala ────────────────────────────────────────────────────────────────
  kotak(page, 0, H - 6, W, 6, MERAH);
  let y = H - 46;
  page.drawText(pdfSafe(BRAND.name.toUpperCase()), { x: L, y, size: 9, font: bold, color: MERAH });
  teksKanan(page, `Kode ${opsi.kode}`, R, y, 9, bold, REDUP);
  y -= 26;
  page.drawText("Laporan Deteksi AI", { x: L, y, size: 24, font: bold, color: GELAP });
  teksKanan(page, `${tanggal} WIB`, R, y + 6, 9, font, REDUP);
  y -= 18;
  const sub = [opsi.nama, `${h.jumlahKata.toLocaleString("id-ID")} kata`, `Diperiksa dengan ${h.penyedia || "ZeroGPT"}`]
    .filter(Boolean)
    .join("  ·  ");
  page.drawText(pdfSafe(sub), { x: L, y, size: 10, font, color: REDUP });
  y -= 22;

  // ── Kartu skor ────────────────────────────────────────────────────────────
  const tinggiKartu = 168;
  const atasKartu = y;
  kotak(page, L, atasKartu - tinggiKartu, R - L, tinggiKartu, LATAR, GARIS);
  const cx = L + 92;
  const cy = atasKartu - tinggiKartu / 2;
  cincin(page, cx, cy, 56, 13, skor, warna);
  teksTengah(page, `${skor}%`, cx, cy - 4, 30, bold, GELAP);
  teksTengah(page, "indikasi AI", cx, cy - 20, 9, font, REDUP);

  const xKanan = L + 186;
  const lebarKanan = R - 20 - xKanan;
  let yk = atasKartu - 34;
  page.drawText("KESIMPULAN", { x: xKanan, y: yk, size: 8, font: bold, color: REDUP });
  yk -= 20;
  for (const b of wrap(labelAi(skor), bold, 14, lebarKanan).slice(0, 2)) {
    page.drawText(b, { x: xKanan, y: yk, size: 14, font: bold, color: warna });
    yk -= 18;
  }
  yk -= 8;
  // Batang proporsi AI vs manusia.
  const tinggiBatang = 12;
  const lebarAi = (lebarKanan * skor) / 100;
  kotak(page, xKanan, yk - tinggiBatang, lebarKanan, tinggiBatang, rgb(0.86, 0.95, 0.91));
  if (lebarAi > 0) kotak(page, xKanan, yk - tinggiBatang, lebarAi, tinggiBatang, warna);
  yk -= tinggiBatang + 16;
  kotak(page, xKanan, yk + 1, 8, 8, warna);
  page.drawText(`Terindikasi AI  ${skor}%`, { x: xKanan + 13, y: yk + 1, size: 9, font: bold, color: TEKS });
  const xLeg2 = xKanan + 150;
  kotak(page, xLeg2, yk + 1, 8, 8, rgb(0.6, 0.85, 0.75));
  page.drawText(`Tulisan manusia  ${manusia}%`, { x: xLeg2 + 13, y: yk + 1, size: 9, font: bold, color: TEKS });
  y = atasKartu - tinggiKartu - 22;

  // ── Statistik ─────────────────────────────────────────────────────────────
  const stat: [string, string][] = [
    ["Jumlah kata", h.jumlahKata.toLocaleString("id-ID")],
    ["Bagian diperiksa", String(Math.max(1, bagian.length || h.ai?.rujukan?.ids.length || 1))],
    ["Kalimat ditandai", String(h.ai?.bagianDitandai.length ?? 0)],
    ["Mesin pemeriksa", h.penyedia || "ZeroGPT"],
  ];
  const lebarStat = (R - L - 3 * 10) / 4;
  stat.forEach(([label, nilai], i) => {
    const x = L + i * (lebarStat + 10);
    kotak(page, x, y - 46, lebarStat, 46, PUTIH, GARIS);
    page.drawText(pdfSafe(label), { x: x + 12, y: y - 18, size: 8, font, color: REDUP });
    page.drawText(pdfSafe(nilai), { x: x + 12, y: y - 36, size: 13, font: bold, color: GELAP });
  });
  y -= 70;

  // ── Skor per bagian (naskah panjang) ─────────────────────────────────────
  if (bagian.length > 1) {
    page.drawText("Skor per bagian", { x: L, y, size: 12, font: bold, color: GELAP });
    y -= 14;
    for (const b of wrap(
      `Naskah melebihi batas satu kali deteksi ZeroGPT, jadi diperiksa dalam ${bagian.length} bagian. ` +
        "Skor keseluruhan di atas adalah rata-rata berbobot jumlah kata. Laporan asli tiap bagian dilampirkan berurutan.",
      font, 9, R - L,
    )) {
      page.drawText(b, { x: L, y, size: 9, font, color: REDUP });
      y -= 12;
    }
    y -= 4;
    bagian.forEach((b, i) => {
      const p = Math.round(b.persen);
      page.drawText(`Bagian ${i + 1}`, { x: L, y: y - 9, size: 10, font: bold, color: TEKS });
      page.drawText(pdfSafe(`${b.kata.toLocaleString("id-ID")} kata`), { x: L + 70, y: y - 9, size: 9, font, color: REDUP });
      const xb = L + 150;
      const wb = R - 50 - xb;
      kotak(page, xb, y - 10, wb, 8, GARIS);
      if (p > 0) kotak(page, xb, y - 10, (wb * p) / 100, 8, warnaSkor(p));
      teksKanan(page, `${b.persen.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`, R, y - 10, 10, bold, GELAP);
      y -= 20;
    });
    y -= 10;
  }

  // ── Kalimat paling terindikasi ───────────────────────────────────────────
  const ditandai = (h.ai?.bagianDitandai ?? []).filter((b) => b.teks.trim().length > 0);
  page.drawText("Kalimat yang paling terindikasi AI", { x: L, y, size: 12, font: bold, color: GELAP });
  y -= 16;
  const batasBawah = 150;
  if (ditandai.length === 0) {
    page.drawText("Tidak ada kalimat yang ditandai oleh mesin pemeriksa.", { x: L, y, size: 10, font, color: REDUP });
    y -= 20;
  } else {
    let tampil = 0;
    for (const b of ditandai) {
      const baris = wrap(`"${b.teks.trim()}"`, font, 9.5, R - L - 24).slice(0, 3);
      if (baris.length === 3) baris[2] = baris[2].replace(/\s*\S*$/, " ...");
      const tinggi = baris.length * 12.5 + 14;
      if (y - tinggi < batasBawah) break;
      kotak(page, L, y - tinggi, R - L, tinggi, rgb(1, 0.97, 0.89));
      kotak(page, L, y - tinggi, 3, tinggi, AMBER);
      let yb = y - 16;
      for (const t of baris) {
        page.drawText(t, { x: L + 14, y: yb, size: 9.5, font, color: TEKS });
        yb -= 12.5;
      }
      y -= tinggi + 6;
      tampil++;
    }
    if (tampil < ditandai.length) {
      page.drawText(pdfSafe(`+${ditandai.length - tampil} kalimat lain ditandai di laporan ZeroGPT terlampir.`), {
        x: L, y: y - 6, size: 9, font, color: REDUP,
      });
      y -= 20;
    }
  }

  // ── Catatan & kaki ────────────────────────────────────────────────────────
  const catatan =
    "Skor ini indikasi, bukan bukti. Detektor AI bisa keliru menandai tulisan asli, terutama tulisan akademik " +
    "yang formal dan berpola. Gunakan untuk meninjau ulang bagian yang ditandai, bukan untuk menyimpulkan.";
  const barisCatatan = wrap(catatan, font, 8.5, R - L - 24);
  const tinggiCatatan = barisCatatan.length * 11 + 16;
  const yCatatan = 104;
  kotak(page, L, yCatatan, R - L, tinggiCatatan, LATAR, GARIS);
  let yc = yCatatan + tinggiCatatan - 15;
  for (const b of barisCatatan) {
    page.drawText(b, { x: L + 12, y: yc, size: 8.5, font, color: REDUP });
    yc -= 11;
  }

  page.drawLine({ start: { x: L, y: 78 }, end: { x: R, y: 78 }, thickness: 1, color: GARIS });
  const lampiran =
    opsi.jumlahHalamanLampiran > 0
      ? `Halaman 2–${opsi.jumlahHalamanLampiran + 1}: laporan asli ZeroGPT, dilampirkan tanpa perubahan.`
      : "Laporan ringkas.";
  page.drawText(pdfSafe(lampiran), { x: L, y: 62, size: 9, font: bold, color: TEKS });
  page.drawText(pdfSafe(`${BRAND.name}  ·  ${opsi.appUrl.replace(/^https?:\/\//, "")}`), { x: L, y: 48, size: 8, font, color: REDUP });
  teksKanan(page, "Halaman 1", R, 48, 8, font, REDUP);

  return doc.save();
}
