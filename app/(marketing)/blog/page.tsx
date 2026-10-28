import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Blog | ${BRAND.name}`,
  description: "Tips skripsi, cara cek plagiasi, panduan akademik, dan artikel seputar dunia mahasiswa Indonesia.",
};

const STATIC_ARTICLES = [
  { slug: "perbedaan-turnitin-repository-no-repository", title: "Perbedaan Turnitin Repository dan No Repository", excerpt: "Banyak mahasiswa bingung soal perbedaan Turnitin Repository vs No Repository.", cover: "/promo-bimbingan.jpeg", category: "Panduan Akademik", readTime: "5 menit", date: "10 Agustus 2026", author: `Tim ${BRAND.shortName}` },
  { slug: "apa-itu-cek-drillbit-pengertian-fungsi", title: "Apa Itu Cek DrillBit? Pengertian, Fungsi, dan Cara Kerjanya", excerpt: "DrillBit adalah platform deteksi plagiasi yang banyak digunakan universitas di Indonesia.", cover: "/promo-bundling.jpeg", category: "Panduan Layanan", readTime: "4 menit", date: "5 Agustus 2026", author: `Tim ${BRAND.shortName}` },
  { slug: "cara-membaca-laporan-turnitin-similarity", title: "Cara Membaca Laporan Turnitin agar Tidak Salah Menilai Plagiarisme", excerpt: "Persentase similarity di Turnitin tidak selalu berarti plagiat.", cover: "/promo-konsultasi.jpeg", category: "Tips Skripsi", readTime: "6 menit", date: "1 Agustus 2026", author: `Tim ${BRAND.shortName}` },
  { slug: "tips-menurunkan-plagiasi-skripsi", title: "7 Tips Efektif Menurunkan Persentase Plagiasi Skripsimu", excerpt: "Nilai similarity masih tinggi? Berikut 7 cara praktis yang bisa kamu lakukan sendiri.", cover: "/promo-parafrase.jpeg", category: "Tips Skripsi", readTime: "7 menit", date: "28 Juli 2026", author: `Tim ${BRAND.shortName}` },
  { slug: "ai-detector-tools-terbaik-mahasiswa", title: "Rekomendasi AI Detector Terbaik untuk Mahasiswa 2026", excerpt: "Kenali tool AI detector terbaik yang bisa mendeteksi teks buatan AI.", cover: "/promo-bimbingan.jpeg", category: "Teknologi", readTime: "5 menit", date: "22 Juli 2026", author: `Tim ${BRAND.shortName}` },
  { slug: "persiapan-sidang-skripsi-checklist", title: "Checklist Persiapan Sidang Skripsi yang Wajib Kamu Punya", excerpt: "Gunakan checklist lengkap ini untuk memastikan semua persiapanmu matang.", cover: "/promo-konsultasi.jpeg", category: "Tips Skripsi", readTime: "8 menit", date: "15 Juli 2026", author: `Tim ${BRAND.shortName}` },
];

const CATEGORIES = ["Semua", "Panduan Akademik", "Panduan Layanan", "Tips Skripsi", "Teknologi"];

async function getArticles(cat?: string) {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    let query = supabase
      .from("blog_posts")
      .select("slug, title, excerpt, cover_url, category, read_time, published_at, author")
      .eq("is_published", true)
      .order("published_at", { ascending: false });
    if (cat && cat !== "Semua") query = query.eq("category", cat);
    const { data } = await query;
    if (data && data.length > 0) {
      return data.map((a) => ({
        slug: a.slug, title: a.title, excerpt: a.excerpt ?? "",
        cover: a.cover_url ?? "/promo-bimbingan.jpeg",
        category: a.category, readTime: a.read_time,
        date: new Date(a.published_at ?? "").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
        author: a.author,
      }));
    }
  } catch { /* fallback */ }
  return cat && cat !== "Semua"
    ? STATIC_ARTICLES.filter((a) => a.category === cat)
    : STATIC_ARTICLES;
}

export default async function BlogPage({ searchParams }: { searchParams: { cat?: string } }) {
  const activeCat = searchParams.cat ?? "Semua";
  const articles = await getArticles(activeCat);
  const [featured, ...rest] = articles;

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src={BRAND.logoPng} alt={BRAND.name} width={28} height={28} unoptimized className="object-contain" />
            <span className="text-lg font-extrabold text-[#8B0000]">{BRAND.shortName}</span>
          </Link>
          <div className="hidden sm:flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link href="/layanan" className="hover:text-[#8B0000] transition-colors">Layanan</Link>
            <Link href="/blog" className="text-[#8B0000] font-semibold">Blog</Link>
            <Link href="/paket-hemat" className="hover:text-[#8B0000] transition-colors">Paket Hemat</Link>
            <Link href="/bimbingan" className="hover:text-[#8B0000] transition-colors">Bimbingan</Link>
          </div>
          <div className="flex gap-2">
            <Link href="/daftar" className="rounded-lg border-2 border-[#8B0000] px-3 py-1.5 text-sm font-semibold text-[#8B0000] hover:bg-brand-50 transition-colors">Daftar</Link>
            <Link href="/login" className="rounded-lg bg-[#8B0000] px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-light transition-colors">Login</Link>
          </div>
        </div>
      </nav>

      <section className="hero-gradient px-4 py-14 text-center">
        <div className="mx-auto max-w-xl">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="h-0.5 w-8 bg-[#8B0000] rounded-full" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#8B0000]">Blog</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Blog Kami</h1>
          <p className="text-slate-500">Tempat bagi-bagi ilmu untuk mahasiswa, tips tugas dan skripsi.</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-6 flex flex-wrap gap-2" role="group" aria-label="Filter kategori">
        {CATEGORIES.map((cat) => (
          <Link key={cat} href={`/blog?cat=${cat}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
              activeCat === cat
                ? "bg-[#8B0000] text-white border-[#8B0000] shadow-brand-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-[#8B0000] hover:text-[#8B0000]"
            }`}>
            {cat}
          </Link>
        ))}
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-20 space-y-10">
        {featured && (
          <Link href={`/blog/${featured.slug}`} className="group block">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-slate-200 shadow-card card-hover">
              <div className="relative aspect-[16/9] lg:aspect-auto">
                <Image src={featured.cover} alt={featured.title} fill className="object-cover object-top" sizes="50vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <span className="absolute top-4 left-4 rounded-full bg-[#8B0000] text-white text-xs font-bold px-3 py-1">{featured.category}</span>
              </div>
              <div className="flex flex-col justify-center p-8 bg-white">
                <h2 className="text-xl font-extrabold text-slate-900 group-hover:text-[#8B0000] transition-colors mb-3 leading-snug">{featured.title}</h2>
                <p className="text-sm text-slate-500 leading-relaxed mb-5">{featured.excerpt}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-5">
                  <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{featured.date}</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{featured.readTime}</span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B0000] group-hover:gap-2.5 transition-all">
                  Baca selengkapnya <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        )}

        {rest.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rest.map((article) => (
              <Link key={article.slug} href={`/blog/${article.slug}`}
                className="group flex flex-col rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-card card-hover">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image src={article.cover} alt={article.title} fill className="object-cover object-top group-hover:scale-105 transition-transform duration-500" sizes="33vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <span className="absolute bottom-3 left-3 rounded-full bg-[#8B0000] text-white text-[11px] font-bold px-2.5 py-0.5">{article.category}</span>
                </div>
                <div className="flex flex-col flex-1 p-5">
                  <h3 className="font-bold text-slate-900 text-sm leading-snug mb-2 group-hover:text-[#8B0000] transition-colors line-clamp-2">{article.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2 flex-1">{article.excerpt}</p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{article.date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{article.readTime}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {articles.length === 0 && (
          <div className="py-20 text-center text-muted-foreground">Belum ada artikel di kategori ini.</div>
        )}

        <div className="rounded-3xl bg-brand-gradient p-10 text-center shadow-brand">
          <h2 className="text-xl font-extrabold text-white mb-2">Siap cek dokumenmu? 🐦</h2>
          <p className="text-white/75 text-sm mb-5">Upload sekarang, laporan bisa kamu unduh dalam hitungan jam.</p>
          <Link href="/daftar" className="inline-flex items-center gap-2 rounded-xl bg-white text-[#8B0000] px-6 py-2.5 text-sm font-extrabold hover:bg-brand-50 transition-colors shadow-md">
            Cek Plagiasi Sekarang <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
