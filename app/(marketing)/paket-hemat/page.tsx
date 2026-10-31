import Link from "next/link";
import type { Metadata } from "next";
import {
  Check, X, ArrowRight, ShieldCheck, Sparkles,
  MessageCircle, ChevronDown, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { LogoKampus } from "@/components/landing/LogoKampus";
import { BRAND, waLink } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Paket Langganan Bimbingan",
  description:
    "Paket bimbingan bulanan Ruang Konsul Solo: mentor tetap, kuota sesi, " +
    "dan pendampingan sampai sidang. Mulai Rp50.000 per sesi.",
};

/**
 * Halaman paket langganan.
 *
 * Isinya sebelumnya paket kuota cek plagiasi — layanan yang sudah dihapus
 * dari situs — jadi halaman ini ditulis ulang untuk paket bimbingan.
 *
 * Dua pola yang sengaja TIDAK dipakai meski lazim di halaman sejenis:
 *
 *   1. Harga coret yang tidak pernah benar-benar berlaku ("Rp750.000"
 *      dicoret jadi "Rp149.000"). Itu harga semu, dan UU No. 8/1999
 *      Pasal 9 ayat (1) huruf f melarang mengiklankan potongan harga yang
 *      menyesatkan. Field `hargaNormal` tersedia, tapi hanya isi kalau
 *      paketnya memang pernah dijual seharga itu.
 *
 *   2. Hitungan slot palsu ("Sisa 5 slot!"). Field `sisaSlot` tersedia dan
 *      hanya tampil kalau diisi — isi hanya kalau kuotanya benar terbatas.
 */

type Paket = {
  nama: string;
  periode: string;
  untuk: string;
  harga: number;
  /** Harga sebelum diskon. Isi HANYA kalau paket ini memang pernah dijual segitu. */
  hargaNormal?: number;
  perSesi: string;
  kodePromo?: string;
  sisaSlot?: number;
  populer?: boolean;
  fitur: { teks: string; ada: boolean }[];
};

const PAKET: Paket[] = [
  {
    nama: "Basic",
    periode: "per bulan",
    untuk: "Baru mulai, butuh arahan awal",
    harga: 279000,
    perSesi: "≈ Rp46.500 / sesi",
    fitur: [
      { teks: "6× sesi konsultasi daring", ada: true },
      { teks: "Resume materi tiap sesi", ada: true },
      { teks: "Rangkuman progres bulanan", ada: true },
      { teks: "Simulasi sidang + uji statistik", ada: false },
      { teks: "Grup WhatsApp privat", ada: false },
    ],
  },
  {
    nama: "Silver",
    periode: "per bulan",
    untuk: "Sedang mengejar target sidang",
    harga: 349000,
    perSesi: "≈ Rp43.600 / sesi",
    populer: true,
    fitur: [
      { teks: "8× sesi konsultasi daring", ada: true },
      { teks: "Resume materi tiap sesi", ada: true },
      { teks: "Rangkuman progres bulanan", ada: true },
      { teks: "Simulasi sidang + uji statistik", ada: true },
      { teks: "Grup WhatsApp privat", ada: false },
    ],
  },
  {
    nama: "Gold",
    periode: "per bulan",
    untuk: "Butuh pendampingan intensif",
    harga: 499000,
    perSesi: "≈ Rp49.900 / sesi",
    fitur: [
      { teks: "10× sesi konsultasi daring", ada: true },
      { teks: "Resume materi tiap sesi", ada: true },
      { teks: "Rangkuman progres bulanan", ada: true },
      { teks: "Simulasi sidang + uji statistik", ada: true },
      { teks: "Grup WhatsApp privat", ada: true },
    ],
  },
];

const KEUNGGULAN = [
  {
    icon: Sparkles,
    judul: "Mentor tetap",
    isi: "Satu mentor selama paket berjalan, jadi kamu tidak perlu menjelaskan ulang penelitianmu setiap bertemu.",
  },
  {
    icon: Clock,
    judul: "Jadwal fleksibel",
    isi: "Pilih sendiri jam sesimu dari kalender. Bisa dijadwal ulang selama belum 24 jam sebelum sesi.",
  },
  {
    icon: ShieldCheck,
    judul: "Kamu tetap penulisnya",
    isi: "Mentor menajamkan arah dan metode. Kami tidak menerima pesanan naskah jadi.",
  },
];

const FAQ = [
  {
    q: "Sesi yang tidak terpakai hangus?",
    a: "Kuota berlaku selama satu bulan sejak paket aktif. Sisa sesi yang tidak dipakai tidak otomatis pindah ke bulan berikutnya, tapi kamu bisa bicara dengan admin kalau ada kendala di luar rencana.",
  },
  {
    q: "Bisa ganti mentor di tengah paket?",
    a: "Bisa. Hubungi admin dan jelaskan alasannya — kecocokan bidang dan gaya bimbingan memang berpengaruh besar, jadi ini hal yang wajar.",
  },
  {
    q: "Sesinya daring atau tatap muka?",
    a: `Keduanya. Daring lewat Zoom atau Google Meet, atau tatap muka di ${BRAND.address.split(",")[0]}.`,
  },
  {
    q: "Apakah skripsi saya dikerjakan tim kalian?",
    a: "Tidak. Kamu yang menulis; mentor membantu menajamkan rumusan masalah, memilih metode, membaca draf, dan menyiapkanmu menghadapi sidang. Kami tidak menerima pesanan naskah jadi, dan tidak menyediakan jasa untuk meloloskan tulisan dari pemeriksaan kemiripan.",
  },
  {
    q: "Pembayarannya bagaimana?",
    a: "Transfer bank, QRIS, atau e-wallet lewat Midtrans. Paket aktif setelah pembayaran dikonfirmasi.",
  },
  {
    q: "Kalau ternyata tidak cocok?",
    a: "Bicara dengan admin dalam 7 hari pertama. Kami akan mencarikan mentor lain atau membahas opsi lainnya bersamamu.",
  },
];

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

