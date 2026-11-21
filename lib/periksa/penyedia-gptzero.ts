import type { HasilAI } from "./types";
import { PERINGATAN_AI } from "./types";

/**
 * Adapter GPTZero untuk deteksi indikasi AI.
 *
 * ── SKEMA ─────────────────────────────────────────────────────────────────
 *
 *   POST https://api.gptzero.me/v2/predict/text
 *   Header : x-api-key: <kunci>
 *            Content-Type: application/json
 *   Badan  : { "document": "<naskah>" }
 *
 *   Tanggapan:
 *   {
 *     "documents": [{
 *       "average_generated_prob":    0..1,
 *       "completely_generated_prob": 0..1,
 *       "overall_burstiness":        number,
 *       "document_classification":   "HUMAN_ONLY" | "AI_ONLY" | "MIXED",
 *       "sentences": [
 *         { "sentence": string, "generated_prob": 0..1, "perplexity": number }
 *       ],
 *       "paragraphs": [
 *         { "completely_generated_prob": 0..1,
 *           "num_sentences": number, "start_sentence_index": number }
 *       ]
 *     }]
 *   }
 *
 * Nama medan di atas dicocokkan dari dokumentasi GPTZero dan dari pustaka
 * klien yang memang berjalan (GPTZeroR). Meski begitu, API berubah tanpa
 * pemberitahuan — karena itu fungsi di bawah MEMERIKSA tiap medan yang
 * dipakai dan melempar galat berisi potongan tanggapan aslinya kalau
 * bentuknya lain. Diam-diam memakai nilai bawaan akan menghasilkan skor
 * yang kelihatan masuk akal tapi keliru, dan itu jauh lebih berbahaya
 * daripada galat yang terlihat.
 *
 * ── YANG PERLU DISETEL ────────────────────────────────────────────────────
 *
 *   PERIKSA_PENYEDIA_AI=gptzero
 *   GPTZERO_API_KEY=<kunci dari dasbor GPTZero>
 *   NEXT_PUBLIC_PERIKSA_PENYEDIA_AI=gptzero   (supaya logonya tampil)
 */

const URL_GPTZERO = "https://api.gptzero.me/v2/predict/text";

function angka(nilai: unknown, jalur: string, mentah: unknown): number {
  if (typeof nilai !== "number" || Number.isNaN(nilai)) {
    throw new Error(
      `Tanggapan GPTZero tidak punya angka di ${jalur}. Bentuk tanggapannya ` +
        `mungkin berubah — periksa dokumentasi terbaru sebelum dipakai lagi. ` +
        `Tanggapan: ${JSON.stringify(mentah).slice(0, 400)}`
    );
  }
  return nilai;
}

/** 0..1 dari GPTZero menjadi 0..100 bulat. */
function persen(p: number): number {
  return Math.round(Math.min(1, Math.max(0, p)) * 100);
}

export function petakanGPTZero(mentah: unknown): HasilAI {
  const akar = mentah as { documents?: unknown[] };
  const dok = akar?.documents?.[0] as Record<string, unknown> | undefined;

  if (!dok) {
    throw new Error(
      `Tanggapan GPTZero tidak berisi documents[0]. ` +
        `Tanggapan: ${JSON.stringify(mentah).slice(0, 400)}`
    );
  }

  // completely_generated_prob adalah peluang SELURUH dokumen dibuat mesin.
  // average_generated_prob adalah rata-rata per kalimat. Yang dipakai
  // sebagai skor utama adalah yang pertama, karena itu yang dipahami orang
  // sebagai "berapa persen terindikasi AI"; kalau tidak ada, baru rata-rata.
  const skorMentah =
    typeof dok.completely_generated_prob === "number"
      ? dok.completely_generated_prob
      : angka(dok.average_generated_prob, "documents[0].average_generated_prob", mentah);

  const kalimat = Array.isArray(dok.sentences) ? dok.sentences : [];

  const bagianDitandai = kalimat
    .map((s) => s as Record<string, unknown>)
    .filter(
      (s) =>
        typeof s.sentence === "string" &&
        typeof s.generated_prob === "number" &&
        s.generated_prob >= 0.65
    )
    .sort(
      (a, b) => (b.generated_prob as number) - (a.generated_prob as number)
    )
    .slice(0, 10)
    .map((s) => ({
      teks: s.sentence as string,
      skor: persen(s.generated_prob as number),
    }));

  return {
    skor: persen(skorMentah),
    bagianDitandai,
    peringatan: PERINGATAN_AI,
  };
}

export async function periksaAIGptZero(teks: string): Promise<HasilAI> {
  const kunci = process.env.GPTZERO_API_KEY;
  if (!kunci) {
    throw new Error("GPTZERO_API_KEY belum disetel.");
  }

  const res = await fetch(URL_GPTZERO, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": kunci,
    },
    body: JSON.stringify({ document: teks }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const badan = await res.text().catch(() => "");
    // 402 dan 429 lazimnya berarti kuota kata bulanan habis. Bedakan dari
    // galat lain supaya pesannya bisa ditindaklanjuti.
    if (res.status === 402 || res.status === 429) {
      throw new Error(
        "Kuota GPTZero bulan ini habis atau permintaan dibatasi. " +
          "Periksa sisa kuota di dasbor GPTZero."
      );
    }
    throw new Error(
      `GPTZero menolak permintaan (${res.status}). ${badan.slice(0, 200)}`
    );
  }

  return petakanGPTZero(await res.json());
}
