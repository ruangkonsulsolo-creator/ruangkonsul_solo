"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays, Clock, Users, ArrowRight, CheckCircle2,
  Star, BookOpen, GraduationCap, Trophy, BarChart2,
  Sparkles, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BRAND, waLink } from "@/lib/brand";

const TABS = [
  { id: "semua",   label: "Semua" },
  { id: "seminar", label: "Seminar Gratis" },
  { id: "skripsi", label: "Skripsi & Thesis" },
  { id: "lomba",   label: "Lomba" },
  { id: "data",    label: "Olah Data" },
];

const STATIC_CLASSES = [
  { id: "seminar-1", tab: "seminar", tag: "GRATIS", tag_color: "bg-[#8B0000] text-white", title: "Seminar Online: Tips Lolos Sidang Skripsi", subtitle: `by ${BRAND.name}`, description: "Seminar intensif 3 jam bersama mentor berpengalaman. Pelajari strategi lolos sidang, cara menurunkan plagiasi, dan persiapan mental.", image_url: null, harga: 0, harga_coret: null, diskon_pct: null, jadwal: "Setiap bulan", durasi: "3 jam", peserta: "Terbuka umum", fitur: ["Materi eksklusif mentor", "Sesi tanya jawab live", "Rekaman acara", "Sertifikat digital"], cta_label: "Daftar Gratis", wa_message: `Halo%20${encodeURIComponent(BRAND.shortName)}%2C%20saya%20ingin%20daftar%20seminar%20gratis`, require_login: false, badge: "Populer", badge_color: "bg-amber-500 text-white", rating: 4.9, review_count: 120, is_active: true },
  { id: "skripsi-weekdays", tab: "skripsi", tag: "WEEKDAYS", tag_color: "bg-[#8B0000] text-white", title: "Bimbingan Skripsi & Thesis — Paket Weekdays", subtitle: "Pendampingan BAB 1–5 sampai ACC Sidang", description: "Bimbingan intensif step by step dari judul, BAB 1–5, analisis data, hingga simulasi sidang. Aktif Senin–Jumat.", image_url: "/promo-bimbingan.jpeg", harga: 3750000, harga_coret: 7500000, diskon_pct: 50, jadwal: "Senin–Jumat", durasi: "1–3 bulan", peserta: "Maks. 5 orang / mentor", fitur: ["Pendampingan judul + 5 literatur","Bimbingan BAB 1–3","Bimbingan BAB 4–5","8–20× Zoom","WA Coaching 09.00–20.30","Unlimited Revisi","Cek Turnitin 3×","PPTx Sidang + Script"], cta_label: "Daftar Sekarang", wa_message: `Halo%20${encodeURIComponent(BRAND.shortName)}%2C%20saya%20ingin%20bimbingan%20skripsi%20weekdays`, require_login: true, badge: "Best Seller", badge_color: "bg-[#8B0000] text-white", rating: 4.9, review_count: 234, is_active: true },
  { id: "skripsi-weekend", tab: "skripsi", tag: "WEEKEND", tag_color: "bg-slate-700 text-white", title: "Bimbingan Skripsi & Thesis — Paket Weekend", subtitle: "Pendampingan BAB 1–5 sampai ACC Sidang", description: "Sama lengkapnya dengan paket Weekdays namun sesi bimbingan aktif di akhir pekan (Sabtu–Minggu).", image_url: "/promo-bimbingan.jpeg", harga: 4499000, harga_coret: null, diskon_pct: null, jadwal: "Sabtu–Minggu", durasi: "1–3 bulan", peserta: "Maks. 5 orang / mentor", fitur: ["Semua fitur Paket Weekdays","Rekaman Zoom setiap sesi","Cek Turnitin 3×","PPTx Sidang + Script"], cta_label: "Daftar Sekarang", wa_message: `Halo%20${encodeURIComponent(BRAND.shortName)}%2C%20saya%20ingin%20bimbingan%20skripsi%20weekend`, require_login: true, badge: null, badge_color: "", rating: 4.8, review_count: 156, is_active: true },
  { id: "lomba-bpc", tab: "lomba", tag: "KOMPETISI", tag_color: "bg-amber-600 text-white", title: "Bimbingan Lomba BPC & BCC", subtitle: "Business Plan & Business Case Competition", description: "Bimbingan intensif untuk memenangkan lomba BPC dan BCC. Dibimbing mentor berpengalaman juara kompetisi bisnis.", image_url: null, harga: 1500000, harga_coret: null, diskon_pct: null, jadwal: "Sesuai timeline lomba", durasi: "2–6 minggu", peserta: "Tim 2–5 mahasiswa", fitur: ["Analisis brief dan strategi","Penyusunan business plan","Review feedback intensif","Latihan presentasi & pitch"], cta_label: "Daftar Bimbingan", wa_message: `Halo%20${encodeURIComponent(BRAND.shortName)}%2C%20saya%20ingin%20bimbingan%20BPC`, require_login: true, badge: null, badge_color: "", rating: 4.9, review_count: 67, is_active: true },
  { id: "lomba-kti", tab: "lomba", tag: "AKADEMIK", tag_color: "bg-[#8B0000] text-white", title: "Bimbingan Lomba KTI, Essay & Paper", subtitle: "Karya Tulis Ilmiah · Essay Kompetisi · Paper Jurnal", description: "Bimbingan untuk lomba KTI, essay kompetisi, dan penulisan paper. Dari pemilihan topik hingga presentasi oral.", image_url: null, harga: 999000, harga_coret: null, diskon_pct: null, jadwal: "Sesuai deadline lomba", durasi: "1–4 minggu", peserta: "Individu atau Tim", fitur: ["Konsultasi topik dan outline","Bimbingan penulisan per bab","Review tata bahasa","Cek plagiasi + Turnitin","Persiapan presentasi"], cta_label: "Daftar Bimbingan", wa_message: `Halo%20${encodeURIComponent(BRAND.shortName)}%2C%20saya%20ingin%20bimbingan%20KTI`, require_login: true, badge: null, badge_color: "", rating: 4.8, review_count: 45, is_active: true },
  { id: "data-spss", tab: "data", tag: "TEKNIS", tag_color: "bg-[#8B0000] text-white", title: "Bimbingan SPSS & SmartPLS", subtitle: "Analisis Statistik untuk Skripsi & Tesis", description: "Kuasai SPSS dan SmartPLS untuk analisis regresi, SEM, path analysis. Interpretasi hasil dan penulisan BAB 4 termasuk.", image_url: null, harga: 750000, harga_coret: null, diskon_pct: null, jadwal: "Fleksibel", durasi: "2–4 sesi (2 jam/sesi)", peserta: "Individu", fitur: ["SPSS: uji asumsi, regresi, korelasi","SmartPLS: SEM & path analysis","Interpretasi output","Penulisan BAB 4 & 5","Recording sesi"], cta_label: "Daftar Bimbingan", wa_message: `Halo%20${encodeURIComponent(BRAND.shortName)}%2C%20saya%20ingin%20bimbingan%20SPSS`, require_login: true, badge: "Terlaris", badge_color: "bg-[#8B0000] text-white", rating: 4.9, review_count: 112, is_active: true },
  { id: "data-python", tab: "data", tag: "TEKNIS", tag_color: "bg-[#8B0000] text-white", title: "Bimbingan Python & R Studio", subtitle: "Data Processing, Visualisasi & Machine Learning", description: "Bimbingan penggunaan Python dan R untuk penelitian akademik, analisis data lanjutan, dan visualisasi ilmiah.", image_url: null, harga: 850000, harga_coret: null, diskon_pct: null, jadwal: "Fleksibel", durasi: "2–6 sesi (2 jam/sesi)", peserta: "Individu", fitur: ["Python: pandas, numpy, matplotlib","R Studio: ggplot2, dplyr","Analisis data skripsi","Visualisasi & interpretasi","Recording sesi"], cta_label: "Daftar Bimbingan", wa_message: `Halo%20${encodeURIComponent(BRAND.shortName)}%2C%20saya%20ingin%20bimbingan%20Python`, require_login: true, badge: null, badge_color: "", rating: 4.7, review_count: 78, is_active: true },
];

