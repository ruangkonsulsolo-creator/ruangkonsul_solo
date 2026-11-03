import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ChevronRight, Package, Scale, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/utils/format-currency";
import { DAFTAR_PRODUK, cariProduk } from "@/lib/merchandise/katalog";
import { fotoProduk } from "@/lib/merchandise/foto";
import { GaleriProduk } from "@/components/merchandise/GaleriProduk";
import { PemesananProduk } from "@/components/merchandise/PemesananProduk";
import { NavbarUtama } from "@/components/ui/NavbarUtama";

/** Tiap produk dibuat jadi halaman statis saat build. */
export function generateStaticParams() {
  return DAFTAR_PRODUK.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const produk = cariProduk(params.slug);
  if (!produk) return { title: "Produk tidak ditemukan" };

  return {
    title: produk.nama,
    description: `${produk.ringkas}. ${formatRupiah(produk.harga)} — Ruang Konsul Solo.`,
  };
}

export default function HalamanProduk({
  params,
}: {
  params: { slug: string };
}) {
  const produk = cariProduk(params.slug);
  if (!produk) notFound();

  const foto = fotoProduk(produk.slug);
  const lainnya = DAFTAR_PRODUK.filter(
    (p) => p.slug !== produk.slug && p.kategori === produk.kategori
  ).slice(0, 4);

  return (
    <div className="min-h-screen bg-white">
      <NavbarUtama />

      {/* ── Remah roti ── */}
      <div className="border-b border-slate-100 px-4 py-3">
        <nav
          aria-label="Remah roti"
          className="mx-auto flex max-w-6xl items-center gap-1.5 text-xs font-medium text-slate-500"
        >
          <Link href="/merchandise" className="hover:text-brand">
            Merchandise
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
          <Link
            href={`/merchandise?kategori=${encodeURIComponent(produk.kategori)}`}
            className="hover:text-brand"
          >
            {produk.kategori}
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate text-slate-900">{produk.nama}</span>
        </nav>
      </div>

      {/* ── Foto dan pemesanan ── */}
      <section className="mx-auto max-w-6xl px-4 py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <GaleriProduk foto={foto} nama={produk.nama} />

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-brand">
              {produk.kategori}
            </span>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight text-slate-900 lg:text-3xl">
              {produk.nama}
            </h1>

            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-extrabold text-brand">
                {formatRupiah(produk.harga)}
              </span>
              {produk.hargaCoret && (
                <span className="text-lg font-medium text-slate-400 line-through">
                  {formatRupiah(produk.hargaCoret)}
                </span>
              )}
            </div>

            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-y border-slate-100 py-4 text-sm text-slate-600">
              <li className="flex items-center gap-1.5">
                <Package className="h-4 w-4 text-slate-400" aria-hidden="true" />
                {produk.stok === null
                  ? "Dibuat setelah dipesan"
                  : produk.stok === 0
                    ? "Stok habis"
                    : `Siap kirim · ${produk.stok} tersedia`}
              </li>
              <li className="flex items-center gap-1.5">
                <Scale className="h-4 w-4 text-slate-400" aria-hidden="true" />
                {produk.beratGram} gram
              </li>
              <li className="flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Kirim seluruh Indonesia
              </li>
            </ul>

            {produk.catatan && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-900">
                {produk.catatan}
              </p>
            )}

            <div className="mt-6">
              <PemesananProduk produk={produk} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Deskripsi dan spesifikasi ── */}
      <section className="border-t border-slate-100 bg-slate-50 px-4 py-12">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <h2 className="mb-4 text-lg font-extrabold text-slate-900">
              Deskripsi
            </h2>
            <div className="space-y-3">
              {produk.deskripsi.map((p, i) => (
                <p key={i} className="leading-relaxed text-slate-700">
                  {p}
                </p>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-lg font-extrabold text-slate-900">
              Spesifikasi
            </h2>
            <dl className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {produk.spesifikasi.map((s, i) => (
                <div
                  key={s.label}
                  className={`grid grid-cols-[9rem_1fr] gap-4 px-4 py-3 text-sm ${
                    i > 0 ? "border-t border-slate-100" : ""
                  }`}
                >
                  <dt className="font-semibold text-slate-500">{s.label}</dt>
                  <dd className="font-medium text-slate-900">{s.nilai}</dd>
                </div>
              ))}
              <div className="grid grid-cols-[9rem_1fr] gap-4 border-t border-slate-100 px-4 py-3 text-sm">
                <dt className="font-semibold text-slate-500">Berat kirim</dt>
                <dd className="font-medium text-slate-900">
                  {produk.beratGram} gram
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ── Produk lain di kategori yang sama ── */}
      {lainnya.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="mb-5 text-lg font-extrabold text-slate-900">
            Lainnya di {produk.kategori}
          </h2>
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {lainnya.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/merchandise/${p.slug}`}
                  className="block rounded-2xl border border-slate-200 p-4 transition-colors hover:border-brand"
                >
                  <span className="block font-bold leading-snug text-slate-900">
                    {p.nama}
                  </span>
                  <span className="mt-1 block text-xs text-slate-600">
                    {p.ringkas}
                  </span>
                  <span className="mt-2 block font-extrabold text-brand">
                    {formatRupiah(p.harga)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="border-t border-slate-100 px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <Button variant="outline" asChild>
            <Link href="/merchandise" className="gap-2">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Kembali ke katalog
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
