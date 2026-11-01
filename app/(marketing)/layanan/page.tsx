import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { BRAND, waLink } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Layanan",
  description:
    "Bimbingan skripsi dan tesis, mentoring tatap muka di Solo, pendampingan " +
    "revisi dan publikasi jurnal, desain presentasi sidang, serta merchandise wisuda.",
};

/**
 * Katalog layanan.
 *
 * Halaman ini sebelumnya memuat empat layanan pemrosesan dokumen dengan
 * struktur per-file (SLA, format, ukuran maksimum). Struktur itu tidak cocok
 * untuk bimbingan, yang dijual per sesi dan per pendampingan, jadi halamannya
 * ditulis ulang alih-alih diisi ulang.
 */
/**
 * Kategori dipakai untuk menyaring katalog lewat ?kategori= di URL, bukan
 * lewat state di klien. Dengan begitu tiap kategori punya alamat sendiri
 * yang bisa dibagikan, ditandai, dan diindeks mesin pencari.
 */
const KATEGORI = [
  "Semua",
  "Bimbingan",
  "Olah Data",
  "Publikasi",
  "Presentasi",
  "Merchandise",
] as const;

type Kategori = Exclude<(typeof KATEGORI)[number], "Semua">;

type Layanan = {
  nama: string;
  kategori: Kategori;
  ringkas: string;
  deskripsi: string;
  harga: string;
  satuan: string;
  isi: string[];
  href: string;
  cta: string;
  utama?: boolean;
};

const LAYANAN: Layanan[] = [
  {
    nama: "Bimbingan Skripsi & Tesis",
    kategori: "Bimbingan",
    ringkas: "Sesi satu lawan satu bersama mentor",
    deskripsi:
      "Kamu yang menulis, mentor yang menunjukkan jalan keluar saat buntu. " +
      "Mulai dari menajamkan rumusan masalah, memilih metode yang cocok dengan " +
      "datamu, sampai menyiapkan diri menghadapi pertanyaan penguji.",
    harga: "Rp 150.000",
    satuan: "per sesi 60 menit",
    isi: [
      "Daring atau tatap muka di Solo",
      "Mentor sesuai bidang dan metodemu",
      "Catatan dan tindak lanjut setelah sesi",
      "Jadwal dipilih sendiri lewat kalender",
    ],
    href: "/booking",
    cta: "Lihat jadwal mentor",
    utama: true,
  },
  {
    nama: "Paket Bimbingan Bulanan",
    kategori: "Bimbingan",
    ringkas: "Pendampingan berkelanjutan sampai sidang",
    deskripsi:
      "Untuk yang sedang mengejar target wisuda. Kuota sesi per bulan dengan " +
      "mentor tetap, supaya tidak perlu menjelaskan ulang penelitianmu dari awal " +
      "setiap kali bertemu.",
    harga: "Rp 500.000",
    satuan: "per bulan, 4 sesi",
    isi: [
      "Mentor tetap selama paket berjalan",
      "Tanya jawab singkat di antara sesi",
      "Rekap progres tiap akhir bulan",
      "Sisa kuota terlihat di dashboard",
    ],
    href: "/booking",
    cta: "Mulai berlangganan",
  },
  {
    nama: "Pendampingan Revisi",
    kategori: "Bimbingan",
    ringkas: "Membedah catatan pembimbing bersama",
    deskripsi:
      "Catatan dosen sering singkat dan sulit diterjemahkan jadi langkah konkret. " +
      "Mentor membaca draf dan catatanmu, lalu membantu menyusun rencana perbaikan " +
      "yang kamu kerjakan sendiri.",
    harga: "Rp 150.000",
    satuan: "per sesi",
    isi: [
      "Draf dibaca sebelum sesi dimulai",
      "Prioritas revisi disusun bersama",
      "Penjelasan alasan di balik tiap catatan",
    ],
    href: "/booking",
    cta: "Pesan sesi revisi",
  },
  {
    nama: "Olah & Interpretasi Data",
    kategori: "Olah Data",
    ringkas: "Bab 4 tidak lagi gelap",
    deskripsi:
      "Memilih uji yang sesuai rancangan penelitianmu, menjalankannya bersama, " +
      "lalu berlatih membaca keluarannya sampai kamu sanggup menjelaskannya " +
      "sendiri di depan penguji.",
    harga: "Rp 200.000",
    satuan: "per sesi",
    isi: [
      "Pilih uji statistik yang tepat",
      "Dijalankan bersama, bukan dikerjakan untukmu",
      "Latihan membaca dan menarasikan output",
      "Siap menjawab pertanyaan penguji",
    ],
    href: "/booking",
    cta: "Pesan sesi olah data",
  },
  {
    nama: "Pendampingan Publikasi Jurnal",
    kategori: "Publikasi",
    ringkas: "Memilih jurnal dan menyiapkan naskah",
    deskripsi:
      "Memahami perbedaan jurnal bereputasi dan predator, menyesuaikan naskah " +
      "dengan template dan gaya selingkung, serta menyiapkan respons untuk " +
      "komentar reviewer.",
    harga: "Rp 350.000",
    satuan: "per pendampingan",
    isi: [
      "Peninjauan kecocokan jurnal tujuan",
      "Penyesuaian format dan sitasi",
      "Latihan menanggapi komentar reviewer",
    ],
    href: "/booking",
    cta: "Konsultasikan naskahmu",
  },
  {
    nama: "Desain Presentasi Sidang",
    kategori: "Presentasi",
    ringkas: "Slide yang membantumu menjelaskan",
    deskripsi:
      "Penelitian yang baik sering kalah di ruang sidang karena slide yang penuh " +
      "teks. Kami menyusun ulang alurnya supaya penguji mengerti kontribusimu " +
      "dalam lima menit pertama.",
    harga: "Rp 250.000",
    satuan: "per deck",
    isi: [
      "Alur cerita disusun ulang, bukan sekadar dipercantik",
      "Grafik data dibuat terbaca dari kursi belakang",
      "Dua kali revisi",
    ],
    href: waLink("Halo, saya ingin tanya soal desain presentasi sidang."),
    cta: "Tanya lewat WhatsApp",
  },
  {
    nama: "Merchandise & Buket Wisuda",
    kategori: "Merchandise",
    ringkas: "Untuk hari yang sudah lama ditunggu",
    deskripsi:
      "Buket wisuda, tumbler, dan kaus Ruang Konsul. Bisa diantar di Solo atau " +
      "dikirim ke luar kota.",
    harga: "Mulai Rp 85.000",
    satuan: "per item",
    isi: ["Buket bunga dan snack", "Tumbler dan kaus", "Pengiriman seluruh Indonesia"],
    href: "/merchandise",
    cta: "Lihat katalog",
  },
];

