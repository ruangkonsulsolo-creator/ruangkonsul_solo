import Image from "next/image";

/**
 * Kartu perangkat lunak yang dipakai mentor saat mendampingi.
 *
 * Soal logo: nama-nama di sini adalah merek dagang milik pemiliknya
 * masing-masing (IBM untuk SPSS dan AMOS, StataCorp untuk STATA, Lumivero
 * untuk NVivo, dan seterusnya). Memajangnya untuk menerangkan perangkat apa
 * yang diajarkan termasuk penggunaan yang wajar, tapi berkas logonya tidak
 * disertakan di repo ini.
 *
 * Kalau kamu ingin memakai logo resminya:
 *   1. Unduh dari situs resmi masing-masing (cari "press kit" atau
 *      "brand assets"), bukan dari hasil pencarian gambar.
 *   2. Taruh di /public/tools/ dengan nama sesuai `slug` di bawah,
 *      misalnya /public/tools/spss.png
 *   3. Ukuran: PNG latar transparan, sisi terpanjang 160 px.
 *
 * Selama berkasnya belum ada, kartu memakai monogram berwarna. Monogram ini
 * buatan sendiri, bukan tiruan logo aslinya — menggambar ulang logo orang
 * lain justru lebih bermasalah daripada tidak memakainya sama sekali.
 */

export type Tool = {
  nama: string;
  untuk: string;
  /** Nama berkas di /public/tools/ tanpa ekstensi. */
  slug: string;
  /** Dipakai monogram saat logo belum ada. */
  warna: string;
  /** Satu sampai tiga huruf. */
  monogram: string;
  /** Setel true setelah berkas logonya benar-benar ada di /public/tools/. */
  adaLogo?: boolean;
};

export const TOOLS: Tool[] = [
  { nama: "SPSS",      untuk: "Statistik kuantitatif",  slug: "spss",      warna: "#1F70C1", monogram: "SP" },
  { nama: "SmartPLS",  untuk: "SEM-PLS",                slug: "smartpls",  warna: "#E8663D", monogram: "PLS" },
  { nama: "AMOS",      untuk: "SEM berbasis kovarian",  slug: "amos",      warna: "#0F62FE", monogram: "AM" },
  { nama: "STATA",     untuk: "Ekonometrika",           slug: "stata",     warna: "#1A5C8A", monogram: "ST" },
  { nama: "EViews",    untuk: "Data runtut waktu",      slug: "eviews",    warna: "#2E7D32", monogram: "EV" },
  { nama: "R",         untuk: "Analisis lanjutan",      slug: "r",         warna: "#276DC3", monogram: "R" },
  { nama: "NVivo",     untuk: "Analisis kualitatif",    slug: "nvivo",     warna: "#6A1B9A", monogram: "NV" },
  { nama: "ATLAS.ti",  untuk: "Koding data kualitatif", slug: "atlasti",   warna: "#F9A825", monogram: "AT" },
  { nama: "Mendeley",  untuk: "Manajemen sitasi",       slug: "mendeley",  warna: "#9D1620", monogram: "ME" },
  { nama: "Zotero",    untuk: "Manajemen referensi",    slug: "zotero",    warna: "#CC2936", monogram: "ZO" },
  { nama: "VOSviewer", untuk: "Analisis bibliometrik",  slug: "vosviewer", warna: "#00897B", monogram: "VOS" },
  { nama: "Python",    untuk: "Olah data & visualisasi",slug: "python",    warna: "#3776AB", monogram: "PY" },
];

export function KartuTool({ t }: { t: Tool }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand-200">
      {t.adaLogo ? (
        <Image
          src={`/tools/${t.slug}.png`}
          alt={`Logo ${t.nama}`}
          width={40}
          height={40}
          className="h-10 w-10 flex-shrink-0 object-contain"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold tracking-tight text-white"
          style={{ backgroundColor: t.warna }}
        >
          {t.monogram}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-bold text-slate-900">{t.nama}</span>
        <span className="block truncate text-xs text-slate-400">{t.untuk}</span>
      </span>
    </li>
  );
}
