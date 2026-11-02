import type {
  HasilAI,
  HasilKemiripan,
  HasilParafrase,
  JenisPeriksa,
} from "./types";
import { CATATAN_PARAFRASE, PERINGATAN_AI } from "./types";

/**
 * Lapisan penyedia pemeriksaan naskah.
 *
 * Dibuat sebagai antarmuka supaya penyedia bisa diganti tanpa menyentuh
 * antarmuka maupun rute API. Itu penting karena harga dan kualitas
 * penyedia-penyedia ini berubah cepat, dan kamu mungkin perlu pindah.
 *
 * ── YANG PERLU KAMU PUTUSKAN SEBELUM INI JALAN ────────────────────────────
 *
 * Pilih penyedia yang memang MENJUAL akses API ke pihak ketiga. Beberapa
 * yang lazim: Copyleaks, PlagiarismCheck.org, Winston AI, Originality.ai.
 * Turnitin tidak termasuk — aksesnya lewat lisensi institusi, dan memakai
 * akun kampus untuk melayani klien luar melanggar lisensi itu.
 *
 * Hitung dulu biaya per 1.000 kata dari penyedia pilihanmu, lalu bandingkan
 * dengan tarif di types.ts (Rp500 kemiripan, Rp1.000 AI, Rp1.000 parafrase).
 * Kalau biaya API lebih tinggi, setiap pemeriksaan membuatmu rugi, dan
 * ruginya tumbuh seiring ramainya pemakai.
 *
 * Parafrase biasanya bukan layanan yang sama dengan pendeteksi kemiripan.
 * Penyedianya kerap berbeda (umumnya model bahasa seperti OpenAI, Anthropic,
 * atau Google), jadi PERIKSA_API_URL untuk parafrase mungkin perlu dipisah
 * dari yang dipakai dua pemeriksaan lainnya.
 *
 * Setelah penyedia dipilih, isi PenyediaHttp di bawah dan setel
 * PERIKSA_PENYEDIA=http di environment.
 */

export interface Penyedia {
  nama: string;
  kemiripan(teks: string): Promise<HasilKemiripan>;
  ai(teks: string): Promise<HasilAI>;
  parafrase(teks: string): Promise<HasilParafrase>;
}

/** Dilempar saat penyedia belum dikonfigurasi, agar rute API bisa membalas 503. */
export class PenyediaBelumSiap extends Error {
  constructor() {
    super("Penyedia pemeriksaan belum dikonfigurasi.");
    this.name = "PenyediaBelumSiap";
  }
}

/**
 * Penyedia HTTP umum.
 *
 * Bentuk permintaan dan tanggapan berbeda-beda antar penyedia, jadi dua
 * fungsi pemetaan di bawah sengaja dibiarkan kosong — isi sesuai dokumentasi
 * penyedia yang kamu pilih. Jangan menebak bentuk tanggapannya; baca
 * dokumentasinya, karena salah memetakan skor akan menghasilkan angka yang
 * terlihat masuk akal tapi keliru, dan itu lebih berbahaya daripada error.
 */
class PenyediaHttp implements Penyedia {
  nama: string;

  constructor(
    private baseUrl: string,
    private apiKey: string,
    nama = "penyedia-http"
  ) {
    this.nama = nama;
  }

  private async panggil(jalur: string, teks: string): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}${jalur}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ text: teks }),
      // Pemeriksaan bisa lama; jangan biarkan menggantung tanpa batas.
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      throw new Error(
        `Penyedia menolak permintaan (${res.status}). ` +
          `Periksa kunci API dan kuota langgananmu.`
      );
    }
    return res.json();
  }

  async kemiripan(teks: string): Promise<HasilKemiripan> {
    const mentah = await this.panggil("/similarity", teks);
    return petakanKemiripan(mentah);
  }

  async ai(teks: string): Promise<HasilAI> {
    const mentah = await this.panggil("/ai-detection", teks);
    return petakanAI(mentah);
  }

  async parafrase(teks: string): Promise<HasilParafrase> {
    const mentah = await this.panggil("/paraphrase", teks);
    return petakanParafrase(mentah);
  }
}

/** Isi sesuai bentuk tanggapan penyedia pilihanmu. */
function petakanKemiripan(mentah: unknown): HasilKemiripan {
  throw new Error(
    "petakanKemiripan belum diisi. Buka lib/periksa/penyedia.ts dan petakan " +
      "tanggapan penyedia ke bentuk HasilKemiripan sesuai dokumentasinya. " +
      `Tanggapan yang diterima: ${JSON.stringify(mentah).slice(0, 300)}`
  );
}