function KartuPaket({ p }: { p: Paket }) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 p-6 ${
        p.populer
          ? "border-brand bg-white shadow-card lg:scale-105"
          : "border-slate-200 bg-white"
      }`}
    >
      {p.populer && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
          Paling dipilih
        </span>
      )}

      <h3 className="text-xl font-extrabold text-slate-900">Paket {p.nama}</h3>
      <p className="mt-0.5 text-sm font-medium text-slate-500">{p.untuk}</p>

      <div className="mt-5">
        {p.hargaNormal && (
          <p className="text-sm font-medium text-slate-500 line-through">
            {rupiah(p.hargaNormal)}
          </p>
        )}
        <p className="flex items-baseline gap-1.5">
          <span className="text-4xl font-extrabold text-brand">
            {rupiah(p.harga)}
          </span>
          <span className="text-sm font-medium text-slate-500">{p.periode}</span>
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{p.perSesi}</p>
      </div>

      {p.kodePromo && (
        <div className="mt-4 rounded-lg border border-dashed border-brand bg-brand-50 px-3 py-2">
          <p className="text-xs text-slate-600">
            Kode promo{" "}
            <span className="font-mono font-bold tracking-wider text-brand">
              {p.kodePromo}
            </span>
          </p>
        </div>
      )}

      <ul className="mt-6 flex-1 space-y-3">
        {p.fitur.map((f) => (
          <li key={f.teks} className="flex items-start gap-2.5 text-sm">
            {f.ada ? (
              <Check
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand"
                aria-hidden="true"
              />
            ) : (
              <X
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-300"
                aria-hidden="true"
              />
            )}
            <span className={f.ada ? "text-slate-700" : "text-slate-400"}>
              {f.teks}
            </span>
          </li>
        ))}
      </ul>

      {p.sisaSlot !== undefined && (
        <p className="mt-5 text-center text-xs font-semibold text-amber-700">
          Sisa {p.sisaSlot} slot bulan ini
        </p>
      )}

      <Link
        href="/booking"
        className={`mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold transition-colors ${
          p.populer
            ? "bg-brand text-white hover:bg-brand-light"
            : "border-2 border-brand text-brand hover:bg-brand-50"
        }`}
      >
        Ambil paket {p.nama} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

export default function PaketHematPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo href="/" size="sm" />
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <Link href="/layanan" className="transition-colors hover:text-brand">Layanan</Link>
            <Link href="/jadwal" className="transition-colors hover:text-brand">Jadwal</Link>
            <Link href="/paket-hemat" className="font-semibold text-brand">Paket Langganan</Link>
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
      <section className="bg-brand-50 px-4 py-14 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="h-0.5 w-8 rounded-full bg-brand" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand">
              Paket Langganan
            </span>
            <span className="h-0.5 w-8 rounded-full bg-brand" />
          </div>
          <h1 className="text-3xl font-extrabold leading-tight text-slate-900 lg:text-5xl">
            Pilih paket bimbingan yang{" "}
            <span className="text-brand">sesuai kebutuhanmu</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-slate-600">
            Semua paket termasuk mentor tetap, resume tiap sesi, dan rangkuman
            progres bulanan. Jadwal kamu atur sendiri lewat kalender.
          </p>
        </div>
      </section>

      {/* ── Kartu paket ── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-5">
          {PAKET.map((p) => (
            <KartuPaket key={p.nama} p={p} />
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-600">
            Belum yakin butuh paket bulanan?{" "}
            <Link href="/booking" className="font-bold text-brand hover:underline">
              Coba satu sesi dulu
            </Link>{" "}
            mulai Rp50.000 — tanpa langganan.
          </p>
        </div>
      </section>

      {/* ── Bukti sosial ── */}
      <section className="border-y border-slate-100 px-4 py-8">
        <div className="mx-auto flex max-w-6xl justify-center">
          <LogoKampus jumlahPeserta="10.000+" rating="4,9" />
        </div>
      </section>

      {/* ── Kenapa paket ── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-10 text-center text-3xl font-extrabold text-slate-900">
          Kenapa langganan, bukan sesi satuan?
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {KEUNGGULAN.map((k) => {
            const Icon = k.icon;
            return (
              <div
                key={k.judul}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                  <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
                </div>
                <h3 className="font-extrabold text-slate-900">{k.judul}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {k.isi}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-center text-3xl font-extrabold text-slate-900">
            Yang sering ditanyakan
          </h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-slate-200 bg-white px-5 py-4"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-slate-900 marker:content-['']">
                  {f.q}
                  <ChevronDown
                    className="h-4 w-4 flex-shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-5 rounded-3xl bg-brand p-10 shadow-card sm:flex-row lg:p-12">
          <div className="text-center sm:text-left">
            <h2 className="mb-1.5 text-2xl font-extrabold text-white lg:text-3xl">
              Masih bingung pilih paket?
            </h2>
            <p className="text-sm text-white/75">
              Ceritakan kendalamu, admin bantu pilihkan yang paling masuk akal
              untuk tahap penelitianmu sekarang.
            </p>
          </div>
          <Button variant="dark" size="lg" asChild className="flex-shrink-0">
            <a
              href={waLink("Halo, saya ingin tanya soal paket langganan bimbingan.")}
              className="gap-2"
            >
              <MessageCircle className="h-4 w-4" /> Chat Admin
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
