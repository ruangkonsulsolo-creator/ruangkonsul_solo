import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { BRAND } from "@/lib/brand";
import { pdfSafe } from "@/lib/receipt/pdf";
import type { DetectionResult } from "@/types/detection";
import type { AiDetectionResult, ParaphraseResult } from "@/types/processing";

const BRAND_RGB = rgb(0x8b / 255, 0, 0);
const MUTED = rgb(0.42, 0.45, 0.5);
const DARK = rgb(0.06, 0.09, 0.16);
const RED = rgb(0.86, 0.15, 0.15);
const AMBER = rgb(0.85, 0.55, 0.05);
const GREEN = rgb(0.1, 0.6, 0.3);
const LIGHT = rgb(0.96, 0.96, 0.97);

const W = 595.28;
const H = 841.89;
const L = 50;
const R = W - 50;

class Writer {
  page!: PDFPage;
  y = 0;
  constructor(public doc: PDFDocument, public font: PDFFont, public bold: PDFFont, public title: string, public subtitle: string) {
    this.newPage();
  }
  newPage() {
    this.page = this.doc.addPage([W, H]);
    this.page.drawRectangle({ x: 0, y: H - 46, width: W, height: 46, color: BRAND_RGB });
    this.page.drawText(pdfSafe(BRAND.name), { x: L, y: H - 29, size: 12, font: this.bold, color: rgb(1, 1, 1) });
    const t = pdfSafe(this.title);
    this.page.drawText(t, { x: R - this.bold.widthOfTextAtSize(t, 10), y: H - 29, size: 10, font: this.bold, color: rgb(1, 1, 1) });
    const n = this.doc.getPageCount();
    this.page.drawText(pdfSafe(`${this.subtitle} · Halaman ${n}`), { x: L, y: 28, size: 7.5, font: this.font, color: MUTED });
    this.y = H - 75;
  }
  ensure(h: number) {
    if (this.y - h < 50) this.newPage();
  }
  lines(text: string, size: number, width: number, font = this.font): string[] {
    const out: string[] = [];
    for (const para of text.split(/\n+/).map(pdfSafe)) {
      let cur = "";
      for (const w of para.split(/\s+/)) {
        const next = cur ? `${cur} ${w}` : w;
        if (font.widthOfTextAtSize(next, size) > width && cur) { out.push(cur); cur = w; }
        else cur = next;
      }
      if (cur) out.push(cur);
    }
    return out;
  }
  text(s: string, opts: { size?: number; font?: PDFFont; color?: RGB; indent?: number; gap?: number; maxLines?: number } = {}) {
    const size = opts.size ?? 10;
    const font = opts.font ?? this.font;
    const indent = opts.indent ?? 0;
    let ls = this.lines(s, size, R - L - indent, font);
    if (opts.maxLines && ls.length > opts.maxLines) ls = [...ls.slice(0, opts.maxLines - 1), ls[opts.maxLines - 1] + " …"];
    for (const ln of ls) {
      this.ensure(size + 4);
      this.page.drawText(ln, { x: L + indent, y: this.y, size, font, color: opts.color ?? DARK });
      this.y -= size + 4;
    }
    this.y -= opts.gap ?? 4;
  }
  heading(s: string) {
    this.ensure(30);
    this.y -= 6;
    this.text(s, { size: 13, font: this.bold, gap: 6 });
  }
  scoreBox(label: string, value: string, color: RGB, caption: string) {
    this.ensure(80);
    this.page.drawRectangle({ x: L, y: this.y - 62, width: R - L, height: 70, color: LIGHT });
    this.page.drawText(pdfSafe(label), { x: L + 14, y: this.y - 10, size: 9, font: this.font, color: MUTED });
    this.page.drawText(pdfSafe(value), { x: L + 14, y: this.y - 44, size: 30, font: this.bold, color });
    const cl = this.lines(caption, 9, 300);
    cl.forEach((ln, i) => this.page.drawText(ln, { x: L + 190, y: this.y - 22 - i * 12, size: 9, font: this.font, color: DARK }));
    this.y -= 82;
  }
  kv(rows: [string, string][]) {
    for (const [k, v] of rows) {
      this.ensure(14);
      this.page.drawText(pdfSafe(k), { x: L, y: this.y, size: 9, font: this.font, color: MUTED });
      this.page.drawText(pdfSafe(v).slice(0, 90), { x: L + 140, y: this.y, size: 9, font: this.bold, color: DARK });
      this.y -= 14;
    }
    this.y -= 6;
  }
  bar(pct: number, color: RGB) {
    this.ensure(10);
    this.page.drawRectangle({ x: L, y: this.y, width: R - L, height: 5, color: rgb(0.9, 0.9, 0.92) });
    this.page.drawRectangle({ x: L, y: this.y, width: ((R - L) * Math.max(0, Math.min(100, pct))) / 100, height: 5, color });
    this.y -= 12;
  }
}

