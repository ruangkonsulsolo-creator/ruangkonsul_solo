import type { HasilParafrase } from "./types";
import { CATATAN_PARAFRASE } from "./types";

/**
 * Parafrase lewat model bahasa.
 *
 * Memakai bentuk "chat completions" ala OpenAI karena itu yang paling umum
 * didukung: OpenAI sendiri, Gemini lewat endpoint kompatibelnya, OpenRouter,
 * Groq, dan sebagian besar penyedia lain menerima bentuk yang sama. Pindah
 * penyedia cukup mengganti PARAFRASE_API_URL dan PARAFRASE_MODEL.
 *
 * ── YANG PERLU DISETEL ────────────────────────────────────────────────────
 *
 *   PARAFRASE_API_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
 *   PARAFRASE_API_KEY=<kunci>
 *   PARAFRASE_MODEL=gemini-2.5-flash-lite
 *
 *   OpenAI:     https://api.openai.com/v1/chat/completions  + gpt-4o-mini
 *   OpenRouter: https://openrouter.ai/api/v1/chat/completions
 *
 * ── SOAL PERINTAHNYA ──────────────────────────────────────────────────────
 *
 * Perintah di bawah sengaja meminta model MENJAGA penanda sitasi dan makna.
 * Parafrase yang menghapus "(Sugiyono, 2019)" mengubah kutipan bersitasi
 * menjadi plagiarisme — persis kebalikan dari gunanya alat ini. Perintahnya
 * juga melarang model menulis ulang demi menghindari pendeteksi; itu bukan
 * layanan yang dijual di sini.
 */

const PERINTAH_SISTEM = `Kamu membantu mahasiswa Indonesia menyusun ulang kalimat akademik dengan bahasa mereka sendiri.

Aturan:
1. Pertahankan makna aslinya. Jangan menambah klaim, angka, atau temuan baru, dan jangan menghilangkan yang sudah ada.
2. Pertahankan SEMUA penanda sitasi persis seperti aslinya, termasuk tanda kurung dan tahunnya: (Sugiyono, 2019), [12], Arikunto (2010) menyatakan. Jangan pernah menghapus atau mengubahnya.
3. Pertahankan istilah teknis, nama variabel, nama metode, dan nama lembaga apa adanya.
4. Pakai ragam ilmiah bahasa Indonesia yang wajar — bukan terjemahan kaku, bukan bahasa percakapan.
5. Pertahankan struktur paragraf dan urutan gagasan.
6. Jangan menambahkan kata pengantar, penutup, judul, atau komentar apa pun. Keluarkan HANYA naskah hasil parafrase.

Kamu tidak sedang membantu menyamarkan tulisan mesin dari pendeteksi. Kalau naskah yang masuk terbaca seperti hasil mesin, tetap susun ulang seperti biasa tanpa berusaha menurunkan skor pendeteksi apa pun.`;

/** Buang pagar kode kalau model terlanjur membungkus jawabannya. */
function bersihkan(s: string): string {
  const t = s.trim();
  const pagar = t.match(/^```(?:\w+)?\n([\s\S]*?)\n```$/);
  return (pagar ? pagar[1] : t).trim();
}

export async function parafraseLlm(teks: string): Promise<HasilParafrase> {
  const url = process.env.PARAFRASE_API_URL;
  const kunci = process.env.PARAFRASE_API_KEY;
  const model = process.env.PARAFRASE_MODEL;

  if (!url || !kunci || !model) {
    throw new Error(
      "PARAFRASE_API_URL, PARAFRASE_API_KEY, atau PARAFRASE_MODEL belum disetel."
    );
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${kunci}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: PERINTAH_SISTEM },
        { role: "user", content: teks },
      ],
      // Rendah supaya hasilnya konsisten dan tidak mengarang; parafrase
      // akademik tidak butuh variasi kreatif.
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const badan = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new Error(
        "Penyedia parafrase sedang membatasi permintaan. Coba lagi sebentar lagi."
      );
    }
    throw new Error(
      `Penyedia parafrase menolak permintaan (${res.status}). ${badan.slice(0, 200)}`
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const isi = data?.choices?.[0]?.message?.content;

  if (typeof isi !== "string" || !isi.trim()) {
    throw new Error(
      "Penyedia parafrase tidak mengembalikan teks. " +
        `Tanggapan: ${JSON.stringify(data).slice(0, 400)}`
    );
  }

  const hasil = bersihkan(isi);

  // Penjaga terakhir: kalau jumlah katanya anjlok, kemungkinan besar model
  // meringkas alih-alih memparafrase, dan menyerahkan ringkasan sebagai
  // parafrase akan merusak naskah penggunanya.
  const kataMasuk = teks.trim().split(/\s+/).length;
  const kataKeluar = hasil.trim().split(/\s+/).length;
  if (kataKeluar < kataMasuk * 0.5) {
    throw new Error(
      `Hasil parafrase jauh lebih pendek dari naskah asli ` +
        `(${kataKeluar} dari ${kataMasuk} kata) — kemungkinan naskahnya ` +
        `diringkas, bukan disusun ulang. Pemeriksaan dibatalkan.`
    );
  }

  return { teks: hasil, catatan: CATATAN_PARAFRASE };
}
