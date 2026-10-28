import Link from "next/link";
import Image from "next/image";
import { FileSearch, Bot, BookOpenCheck, PenLine, Clock, FileCheck2, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND, waLink } from "@/lib/brand";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Layanan | ${BRAND.name}`,
  description: `Cek Plagiasi, AI Detector, DrillBit Checker, dan Jasa Parafrase untuk mahasiswa Indonesia dari ${BRAND.name}.`,
};

const layanan = [
  { icon: FileSearch, name: "Cek Plagiasi", tagline: "Laporan Turnitin", desc: `${BRAND.name} hadir untuk mendukung setiap kebutuhan akademikmu. Dokumen diproses menggunakan tools yang sama dengan yang digunakan institusi pendidikan.`, harga: "Rp 35.000", satuan: "per file", sla: "24 jam", format: "PDF, DOCX, DOC", maxSize: "50 MB", href: "/cek-plagiasi", fitur: ["Laporan persentase kemiripan lengkap","Highlight sumber yang mirip","No repository — tidak masuk database","Akses laporan 24 jam via dashboard"], color: "bg-brand-50", iconColor: "text-[#8B0000]", accent: "border-[#8B0000]" },
  { icon: Bot, name: "AI Detector", tagline: "GPT Zero Detector", desc: "Identifikasi seberapa besar proporsi teks dalam dokumenmu yang terdeteksi ditulis oleh AI. Laporan mencakup skor per paragraf.", harga: "Rp 25.000", satuan: "per file", sla: "12 jam", format: "PDF, DOCX, DOC", maxSize: "50 MB", href: "/cek-ai", fitur: ["Skor AI per paragraf","Overall AI percentage score","Rekomendasi bagian yang perlu direvisi","Laporan PDF terstruktur"], color: "bg-brand-50", iconColor: "text-[#8B0000]", accent: "border-[#8B0000]" },
  { icon: BookOpenCheck, name: "Cek DrillBit", tagline: "Plagiasi + AI", desc: "DrillBit adalah platform deteksi plagiasi yang digunakan banyak universitas di Indonesia. Dapatkan laporan DrillBit resmi.", harga: "Rp 45.000", satuan: "per file", sla: "48 jam", format: "PDF, DOCX", maxSize: "20 MB", href: "/cek-drillbit", fitur: ["Laporan DrillBit resmi","Diakui oleh kampus-kampus Indonesia","Skor plagiasi + deteksi AI sekaligus","Certificate of originality tersedia"], color: "bg-brand-50", iconColor: "text-[#8B0000]", accent: "border-[#8B0000]" },
  { icon: PenLine, name: "Jasa Parafrase", tagline: "Turunkan Plagiasi", desc: `Tim penulis profesional ${BRAND.name} akan memparafrase dokumenmu sehingga persentase kemiripan turun secara signifikan.`, harga: "Rp 75.000", satuan: "mulai / halaman", sla: "72 jam", format: "PDF, DOCX, DOC", maxSize: "50 MB", href: "/jasa-parafrase", fitur: ["Dikerjakan oleh tim penulis berpengalaman","Tidak mengubah substansi tulisan","Dapat menurunkan plagiasi hingga 80%","Revisi 1× gratis jika hasil tidak sesuai"], color: "bg-brand-50", iconColor: "text-[#8B0000]", accent: "border-[#8B0000]" },
];

export default function LayananPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src={BRAND.logoPng} alt={BRAND.name} width={28} height={28} unoptimized className="object-contain" />
            <span className="text-lg font-extrabold text-[#8B0000]">{BRAND.shortName}</span>
          </Link>
          <div className="hidden sm:flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link href="/layanan" className="text-[#8B0000] font-semibold">Layanan</Link>
            <Link href="/paket-hemat" className="hover:text-[#8B0000] transition-colors">Paket Hemat</Link>
            <Link href="/bimbingan" className="hover:text-[#8B0000] transition-colors">Bimbingan</Link>
            <Link href="/blog" className="hover:text-[#8B0000] transition-colors">Blog</Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild><Link href="/daftar">Daftar</Link></Button>
            <Button size="sm" asChild><Link href="/login">Login</Link></Button>
          </div>
        </div>
      </nav>

      <section className="hero-gradient px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-0.5 w-8 bg-[#8B0000] rounded-full" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#8B0000]">Layanan</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-3">
            Layanan Cek Turnitin, Cek AI,<br className="hidden sm:block" /> Drillbit, dan Parafrase
          </h1>
          <p className="text-slate-500 max-w-xl leading-relaxed">
            {BRAND.name} hadir untuk mendukung setiap kebutuhan akademikmu, mulai dari tugas kuliah, skripsi, tesis, hingga artikel ilmiah.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {layanan.map((l) => {
            const Icon = l.icon;
            return (
              <Link key={l.name} href={l.href} className="group flex flex-col gap-4 rounded-2xl border-2 border-brand-100 bg-brand-50 p-6 card-hover">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Icon className="h-5 w-5 text-[#8B0000]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900">{l.name}</h3>
                    <p className="text-xs text-slate-400">{l.tagline}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-[#8B0000]">{l.harga} <span className="text-xs font-normal text-slate-400">/ file</span></p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B0000] group-hover:gap-2.5 transition-all">
                  Klik di sini <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="px-4 pb-20 space-y-8">
        {layanan.map((l, i) => {
          const Icon = l.icon;
          return (
            <div key={l.name} className={`mx-auto max-w-4xl rounded-3xl border border-slate-200 overflow-hidden shadow-card ${i % 2 === 1 ? "bg-slate-50" : "bg-white"}`}>
              <div className="p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
                      <Icon className="h-6 w-6 text-[#8B0000]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">{l.name}</h2>
                      <p className="text-sm text-slate-400">{l.tagline}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-5">{l.desc}</p>
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { icon: Clock, label: "Estimasi", val: l.sla },
                      { icon: FileCheck2, label: "Format", val: l.format },
                      { icon: ShieldCheck, label: "Maks.", val: l.maxSize },
                    ].map((s) => {
                      const SIcon = s.icon;
                      return (
                        <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-card">
                          <SIcon className="h-4 w-4 text-[#8B0000] mx-auto mb-1" />
                          <p className="text-xs font-semibold text-slate-700">{s.val}</p>
                          <p className="text-[10px] text-muted-foreground">{s.label}</p>
                        </div>
                      );
                    })}
                  </div>
                  <Button asChild className="gap-2"><Link href={l.href}>Mulai {l.name} <ArrowRight className="h-4 w-4" /></Link></Button>
                </div>
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Yang kamu dapatkan</p>
                    <ul className="space-y-2.5">
                      {l.fitur.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#8B0000]" />
                          <span className="text-slate-700">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl bg-brand-50 border border-brand-100 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Harga</p>
                    <p className="text-3xl font-extrabold text-[#8B0000]">{l.harga}</p>
                    <p className="text-xs text-slate-400">{l.satuan}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
