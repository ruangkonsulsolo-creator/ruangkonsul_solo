import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, CalendarDays, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { NavSubBrand } from "@/components/landing/NavSubBrand";
import { BRAND, waLink } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Panduan menyusun skripsi, memilih metode penelitian, mengolah data, " +
    "dan menghadapi sidang — ditulis mentor Ruang Konsul Solo.",
};

export const dynamic = "force-dynamic";

type Artikel = {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  category: string;
  readTime: string;
  date: string;
  author: string;
};

/**
 * Artikel cadangan saat tabel blog_posts masih kosong.
 *
 * Isi sebelumnya seluruhnya tentang Turnitin, plagiasi, dan AI detector —
 * layanan yang sudah dihapus dari situs. Artikel yang mengarah ke layanan
 * yang tidak ada akan membawa pengunjung ke jalan buntu, jadi topiknya
 * diganti ke bimbingan.
 */
const ARTIKEL_CADANGAN: Artikel[] = [
  {
    slug: "menyusun-rumusan-masalah-yang-tidak-ditolak",
    title: "Menyusun Rumusan Masalah yang Tidak Ditolak Pembimbing",
    excerpt:
      "Kebanyakan proposal ditolak bukan karena topiknya buruk, tapi karena rumusan masalahnya belum menunjukkan ada yang benar-benar perlu dijawab.",
    cover: "/promo-konsultasi.jpeg",
    category: "Metodologi",
    readTime: "7 menit",
    date: "20 Oktober 2026",
    author: `Tim ${BRAND.shortName}`,
  },
  {
    slug: "memilih-uji-statistik-sesuai-data",
    title: "Memilih Uji Statistik yang Sesuai dengan Datamu",
    excerpt:
      "Pohon keputusan sederhana: dari jenis variabel dan jumlah kelompok, sampai ke uji yang tepat — lengkap dengan syarat yang sering terlewat.",
    cover: "/promo-bimbingan.jpeg",
    category: "Olah Data",
    readTime: "9 menit",
    date: "14 Oktober 2026",
    author: `Tim ${BRAND.shortName}`,
  },
  {
    slug: "menerjemahkan-catatan-dosen-pembimbing",
    title: "Menerjemahkan Catatan Dosen Pembimbing Jadi Langkah Konkret",
    excerpt:
      "“Perdalam lagi” dan “kurang tajam” sebenarnya menunjuk masalah yang spesifik. Begini cara membacanya.",
    cover: "/promo-bundling.jpeg",
    category: "Bimbingan",
    readTime: "6 menit",
    date: "7 Oktober 2026",
    author: `Tim ${BRAND.shortName}`,
  },
  {
    slug: "menghindari-jurnal-predator",
    title: "Cara Mengenali Jurnal Predator Sebelum Naskahmu Terlanjur Masuk",
    excerpt:
      "Biaya publikasi murah dan janji terbit seminggu adalah tanda bahaya. Ini daftar periksa sebelum submit.",
    cover: "/promo-konsultasi.jpeg",
    category: "Publikasi",
    readTime: "8 menit",
    date: "29 September 2026",
    author: `Tim ${BRAND.shortName}`,
  },
  {
    slug: "menyiapkan-diri-menghadapi-sidang",
    title: "Menyiapkan Diri Menghadapi Sidang: Pertanyaan yang Hampir Pasti Muncul",
    excerpt:
      "Penguji jarang menanyakan hal yang tidak terduga. Sembilan pertanyaan ini muncul di hampir semua sidang.",
    cover: "/promo-bimbingan.jpeg",
    category: "Sidang",
    readTime: "10 menit",
    date: "21 September 2026",
    author: `Tim ${BRAND.shortName}`,
  },
  {
    slug: "mengutip-dengan-benar",
    title: "Mengutip dengan Benar: Parafrase, Kutipan Langsung, dan Sitasi",
    excerpt:
      "Kemiripan tinggi biasanya berakar di cara mengutip, bukan di pilihan kata. Ini bedanya dan kapan memakai yang mana.",
    cover: "/promo-parafrase.jpeg",
    category: "Penulisan",
    readTime: "7 menit",
    date: "12 September 2026",
    author: `Tim ${BRAND.shortName}`,
  },
];

const KATEGORI = [
  "Semua",
  "Metodologi",
  "Olah Data",
  "Bimbingan",
  "Publikasi",
  "Sidang",
  "Penulisan",
];

