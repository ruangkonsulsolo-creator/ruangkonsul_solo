import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND, waLink } from "@/lib/brand";
import { NavbarUtama } from "@/components/ui/NavbarUtama";

export type BagianLegal = { judul: string; isi: ReactNode };

export const TAUTAN_LEGAL = [
  { href: "/syarat", label: "Syarat & Ketentuan" },
  { href: "/kebijakan-refund", label: "Kebijakan Refund" },
  { href: "/kebijakan-privasi", label: "Kebijakan Privasi" },
  { href: "/kontak", label: "Kontak" },
] as const;

/** Kerangka bersama halaman legal: judul, tanggal berlaku, bagian bernomor, kontak, tautan antarhalaman. */
export function HalamanLegal({
  judul,
  ringkasan,
  diperbarui,
  bagian,
  aktif,
}: {
  judul: string;
  ringkasan?: ReactNode;
  diperbarui: string;
  bagian: BagianLegal[];
  aktif: (typeof TAUTAN_LEGAL)[number]["href"];
}) {
  return (
    <div className="min-h-screen bg-white">
      <NavbarUtama />
      <main className="mx-auto max-w-2xl px-4 py-14">
        <nav aria-label="Halaman informasi" className="mb-8 flex flex-wrap gap-2">
          {TAUTAN_LEGAL.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={t.href === aktif ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                t.href === aktif ? "border-brand bg-brand text-white" : "border-slate-200 text-slate-600 hover:border-brand hover:text-brand"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <h1 className="mb-2 text-3xl font-extrabold text-slate-900">{judul}</h1>
        <p className="text-sm text-muted-foreground">
          Terakhir diperbarui: {diperbarui} · Berlaku untuk semua pengguna {BRAND.domain}
        </p>
        {ringkasan && <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{ringkasan}</div>}

        <div className="mt-8 space-y-8">
          {bagian.map((b, i) => (
            <section key={b.judul}>
              <h2 className="mb-2 text-base font-extrabold text-slate-900">
                {i + 1}. {b.judul}
              </h2>
              <div className="space-y-2 text-sm leading-relaxed text-slate-600 [&_li]:ml-4 [&_li]:list-disc [&_ul]:space-y-1">{b.isi}</div>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-brand-200 bg-brand-50 p-5 text-sm text-brand-dark">
          <p className="mb-1 font-semibold">Ada pertanyaan?</p>
          <p>
            Hubungi kami di{" "}
            <a href={`mailto:${BRAND.email}`} className="font-semibold underline">{BRAND.email}</a> atau{" "}
            <a href={waLink()} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
              WhatsApp {BRAND.whatsappDisplay}
            </a>
            .
          </p>
        </div>
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p>© {BRAND.year} {BRAND.name}</p>
        <p className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
          {TAUTAN_LEGAL.map((t) => (
            <Link key={t.href} href={t.href} className={t.href === aktif ? "text-brand" : "hover:text-brand"}>
              {t.label}
            </Link>
          ))}
        </p>
      </footer>
    </div>
  );
}
