import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, ImageOff } from "lucide-react";
import { formatRupiah } from "@/lib/utils/format-currency";
import type { Produk } from "@/lib/katalog/tipe";

/**
 * Kartu produk untuk halaman daftar.
 *
 * Satu kartu dipakai untuk semua etalase — merchandise maupun paket
 * bimbingan — karena isinya sama saja: foto bila ada, nama, harga, dan
 * beberapa poin pertama. Membuat kartu terpisah per etalase berarti tiga
 * tempat berbeda yang harus diperbaiki setiap kali ada perubahan kecil.
 */
export function KartuProduk({ produk }: { produk: Produk }) {
  const p = produk;
  const diskon =
    p.harga_coret && p.harga_coret > p.harga
      ? Math.round(((p.harga_coret - p.harga) / p.harga_coret) * 100)
      : null;

  return (
    <Link
      href={`/produk/${p.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-brand hover:shadow-card-hover"
    >
      {/*
        object-contain, bukan object-cover.

        Katalognya memuat dua jenis gambar dengan bentuk yang jauh berbeda:
        poster paket bimbingan 16:9 yang isinya tulisan, dan foto merchandise
        yang hampir persegi. Dipotong agar memenuhi bingkai, poster kehilangan
        tepi kiri-kanannya — dan di poster itulah harga dan isi paketnya
        tertulis. Lebih baik ada sedikit ruang kosong daripada ada tulisan
        yang terpangkas.
      */}
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-50">
        {p.gambar.length > 0 ? (
          <Image
            src={p.gambar[0]}
            alt={p.nama}
            fill
            className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 300px"
          />
        ) : (
          <span className="flex h-full items-center justify-center">
            <ImageOff className="h-10 w-10 text-brand-200" aria-hidden="true" />
          </span>
        )}

        {p.badge && (
          <span className="absolute left-2 top-2 rounded-md bg-brand px-2 py-0.5 text-[10px] sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[11px] font-extrabold uppercase tracking-wide text-white">
            {p.badge}
          </span>
        )}
        {diskon !== null && (
          <span className="absolute right-2 top-2 flex h-9 w-9 sm:right-3 sm:top-3 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-red-500 text-xs font-extrabold text-white shadow">
            -{diskon}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="text-sm font-bold leading-snug text-slate-900 sm:text-base transition-colors group-hover:text-brand">
          {p.nama}
        </h3>
        {p.subjudul && (
          <p className="mt-0.5 text-xs text-slate-500">{p.subjudul}</p>
        )}

        {p.fitur.length > 0 && (
          <ul className="mt-3 space-y-1">
            {p.fitur.slice(0, 3).map((f) => (
              <li key={f} className="flex items-start gap-1.5 text-xs text-slate-600">
                <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-brand" aria-hidden="true" />
                {f}
              </li>
            ))}
            {p.fitur.length > 3 && (
              <li className="pl-[1.125rem] text-xs font-medium text-brand">
                +{p.fitur.length - 3} lainnya
              </li>
            )}
          </ul>
        )}

        {p.fitur.length === 0 && p.deskripsi && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">
            {p.deskripsi}
          </p>
        )}

        <div className="mt-auto pt-3 sm:pt-4">
          {p.harga_mulai && (
            <span className="block text-[11px] font-medium text-slate-400">
              mulai dari
            </span>
          )}
          <span className="flex flex-wrap items-baseline gap-2">
            <span className="text-base font-extrabold text-brand sm:text-lg">
              {formatRupiah(p.harga)}
            </span>
            {p.harga_coret && (
              <span className="text-xs font-medium text-slate-400 line-through">
                {formatRupiah(p.harga_coret)}
              </span>
            )}
            {p.satuan && (
              <span className="text-xs font-medium text-slate-500">{p.satuan}</span>
            )}
          </span>

          <span className="mt-2 flex items-center gap-1 text-xs font-bold text-brand">
            Lihat detail
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