type KelasItem = typeof STATIC_CLASSES[0];

function fmt(n: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n); }

function ClassCard({ cls }: { cls: KelasItem }) {
  const iconMap: Record<string, React.ElementType> = { seminar: Sparkles, skripsi: BookOpen, lomba: Trophy, data: BarChart2 };
  const Icon = iconMap[cls.tab] ?? GraduationCap;
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden card-hover group">
      <div className="relative aspect-[16/9] bg-gradient-to-br from-brand-50 to-brand-100 overflow-hidden">
        {cls.image_url ? (
          <Image src={cls.image_url} alt={cls.title} fill className="object-cover object-top group-hover:scale-105 transition-transform duration-500" sizes="33vw" />
        ) : (
          <div className="flex h-full items-center justify-center"><Icon className="h-16 w-16 text-brand-200" /></div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={`rounded-md px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${cls.tag_color}`}>{cls.tag}</span>
          {cls.badge && <span className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${cls.badge_color}`}>{cls.badge}</span>}
        </div>
        {cls.diskon_pct && <div className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white text-xs font-extrabold shadow">-{cls.diskon_pct}%</div>}
      </div>
      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-extrabold text-slate-900 text-base leading-snug mb-0.5 group-hover:text-[#8B0000] transition-colors">{cls.title}</h3>
        <p className="text-xs text-muted-foreground mb-3">{cls.subtitle}</p>
        <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1 line-clamp-3">{cls.description}</p>
        <ul className="space-y-1 mb-4">
          {cls.fitur.slice(0, 3).map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs text-slate-600"><CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-[#8B0000]" />{f}</li>
          ))}
          {cls.fitur.length > 3 && <li className="text-xs text-[#8B0000] font-medium pl-5">+{cls.fitur.length - 3} fitur lainnya</li>}
        </ul>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mb-4 border-t border-slate-100 pt-3">
          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3 text-[#8B0000]" />{cls.jadwal}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-[#8B0000]" />{cls.durasi}</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3 text-[#8B0000]" />{cls.peserta}</span>
        </div>
        <div className="flex items-center gap-1.5 mb-4 text-xs">
          <div className="flex gap-0.5">{[1,2,3,4,5].map((i) => <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(cls.rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />)}</div>
          <span className="font-bold text-slate-700">{cls.rating}</span>
          <span className="text-muted-foreground">({cls.review_count} ulasan)</span>
        </div>
        <div className="mb-4">
          {cls.harga === 0 ? <p className="text-2xl font-extrabold text-[#8B0000]">GRATIS</p> : (
            <div>
              {cls.harga_coret && <p className="text-sm text-slate-400 line-through">{fmt(cls.harga_coret)}</p>}
              <p className="text-2xl font-extrabold text-[#8B0000]">{fmt(cls.harga)}</p>
            </div>
          )}
        </div>
        <a
          href={cls.require_login ? `/daftar?next=/bimbingan` : `https://wa.me/${BRAND.whatsapp}?text=${cls.wa_message}`}
          target={cls.require_login ? undefined : "_blank"}
          rel={cls.require_login ? undefined : "noopener noreferrer"}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B0000] text-white text-sm font-extrabold px-4 py-2.5 hover:bg-brand-light transition-colors shadow-brand-sm"
        >
          {cls.cta_label} <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

export default function BimbinganPage() {
  const [activeTab, setActiveTab] = useState("semua");
  const [classes, setClasses] = useState<KelasItem[]>(STATIC_CLASSES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/kelas-bimbingan")
      .then((r) => r.json())
      .then((json) => { if (json.data?.length > 0) setClasses(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = (activeTab === "semua" ? classes : classes.filter((c) => c.tab === activeTab)).filter((c) => c.is_active);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src={BRAND.logoPng} alt={BRAND.name} width={28} height={28} unoptimized className="object-contain" />
            <span className="text-lg font-extrabold text-[#8B0000]">{BRAND.shortName}</span>
          </Link>
          <div className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link href="/layanan"    className="hover:text-[#8B0000] transition-colors">Layanan</Link>
            <Link href="/blog"       className="hover:text-[#8B0000] transition-colors">Blog</Link>
            <Link href="/paket-hemat" className="hover:text-[#8B0000] transition-colors">Paket Hemat</Link>
            <Link href="/bimbingan" className="text-[#8B0000] font-bold border-b-2 border-[#8B0000] pb-0.5">Bimbingan</Link>
            <Link href="/referral"   className="hover:text-[#8B0000] transition-colors">Referral</Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild><Link href="/daftar">Daftar</Link></Button>
            <Button size="sm" asChild><Link href="/login">Login</Link></Button>
          </div>
        </div>
      </nav>

      {/* Promo banner */}
      <div className="bg-[#8B0000] text-white text-sm py-2.5 px-4 text-center font-medium flex flex-wrap items-center justify-center gap-3">
        <span>🎓 Konsultasi awal <strong>GRATIS!</strong> Hubungi kami sekarang</span>
        <a href={waLink("Halo, saya ingin konsultasi program bimbingan")} target="_blank" rel="noopener noreferrer"
          className="rounded-full border border-white/60 px-3 py-0.5 text-xs font-bold hover:bg-white hover:text-[#8B0000] transition-colors">
          Chat WhatsApp →
        </a>
      </div>

      {/* Hero */}
      <section className="hero-gradient px-4 py-14">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-4">by {BRAND.name}</Badge>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-3">
            Program <span className="text-[#8B0000]">Bimbingan</span> Akademik &amp; Kompetisi
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto leading-relaxed">
            Bimbingan intensif dari mentor berpengalaman. Skripsi, lomba, dan olah data — semua tersedia di sini.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-8">
            {[{ val: "500+", label: "Mahasiswa Dibimbing" }, { val: "50+", label: "Kampus" }, { val: "95%", label: "Lulus Sidang" }, { val: "4.9★", label: "Rating" }].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-extrabold text-[#8B0000]">{s.val}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="sticky top-14 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex gap-0 overflow-x-auto" role="tablist">
            {TABS.map((tab) => (
              <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-5 py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? "border-[#8B0000] text-[#8B0000]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
                <div className="aspect-[16/9] bg-slate-100" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-10 bg-slate-100 rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">Tidak ada kelas di kategori ini.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((cls) => <ClassCard key={cls.id} cls={cls} />)}
          </div>
        )}
      </section>

      {/* Testimoni */}
      <section className="bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-xl font-extrabold text-slate-900 text-center mb-6">Kata Mereka yang Sudah Dibimbing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { n: "Rizky A.", u: "UNS", t: "Bimbingan skripsinya sangat detail. BAB 1-5 selesai 6 minggu, langsung ACC!", init: "RA" },
              { n: "Siti M.",  u: "UGM", t: "Menang BPC berkat bimbingan di sini. Mentor sangat berpengalaman!", init: "SM" },
              { n: "Budi S.",  u: "ITS", t: "Bimbingan SPSS jadi mudah. Analisis BAB 4 beres 2 sesi.", init: "BS" },
            ].map((t) => (
              <div key={t.n} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-card">
                <div className="flex gap-0.5 mb-3">{[1,2,3,4,5].map((i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}</div>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">"{t.t}"</p>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8B0000] text-white text-xs font-bold">{t.init}</div>
                  <div><p className="text-sm font-semibold">{t.n}</p><p className="text-xs text-muted-foreground">{t.u}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-14">
        <div className="mx-auto max-w-3xl rounded-3xl bg-brand-gradient p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-brand">
          <div>
            <h2 className="text-xl font-extrabold text-white mb-1">Masih bingung pilih program? 🎓</h2>
            <p className="text-white/75 text-sm">Konsultasi gratis langsung dengan tim kami via WhatsApp.</p>
          </div>
          <a href={waLink("Halo, saya ingin konsultasi program bimbingan")} target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-white text-[#8B0000] font-extrabold text-sm px-5 py-2.5 hover:bg-brand-50 transition-colors shadow-md">
            <MessageCircle className="h-4 w-4" />
            Chat Sekarang
          </a>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {BRAND.year} {BRAND.name} ·{" "}
        <Link href="/" className="hover:text-[#8B0000]">Beranda</Link>
        {" · "}
        <Link href="/layanan" className="hover:text-[#8B0000]">Layanan</Link>
        {" · "}
        <Link href="/paket-hemat" className="hover:text-[#8B0000]">Paket Hemat</Link>
      </footer>

      <a href={waLink()} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition-all hover:scale-110"
        aria-label="Chat WhatsApp">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </div>
  );
}