export default function LayananPage({
  searchParams,
}: {
  searchParams: { kategori?: string };
}) {
  const aktif = searchParams.kategori ?? "Semua";
  const tampil =
    aktif === "Semua" ? LAYANAN : LAYANAN.filter((l) => l.kategori === aktif);

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo href="/" size="sm" />
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <Link href="/layanan" className="font-semibold text-brand">Layanan</Link>
            <Link href="/jadwal" className="transition-colors hover:text-brand">Jadwal</Link>
            <Link href="/paket-hemat" className="transition-colors hover:text-brand">Paket Langganan</Link>
            <Link href="/event" className="transition-colors hover:text-brand">Event</Link>
            <Link href="/blog" className="transition-colors hover:text-brand">Blog</Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild><Link href="/daftar">Daftar</Link></Button>
            <Button size="sm" asChild><Link href="/login">Login</Link></Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-brand-50 px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-0.5 w-8 rounded-full bg-brand" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand">
              Layanan
            </span>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight text-slate-900 lg:text-5xl">
            Pendampingan untuk tulisan yang{" "}
            <span className="text-brand">kamu kerjakan sendiri</span>
          </h1>
          <p className="mt-3 max-w-xl leading-relaxed text-slate-600">
            Semua layanan bertumpu pada hal yang sama: kamu tetap penulis karyamu.
            Mentor membantu melewati bagian yang macet, bukan menggantikanmu
            mengerjakannya.
          </p>
        </div>
      </section>

      {/* ── Filter kategori ── */}
      <section className="sticky top-[57px] z-20 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl">
          <ul className="-mx-1 flex gap-2 overflow-x-auto pb-1">
            {KATEGORI.map((k) => {
              const ini = k === aktif;
              const jumlah =
                k === "Semua"
                  ? LAYANAN.length
                  : LAYANAN.filter((l) => l.kategori === k).length;
              return (
                <li key={k} className="shrink-0">
                  <Link
                    href={k === "Semua" ? "/layanan" : `/layanan?kategori=${encodeURIComponent(k)}`}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                      ini
                        ? "bg-brand text-white"
                        : "border border-slate-200 text-slate-600 hover:border-brand hover:text-brand"
                    }`}
                  >
                    {k}
                    <span className={ini ? "text-white/70" : "text-slate-400"}>
                      {jumlah}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── Katalog ── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        {tampil.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="font-semibold text-slate-900">
              Belum ada layanan di kategori ini
            </p>
            <Link href="/layanan" className="mt-2 inline-block text-sm font-bold text-brand hover:underline">
              Lihat semua layanan
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tampil.map((l) => (
              <article
                key={l.nama}
                className={`flex flex-col rounded-2xl border-2 p-6 transition-colors ${
                  l.utama
                    ? "border-brand bg-white shadow-card"
                    : "border-slate-200 bg-white hover:border-brand-200"
                }`}
              >
                {l.utama && (
                  <span className="mb-3 inline-block w-fit rounded-full bg-brand px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
                    Produk utama
                  </span>
                )}
                <span className="mb-2 inline-block w-fit rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand">
                  {l.kategori}
                </span>

                <h2 className="text-xl font-extrabold leading-snug text-slate-900">
                  {l.nama}
                </h2>
                <p className="mt-0.5 text-sm font-medium text-slate-500">{l.ringkas}</p>

                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {l.deskripsi}
                </p>

                <ul className="mt-4 flex-1 space-y-2">
                  {l.isi.map((i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" aria-hidden="true" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-3">
                    <span className="text-2xl font-extrabold text-brand">{l.harga}</span>{" "}
                    <span className="text-xs font-medium text-slate-500">{l.satuan}</span>
                  </p>
                  <Link
                    href={l.href}
                    className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                      l.utama
                        ? "bg-brand text-white hover:bg-brand-light"
                        : "border-2 border-brand text-brand hover:bg-brand-50"
                    }`}
                  >
                    {l.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── Catatan ── */}
      <section className="bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-2 font-extrabold text-slate-900">Yang tidak kami layani</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            Ruang Konsul tidak mengerjakan skripsi, tesis, atau disertasi untuk
            diserahkan atas namamu, dan tidak menyediakan jasa untuk meloloskan
            tulisan dari pemeriksaan kemiripan. Kalau itu yang kamu cari, kami
            bukan tempatnya.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Ada kebutuhan yang belum tercakup?{" "}
            <a
              href={waLink("Halo, saya ingin bertanya soal layanan Ruang Konsul.")}
              className="font-bold text-brand hover:underline"
            >
              Tanya lewat WhatsApp {BRAND.whatsappDisplay}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
