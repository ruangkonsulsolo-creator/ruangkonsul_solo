import Link from "next/link";
import Image from "next/image";
import {
  GraduationCap, ArrowRight, CheckCircle2, Star, ChevronDown,
  MapPin, Clock, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { HeroSlider } from "@/components/landing/HeroSlider";
import { ambilHeroSlides } from "@/lib/landing/hero-slides";
import { ambilMentorPublik } from "@/lib/mentor/publik";
import { ambilPaketPromo } from "@/lib/landing/paket-promo";
import { PaketPromoSlider } from "@/components/landing/PaketPromoSlider";
import { KartuMentor } from "@/components/mentor/KartuMentor";
import { HeroBackground } from "@/components/landing/HeroBackground";
import { BannerStrip } from "@/components/landing/BannerStrip";
import { LogoKampus } from "@/components/landing/LogoKampus";
import { KartuTool, TOOLS } from "@/components/landing/KartuTool";
import { KotakPeriksa } from "@/components/periksa/KotakPeriksa";
import { ambilTarifPeriksa } from "@/lib/periksa/tarif";
import { TestimoniWhatsApp } from "@/components/landing/TestimoniWhatsApp";
import { BRAND, waLink } from "@/lib/brand";
import type { Metadata } from "next";
import { NavbarUtama } from "@/components/ui/NavbarUtama";
import { ambilEtalase } from "@/lib/katalog/baca";
import { ETALASE } from "@/lib/katalog/tipe";
import { formatRupiah } from "@/lib/utils/format-currency";

export const metadata: Metadata = {
  title: `${BRAND.name} — Bimbingan Skripsi & Tesis Solo`,
  description:
    "Bimbingan skripsi dan tesis bersama mentor berpengalaman di Solo, Jogja, "
    + "Jakarta dan Bekasi. Pilih mentor, pesan jadwal, kerjakan tulisanmu sendiri "
    + "dengan arahan yang jelas.",
};

/* ─── data ──────────────────────────────────────────────────────────────────── */
// Paket bimbingan harian kini datang dari tabel produk (etalase
// bimbingan-online), disunting lewat panel admin. Daftar yang dulu
// ditulis di sini sudah dihapus supaya tidak ada dua sumber harga.


// Ganti dengan data mentor sungguhan. Foto menyusul — untuk sekarang
// dipakai inisial supaya tidak ada wajah palsu di situs.
// Taruh foto mentor di /public/mentor/ lalu isi `foto` dengan nama berkasnya,
// misal "/mentor/azarel.jpg". Kalau `foto` null, kartu memakai inisial.

// Promo berjalan. Atur tanggal berakhirnya supaya tidak basi di halaman.
const PROMO = [
  { judul: "Diskon 20% Sesi Pertama", syarat: "Untuk pendaftar baru, berlaku sekali",
    kode: "MULAI20", sampai: "30 November 2026" },
  { judul: "Paket Berdua Hemat 15%", syarat: "Daftar bersama satu teman seangkatan",
    kode: "BARENG15", sampai: "31 Desember 2026" },
  { judul: "Gratis 1 Sesi Revisi", syarat: "Pembelian paket bulanan pertama",
    kode: "REVISIFREE", sampai: "31 Desember 2026" },
];

const JASA = [
  "Jasa Revisi", "Jasa Jurnal", "Jasa Templating", "Jasa Publikasi",
  "Jasa Formatting", "Jasa PowerPoint", "Jasa Checking Proposal", "Jasa Statistik",
];

const TESTIMONIALS = [
  { name: "Rizky A.",    univ: "UNS",  text: "Bimbingan skripsinya sangat sabar dan detail. BAB 1-5 selesai 6 minggu, langsung ACC!",  init: "RA", star: 5 },
  { name: "Dita S.",     univ: "UGM",  text: "Rumusan masalahku diputar balik sampai akhirnya masuk akal. Proposal ACC sekali maju.", init: "DS", star: 5 },
  { name: "Budi W.",     univ: "ITS",  text: "Bimbingan SPSS beres 2 sesi, interpretasi BAB 4 jadi jauh lebih mudah dipahami.",        init: "BW", star: 5 },
];

const FAQS = [
  { q: "Satu sesi berapa lama?",                  a: "Enam puluh menit, daring atau tatap muka di Solo. Bisa diperpanjang kalau slot mentor berikutnya kosong." },
  { q: "Apakah bisa konsultasi dulu sebelum bayar?", a: "Bisa! Hubungi kami via WhatsApp untuk konsultasi gratis sebelum memutuskan layanan." },
  { q: "Apakah skripsi saya dikerjakan tim kalian?", a: "Tidak. Kamu yang menulis; mentor membantu menajamkan arah, metode, dan argumenmu. Kami tidak menerima pesanan naskah jadi." },
  { q: "Apakah draf saya aman?",                   a: "Draf hanya dibaca mentor yang menangani sesimu, disimpan di penyimpanan terenkripsi, dan tidak pernah dibagikan ke pihak lain." },
  { q: "Bagaimana cara booking bimbingan?",        a: "Daftar akun, pilih mentor, pilih slot jadwal, lakukan pembayaran — selesai." },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="h-0.5 w-8 bg-brand rounded-full" />
      <span className="text-xs font-bold uppercase tracking-widest text-brand">{children}</span>
    </div>
  );
}

