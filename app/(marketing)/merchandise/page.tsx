import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ImagePlus, Package, Truck, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { BRAND, waLink } from "@/lib/brand";
import { formatRupiah } from "@/lib/utils/format-currency";
import {
  KATEGORI,
  hargaTermurah,
  produkKategori,
} from "@/lib/merchandise/katalog";
import { fotoUtama } from "@/lib/merchandise/foto";

export const metadata: Metadata = {
  title: "Merchandise",
  description:
    "Buket wisuda, hoodie, tumbler, tote bag, dan perlengkapan kuliah resmi " +
    "Ruang Konsul Solo. Bisa diantar di Solo atau dikirim ke seluruh Indonesia.",
};

/**
 * Daftar produk.
 *
 * Kategori disaring lewat ?kategori= di URL, bukan state di klien, supaya
 * tiap kategori punya alamat sendiri yang bisa dibagikan dan diindeks —
 * pola yang sama dengan halaman /layanan.
 */
export default function MerchandisePage({
  searchParams,
}: {
  searchParams: { kategori?: string };
}) {
  const aktif = searchParams.kategori ?? "Semua";
  const tampil = produkKategori(aktif);

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo href="/" size="sm" />
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <Link href="/layanan" className="transition-colors hover:text-brand">Layanan</Link>
            <Link href="/merchandise" className="font-semibold text-brand">Merchandise</Link>
            <Link href="/jadwal" className="transition-colors hover:text-brand">Jadwal</Link>
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
      <section className="bg-brand-50 px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-0.5 w-8 rounded-full bg-brand" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand">
              Merchandise
            </span>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight text-slate-900 lg:text-5xl">
            Perlengkapan kuliah dan{" "}
            <span className="text-brand">hadiah hari wisuda</span>
          </h1>
          <p className="mt-3 max-w-xl leading-relaxed text-slate-600">
            Mulai {formatRupiah(hargaTermurah())}. Bisa diambil langsung di
            Solo atau dikirim ke seluruh Indonesia.
          </p>
        </div>
      </section>

      {/* ── Filter kategori ── */}
      <section className="sticky top-[57px] z-20 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl">
          <ul className="-mx-1 flex gap-2 overflow-x-auto pb-1">
            {KATEGORI.map((k) => {
              const ini = k === aktif;
              const jumlah = produkKategori(k).length;
              return (
                <li key={k} className="shrink-0">
                  <Link
                    href={
                      k === "Semua"
                        ? "/merchandise"
                        : `/merchandise?kategori=${encodeURIComponent(k)}`
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                      ini
                        ? "bg-brand text-white"
                        : "border border-slate-200 text-slate-600 hover:border-brand hover:text-brand"
                    }`}
                  >
                    {k}
                    <span className={ini ? "text-white/70" : "text-slate-400"}>
                      {jumlah}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── Katalog ── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        {tampil.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="font-semibold text-slate-900">
              Belum ada produk di kategori ini
            </p>
            <Link
              href="/merchandise"
              className="mt-2 inline-block text-sm font-bold text-brand hover:underline"
            >
              Lihat semua produk
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {tampil.map((p) => {
              const foto = fotoUtama(p.slug);
              return (
                <li key={p.slug}>
                  <Link
                    href={`/merchandise/${p.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-brand hover:shadow-card-hover"
                  >
                    <div className="relative aspect-square overflow-hidden bg-slate-50">
                      {foto ? (
                        <Image
                          src={foto}
                          alt={p.nama}
                          fill
                          sizes="(min-width: 1024px) 280px, 50vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <span className="flex h-full flex-col items-center justify-center gap-2 border-b border-dashed border-slate-200 p-4 text-center">
                          <ImagePlus
                            className="h-8 w-8 text-slate-300"
                            aria-hidden="true"
                          />
                          <span className="text-[10px] font-medium leading-tight text-slate-400">
                            Foto belum dipasang
                          </span>
                        </span>
                      )}
                      {p.stok === null && (
                        <span className="absolute left-3 top-3 rounded-full bg-slate-900/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                          Pre-order
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
                        {p.kategori}
                      </span>
                      <span className="mt-1 block font-bold leading-snug text-slate-900">
                        {p.nama}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                        {p.ringkas}
                      </span>
                      <span className="mt-auto pt-3 text-lg font-extrabold text-brand">
                        {formatRupiah(p.harga)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Keterangan belanja ── */}
      <section className="border-t border-slate-100 bg-slate-50 px-4 py-12">
        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-3">
          {[
            {
              icon: Package,
              judul: "Dibuat setelah dipesan",
              isi: "Sebagian produk dikerjakan per pesanan, jadi stoknya tidak pernah basi. Waktu pengerjaan tertulis di tiap halaman produk.",
            },
            {
              icon: Truck,
              judul: "Kirim seluruh Indonesia",
              isi: "Ongkir dihitung dari berat dan alamat tujuan saat kamu memesan. Area Solo bisa diambil sendiri tanpa ongkir.",
            },
            {
              icon: MessageCircle,
              judul: "Tanya dulu boleh",
              isi: "Ragu soal ukuran atau warna? Tanyakan lewat WhatsApp sebelum memesan — lebih baik daripada salah beli.",
            },
          ].map((k) => (
            <div key={k.judul}>
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                <k.icon className="h-5 w-5 text-brand" aria-hidden="true" />
              </span>
              <h2 className="font-bold text-slate-900">{k.judul}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {k.isi}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Ajakan ── */}
      <section className="px-4 py-14">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-xl font-extrabold text-slate-900">
            Mau pesan dalam jumlah banyak?
          </h2>
          <p className="max-w-lg text-sm leading-relaxed text-slate-600">
            Untuk angkatan, himpunan, atau souvenir wisuda satu jurusan, harga
            dan waktu pengerjaannya dihitung terpisah. Kirim saja rencananya.
          </p>
          <Button asChild>
            <a
              href={waLink(
                `Halo ${BRAND.name}, saya ingin pesan merchandise dalam jumlah banyak.`
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              Tanya lewat WhatsApp
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
