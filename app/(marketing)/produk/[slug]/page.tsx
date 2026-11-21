import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Check, ChevronRight, Package, Scale, Truck } from "lucide-react";
import { NavbarUtama } from "@/components/ui/NavbarUtama";
import { GaleriProduk } from "@/components/merchandise/GaleriProduk";
import { PesanProduk } from "@/components/katalog/PesanProduk";
import { formatRupiah } from "@/lib/utils/format-currency";
import { ambilProduk, ambilSekategori } from "@/lib/katalog/baca";
import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/brand";

export const revalidate = 120;

/**
 * Satu halaman produk untuk seluruh katalog.
 *
 * Merchandise dan paket bimbingan dulu punya halaman sendiri-sendiri
 * meskipun isinya sama: foto, harga, keterangan, tombol pesan. Satu halaman
 * untuk semuanya berarti perbaikan apa pun berlaku di mana-mana sekaligus.
 */

async function konteks(slug: string) {
  const produk = await ambilProduk(slug);
  if (!produk) return null;

  const supabase = createClient();
  const [{ data: etalase }, { data: kategori }] = await Promise.all([
    supabase.from("etalase").select("slug, nama").eq("id", produk.etalase_id).maybeSingle(),
    produk.kategori_id
      ? supabase.from("kategori_produk").select("nama").eq("id", produk.kategori_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    produk,
    etalase: etalase as { slug: string; nama: string } | null,
    kategori: (kategori as { nama: string } | null)?.nama ?? null,
  };
}

export async function generateMetadata({
  params,
}: { params: { slug: string } }): Promise<Metadata> {
  const produk = await ambilProduk(params.slug);
  if (!produk) return { title: "Produk tidak ditemukan" };
  return {
    title: produk.nama,
    description:
      produk.deskripsi?.slice(0, 160) ??
      `${produk.subjudul ?? produk.nama} — ${BRAND.name}.`,
  };
}

export default async function HalamanProduk({
  params,
}: { params: { slug: string } }) {
  const data = await konteks(params.slug);
  // return, bukan sekadar memanggil: penyempitan tipe setelah baris ini
  // jadi tidak bergantung pada notFound() yang bertipe never.
  if (!data) return notFound();

  const { produk: p, etalase, kategori } = data;

  // Penggabungan foto basis data dan folder sudah dilakukan di
  // lib/katalog/baca.ts, jadi di sini tinggal dipakai.
  const foto = p.gambar;

  const lainnya = await ambilSekategori(p.kategori_id, p.slug, 4);

  const diskon =
    p.harga_coret && p.harga_coret > p.harga
      ? Math.round(((p.harga_coret - p.harga) / p.harga_coret) * 100)
      : null;

  return (
    <div className="min-h-screen bg-white">
      <NavbarUtama />

      {/* ── Remah roti ── */}
      <div className="border-b border-slate-100 px-4 py-3">
        <nav
          aria-label="Remah roti"
          className="mx-auto flex max-w-6xl items-center gap-1.5 text-xs font-medium text-slate-500"
        >
          {etalase && (
            <>
              <Link href={`/etalase/${etalase.slug}`} className="hover:text-brand">
                {etalase.nama}
              </Link>
              <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
            </>
          )}
          {kategori && (
            <>
              <span>{kategori}</span>
              <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
            </>
          )}
          <span className="truncate text-slate-900">{p.nama}</span>
        </nav>
      </div>

      {/* ── Foto dan pemesanan ── */}
      <section className="mx-auto max-w-6xl px-4 py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <GaleriProduk foto={foto} nama={p.nama} />

          <div>
            {kategori && (
              <span className="text-xs font-bold uppercase tracking-widest text-brand">
                {kategori}
              </span>
            )}
            <h1 className="mt-2 text-2xl font-extrabold leading-tight text-slate-900 lg:text-3xl">
              {p.nama}
            </h1>
            {p.subjudul && (
              <p className="mt-1 text-sm text-slate-600">{p.subjudul}</p>
            )}

            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              {p.harga_mulai && (
                <span className="text-sm font-medium text-slate-500">mulai dari</span>
              )}
              <span className="text-3xl font-extrabold text-brand">
                {formatRupiah(p.harga)}
              </span>
              {p.satuan && (
                <span className="text-sm font-semibold text-slate-500">{p.satuan}</span>
              )}
              {p.harga_coret && (
                <span className="text-lg font-medium text-slate-400 line-through">
                  {formatRupiah(p.harga_coret)}
                </span>
              )}
              {diskon !== null && (
                <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-extrabold text-red-600">
                  hemat {diskon}%
                </span>
              )}
            </div>

            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-y border-slate-100 py-4 text-sm text-slate-600">
              <li className="flex items-center gap-1.5">
                <Package className="h-4 w-4 text-slate-400" aria-hidden="true" />
                {p.stok === null
                  ? "Dibuat setelah dipesan"
                  : p.stok === 0
                    ? "Stok habis"
                    : `Siap kirim · ${p.stok} tersedia`}
              </li>
              {p.berat_gram && (
                <li className="flex items-center gap-1.5">
                  <Scale className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  {p.berat_gram} gram
                </li>
              )}
              {p.berat_gram && (
                <li className="flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  Kirim seluruh Indonesia
                </li>
              )}
            </ul>

            {p.catatan && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-900">
                {p.catatan}
              </p>
            )}

            <div className="mt-6">
              <PesanProduk produk={p} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Keterangan ── */}
      {(p.deskripsi || p.fitur.length > 0 || p.spesifikasi.length > 0) && (
        <section className="border-t border-slate-100 bg-slate-50 px-4 py-12">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="space-y-8">
              {p.deskripsi && (
                <div>
                  <h2 className="mb-3 text-lg font-extrabold text-slate-900">Deskripsi</h2>
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                    {p.deskripsi}
                  </p>
                </div>
              )}

              {p.fitur.length > 0 && (
                <div>
                  <h2 className="mb-3 text-lg font-extrabold text-slate-900">
                    Yang kamu dapat
                  </h2>
                  <ul className="space-y-2">
                    {p.fitur.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-slate-700">
                        <Check className="mt-1 h-4 w-4 flex-shrink-0 text-brand" aria-hidden="true" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {p.spesifikasi.length > 0 && (
              <div>
                <h2 className="mb-3 text-lg font-extrabold text-slate-900">Spesifikasi</h2>
                <dl className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {p.spesifikasi.map((s, i) => (
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
                  {p.berat_gram && (
                    <div className="grid grid-cols-[9rem_1fr] gap-4 border-t border-slate-100 px-4 py-3 text-sm">
                      <dt className="font-semibold text-slate-500">Berat kirim</dt>
                      <dd className="font-medium text-slate-900">{p.berat_gram} gram</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Produk lain ── */}
      {lainnya.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="mb-5 text-lg font-extrabold text-slate-900">
            Lainnya di {kategori ?? etalase?.nama ?? "katalog"}
          </h2>
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {lainnya.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/produk/${l.slug}`}
                  className="block rounded-2xl border border-slate-200 p-4 transition-colors hover:border-brand"
                >
                  <span className="block font-bold leading-snug text-slate-900">
                    {l.nama}
                  </span>
                  {l.subjudul && (
                    <span className="mt-1 block text-xs text-slate-600">{l.subjudul}</span>
                  )}
                  <span className="mt-2 block font-extrabold text-brand">
                    {l.harga_mulai ? "mulai " : ""}
                    {formatRupiah(l.harga)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="border-t border-slate-100 px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href={etalase ? `/etalase/${etalase.slug}` : "/"}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke {etalase?.nama ?? "beranda"}
          </Link>
        </div>
      </div>
    </div>
  );
}
