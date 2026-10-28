import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Gift, Users, Wallet, CheckCircle2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND, waLink } from "@/lib/brand";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Program Referral | ${BRAND.name}`,
  description: `Ajak temanmu bergabung di ${BRAND.name} dan dapatkan komisi 10% dari setiap pembelian pertama mereka.`,
};

const steps = [
  { icon: Share2,  num: "01", title: "Bagikan Link Referralmu", desc: "Salin link referral unikmu dari dashboard dan bagikan ke teman-temanmu." },
  { icon: Users,   num: "02", title: "Teman Mendaftar & Beli",  desc: `Temanmu mendaftar akun ${BRAND.name} menggunakan link atau kode referralmu dan melakukan pembelian pertama.` },
  { icon: Wallet,  num: "03", title: "Kamu Dapat Komisi 10%",  desc: `Setelah pembayaran temanmu dikonfirmasi, komisi 10% langsung dikreditkan ke akun ${BRAND.name}-mu.` },
];

const faqs = [
  { q: "Berapa komisi yang saya dapat?", a: `Kamu mendapat komisi 10% dari nilai transaksi pertama teman yang mendaftar via link referralmu.` },
  { q: "Kapan komisi saya diterima?", a: "Komisi dikreditkan otomatis ke saldo akunmu setelah pembayaran teman dikonfirmasi, biasanya dalam 1×24 jam." },
  { q: "Bagaimana cara menggunakan kredit komisi?", a: `Kredit referral bisa digunakan sebagai potongan harga pada pembelian layanan atau paket hemat ${BRAND.name}.` },
  { q: "Apakah ada batas jumlah referral?", a: "Tidak ada batas! Semakin banyak teman yang kamu ajak, semakin besar komisi yang kamu kumpulkan." },
  { q: "Apakah teman saya juga dapat keuntungan?", a: `Teman yang mendaftar via link referralmu akan mendapat sambutan sebagai pengguna baru ${BRAND.name}.` },
];

export default function ReferralPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src={BRAND.logoPng} alt={BRAND.name} width={28} height={28} unoptimized className="object-contain" />
            <span className="text-lg font-extrabold text-[#8B0000]">{BRAND.shortName}</span>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild><Link href="/daftar">Daftar</Link></Button>
            <Button size="sm" asChild><Link href="/login">Login</Link></Button>
          </div>
        </div>
      </nav>

      <section className="bg-brand-gradient px-4 py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 h-40 w-40 rounded-full bg-white" />
          <div className="absolute bottom-10 right-10 h-60 w-60 rounded-full bg-white" />
        </div>
        <div className="relative z-10 mx-auto max-w-xl">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-5 mx-auto">
            <Gift className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">Ajak Teman, Dapat Komisi! 🎉</h1>
          <p className="text-white/80 text-lg mb-8">Bagikan link referralmu dan dapatkan <strong className="text-white">komisi 10%</strong> dari setiap pembelian pertama temanmu.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="dark" size="lg" asChild>
              <Link href="/daftar" className="gap-2">Daftar &amp; Mulai Referral <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border-2 border-white/60 text-white px-6 py-3 text-sm font-bold hover:bg-white/10 transition-colors">
              Sudah punya akun? Login
            </Link>
          </div>
        </div>
      </section>

      <div className="border-b border-slate-100">
        <div className="mx-auto max-w-4xl px-4 py-10 grid grid-cols-3 gap-6 text-center">
          {[
            { val: "10%",    label: "Komisi per referral" },
            { val: "∞",      label: "Tidak ada batas referral" },
            { val: "24 jam", label: "Kredit masuk otomatis" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl lg:text-4xl font-extrabold text-[#8B0000] mb-1">{s.val}</p>
              <p className="text-sm text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="h-0.5 w-8 bg-[#8B0000] rounded-full" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#8B0000]">Cara Kerja</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Simpel Banget — 3 Langkah</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.num} className="flex flex-col items-center text-center">
                <div className="relative mb-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B0000] shadow-brand">
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-dark text-white text-[10px] font-extrabold">{s.num}</span>
                </div>
                <h3 className="font-extrabold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-brand-50 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold text-slate-900">Kenapa Program Referral {BRAND.shortName}?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {["Komisi 10% langsung — tidak ada minimum payout","Link referral unik yang mudah dibagikan","Tidak perlu bayar untuk bergabung — gratis!","Kredit bisa langsung digunakan untuk order","Dashboard real-time untuk pantau komisi","Tidak ada batas waktu atau batas jumlah referral"].map((b) => (
              <div key={b} className="flex items-start gap-3 rounded-2xl bg-white border border-brand-100 px-4 py-3.5 shadow-card">
                <CheckCircle2 className="h-5 w-5 text-[#8B0000] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700 font-medium">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 py-16">
        <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-8">FAQ Referral</h2>
        <div className="space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-slate-800 list-none hover:bg-brand-50 transition-colors">
                {f.q}
                <span className="text-muted-foreground group-open:rotate-180 transition-transform duration-200 text-lg leading-none" aria-hidden="true">↓</span>
              </summary>
              <div className="border-t border-slate-100 px-5 py-4">
                <p className="text-sm text-slate-600 leading-relaxed">{f.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="mx-auto max-w-3xl rounded-3xl bg-brand-gradient p-10 text-center shadow-brand">
          <h2 className="text-2xl font-extrabold text-white mb-2">Mulai Referral Sekarang 🚀</h2>
          <p className="text-white/75 text-sm mb-6">Daftar gratis dan langsung dapatkan link referral unikmu.</p>
          <Link href="/daftar" className="inline-flex items-center gap-2 rounded-xl bg-white text-[#8B0000] px-6 py-3 text-sm font-extrabold hover:bg-brand-50 transition-colors shadow-md">
            Daftar Gratis &amp; Mulai <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
