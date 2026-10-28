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
];

export default function LayananPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src={BRAND.logoPng} alt={BRAND.name} width={28} height={28} unoptimized className="object-contain" />
            <span className="text-lg font-extrabold text-koreksi-deep">{BRAND.shortName}</span>
          </Link>
          <div className="hidden sm:flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link href="/layanan" className="text-koreksi-deep font-semibold">Layanan</Link>
            <Link href="/paket-hemat" className="hover:text-koreksi-deep transition-colors">Paket Hemat</Link>
            <Link href="/bimbingan" className="hover:text-koreksi-deep transition-colors">Bimbingan</Link>
            <Link href="/blog" className="hover:text-koreksi-deep transition-colors">Blog</Link>
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
            <span className="h-0.5 w-8 bg-ink rounded-full" />
            <span className="text-xs font-bold uppercase tracking-widest text-koreksi-deep">Layanan</span>
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
              <Link key={l.name} href={l.href} className="group flex flex-col gap-4 rounded-2xl border-2 border-paper-edge bg-paper-raised p-6 card-hover">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Icon className="h-5 w-5 text-koreksi-deep" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900">{l.name}</h3>
                    <p className="text-xs text-slate-400">{l.tagline}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-koreksi-deep">{l.harga} <span className="text-xs font-normal text-slate-400">/ file</span></p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-koreksi-deep group-hover:gap-2.5 transition-all">
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
            <div key={l.name} className={`mx-auto max-w-4xl rounded-3xl border border-slate-200 overflow-hidden shadow-lift ${i % 2 === 1 ? "bg-slate-50" : "bg-white"}`}>
              <div className="p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-raised">
                      <Icon className="h-6 w-6 text-koreksi-deep" />
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
                        <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-lift">
                          <SIcon className="h-4 w-4 text-koreksi-deep mx-auto mb-1" />
                          <p className="text-xs font-semibold text-slate-700">{s.val}</p>
                          <p className="text-[10px] text-ink-faint">{s.label}</p>
                        </div>
                      );
                    })}
                  </div>
                  <Button asChild className="gap-2"><Link href={l.href}>Mulai {l.name} <ArrowRight className="h-4 w-4" /></Link></Button>
                </div>
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lift">
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-faint mb-3">Yang kamu dapatkan</p>
                    <ul className="space-y-2.5">
                      {l.fitur.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-koreksi-deep" />
                          <span className="text-slate-700">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl bg-paper-raised border border-paper-edge p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-faint mb-1">Harga</p>
                    <p className="text-3xl font-extrabold text-koreksi-deep">{l.harga}</p>
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
