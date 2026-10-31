import Image from "next/image";
import { MessageCircle } from "lucide-react";

/**
 * Tangkapan layar percakapan WhatsApp dari klien, ditampilkan di dalam
 * bingkai ponsel.
 *
 * Isi daftar SCREENSHOT di bawah dengan berkas asli yang kamu taruh di
 * /public/testimoni-wa/. Jangan diisi gambar hasil rekaan: tangkapan layar
 * percakapan yang dikarang adalah testimoni palsu, dan satu saja yang
 * ketahuan cukup untuk merusak kepercayaan pada semua testimoni lain di
 * halaman ini.
 *
 * Sebelum memasang, tutup nomor telepon dan foto profil klien, lalu minta
 * izin mereka. UU No. 27/2022 tentang Pelindungan Data Pribadi mengatur
 * penggunaan data pribadi orang lain, dan isi percakapan termasuk di
 * dalamnya.
 */

type Screenshot = {
  /** Berkas di /public/testimoni-wa/ */
  file: string;
  /** Deskripsi untuk pembaca layar dan saat gambar gagal dimuat. */
  alt: string;
  /** Keterangan singkat di bawah bingkai. Opsional. */
  nama?: string;
  kampus?: string;
};

const SCREENSHOT: Screenshot[] = [
  // Contoh pengisian — hapus tanda komentar dan sesuaikan:
  // { file: "/testimoni-wa/rizky.jpg", alt: "Percakapan WhatsApp dengan Rizky soal revisi bab 3",
  //   nama: "Rizky A.", kampus: "UNS" },
];

/** Bingkai ponsel. Digambar dengan CSS, bukan gambar, supaya tetap tajam. */
function BingkaiPonsel({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[220px] shrink-0 sm:w-[240px]">
      <div className="relative rounded-[2rem] border-[6px] border-slate-900 bg-slate-900 shadow-xl">
        {/* Poni */}
        <div className="absolute left-1/2 top-0 z-10 h-5 w-24 -translate-x-1/2 rounded-b-xl bg-slate-900" />
        {/* Layar */}
        <div className="relative aspect-[9/19] overflow-hidden rounded-[1.6rem] bg-[#ECE5DD]">
          {children}
        </div>
      </div>
      {/* Tombol samping */}
      <span className="absolute -right-[9px] top-20 h-12 w-[3px] rounded-r bg-slate-700" />
      <span className="absolute -left-[9px] top-16 h-8 w-[3px] rounded-l bg-slate-700" />
      <span className="absolute -left-[9px] top-28 h-8 w-[3px] rounded-l bg-slate-700" />
    </div>
  );
}

export function TestimoniWhatsApp() {
  // Tanpa tangkapan layar, bagian ini tidak dirender sama sekali. Bingkai
  // ponsel kosong di halaman publik terlihat seperti situs yang rusak.
  if (SCREENSHOT.length === 0) return null;

  return (
    <section className="bg-white px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-0.5 w-8 rounded-full bg-brand" />
          <span className="text-xs font-bold uppercase tracking-widest text-brand">
            Kata Mereka
          </span>
        </div>
        <h2 className="mb-2 text-3xl font-extrabold text-slate-900 lg:text-4xl">
          Pesan yang masuk ke WhatsApp kami
        </h2>
        <p className="mb-10 max-w-xl text-slate-500">
          Dikirim langsung oleh mahasiswa yang sudah selesai bimbingan, dimuat
          atas izin mereka.
        </p>

        <ul className="flex flex-wrap justify-center gap-8 lg:justify-start">
          {SCREENSHOT.map((s) => (
            <li key={s.file} className="flex flex-col items-center">
              <BingkaiPonsel>
                <Image
                  src={s.file}
                  alt={s.alt}
                  fill
                  sizes="240px"
                  className="object-cover object-top"
                />
              </BingkaiPonsel>
              {s.nama && (
                <div className="mt-4 text-center">
                  <p className="text-sm font-bold text-slate-900">{s.nama}</p>
                  {s.kampus && (
                    <p className="text-xs text-slate-400">{s.kampus}</p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-slate-400 lg:justify-start">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Nomor dan foto profil sengaja disamarkan.
        </p>
      </div>
    </section>
  );
}
