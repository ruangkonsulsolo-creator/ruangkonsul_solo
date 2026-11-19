import "server-only";
import type { AiDetectionResult, AiSegmentResult } from "@/types/processing";
import { callClaude, llmAvailable, mapLimit, parseJson } from "./llm";
import { sampleEvenly, splitSentences, tokens, toParagraphs, toSegments, wordCount } from "./text";

const AI_PHRASES = [
  // Indonesia
  "selain itu", "secara keseluruhan", "dengan demikian", "penting untuk dicatat", "dalam konteks ini",
  "hal ini menunjukkan", "lebih lanjut", "di era digital", "memainkan peran penting", "berbagai aspek",
  "tidak dapat dipungkiri", "dapat disimpulkan bahwa", "secara signifikan", "peran yang krusial",
  "dalam hal ini", "oleh karena itu", "pada akhirnya", "menjadi semakin penting", "aspek penting",
  // English
  "it is important to note", "furthermore", "moreover", "in conclusion", "delve", "plays a crucial role",
  "in today's", "it is worth noting", "a testament to", "in the realm of", "overall,", "additionally",
];

/** Skor stilometri 0–100 + sinyal yang terdeteksi. */
export function stylometry(text: string): { score: number; signals: string[] } {
  const sents = splitSentences(text);
  const lens = sents.map(wordCount).filter((n) => n > 0);
  const signals: string[] = [];
  let score = 35;

  if (lens.length >= 3) {
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
    const cv = sd / mean;
    // Tulisan manusia cenderung "bursty" (panjang kalimat bervariasi)
    if (cv < 0.3) { score += 20; signals.push("Panjang kalimat sangat seragam"); }
    else if (cv < 0.45) score += 8;
    else if (cv > 0.7) { score -= 12; signals.push("Variasi panjang kalimat alami"); }
    if (mean > 18 && mean < 28 && cv < 0.4) score += 5;
  }

  const lower = text.toLowerCase();
  const hits = AI_PHRASES.filter((p) => lower.includes(p));
  const words = Math.max(wordCount(text), 1);
  const density = (hits.length / words) * 100;
  if (density > 1.2) { score += 20; signals.push(`Frasa transisi khas AI: "${hits.slice(0, 3).join('", "')}"`); }
  else if (hits.length >= 2) { score += 10; signals.push(`Frasa transisi formulaik: "${hits.slice(0, 2).join('", "')}"`); }

  const t = tokens(text);
  if (t.length > 80) {
    const ttr = new Set(t).size / t.length;
    if (ttr < 0.45) { score += 6; signals.push("Kosakata repetitif"); }
    if (ttr > 0.7) score -= 6;
  }

  // Penanda tulisan manusia akademik: sitasi, typo/singkatan informal, angka spesifik
  if (/\(\s*[A-Z][a-z]+.*\d{4}\s*\)/.test(text) || /\[\d+\]/.test(text)) { score -= 8; signals.push("Ada sitasi spesifik"); }

  return { score: Math.max(0, Math.min(100, Math.round(score))), signals };
}

const SYSTEM = `Kamu adalah analis forensik linguistik untuk dokumen akademik berbahasa Indonesia/Inggris.
Tugasmu memperkirakan kemungkinan setiap segmen teks DIHASILKAN oleh AI generatif (ChatGPT, Claude, Gemini, dsb.) dibanding ditulis manusia.
Pertimbangkan: keseragaman struktur, frasa transisi generik, generalisasi tanpa data spesifik, ketiadaan opini/pengalaman, kerapian berlebihan, pola daftar, dan ketiadaan kesalahan khas manusia.
Bersikap hati-hati: teks akademik manusia yang rapi bukan otomatis AI. Jangan pernah memberi 0 atau 100.
Balas HANYA JSON array: [{"i": <index>, "p": <0-100>, "r": "<alasan singkat ≤ 12 kata, bahasa Indonesia>"}]`;

async function modelScores(segs: { index: number; text: string }[]) {
  const model = process.env.ANTHROPIC_MODEL_DETECT ?? "claude-haiku-5-5";
  const batches: { index: number; text: string }[][] = [];
  for (let i = 0; i < segs.length; i += 6) batches.push(segs.slice(i, i + 6));

  const results = await mapLimit(batches, 4, async (batch) => {
    const prompt = batch.map((s) => `### Segmen ${s.index}\n${s.text.slice(0, 2500)}`).join("\n\n");
    const out = await callClaude({ system: SYSTEM, prompt, model, maxTokens: 1200, temperature: 0 });
    return parseJson<{ i: number; p: number; r: string }[]>(out);
  });
  const map = new Map<number, { p: number; r: string }>();
  for (const arr of results) for (const x of arr) map.set(Number(x.i), { p: Math.max(1, Math.min(99, Number(x.p))), r: String(x.r ?? "") });
  return { map, model };
}

export async function detectAi(rawText: string): Promise<AiDetectionResult> {
  const t0 = Date.now();
  const segments = toSegments(toParagraphs(rawText), 60, 220).filter((s) => s.words >= 25);
  if (!segments.length) throw new Error("Teks terlalu pendek untuk dianalisis (min. ±25 kata per paragraf).");

  // Maks 40 segmen dianalisis (sampel merata) agar biaya & waktu terkendali
  const analyzed = sampleEvenly(segments, Number(process.env.AI_DETECT_MAX_SEGMENTS ?? 40));
  const stylo = new Map(analyzed.map((s) => [s.index, stylometry(s.text)]));

  let modelMap: Map<number, { p: number; r: string }> | null = null;
  let model: string | undefined;
  if (llmAvailable()) {
    try {
      const r = await modelScores(analyzed);
      modelMap = r.map;
      model = r.model;
    } catch (err) {
      console.error("[ai-detect] model gagal, pakai stilometri saja:", err);
    }
  }

  const segResults: AiSegmentResult[] = analyzed.map((s) => {
    const st = stylo.get(s.index)!;
    const m = modelMap?.get(s.index);
    const score = m ? Math.round(0.75 * m.p + 0.25 * st.score) : st.score;
    return {
      index: s.index,
      text: s.text,
      words: s.words,
      ai_score: score,
      signals: [...(m?.r ? [m.r] : []), ...st.signals].slice(0, 4),
    };
  });

  const totalWords = segResults.reduce((a, s) => a + s.words, 0) || 1;
  const overall = Math.round(segResults.reduce((a, s) => a + s.ai_score * s.words, 0) / totalWords);

  return {
    kind: "ai",
    overall_ai_score: overall,
    verdict: overall >= 65 ? "tinggi" : overall >= 35 ? "sedang" : "rendah",
    word_count: wordCount(rawText),
    analyzed_segments: segResults.length,
    total_segments: segments.length,
    method: modelMap ? "model+stylometry" : "stylometry",
    segments: segResults,
    metadata: { processed_at: new Date().toISOString(), processing_time_ms: Date.now() - t0, model },
  };
}
