import type { HasilAI } from "./types";
import { PERINGATAN_AI } from "./types";

/**
 * Adapter ZeroGPT (zerogpt.com, Olive Works LLC) untuk deteksi indikasi AI.
 * Bukan GPTZero — dua perusahaan dan mesin yang berbeda.
 *
 * ── SKEMA (ZeroGPT Business API) ──────────────────────────────────────────
 *
 *   POST https://api.zerogpt.com/api/detect/detectText
 *   Header : ApiKey: <kunci>          (nama header bisa diganti lewat env)
 *            Content-Type: application/json
 *   Badan  : { "input_text": "<naskah>" }
 *
 *   Tanggapan (medan yang dipakai):
 *   { "success": true,
 *     "data": { "fakePercentage": 0..100,     ← skor indikasi AI
 *               "h": [ "<kalimat>", ... ],    ← kalimat yang ditandai AI
 *               "textWords": number } }
 *
 * Dokumentasi resminya (theneo.io) dirender JavaScript sehingga tidak semua
 * detail bisa dipastikan dari sini; karena itu alamat dan nama header bisa
 * diatur lewat env, dan setiap medan yang dipakai DIPERIKSA — kalau bentuk
 * tanggapannya lain, kita melempar galat berisi potongan tanggapan asli
 * alih-alih diam-diam menghasilkan skor keliru.
 *
 * Teks panjang dipecah per ±45.000 karakter (paket Beginner: 50.000/deteksi),
 * lalu skornya digabung dengan bobot jumlah kata tiap potongan.
 *
 * Catatan: ZeroGPT meminta "IP whitelist" di dasbor. Vercel (paket Hobby)
 * tidak punya IP keluar yang tetap; kalau whitelist wajib diisi, permintaan
 * dari server akan ditolak (401/403) dan pesannya menyebut hal itu.
 *
 * ── YANG PERLU DISETEL ────────────────────────────────────────────────────
 *
 *   PERIKSA_PENYEDIA_AI=zerogpt
 *   ZEROGPT_API_KEY=<kunci dari dasbor ZeroGPT>
 *   NEXT_PUBLIC_PERIKSA_PENYEDIA_AI=zerogpt   (supaya nama penyedia tampil jujur)
 *   ZEROGPT_API_URL, ZEROGPT_AUTH_HEADER       (opsional, bila dokumentasi berbeda)
 */

const URL_BAWAAN = "https://api.zerogpt.com/api/detect/detectText";
// Paket Beginner: 50.000 karakter per deteksi. Sisakan ruang aman.
const MAKS_KARAKTER = 45_000;

function hitungKata(s: string) {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

/** Pecah teks per paragraf/kalimat agar tiap potongan ≤ batas karakter. */
export function pecahTeks(teks: string, maks = MAKS_KARAKTER): string[] {
  const bersih = teks.trim();
  if (bersih.length <= maks) return [bersih];
  const satuan = bersih.split(/(?<=[.!?…])\s+|\n{2,}/);
  const hasil: string[] = [];
  let kini = "";
  for (const s of satuan) {
    // Satu "kalimat" yang terlalu panjang (mis. tanpa titik): potong paksa.
    const potong = s.length > maks ? s.match(new RegExp(`[\\s\\S]{1,${maks}}`, "g")) ?? [s] : [s];
    for (const p of potong) {
      if ((kini + " " + p).trim().length > maks && kini) {
        hasil.push(kini.trim());
        kini = p;
      } else {
        kini = kini ? `${kini} ${p}` : p;
      }
    }
  }
  if (kini.trim()) hasil.push(kini.trim());
  return hasil;
}

type Potongan = { persen: number; kata: number; ditandai: string[]; id: string | null };

const angka = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v);

/** Petakan satu tanggapan ZeroGPT; lempar galat bila bentuknya tidak dikenal. */
export function petakanPotonganZeroGpt(mentah: unknown, kataCadangan: number): Potongan {
  const akar = mentah as { success?: unknown; data?: Record<string, unknown>; message?: unknown };
  const data = akar?.data;
  const fp = data?.fakePercentage;
  const persen = typeof fp === "string" ? Number(fp) : fp;
  if (typeof persen !== "number" || Number.isNaN(persen)) {
    const pesan = typeof akar?.message === "string" ? ` Pesan: ${akar.message}.` : "";
    throw new Error(
      `Tanggapan ZeroGPT tidak berisi data.fakePercentage.${pesan} Bentuk tanggapannya mungkin berubah — ` +
        `periksa dokumentasi terbaru. Tanggapan: ${JSON.stringify(mentah).slice(0, 400)}`
    );
  }
  const tw = angka(data?.textWords);
  const kata = typeof tw === "number" && tw > 0 ? tw : kataCadangan;
  const ditandai = Array.isArray(data?.h) ? data.h.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
  const id = data?.id != null && String(data.id).trim() !== "" ? String(data.id) : null;
  return { persen: Math.min(100, Math.max(0, persen)), kata, ditandai, id };
}