async function ambilArtikel(kategori?: string): Promise<Artikel[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    let query = supabase
      .from("blog_posts")
      .select(
        "slug, title, excerpt, cover_url, category, read_time, published_at, author"
      )
      .eq("is_published", true)
      .order("published_at", { ascending: false });
    if (kategori && kategori !== "Semua") query = query.eq("category", kategori);

    const { data, error } = await query;
    if (error) console.error("[blog] gagal memuat artikel:", error.message);

    if (data && data.length > 0) {
      return data.map((a) => ({
        slug: a.slug,
        title: a.title,
        excerpt: a.excerpt ?? "",
        cover: a.cover_url ?? "/promo-bimbingan.jpeg",
        category: a.category,
        readTime: a.read_time,
        date: new Date(a.published_at ?? "").toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        author: a.author,
      }));
    }
  } catch (e) {
    console.error("[blog]", e);
  }

  // Tabel kosong atau tidak terjangkau: pakai artikel cadangan.
  return kategori && kategori !== "Semua"
    ? ARTIKEL_CADANGAN.filter((a) => a.category === kategori)
    : ARTIKEL_CADANGAN;
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { kategori?: string };
}) {
  const kategoriAktif = searchParams.kategori ?? "Semua";
  const artikel = await ambilArtikel(kategoriAktif);
  const [utama, ...sisanya] = artikel;

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo href="/" size="sm" />
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <Link href="/layanan" className="transition-colors hover:text-brand">Layanan</Link>
            <Link href="/jadwal" className="transition-colors hover:text-brand">Jadwal</Link>
            <Link href="/paket-hemat" className="transition-colors hover:text-brand">Paket Langganan</Link>
            <Link href="/event" className="transition-colors hover:text-brand">Event</Link>
            <Link href="/blog" className="font-semibold text-brand">Blog</Link>
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
              Blog
            </span>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight text-slate-900 lg:text-5xl">
            Panduan menyusun penelitian,{" "}
            <span className="text-brand">ditulis mentor kami</span>
          </h1>
          <p className="mt-3 max-w-xl leading-relaxed text-slate-600">
            Dari merumuskan masalah sampai menghadapi penguji. Semuanya bisa
            kamu kerjakan sendiri — artikel ini menunjukkan caranya.
          </p>

          <div className="mt-8 max-w-3xl">
            <NavSubBrand aktif="news" />
          </div>
        </div>
      </section>

      {/* ── Kategori ── */}
      <section className="border-b border-slate-100 px-4 py-4">
        <div className="mx-auto max-w-6xl">
          <ul className="-mx-1 flex gap-2 overflow-x-auto pb-1">
            {KATEGORI.map((k) => {
              const aktif = k === kategoriAktif;
              return (
                <li key={k} className="shrink-0">
                  <Link
                    href={k === "Semua" ? "/blog" : `/blog?kategori=${encodeURIComponent(k)}`}
                    className={`inline-block rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                      aktif
                        ? "bg-brand text-white"
                        : "border border-slate-200 text-slate-600 hover:border-brand hover:text-brand"
                    }`}
                  >
                    {k}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {artikel.length === 0 ? (
        <section className="mx-auto max-w-2xl px-4 py-24 text-center">
          <Search className="mx-auto mb-3 h-10 w-10 text-slate-300" aria-hidden="true" />
          <h2 className="mb-2 text-xl font-extrabold text-slate-900">
            Belum ada artikel di kategori ini
          </h2>
          <p className="mb-5 text-sm text-slate-500">
            Coba kategori lain, atau lihat semua artikel.
          </p>
          <Button asChild><Link href="/blog">Lihat semua artikel</Link></Button>
        </section>
      ) : (
        <>
          {/* ── Artikel utama ── */}
          <section className="mx-auto max-w-6xl px-4 py-12">
            <Link
              href={`/blog/${utama.slug}`}
              className="group grid grid-cols-1 gap-6 overflow-hidden rounded-2xl border border-slate-200 transition-colors hover:border-brand lg:grid-cols-2"
            >
              <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[320px]">
                <Image
                  src={utama.cover}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col justify-center p-6 lg:p-8">
                <span className="mb-3 inline-block w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand">
                  {utama.category}
                </span>
                <h2 className="text-2xl font-extrabold leading-snug text-slate-900 group-hover:text-brand lg:text-3xl">
                  {utama.title}
                </h2>
                <p className="mt-3 leading-relaxed text-slate-600">
                  {utama.excerpt}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {utama.date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {utama.readTime}
                  </span>
                  <span>{utama.author}</span>
                </div>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand">
                  Baca selengkapnya{" "}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </div>
            </Link>
          </section>

          {/* ── Artikel lain ── */}
          {sisanya.length > 0 && (
            <section className="mx-auto max-w-6xl px-4 pb-20">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {sisanya.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/blog/${a.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 transition-colors hover:border-brand"
                  >
                    <div className="relative aspect-[16/10]">
                      <Image
                        src={a.cover}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-brand backdrop-blur-sm">
                        {a.category}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-extrabold leading-snug text-slate-900 group-hover:text-brand">
                        {a.title}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">
                        {a.excerpt}
                      </p>
                      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" aria-hidden="true" />
                          {a.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {a.readTime}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── CTA ── */}
      <section className="px-4 pb-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-5 rounded-3xl bg-brand p-10 shadow-card sm:flex-row">
          <div className="text-center sm:text-left">
            <h2 className="mb-1.5 text-2xl font-extrabold text-white">
              Masih buntu setelah membaca?
            </h2>
            <p className="text-sm text-white/75">
              Bawa draf dan kendalamu ke satu sesi bimbingan.
            </p>
          </div>
          <Button variant="dark" size="lg" asChild className="flex-shrink-0">
            <Link href="/booking" className="gap-2">
              Pesan jadwal <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