async function init(title: string, subtitle: string) {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setAuthor(BRAND.name);
  doc.setCreator(BRAND.name);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  return new Writer(doc, font, bold, title, subtitle);
}

export interface ReportMeta {
  orderNumber: string;
  serviceName: string;
  fileName: string;
  customerName: string;
  processedAt: string;
}

function metaRows(m: ReportMeta): [string, string][] {
  return [
    ["No. Pesanan", m.orderNumber],
    ["Layanan", m.serviceName],
    ["Nama File", m.fileName],
    ["Customer", m.customerName],
    ["Diproses", new Date(m.processedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB"],
  ];
}

const pctColor = (p: number) => (p >= 40 ? RED : p >= 20 ? AMBER : GREEN);

export async function similarityReportPdf(r: DetectionResult, m: ReportMeta): Promise<Uint8Array> {
  const w = await init("LAPORAN CEK SIMILARITY", `${m.orderNumber} · ${BRAND.domain}`);
  w.kv(metaRows(m));
  w.scoreBox("Indeks Similarity", `${r.overall_similarity.toFixed(1)}%`, pctColor(r.overall_similarity),
    `${r.plagiarized_segment_count} dari ${r.segment_count} segmen melewati ambang ${Math.round(r.metadata.similarity_threshold * 100)}%. Total ${r.word_count.toLocaleString("id-ID")} kata dianalisis.`);

  w.heading("Sumber Teratas");
  if (!r.top_sources.length) w.text("Tidak ditemukan sumber yang signifikan.", { color: MUTED });
  r.top_sources.forEach((s, i) => {
    w.text(`${i + 1}. ${s.title}`, { font: w.bold, size: 9.5, gap: 0, maxLines: 2 });
    w.text(`${s.source_name}${s.source_url ? ` — ${s.source_url}` : ""} · ${s.match_count} segmen · maks ${(s.max_similarity * 100).toFixed(0)}%`, { size: 8, color: MUTED, indent: 12, maxLines: 2 });
  });

  w.heading("Rincian Segmen");
  r.segments.forEach((s, i) => {
    w.ensure(60);
    w.text(`Segmen ${i + 1} — ${s.similarity_score}%${s.is_plagiarized ? "  (perlu revisi)" : ""}`, { font: w.bold, size: 9, color: pctColor(s.similarity_score), gap: 0 });
    w.bar(s.similarity_score, pctColor(s.similarity_score));
    w.text(s.text, { size: 8.5, maxLines: s.is_plagiarized ? 14 : 4 });
    for (const mt of s.matches.slice(0, 2)) {
      w.text(`↳ ${(mt.similarity * 100).toFixed(0)}% · ${mt.title} (${mt.source_name})${mt.source_url ? ` ${mt.source_url}` : ""}`, { size: 7.5, color: MUTED, indent: 12, maxLines: 2 });
    }
    w.y -= 4;
  });

  w.heading("Catatan Metodologi");
  w.text(`Dokumen dipecah per paragraf lalu dibandingkan frasa-demi-frasa (shingle 4-5 kata) dengan: ${r.metadata.embedding_model.replace(/^.*sumber: /, "")}. Persentase menunjukkan proporsi frasa yang juga muncul di sumber. Kutipan langsung yang disitasi dengan benar tetap terhitung mirip — nilai akhir perlu ditinjau secara kontekstual. Laporan ini bukan laporan resmi Turnitin/iThenticate.`, { size: 8.5, color: MUTED });
  return w.doc.save();
}

export async function aiReportPdf(r: AiDetectionResult, m: ReportMeta): Promise<Uint8Array> {
  const w = await init("LAPORAN AI DETECTOR", `${m.orderNumber} · ${BRAND.domain}`);
  w.kv(metaRows(m));
  const c = r.overall_ai_score >= 65 ? RED : r.overall_ai_score >= 35 ? AMBER : GREEN;
  w.scoreBox("Indikasi Teks AI", `${r.overall_ai_score}%`, c,
    `Tingkat indikasi: ${r.verdict.toUpperCase()}. ${r.analyzed_segments} dari ${r.total_segments} segmen dianalisis (${r.word_count.toLocaleString("id-ID")} kata). Metode: ${r.method === "model+stylometry" ? "model bahasa + analisis stilometri" : "analisis stilometri"}.`);

  w.heading("Rincian per Segmen");
  r.segments.forEach((s) => {
    const sc = s.ai_score >= 65 ? RED : s.ai_score >= 35 ? AMBER : GREEN;
    w.ensure(50);
    w.text(`Segmen ${s.index + 1} — ${s.ai_score}%`, { font: w.bold, size: 9, color: sc, gap: 0 });
    w.bar(s.ai_score, sc);
    w.text(s.text, { size: 8.5, maxLines: s.ai_score >= 65 ? 12 : 4 });
    if (s.signals.length) w.text(`Sinyal: ${s.signals.join(" · ")}`, { size: 7.5, color: MUTED, indent: 12, maxLines: 2 });
    w.y -= 4;
  });

  w.heading("Catatan Penting");
  w.text("Skor AI adalah estimasi probabilistik, bukan bukti. Teks akademik manusia yang sangat rapi bisa mendapat skor sedang, dan teks AI yang sudah disunting bisa lolos. Gunakan sebagai bahan revisi dan diskusi dengan dosen, bukan dasar keputusan tunggal.", { size: 8.5, color: MUTED });
  return w.doc.save();
}

export async function paraphraseReportPdf(r: ParaphraseResult, m: ReportMeta): Promise<Uint8Array> {
  const w = await init("LAPORAN PARAFRASE", `${m.orderNumber} · ${BRAND.domain}`);
  w.kv(metaRows(m));
  w.scoreBox("Rata-rata Perubahan Frasa", `${r.avg_change_pct}%`, r.avg_change_pct >= 60 ? GREEN : AMBER,
    `${r.paragraph_count} paragraf diparafrasekan dari ${r.word_count.toLocaleString("id-ID")} kata.${r.truncated ? " Sebagian dokumen melebihi batas kata dan tidak diparafrasekan." : ""} File hasil (.docx) tersedia untuk diunduh di dashboard.`);
  w.heading("Perbandingan (Asli → Parafrase)");
  r.paragraphs.filter((p) => p.change_pct > 0).slice(0, 60).forEach((p, i) => {
    w.ensure(60);
    w.text(`Paragraf ${i + 1} — perubahan ${p.change_pct}%`, { font: w.bold, size: 9, gap: 0 });
    w.text(`Asli: ${p.original}`, { size: 8, color: MUTED, maxLines: 6, gap: 2 });
    w.text(`Hasil: ${p.paraphrased}`, { size: 8.5, maxLines: 8 });
  });
  return w.doc.save();
}