/** Gabungkan potongan menjadi HasilAI (rata-rata berbobot jumlah kata). */
export function gabungPotongan(potongan: Potongan[]): HasilAI {
  const totalKata = potongan.reduce((s, p) => s + p.kata, 0) || 1;
  const skor = Math.round(potongan.reduce((s, p) => s + p.persen * p.kata, 0) / totalKata);
  const bagianDitandai = potongan
    .flatMap((p) => p.ditandai.map((teks) => ({ teks: teks.trim(), skor: Math.round(p.persen) })))
    .filter((b, i, arr) => arr.findIndex((x) => x.teks === b.teks) === i)
    .slice(0, 10);
  const ids = potongan.map((p) => p.id).filter((x): x is string => !!x);
  return {
    skor,
    bagianDitandai,
    peringatan: PERINGATAN_AI,
    ...(ids.length === potongan.length && ids.length > 0 ? { rujukan: { penyedia: "zerogpt" as const, ids } } : {}),
  };
}

function headerAuth(kunci: string): Record<string, string> {
  return { [process.env.ZEROGPT_AUTH_HEADER || "ApiKey"]: kunci };
}

async function satuPermintaan(teks: string, kunci: string): Promise<Potongan> {
  const url = process.env.ZEROGPT_API_URL || URL_BAWAAN;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headerAuth(kunci) },
    body: JSON.stringify({ input_text: teks }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const badan = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `ZeroGPT menolak akses (${res.status}). Periksa ZEROGPT_API_KEY dan pengaturan IP whitelist di dasbor ZeroGPT. ${badan.slice(0, 160)}`
      );
    }
    if (res.status === 402 || res.status === 429) {
      throw new Error("Saldo API ZeroGPT habis atau permintaan dibatasi. Isi saldo di dasbor ZeroGPT.");
    }
    throw new Error(`ZeroGPT menolak permintaan (${res.status}). ${badan.slice(0, 200)}`);
  }
  return petakanPotonganZeroGpt(await res.json(), hitungKata(teks));
}

export async function periksaAIZeroGpt(teks: string): Promise<HasilAI> {
  const kunci = process.env.ZEROGPT_API_KEY;
  if (!kunci) throw new Error("ZEROGPT_API_KEY belum disetel.");
  const potongan: Potongan[] = [];
  // Berurutan, bukan paralel: lebih ramah batas laju API dan tetap cepat
  // untuk naskah satu bab (1–3 potongan).
  for (const p of pecahTeks(teks)) potongan.push(await satuPermintaan(p, kunci));
  return gabungPotongan(potongan);
}

/**
 * Laporan PDF RESMI ZeroGPT untuk satu id deteksi:
 *   GET https://api.zerogpt.com/api/dashboard/exportToPdf?id=<id>&user_id=<user_id>
 * user_id adalah id akun ZeroGPT pemilik API key (ZEROGPT_USER_ID).
 *
 * Bentuk tanggapan tidak terdokumentasi lengkap, jadi tiga kemungkinan
 * ditangani: berkas PDF langsung, JSON berisi URL PDF, atau JSON berisi
 * PDF base64. Selain itu dianggap gagal (pemanggil memakai cadangan).
 */
export async function ambilPdfResmiZeroGpt(id: string): Promise<Uint8Array> {
  const kunci = process.env.ZEROGPT_API_KEY;
  const userId = process.env.ZEROGPT_USER_ID;
  if (!kunci || !userId) throw new Error("ZEROGPT_API_KEY / ZEROGPT_USER_ID belum disetel.");
  const dasar = (process.env.ZEROGPT_API_BASE || "https://api.zerogpt.com").replace(/\/$/, "");
  const url = `${dasar}/api/dashboard/exportToPdf?id=${encodeURIComponent(id)}&user_id=${encodeURIComponent(userId)}`;
  const res = await fetch(url, { headers: headerAuth(kunci), signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`ZeroGPT exportToPdf ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);

  const pdfAsli = (b: Uint8Array) => b.length > 4 && String.fromCharCode(...b.slice(0, 4)) === "%PDF";
  const jenis = res.headers.get("content-type") ?? "";
  if (!jenis.includes("json")) {
    const buf = new Uint8Array(await res.arrayBuffer());
    if (pdfAsli(buf)) return buf;
    throw new Error("ZeroGPT exportToPdf tidak mengembalikan PDF.");
  }

  const json = (await res.json()) as Record<string, unknown>;
  const data = (json.data ?? json) as Record<string, unknown> | string;
  const kandidat = typeof data === "string" ? [data] : Object.values(data).filter((v): v is string => typeof v === "string");
  for (const v of kandidat) {
    if (/^https?:\/\//.test(v)) {
      const r = await fetch(v, { signal: AbortSignal.timeout(60_000) });
      const b = new Uint8Array(await r.arrayBuffer());
      if (r.ok && pdfAsli(b)) return b;
    } else if (v.length > 100) {
      const b = Uint8Array.from(Buffer.from(v.replace(/^data:application\/pdf;base64,/, ""), "base64"));
      if (pdfAsli(b)) return b;
    }
  }
  throw new Error(`ZeroGPT exportToPdf: bentuk tanggapan tidak dikenal. ${JSON.stringify(json).slice(0, 300)}`);
}
