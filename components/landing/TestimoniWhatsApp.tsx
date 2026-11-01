import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import { ImagePlus } from "lucide-react";

/**
 * Tangkapan layar percakapan WhatsApp dari klien, di dalam bingkai ponsel.
 *
 * ── CARA MENGISI ──────────────────────────────────────────────────────────
 *
 * Taruh berkasnya di  /public/testimoni-wa/  — selesai. Tidak ada kode yang
 * perlu diubah: folder ini dipindai sendiri saat build, jadi berapa pun
 * jumlah berkasnya akan tampil, urut berdasarkan nama.
 *
 *   Ukuran yang pas:  1080 × 2280 piksel  (rasio 9:19)
 *   Format:           .jpg, .jpeg, .png, atau .webp
 *   Ukuran berkas:    usahakan di bawah 300 KB per gambar
 *
 * Penamaan yang rapi membantu karena urutannya mengikuti nama berkas:
 * wa-1.jpg, wa-2.jpg, wa-3.jpg, dan seterusnya.
 *
 * Gambar dipasang dengan object-cover object-top, jadi kalau tingginya
 * lebih dari rasio 9:19 bagian bawah terpotong — taruh bagian percakapan
 * yang paling penting di atas.
 *
 * CATATAN: pemindaian terjadi saat build. Setelah menambah berkas baru,
 * jalankan ulang `npm run dev` atau `npm run build` supaya terbaca.
 *
 * Satu hal yang tetap perlu dijaga: pakai tangkapan layar yang betul-betul
 * ada. Percakapan yang dikarang adalah testimoni palsu, dan satu saja yang
 * ketahuan cukup untuk meruntuhkan kepercayaan pada seluruh testimoni di
 * halaman ini.
 */

const FOLDER = path.join(process.cwd(), "public", "testimoni-wa");
const EKSTENSI = new Set([".jpg", ".jpeg", ".png", ".webp"]);

/** Berkas gambar di /public/testimoni-wa/, urut berdasarkan nama. */
function bacaTestimoni(): string[] {
  try {
    return fs
      .readdirSync(FOLDER)
      .filter((nama) => EKSTENSI.has(path.extname(nama).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "id", { numeric: true }))
      .map((nama) => `/testimoni-wa/${nama}`);
  } catch {
    // Folder belum dibuat — bukan galat, cukup anggap kosong.
    return [];
  }
}

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

/** Kotak penanda, hanya tampil saat pengembangan selama folder masih kosong. */
function Penanda() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center">
      <ImagePlus className="h-7 w-7 text-slate-300" aria-hidden="true" />
      <p className="text-[11px] font-semibold leading-tight text-slate-500">
        Taruh berkasnya di
      </p>
      <code className="break-all text-[10px] leading-tight text-slate-400">
        /public/testimoni-wa/
      </code>
      <p className="mt-1 text-[10px] leading-tight text-slate-400">
        1080 × 2280 px
        <br />
        lalu jalankan ulang
        <br />
        <code>npm run dev</code>
      </p>
    </div>
  );
}

export function TestimoniWhatsApp() {
  const berkas = bacaTestimoni();

  // Di produksi, bagian ini hilang sepenuhnya kalau foldernya masih kosong —
  // bingkai kosong di halaman publik terbaca sebagai situs yang rusak. Saat
  // `npm run dev`, penanda tetap tampil supaya bentuk dan ukurannya terlihat.
  const tampilkanPenanda =
    berkas.length === 0 && process.env.NODE_ENV === "development";
  if (berkas.length === 0 && !tampilkanPenanda) return null;

  return (
    <section className="bg-white px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-center justify-center gap-2">
          <span className="h-0.5 w-8 rounded-full bg-brand" />
          <span className="text-xs font-bold uppercase tracking-widest text-brand">
            Kata Mereka
          </span>
        </div>
        <h2 className="mb-2 flex flex-wrap items-center justify-center gap-3 text-3xl font-extrabold text-slate-900 lg:text-4xl">
          Testimoni Sobat Konsul
          <Image
            src="/icon-whatsapp.webp"
            alt="WhatsApp"
            width={40}
            height={40}
            className="h-8 w-8 lg:h-10 lg:w-10"
          />
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center font-medium text-slate-600">
          Mereka Terbantu, Terbimbing, dan Terpuaskan. Kami,{" "}
          <span className="font-bold text-brand">@ruangkonsull_solo</span> hadir
          sebagai teman dan sahabat bagi Mahasiswa
        </p>

        <ul className="flex flex-wrap items-start justify-center gap-8">
          {tampilkanPenanda
            ? [0, 1, 2].map((i) => (
                <li key={i} className="flex flex-col items-center">
                  <BingkaiPonsel>
                    <Penanda />
                  </BingkaiPonsel>
                </li>
              ))
            : berkas.map((src, i) => (
                <li key={src} className="flex flex-col items-center">
                  <BingkaiPonsel>
                    <Image
                      src={src}
                      alt={`Percakapan WhatsApp dengan peserta bimbingan ${i + 1}`}
                      fill
                      sizes="230px"
                      className="object-cover object-top"
                    />
                  </BingkaiPonsel>
                </li>
              ))}
        </ul>
      </div>
    </section>
  );
}
