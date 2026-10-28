import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, ArrowRight, Zap, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BRAND, waLink } from "@/lib/brand";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Paket Hemat | ${BRAND.name}`,
  description: "Beli paket kuota cek plagiasi dan AI detector dengan harga lebih hemat per cek-nya.",
};

const paketPlagiasi = [
  { id: "a", name: "Paket A", sub: "Cek Plagiasi 10× · masa aktif 30 hari", harga: 299000, perCek: 29900, quota: 10, hari: 30, popular: false },
  { id: "b", name: "Paket B", sub: "Cek Plagiasi 25× · masa aktif 60 hari", harga: 625000, perCek: 25000, quota: 25, hari: 60, popular: true },
  { id: "c", name: "Paket C", sub: "Cek Plagiasi 50× · masa aktif 90 hari", harga: 1100000, perCek: 22000, quota: 50, hari: 90, popular: false },
];

const paketAI = [
  { id: "ai-a", name: "AI Starter", sub: "AI Detector 10× · masa aktif 30 hari", harga: 199000, perCek: 19900, quota: 10, hari: 30, popular: false },
  { id: "ai-b", name: "AI Pro",     sub: "AI Detector 25× · masa aktif 60 hari", harga: 450000, perCek: 18000, quota: 25, hari: 60, popular: true },
];

const fiturPaket = ["Skip antrian", "Notifikasi WhatsApp", "Customer Prioritas", "Kuota tidak hangus sebelum masa aktif habis"];

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

function PaketCard({ name, sub, harga, perCek, quota, hari, popular }: typeof paketPlagiasi[0]) {
  return (
    <div className={`relative flex flex-col rounded-3xl border p-6 transition-shadow hover:shadow-card-hover ${popular ? "border-[#8B0000] bg-[#8B0000] text-white shadow-brand" : "border-slate-200 bg-white"}`}>
      {popular && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-[11px] font-bold text-[#8B0000] shadow-sm border border-brand-200">
          ⭐ Terpopuler
        </span>
      )}
      <h3 className={`font-bold text-lg mb-0.5 ${popular ? "text-white" : "text-slate-900"}`}>{name}</h3>
      <p className={`text-xs mb-4 ${popular ? "text-white/70" : "text-slate-400"}`}>{sub}</p>
      <p className={`text-4xl font-extrabold mb-1 ${popular ? "text-white" : "text-slate-900"}`}>{fmt(harga)}</p>
      <p className={`text-xs mb-5 ${popular ? "text-white/70" : "text-muted-foreground"}`}>{fmt(perCek)} / cek</p>
      <ul className="space-y-2 mb-6">
        {[`${quota}x cek tersedia`, `Masa aktif ${hari} hari`, ...fiturPaket].map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${popular ? "text-white/80" : "text-[#8B0000]"}`} />
            <span className={popular ? "text-white/90" : "text-slate-600"}>{f}</span>
          </li>
        ))}
      </ul>
      <Link href="/daftar" className={`flex w-full items-center justify-center rounded-2xl py-3 text-sm font-bold transition-all ${popular ? "bg-white text-[#8B0000] hover:bg-brand-50" : "bg-[#8B0000] text-white hover:bg-brand-light shadow-brand-sm"}`}>
        Beli sekarang
      </Link>
    </div>
  );
}

export default function PaketHematPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src={BRAND.logoPng} alt={BRAND.name} width={28} height={28} unoptimized className="object-contain" />
            <span className="text-lg font-extrabold text-[#8B0000]">{BRAND.shortName}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild><Link href="/daftar">Daftar</Link></Button>
            <Button size="sm" asChild><Link href="/login">Login</Link></Button>
          </div>
        </div>
      </nav>

      <section className="hero-gradient px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <Badge variant="secondary" className="mb-4">💰 Hemat hingga 37% dibanding harga satuan</Badge>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-3">
            Paket Hemat <span className="text-[#8B0000]">{BRAND.name}</span>
          </h1>
          <p className="text-slate-500 text-lg">Beli lebih banyak, bayar lebih murah. Pilih paket yang sesuai kebutuhanmu.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            {[
              { icon: Zap,    text: "Skip antrian prioritas" },
              { icon: Shield, text: "Dokumen aman & privat" },
              { icon: Clock,  text: "Notifikasi WhatsApp otomatis" },
            ].map((b) => (
              <span key={b.text} className="flex items-center gap-1.5">
                <b.icon className="h-4 w-4 text-[#8B0000]" />
                {b.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-0.5 w-8 bg-[#8B0000] rounded-full" />
          <p className="text-xs font-bold uppercase tracking-widest text-[#8B0000]">Cek Plagiasi</p>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Paket Cek Plagiasi</h2>
        <p className="text-slate-500 mb-8">Laporan Turnitin lengkap dengan persentase kemiripan.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {paketPlagiasi.map((p) => <PaketCard key={p.id} {...p} />)}
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-0.5 w-8 bg-[#8B0000] rounded-full" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#8B0000]">AI Detector</p>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Paket AI Detector</h2>
          <p className="text-slate-500 mb-8">Deteksi teks yang ditulis AI per paragraf.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
            {paketAI.map((p) => <PaketCard key={p.id} {...p} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-8">Satuan vs Paket Hemat</h2>
        <div className="rounded-3xl border border-slate-200 overflow-hidden shadow-card">
          <table className="w-full text-sm" aria-label="Perbandingan harga satuan dan paket">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3">Layanan</th>
                <th className="px-5 py-3">Harga Satuan</th>
                <th className="px-5 py-3 text-[#8B0000]">Paket Terbaik</th>
                <th className="px-5 py-3 text-[#8B0000]">Hemat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { l: "Cek Plagiasi", satuan: 35000, paket: 22000 },
                { l: "AI Detector",  satuan: 25000, paket: 18000 },
              ].map((r) => {
                const hemat = Math.round(((r.satuan - r.paket) / r.satuan) * 100);
                return (
                  <tr key={r.l} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-medium text-slate-800">{r.l}</td>
                    <td className="px-5 py-3.5 text-slate-500 line-through">{fmt(r.satuan)}</td>
                    <td className="px-5 py-3.5 font-bold text-[#8B0000]">{fmt(r.paket)}</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-brand-50 text-[#8B0000] text-xs font-bold px-2.5 py-1 border border-brand-200">-{hemat}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="mx-auto max-w-3xl rounded-3xl bg-brand-gradient p-10 text-center shadow-brand">
          <h2 className="text-2xl font-extrabold text-white mb-2">Mulai hemat hari ini 🎉</h2>
          <p className="text-white/75 text-sm mb-6">Daftar gratis dan langsung beli paket hemat pilihanmu.</p>
          <Link href="/daftar" className="inline-flex items-center gap-2 rounded-xl bg-white text-[#8B0000] px-6 py-3 text-sm font-extrabold hover:bg-brand-50 transition-colors shadow-md">
            Daftar &amp; Beli Paket <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
