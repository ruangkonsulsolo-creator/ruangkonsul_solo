import "server-only";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import type { ParaphraseParagraph, ParaphraseResult } from "@/types/processing";
import { BRAND } from "@/lib/brand";
import { callClaude, mapLimit, parseJson } from "./llm";
import { containment, toParagraphs, wordCount } from "./text";

const SYSTEM = `Kamu editor akademik profesional. Parafrasekan setiap paragraf agar:
- makna, data, angka, istilah teknis, nama, dan sitasi (mis. "(Sugiyono, 2019)", "[3]") TETAP sama persis;
- struktur kalimat dan pilihan kata berubah signifikan (hindari menyalin frasa ≥ 4 kata berurutan dari aslinya);
- bahasa tetap formal-akademik dan dalam BAHASA YANG SAMA dengan aslinya;
- judul/subjudul pendek (≤ 8 kata) dan daftar pustaka dibiarkan apa adanya.
Jangan menambah informasi baru, jangan meringkas.
Balas HANYA JSON array string, satu elemen per paragraf input, urutan sama.`;

/** Maks kata yang diparafrasekan per pesanan (sisanya disalin apa adanya & ditandai). */
const maxWords = () => Number(process.env.PARAPHRASE_MAX_WORDS ?? 10000);

function isReferenceHeading(p: string) {
  return /^(daftar pustaka|referensi|references|bibliography)\b/i.test(p.trim());
}

export async function paraphraseDocument(rawText: string): Promise<{ result: ParaphraseResult; docx: Buffer }> {
  const t0 = Date.now();
  const model = process.env.ANTHROPIC_MODEL_PARAPHRASE ?? "claude-sonnet-5-5";
  const paragraphs = toParagraphs(rawText);

  // Berhenti di "Daftar Pustaka" — referensi tidak diparafrasekan
  const refIdx = paragraphs.findIndex(isReferenceHeading);
  const body = refIdx >= 0 ? paragraphs.slice(0, refIdx) : paragraphs;
  const tail = refIdx >= 0 ? paragraphs.slice(refIdx) : [];

  // Batasi jumlah kata
  let budget = maxWords();
  const toProcess: string[] = [];
  const overflow: string[] = [];
  for (const p of body) {
    const w = wordCount(p);
    if (budget - w >= 0 || toProcess.length === 0) { toProcess.push(p); budget -= w; }
    else overflow.push(p);
  }

  // Batch ±1.200 kata per panggilan
  const batches: { start: number; items: string[] }[] = [];
  let cur: string[] = [];
  let curWords = 0;
  let start = 0;
  toProcess.forEach((p, i) => {
    if (curWords + wordCount(p) > 1200 && cur.length) {
      batches.push({ start, items: cur });
      cur = []; curWords = 0; start = i;
    }
    cur.push(p); curWords += wordCount(p);
  });
  if (cur.length) batches.push({ start, items: cur });

  const outputs = await mapLimit(batches, 4, async (b) => {
    const prompt = `Paragraf (JSON array, ${b.items.length} elemen):\n${JSON.stringify(b.items)}`;
    const text = await callClaude({ system: SYSTEM, prompt, model, maxTokens: 8000, temperature: 0.7 });
    const arr = parseJson<string[]>(text);
    // Jika jumlah tidak cocok, pakai aslinya untuk yang hilang
    return b.items.map((orig, i) => (typeof arr[i] === "string" && arr[i].trim() ? arr[i].trim() : orig));
  });

  const rewritten = outputs.flat();
  const paras: ParaphraseParagraph[] = toProcess.map((orig, i) => {
    const para = rewritten[i] ?? orig;
    const short = wordCount(orig) < 9;
    return {
      original: orig,
      paraphrased: para,
      change_pct: short ? 0 : Math.round((1 - containment(orig, para, 4)) * 100),
    };
  });

  const scored = paras.filter((p) => wordCount(p.original) >= 9);
  const avg = scored.length ? Math.round(scored.reduce((a, p) => a + p.change_pct, 0) / scored.length) : 0;

  const docx = await buildDocx(paras.map((p) => p.paraphrased), overflow, tail);

  return {
    result: {
      kind: "paraphrase",
      word_count: wordCount(rawText),
      paragraph_count: paras.length,
      avg_change_pct: avg,
      truncated: overflow.length > 0,
      paragraphs: paras,
      metadata: { processed_at: new Date().toISOString(), processing_time_ms: Date.now() - t0, model },
    },
    docx,
  };
}

async function buildDocx(paraphrased: string[], overflow: string[], references: string[]): Promise<Buffer> {
  const p = (text: string, opts: { italic?: boolean; color?: string } = {}) =>
    new Paragraph({
      spacing: { after: 160, line: 360 },
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text, font: "Times New Roman", size: 24, italics: opts.italic, color: opts.color })],
    });

  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: `Hasil Parafrase — ${BRAND.name}`, font: "Times New Roman" })] }),
    p("Periksa kembali hasil parafrase sebelum digunakan. Istilah, data, dan sitasi dipertahankan dari dokumen asli.", { italic: true, color: "666666" }),
    ...paraphrased.map((t) => p(t)),
  ];
  if (overflow.length) {
    children.push(p(`[Bagian berikut melebihi batas ${maxWords().toLocaleString("id-ID")} kata dan TIDAK diparafrasekan]`, { italic: true, color: "B00020" }));
    children.push(...overflow.map((t) => p(t, { color: "666666" })));
  }
  if (references.length) children.push(...references.map((t) => p(t)));

  const doc = new Document({ creator: BRAND.name, title: "Hasil Parafrase", sections: [{ children }] });
  return Packer.toBuffer(doc);
}