function petakanAI(mentah: unknown): HasilAI {
  throw new Error(
    "petakanAI belum diisi. Buka lib/periksa/penyedia.ts dan petakan " +
      "tanggapan penyedia ke bentuk HasilAI sesuai dokumentasinya. " +
      `Tanggapan yang diterima: ${JSON.stringify(mentah).slice(0, 300)}`
  );
}

function petakanParafrase(mentah: unknown): HasilParafrase {
  throw new Error(
    "petakanParafrase belum diisi. Buka lib/periksa/penyedia.ts dan petakan " +
      "tanggapan penyedia ke bentuk HasilParafrase sesuai dokumentasinya. " +
      "Kalau memakai model bahasa, jaga agar perintahnya menyusun ulang " +
      "kalimat tanpa mengubah makna, dan tidak menghapus penanda sitasi " +
      "yang sudah ada di naskah. " +
      `Tanggapan yang diterima: ${JSON.stringify(mentah).slice(0, 300)}`
  );
}

export function ambilPenyedia(): Penyedia {
  const mode = process.env.PERIKSA_PENYEDIA;

  if (mode === "http") {
    const url = process.env.PERIKSA_API_URL;
    const key = process.env.PERIKSA_API_KEY;
    if (!url || !key) throw new PenyediaBelumSiap();
    return new PenyediaHttp(url, key, process.env.PERIKSA_NAMA ?? "penyedia-http");
  }

  throw new PenyediaBelumSiap();
}

/**
 * Saran perbaikan dari hasil pemeriksaan.
 *
 * Ini inti produknya. Angka saja membuat orang cemas; yang menolong adalah
 * tahu apa yang harus dikerjakan setelah melihat angka itu.
 */
export function susunSaran(
  jenis: JenisPeriksa,
  kemiripan?: HasilKemiripan,
  ai?: HasilAI,
  parafrase?: HasilParafrase
): string[] {
  const saran: string[] = [];

  if (parafrase) {
    saran.push(...CATATAN_PARAFRASE);
  }

  if (kemiripan) {
    const tanpaSitasi = Math.max(0, kemiripan.persen - kemiripan.persenBersitasi);

    if (kemiripan.persenBersitasi > 0) {
      saran.push(
        `${kemiripan.persenBersitasi}% kemiripanmu berasal dari kutipan yang ` +
          `sudah bersitasi. Bagian itu wajar dan tidak perlu diubah — angka ` +
          `kemiripan memang ikut menghitungnya.`
      );
    }

    if (tanpaSitasi >= 15) {
      saran.push(
        `Sekitar ${tanpaSitasi}% mirip dengan sumber lain tanpa sitasi. ` +
          `Telusuri bagian yang ditandai: kalau gagasannya memang dari sumber ` +
          `itu, tambahkan sitasi. Kalau kamu sedang menjelaskan ulang, tutup ` +
          `sumbernya lalu tulis ulang dari pemahamanmu.`
      );
    } else if (tanpaSitasi > 0) {
      saran.push(
        `Kemiripan tanpa sitasi hanya sekitar ${tanpaSitasi}%. Periksa sekilas ` +
          `bagian yang ditandai untuk memastikan tidak ada yang terlewat disitasi.`
      );
    }

    if (kemiripan.sumber.length > 0 && kemiripan.persen >= 25) {
      saran.push(
        `Sebagian besar kemiripan menumpuk di beberapa sumber yang sama. ` +
          `Itu biasanya pertanda bab tinjauan pustakamu terlalu bersandar pada ` +
          `sedikit rujukan — tambahkan sumber lain dan bandingkan temuannya.`
      );
    }
  }

  if (ai) {
    saran.push(
      `Soal skor indikasi AI: tinjau kalimat yang ditandai, tapi jangan menulis ` +
        `ulang bagian yang memang kamu tulis sendiri hanya demi menurunkan angka. ` +
        `Alat ini sering salah menandai tulisan akademik yang bergaya formal.`
    );
  }

  saran.push(
    `Mau dibedah bersama mentor? Bawa naskah dan hasil pemeriksaan ini ke satu ` +
      `sesi bimbingan — yang dibahas cara mengutip dan memposisikan sumber, ` +
      `bukan sekadar menurunkan angkanya.`
  );

  return saran;
}
