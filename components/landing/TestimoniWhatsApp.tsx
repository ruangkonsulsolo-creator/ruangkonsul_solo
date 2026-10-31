import Image from "next/image";
import { ImagePlus } from "lucide-react";

/**
 * Tangkapan layar percakapan WhatsApp dari klien, di dalam bingkai ponsel.
 *
 * ── CARA MENGISI ──────────────────────────────────────────────────────────
 *
 * 1. Taruh berkasnya di  /public/testimoni-wa/
 * 2. Ukuran yang pas:    1080 × 2280 piksel  (rasio 9:19)
 *    Format:             JPG (lebih ringan) atau PNG
 *    Ukuran berkas:      usahakan di bawah 300 KB per gambar
 *
 *    Gambar dipasang dengan object-cover object-top, jadi kalau tingginya
 *    lebih dari 2280 bagian bawah terpotong — taruh bagian percakapan yang
 *    paling penting di atas. Kalau lebarnya bukan 1080, gambar tetap tampil
 *    tapi bisa agak buram di layar retina.
 *
 * 3. Ubah `ada: false` jadi `ada: true` pada entri yang berkasnya sudah siap.
 *    Selama masih false, yang tampil adalah kotak penanda, bukan gambar.
 *
 * Satu hal yang tetap perlu dijaga: pakai tangkapan layar yang betul-betul
 * ada. Percakapan yang dikarang adalah testimoni palsu, dan satu saja yang
 * ketahuan cukup untuk meruntuhkan kepercayaan pada seluruh testimoni di
 * halaman ini.
 */

type Screenshot = {
  file: string;
  alt: string;
  nama: string;
  kampus?: string;
  /** false = tampilkan kotak penanda; true = tampilkan gambar. */
  ada: boolean;
};

const SCREENSHOT: Screenshot[] = [
  {
    file: "/testimoni-wa/wa-1.jpg",
    alt: "Percakapan WhatsApp dengan klien tentang hasil bimbingan",
    nama: "Klien 1",
    kampus: "",
    ada: false,
  },
  {
    file: "/testimoni-wa/wa-2.jpg",
    alt: "Percakapan WhatsApp dengan klien tentang hasil bimbingan",
    nama: "Klien 2",
    kampus: "",
    ada: false,
  },
  {
    file: "/testimoni-wa/wa-3.jpg",
    alt: "Percakapan WhatsApp dengan klien tentang hasil bimbingan",
    nama: "Klien 3",
    kampus: "",
    ada: false,
  },
];

/** Bingkai ponsel digambar dengan CSS, bukan gambar, supaya tetap tajam. */
function BingkaiPonsel({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[210px] shrink-0 sm:w-[230px]">
      <div className="relative rounded-[2.2rem] border-[7px] border-slate-900 bg-slate-900 shadow-xl">
        {/* Poni */}
        <div className="absolute left-1/2 top-0 z-10 h-5 w-24 -translate-x-1/2 rounded-b-xl bg-slate-900" />
        {/* Layar — warna latar khas WhatsApp */}
        <div className="relative aspect-[9/19] overflow-hidden rounded-[1.7rem] bg-[#ECE5DD]">
          {children}
        </div>
      </div>
      {/* Tombol samping */}
      <span className="absolute -right-[10px] top-24 h-14 w-[3px] rounded-r bg-slate-700" />
      <span className="absolute -left-[10px] top-20 h-9 w-[3px] rounded-l bg-slate-700" />
      <span className="absolute -left-[10px] top-32 h-9 w-[3px] rounded-l bg-slate-700" />
    </div>
  );
}

/** Kotak penanda selama berkas aslinya belum dipasang. */
function Penanda({ file }: { file: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center">
      <ImagePlus className="h-7 w-7 text-slate-300" aria-hidden="true" />
      <p className="text-[11px] font-semibold leading-tight text-slate-500">
        Taruh berkas di
      </p>
      <code className="break-all text-[10px] leading-tight text-slate-400">
        {file}
      </code>
      <p className="mt-1 text-[10px] leading-tight text-slate-400">
        1080 × 2280 px
        <br />
        lalu ubah <code>ada: true</code>
      </p>
    </div>
  );
}

export function TestimoniWhatsApp() {
  const siap = SCREENSHOT.filter((s) => s.ada);

  // Di produksi, bagian ini hilang sepenuhnya kalau belum ada satu pun
  // tangkapan layar — bingkai kosong di halaman publik terbaca sebagai
  // situs yang rusak. Saat dijalankan dengan `npm run dev`, penanda tetap
  // tampil supaya kamu bisa melihat bentuk dan ukurannya.
  const tampilkanPenanda = process.env.NODE_ENV === "development";
  const daftar = siap.length > 0 ? siap : tampilkanPenanda ? SCREENSHOT : [];
  if (daftar.length === 0) return null;

  return (
    <section className="bg-white px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-0.5 w-8 rounded-full bg-brand" />
          <span className="text-xs font-bold uppercase tracking-widest text-brand">
            Kata Mereka
          </span>
        </div>
        <h2 className="mb-2 flex flex-wrap items-center gap-3 text-3xl font-extrabold text-slate-900 lg:text-4xl">
          Testimoni Sobat Konsul
          <Image
            src="/icon-whatsapp.webp"
            alt="WhatsApp"
            width={40}
            height={40}
            className="h-8 w-8 lg:h-10 lg:w-10"
          />
        </h2>
        <p className="mb-10 max-w-xl font-medium text-slate-600">
          Dikirim langsung oleh mahasiswa yang sudah selesai bimbingan, dimuat
          atas izin mereka.
        </p>

        <ul className="flex flex-wrap justify-center gap-8 lg:justify-start">
          {daftar.map((s) => (
            <li key={s.file} className="flex flex-col items-center">
              <BingkaiPonsel>
                {s.ada ? (
                  <Image
                    src={s.file}
                    alt={s.alt}
                    fill
                    sizes="230px"
                    className="object-cover object-top"
                  />
                ) : (
                  <Penanda file={s.file} />
                )}
              </BingkaiPonsel>
              {s.ada && (
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

        {siap.length > 0 && (
          <p className="mt-8 text-center text-xs font-medium text-slate-500 lg:text-left">
            Nomor dan foto profil disamarkan.
          </p>
        )}
      </div>
    </section>
  );
}