/* ─── page ──────────────────────────────────────────────────────────────────── */

/** Data mentor berubah jarang; lima menit cukup segar tanpa membebani. */
export const revalidate = 300;

export default async function LandingPage() {
  const tarifPeriksa = await ambilTarifPeriksa();
  const [MENTOR, bimbingan, heroSlides, paketPromo] = await Promise.all([
    ambilMentorPublik({ limit: 8 }),
    ambilEtalase(ETALASE.bimbinganOnline),
    ambilHeroSlides(),
    ambilPaketPromo(),
  ]);
  const paketHarian = bimbingan.produk;
  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* ── WA Banner ── */}
      <div className="bg-brand text-white text-sm py-2.5 px-4 text-center flex flex-wrap items-center justify-center gap-3">
        <Image src={BRAND.iconWhatsapp} alt="WhatsApp" width={20} height={20} unoptimized className="rounded flex-shrink-0" />
        <span>Gabung saluran WhatsApp untuk update layanan, promo, dan info terbaru dari {BRAND.name}!</span>
        <a href={waLink("Halo, saya ingin info layanan Ruang Konsul Solo")} target="_blank" rel="noopener noreferrer"
          className="rounded-full border border-white/60 px-3 py-0.5 text-xs font-semibold hover:bg-white hover:text-brand transition-colors">
          Gabung Disini
        </a>
      </div>

      {/* ── Navbar ── */}
      <NavbarUtama />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden hero-gradient">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 lg:py-24 flex flex-col lg:flex-row items-center gap-12">

          {/* Kiri */}
          <div className="flex-1 text-center lg:text-left">
            <Badge variant="secondary" className="mb-5 text-xs px-3 py-1">
              🎓 Solo · Jogja · Jakarta · Bekasi
            </Badge>
            {/*
              Catatan: "no. 1 di Indonesia" adalah klaim superlatif. UU No. 8
              Tahun 1999 tentang Perlindungan Konsumen Pasal 9 ayat (1)
              melarang menyatakan suatu jasa sebagai yang nomor satu atau
              paling unggul tanpa bukti yang bisa dipertanggungjawabkan, dan
              Etika Pariwara Indonesia mengatur hal serupa. Pemilik sudah
              diberi tahu risikonya dan memutuskan memakainya. Siapkan bukti
              pendukung kalau suatu saat ditanya.
            */}
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold leading-[1.1] tracking-tight text-brand">
              Jasa Bimbingan Skripsi, Tesis &amp; Disertasi no. 1 di Indonesia
            </h1>

            <p className="mt-5 text-xl lg:text-2xl font-bold text-slate-900 max-w-xl mx-auto lg:mx-0 leading-snug">
              Dibimbing Mentor Berpengalaman sampai Paham dan Lulus Tepat Waktu.{" "}
              <span className="text-brand">No molor-molor!</span>
            </p>

            <p className="mt-3 text-base font-medium text-slate-600 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Pilih mentor sesuai bidangmu, pesan jadwal sendiri, dan selesaikan bab
              yang terkendala minggu ini. Mulai Rp50.000 per sesi.
            </p>

            {/* Stats */}
            <div className="mt-7 flex flex-wrap justify-center lg:justify-start gap-6 text-sm">
              {[
                // Ganti dengan angka sungguhan sebelum publish.
                { val: "10.000+", label: "Mahasiswa Dibimbing" },
                { val: "10+",     label: "Mentor Available" },
                { val: "4,9/5",   label: "Rata-rata Penilaian" },
              ].map((s, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-2xl font-extrabold text-brand">{s.val}</span>
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap justify-center lg:justify-start gap-3">
              <Button size="lg" asChild className="shadow-card gap-2">
                <Link href="/booking">Pesan Jadwal Bimbingan <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#mentor">Lihat Mentor</Link>
              </Button>
            </div>

            {/* Bukti sosial menggantikan baris emoji: logo kampus asal peserta
                lebih meyakinkan daripada tiga janji tanpa bukti. */}
            <div className="mt-7 flex justify-center lg:justify-start">
              <LogoKampus jumlahPeserta="10.000++" rating="4,9" />
            </div>
          </div>

          {/* Kanan — slider */}
          <HeroSlider slides={heroSlides} />
        </div>
      </section>

      {/* ── Banner strip (dikelola di /admin/banner bagian 2) ── */}
      <BannerStrip />

      {/* ── Paket Layanan (dikelola admin) ── */}
      {paketPromo.length > 0 && (
        <section id="paket" className="bg-gradient-to-b from-brand-50/60 to-white px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <SectionLabel>Paket Layanan</SectionLabel>
            <h2 className="mb-2 text-3xl font-extrabold text-slate-900 lg:text-4xl">Pilih bantuan yang kamu butuhkan</h2>
            <p className="mb-8 max-w-xl font-medium text-slate-600">
              Dari bimbingan per jam sampai cek naskah, harga jelas sejak awal.
            </p>
            <PaketPromoSlider paket={paketPromo} />
          </div>
        </section>
      )}

      {/* ── Layanan Tab Utama ── */}
      {/*
        Paket bimbingan harian, dibaca dari katalog (etalase bimbingan-online).
        Sebelumnya bagian ini berisi enam layanan dengan harga yang tidak
        pernah ada di daftar harga mana pun — Rp150.000 per sesi dan
        seterusnya. Sekarang yang tampil di sini sama persis dengan yang
        disunting admin di panel katalog.
      */}
      {paketHarian.length > 0 && (
        <section id="layanan" className="mx-auto max-w-6xl px-4 py-20">
          <SectionLabel>Bimbingan Online</SectionLabel>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-2">
            Bimbingan yang membuatmu<br className="hidden sm:block" /> sanggup menulisnya sendiri
          </h2>
          <p className="text-slate-600 font-medium max-w-xl mb-10">
            Privat per jam bersama mentor, tersedia untuk Skripsi, Tesis, dan
            Disertasi. Ambil hanya bagian yang sedang kamu butuhkan.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paketHarian.map((l, i) => {
              const unggulan = i === 0;
              return (
                <div
                  key={l.id}
                  className={`group relative flex flex-col rounded-2xl border p-6 card-hover transition-all ${
                    unggulan
                      ? "border-brand bg-brand text-white shadow-card"
                      : "border-slate-200 bg-white hover:border-brand-200"
                  }`}
                >
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl mb-4 ${unggulan ? "bg-white/20" : "bg-brand-50"}`}>
                    <GraduationCap className={`h-5 w-5 ${unggulan ? "text-white" : "text-brand"}`} aria-hidden="true" />
                  </div>
                  <h3 className={`text-lg font-bold mb-0.5 leading-snug ${unggulan ? "text-white" : "text-slate-900"}`}>
                    {l.nama}
                  </h3>
                  {l.subjudul && (
                    <p className={`text-sm mb-3 ${unggulan ? "text-white/80" : "text-slate-500"}`}>
                      {l.subjudul}
                    </p>
                  )}
                  <p className={`text-sm font-semibold mb-4 ${unggulan ? "text-white" : "text-brand"}`}>
                    {formatRupiah(l.harga)}
                    {l.satuan && (
                      <span className={`text-xs font-medium ${unggulan ? "text-white/75" : "text-slate-500"}`}>
                        {" "}{l.satuan}
                      </span>
                    )}
                  </p>
                  <ul className="mb-5 space-y-2">
                    {l.fitur.map((f) => (
                      <li key={f} className={`flex items-start gap-2 text-sm ${unggulan ? "text-white/90" : "text-slate-600"}`}>
                        <CheckCircle2 className={`h-4 w-4 flex-shrink-0 mt-0.5 ${unggulan ? "text-white/80" : "text-brand"}`} aria-hidden="true" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/produk/${l.slug}`}
                    className={`mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                      unggulan ? "bg-white text-brand hover:bg-brand-50" : "bg-brand text-white hover:bg-brand-light"
                    }`}
                  >
                    Selengkapnya <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Link
              href={`/etalase/${ETALASE.bimbinganBulanan}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              Mau sebulan penuh? Lihat paket bulanan <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      {/* ── Jasa Akademik ── */}
      <section className="bg-brand-50 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <SectionLabel>Jasa Akademik</SectionLabel>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-8">Semua Kebutuhan Akademik Tersedia</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {JASA.map((j) => (
              <Link key={j} href="/layanan" className="flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-brand hover:text-brand transition-colors card-hover">
                <CheckCircle2 className="h-4 w-4 text-brand flex-shrink-0" aria-hidden="true" />
                {j}
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/layanan" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
              Lihat semua layanan <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Perangkat yang dipakai ── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <SectionLabel>Perangkat</SectionLabel>
        <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-2">
          Mentor mengajarimu memakainya,<br className="hidden sm:block" /> bukan menjalankannya untukmu
        </h2>
        <p className="text-slate-600 font-medium max-w-xl mb-10">
          Keluar dari sesi, kamu bisa mengulang analisisnya sendiri. Itu yang menyelamatkanmu
          saat penguji bertanya &ldquo;ini bagaimana cara dapatnya?&rdquo;
        </p>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {TOOLS.map((tool) => (
            <KartuTool key={tool.slug} t={tool} />
          ))}
        </ul>
      </section>

      {/* ── Periksa naskah ── */}
      <section id="periksa" className="bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="h-0.5 w-8 rounded-full bg-brand" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand">
              AI Checking Proposal
            </span>
            <span className="h-0.5 w-8 rounded-full bg-brand" />
          </div>
          <h2 className="text-center text-2xl font-extrabold text-slate-900 lg:text-3xl">
            Cek tulisanmu sebelum diserahkan
          </h2>
          <p className="mx-auto mt-3 mb-10 max-w-2xl text-center font-medium text-slate-600">
            Tempel naskahmu, lihat bagian mana yang perlu sitasi atau perlu
            ditulis ulang dengan kalimatmu sendiri. Tujuannya memperbaiki cara
            mengutip — bukan mengakali pemeriksaan kampus.
          </p>

          <KotakPeriksa tarif={tarifPeriksa.tarif} aktif={tarifPeriksa.aktif} manual={tarifPeriksa.manual} minimum={tarifPeriksa.minimum} />
        </div>
      </section>

      {/* ── Mentor ── */}
      {MENTOR.length > 0 && (
      <section id="mentor" className="bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>Mentor Kami</SectionLabel>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-2">
            Yang akan duduk bersamamu
          </h2>
          <p className="text-slate-600 font-medium max-w-xl mb-10">
            Semua mentor pernah melewati proses yang sedang kamu jalani, dan terbiasa
            membaca draf yang belum rapi tanpa menghakimi.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {MENTOR.map((m) => (
              <KartuMentor key={m.id} m={m} aksi="booking" />
            ))}
          </div>
          <Link
            href="/mentor-kami"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
          >
            Lihat profil lengkap semua mentor <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
      )}

      {/* ── Promo ── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <SectionLabel>Promo Berjalan</SectionLabel>
        <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-10">
          Tunjukkan kodenya saat konfirmasi
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {PROMO.map((pr) => (
            <div key={pr.kode} className="relative overflow-hidden rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 p-6">
              <h3 className="text-lg font-extrabold text-slate-900">{pr.judul}</h3>
              <p className="mt-1 text-sm text-slate-600">{pr.syarat}</p>
              <div className="mt-4 inline-block rounded-lg border border-brand bg-white px-3 py-1.5">
                <span className="font-mono text-sm font-bold tracking-wider text-brand">{pr.kode}</span>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Sampai {pr.sampai}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bimbingan CTA ── */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <div className="rounded-3xl bg-brand overflow-hidden shadow-card">
          <div className="flex flex-col lg:flex-row items-center gap-8 p-8 lg:p-12">
            <div className="flex-1 text-center lg:text-left">
              <SectionLabel>Program Bimbingan</SectionLabel>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-white mb-3">
                Bimbingan Skripsi &amp; Tesis<br />Sampai ACC Sidang! 🎓
              </h2>
              <p className="text-white/80 leading-relaxed mb-5">
                Dibimbing step by step dari judul, BAB 1–5, analisis data, hingga simulasi
                sidang. Aktif Weekdays & Weekend.
              </p>
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <Button variant="dark" size="lg" asChild>
                  <Link href="/jadwal" className="gap-2">
                    Pilih Mentor &amp; Jadwal <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <a href={waLink("Halo, saya ingin konsultasi bimbingan skripsi")} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-white/60 text-white px-5 py-2.5 text-sm font-semibold hover:bg-white/10 transition-colors">
                  <MessageCircle className="h-4 w-4" /> Chat WhatsApp
                </a>
              </div>
            </div>
            <div className="flex-shrink-0 grid grid-cols-2 gap-3 text-center">
              {[
                { val: "500+", label: "Mahasiswa Dibimbing" },
                { val: "95%",  label: "Lulus Sidang" },
                { val: "4.9★", label: "Rating" },
                { val: "S1&S2", label: "Program" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-white/15 backdrop-blur-sm p-4">
                  <p className="text-2xl font-extrabold text-white">{s.val}</p>
                  <p className="text-xs text-white/70 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Cara Kerja ── */}
      <section className="bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-5xl text-center">
          <SectionLabel>Cara Kerja</SectionLabel>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 mb-3">
            Cuma 3 Langkah Mudah
          </h2>
          <p className="text-slate-600 font-medium max-w-xl mx-auto mb-12">
            Dari kirim kendala sampai selesai sesi, semuanya bisa kamu urus
            sendiri lewat dashboard.
          </p>

          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Garis penghubung antarlangkah, hanya di layar lebar. */}
            <div
              aria-hidden="true"
              className="hidden sm:block absolute top-11 left-[16.67%] right-[16.67%] h-0.5 bg-brand-200"
            />
            {[
              {
                num: "01", logo: "/alur/upload.png", title: "Kirim Kebutuhanmu",
                desc: "Pilih mentor dan jadwal, lalu ceritakan bab mana yang sedang macet. Bisa sekalian unggah drafmu.",
              },
              {
                num: "02", logo: "/alur/payment.png", title: "Bayar",
                desc: "Transfer bank, QRIS, atau e-wallet. Jadwalmu terkunci begitu pembayaran dikonfirmasi.",
              },
              {
                num: "03", logo: "/alur/result.png", title: "Sesi Bimbingan",
                desc: "Mentor mendampingi sesuai kebutuhanmu. Catatan dan tindak lanjut masuk ke dashboard, plus pengingat lewat WhatsApp.",
              },
            ].map((s) => (
              <div key={s.num} className="relative flex flex-col items-center text-center">
                <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-brand-100 bg-white p-4 shadow-card">
                  <Image
                    src={s.logo}
                    alt=""
                    width={160}
                    height={160}
                    className="h-14 w-14 object-contain"
                  />
                </div>
                <span className="mb-1 text-xs font-extrabold tracking-widest text-brand">
                  {s.num}
                </span>
                <h3 className="mb-2 text-lg font-extrabold text-slate-900">{s.title}</h3>
                <p className="max-w-xs text-sm leading-relaxed text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* ── Metode pembayaran ── */}
          <div className="mt-14 rounded-2xl border border-slate-200 bg-white px-6 py-7">
            <p className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-500">
              Metode Pembayaran
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
              {[
                { nama: "ShopeePay", file: "/bayar/shopeepay.png" },
                { nama: "GoPay",     file: "/bayar/gopay.png" },
                { nama: "OVO",       file: "/bayar/ovo.png" },
                { nama: "BCA",       file: "/bayar/bca.png" },
                { nama: "BRI",       file: "/bayar/bri.png" },
                { nama: "QRIS",      file: "/bayar/qris.png" },
              ].map((m) => (
                <li key={m.nama}>
                  <Image
                    src={m.file}
                    alt={m.nama}
                    width={160}
                    height={80}
                    className="h-7 w-auto object-contain"
                  />
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs font-medium text-slate-500">
              Pembayaran diproses lewat Midtrans. Kami tidak menyimpan data
              kartu atau rekeningmu.
            </p>
          </div>
        </div>
      </section>

      {/* ── Testimoni WhatsApp ── */}
      <TestimoniWhatsApp />

      {/* ── Testimoni ── */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <SectionLabel>Testimoni</SectionLabel>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-8">Kata Mereka yang Sudah Pakai</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl bg-white border border-slate-200 p-6 card-hover shadow-card">
              <div className="flex gap-0.5 mb-3" aria-label={`${t.star} bintang`}>
                {Array.from({ length: t.star }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                ))}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">{t.init}</div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.univ}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-2"><SectionLabel>FAQ</SectionLabel></div>
          <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-8">
            Pertanyaan Seputar Layanan Kami
          </h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-slate-800 list-none hover:bg-brand-50 transition-colors">
                  {f.q}
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400 group-open:rotate-180 transition-transform duration-200" aria-hidden="true" />
                </summary>
                <div className="border-t border-slate-100 px-5 py-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{f.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Kontak & Lokasi ── */}
      <section id="kontak" className="mx-auto max-w-5xl px-4 py-16">
        <SectionLabel>Kontak &amp; Lokasi</SectionLabel>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-8">Temukan Kami</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Info kontak — background putih, aksen merah */}
          <div className="space-y-3">

            {/* WhatsApp */}
            <a href={waLink()} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-card hover:border-brand hover:shadow-card transition-all group">
              <Image src={BRAND.iconWhatsapp} alt="WhatsApp" width={36} height={36} className="flex-shrink-0 rounded-xl" unoptimized />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">WhatsApp</p>
                <p className="text-base font-bold text-brand group-hover:underline">{BRAND.whatsappDisplay}</p>
              </div>
            </a>

            {/* Instagram */}
            <a href={BRAND.instagramUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-card hover:border-brand hover:shadow-card transition-all group">
              <Image src={BRAND.iconInstagram} alt="Instagram" width={36} height={36} className="flex-shrink-0 rounded-xl" unoptimized />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Instagram</p>
                <p className="text-base font-bold text-brand group-hover:underline">{BRAND.instagram}</p>
              </div>
            </a>

            {/* TikTok */}
            <a href={BRAND.tiktokUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-card hover:border-brand hover:shadow-card transition-all group">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-black overflow-hidden">
                <Image src={BRAND.iconTiktok} alt="TikTok" width={36} height={36} className="object-contain" unoptimized />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">TikTok</p>
                <p className="text-base font-bold text-brand group-hover:underline">{BRAND.tiktok}</p>
              </div>
            </a>

            {/* Gmail */}
            <a href={`mailto:${BRAND.email}`}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-card hover:border-brand hover:shadow-card transition-all group">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-50">
                {/* Gmail icon SVG */}
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                  <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fill="#fff" stroke="#e5e7eb" strokeWidth="1"/>
                  <path d="M2 6l10 7L22 6" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 6v12h20V6" fill="none"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gmail</p>
                <p className="text-base font-bold text-brand group-hover:underline truncate">{BRAND.email}</p>
              </div>
            </a>

            {/* Alamat */}
            <a href={BRAND.mapsUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-card hover:border-brand hover:shadow-card transition-all group">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50">
                <MapPin className="h-5 w-5 text-brand" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alamat</p>
                <p className="text-sm font-medium text-slate-700 group-hover:text-brand leading-snug">{BRAND.address}</p>
              </div>
            </a>

            {/* Jam operasional */}
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-card">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50">
                <Clock className="h-5 w-5 text-brand" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Jam Operasional</p>
                <p className="text-sm font-medium text-slate-700">Senin–Minggu, 09.00–21.00 WIB</p>
              </div>
            </div>
          </div>

          {/* Google Maps embed — link share resmi */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-card" style={{ minHeight: "360px" }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3955.5!2d110.8588!3d-7.5377!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zSmwuIFNpYmVsYSBCYXJhdCBObyAyMSBNb2pvc29uZ28gSmVicmVzIFN1cmFrYXJ0YQ!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: "360px" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Lokasi Ruang Konsul Solo"
            />
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="px-4 py-8 mb-0">
        <div className="mx-auto max-w-4xl rounded-3xl bg-brand p-10 lg:p-14 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-card">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white mb-2">Mulai dari satu sesi</h2>
            <p className="text-white/75 text-sm">Pilih mentor dan jam yang cocok. Tidak ada pembayaran sebelum jadwalmu dikonfirmasi.</p>
          </div>
          <Button variant="dark" size="lg" asChild className="flex-shrink-0">
            <Link href="/booking" className="gap-2">
              Lihat jadwal mentor <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Footer — putih, teks merah/gelap ── */}
      <footer className="border-t border-slate-100 bg-white px-4 pt-14 pb-8">
        <div className="mx-auto max-w-6xl">

          {/* Row atas — 4 kolom */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 pb-10 border-b border-slate-100">

            {/* Kolom 1 — Brand + call center */}
            <div className="col-span-2 lg:col-span-1">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <Image src={BRAND.logoPng} alt={BRAND.name} width={38} height={38} unoptimized className="object-contain flex-shrink-0" />
                <div className="flex flex-col leading-tight">
                  <span className="text-base font-extrabold text-brand">{BRAND.name}</span>
                  <span className="text-[10px] font-medium text-slate-400">{BRAND.taglineShort}</span>
                </div>
              </Link>

              <p className="text-xs text-slate-500 leading-relaxed mb-5">{BRAND.tagline}</p>

              {/* Call center / Hubungi bantuan */}
              <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3.5 space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Hubungi Bantuan</p>
                <a href={waLink("Halo, saya butuh bantuan")} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 group">
                  <Image src={BRAND.iconWhatsapp} alt="WA" width={24} height={24} unoptimized className="rounded-lg flex-shrink-0" />
                  <span className="text-sm font-bold text-brand group-hover:underline">{BRAND.whatsappDisplay}</span>
                </a>
                <a href={`mailto:${BRAND.email}`}
                  className="flex items-center gap-2.5 group">
                  <div className="h-6 w-6 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none">
                      <rect x="1" y="3" width="18" height="14" rx="2" stroke="#EA4335" strokeWidth="1.5"/>
                      <path d="M1 6l9 6 9-6" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-brand truncate">{BRAND.email}</span>
                </a>
              </div>
            </div>

            {/* Kolom 2 — Navigasi */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand mb-4">Navigasi</p>
              <ul className="space-y-2.5">
                {[
                  { label: "Beranda",     href: "/" },
                  { label: "Layanan",     href: "/layanan" },
                  { label: "Bimbingan",   href: "/jadwal" },
                { label: "Paket Bimbingan", href: "/bimbingan" },
                  { label: "Paket Hemat", href: "/paket-hemat" },
                  { label: "Blog",        href: "/blog" },
                  { label: "Referral",    href: "/referral" },
                  { label: "Cek Pesanan", href: "/dashboard/riwayat-pesanan" },
                ].map((m) => (
                  <li key={m.label}>
                    <Link href={m.href}
                      className="text-sm text-slate-600 hover:text-brand hover:font-semibold transition-all flex items-center gap-1.5 group">
                      <span className="h-1 w-1 rounded-full bg-brand-100 group-hover:bg-brand transition-colors" />
                      {m.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kolom 3 — Produk & Fitur */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand mb-4">Produk &amp; Fitur</p>
              <ul className="space-y-2.5">
                {[
                  { label: "Jasa Revisi",         href: "/layanan" },
                  { label: "Jasa PowerPoint",     href: "/layanan" },
                  { label: "Bimbingan Skripsi",   href: "/jadwal" },
                  { label: "Bimbingan Tesis",     href: "/jadwal" },
                  { label: "Bimbingan Lomba",     href: "/jadwal" },
                  { label: "Bimbingan Olah Data", href: "/jadwal" },
                  { label: "Merchandise",         href: "/merchandise" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href}
                      className="text-sm text-slate-600 hover:text-brand hover:font-semibold transition-all flex items-center gap-1.5 group">
                      <span className="h-1 w-1 rounded-full bg-brand-100 group-hover:bg-brand transition-colors" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kolom 4 — Informasi + Lokasi */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand mb-4">Informasi</p>
              <ul className="space-y-2.5 mb-5">
                {[
                  { label: "Syarat & Ketentuan",  href: "/syarat" },
                  { label: "Kebijakan Refund",     href: "/kebijakan-refund" },
                  { label: "Kebijakan Privasi",    href: "/kebijakan-privasi" },
                  { label: "Kontak",               href: "/kontak" },
                  { label: "Daftar Akun",          href: "/daftar" },
                  { label: "Masuk / Login",        href: "/login" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href}
                      className="text-sm text-slate-600 hover:text-brand hover:font-semibold transition-all flex items-center gap-1.5 group">
                      <span className="h-1 w-1 rounded-full bg-brand-100 group-hover:bg-brand transition-colors" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Alamat */}
              <a href={BRAND.mapsUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-2 text-xs text-slate-500 hover:text-brand transition-colors leading-relaxed group">
                <MapPin className="h-3.5 w-3.5 text-brand flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{BRAND.address}</span>
              </a>
            </div>
          </div>

          {/* Row bawah — copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6">
            <p className="text-xs text-slate-400">
              © {BRAND.year} <span className="font-semibold text-brand">{BRAND.name}</span>. Semua hak dilindungi.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-400">
              <Link href="/syarat" className="hover:text-brand transition-colors">Syarat &amp; Ketentuan</Link>
              <Link href="/kebijakan-refund" className="hover:text-brand transition-colors">Kebijakan Refund</Link>
              <Link href="/kebijakan-privasi" className="hover:text-brand transition-colors">Kebijakan Privasi</Link>
              <Link href="/kontak" className="hover:text-brand transition-colors">Kontak</Link>
            </div>
          </div>
        </div>
      </footer>
      {/* ── WA Float ── */}
      <a href={waLink()} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition-all hover:scale-110"
        aria-label="Hubungi via WhatsApp">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </div>
  );
}
