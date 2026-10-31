import Image from "next/image";

/**
 * Kartu perangkat lunak yang dipakai mentor saat mendampingi.
 *
 * Logo diletakkan di /public/tools/<slug>.png, tinggi seragam 120 px dengan
 * lebar mengikuti bentuk aslinya. Rasionya memang beragam — Python dan
 * Zotero berupa ikon persegi, STATA dan NVivo berupa wordmark memanjang —
 * jadi area logo di kartu dibuat bertinggi tetap dan berlebar fleksibel.
 * Memaksa semuanya ke kotak persegi akan membuat wordmark menyusut sampai
 * tidak terbaca.
 *
 * Nama-nama di sini adalah merek dagang milik pemiliknya masing-masing.
 * Dipakai untuk menerangkan perangkat apa yang diajarkan, bukan untuk
 * menyatakan afiliasi atau dukungan dari pembuatnya.
 */

export type Tool = {
  nama: string;
  untuk: string;
  slug: string;
};

export const TOOLS: Tool[] = [
  { nama: "SPSS",      untuk: "Statistik kuantitatif",   slug: "spss" },
  { nama: "SmartPLS",  untuk: "SEM-PLS",                 slug: "smartpls" },
  { nama: "AMOS",      untuk: "SEM berbasis kovarian",   slug: "amos" },
  { nama: "STATA",     untuk: "Ekonometrika",            slug: "stata" },
  { nama: "EViews",    untuk: "Data runtut waktu",       slug: "eviews" },
  { nama: "R",         untuk: "Analisis lanjutan",       slug: "r" },
  { nama: "NVivo",     untuk: "Analisis kualitatif",     slug: "nvivo" },
  { nama: "ATLAS.ti",  untuk: "Koding data kualitatif",  slug: "atlasti" },
  { nama: "Mendeley",  untuk: "Manajemen sitasi",        slug: "mendeley" },
  { nama: "Zotero",    untuk: "Manajemen referensi",     slug: "zotero" },
  { nama: "VOSviewer", untuk: "Analisis bibliometrik",   slug: "vosviewer" },
  { nama: "Python",    untuk: "Olah data & visualisasi", slug: "python" },
];

export function KartuTool({ t }: { t: Tool }) {
  return (
    <li className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-brand hover:shadow-card">
      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-slate-50 p-1.5">
        <Image
          src={`/tools/${t.slug}.png`}
          alt={`Logo ${t.nama}`}
          width={120}
          height={120}
          className="max-h-full max-w-full object-contain"
        />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-bold text-slate-900">{t.nama}</span>
        <span className="block truncate text-xs font-medium text-slate-500">
          {t.untuk}
        </span>
      </span>
    </li>
  );
}
