import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { KartuProduk } from "@/components/katalog/KartuProduk";
import { AlurJasa } from "@/components/katalog/AlurJasa";
import { BRAND, waLink } from "@/lib/brand";
import type { Etalase, Kategori, Produk } from "@/lib/katalog/tipe";

/**
 * Isi halaman satu etalase.
 *
 * Dipisah dari halamannya supaya /merchandise dan /etalase/<slug> memakai
 * tampilan yang sama persis, bukan dua salinan yang perlahan berbeda.
 */
export function IsiEtalase({
  etalase,
  kategori,
  produk,
  tanpaKepala = false,
  tanpaPenutup = false,
}: {
  etalase: Etalase;
  kategori: Kategori[];
  produk: Produk[];
  /** Halaman yang sudah punya hero sendiri mematikan kepala di sini. */
  tanpaKepala?: boolean;
  /** Dua etalase dalam satu halaman cukup satu tombol pulang di bawah. */
  tanpaPenutup?: boolean;
}) {
  // Produk tanpa kategori tetap harus tampil, jadi dikumpulkan di kelompok
  // terakhir alih-alih hilang diam-diam dari halaman.
  const kelompok = [
    ...kategori.map((k) => ({
      nama: k.nama,
      isi: produk.filter((p) => p.kategori_id === k.id),
    })),
    {
      nama: kategori.length === 0 && produk.length > 0 && produk.every((p) => p.jasa_berkas) ? "Pilihan jasa" : "Lainnya",
      isi: produk.filter((p) => p.kategori_id === null),
    },
  ].filter((g) => g.isi.length > 0);

  // Etalase berisi jasa berkas → tampil sebagai halaman "Keterangan & daftar jasa".
  const jasa = produk.filter((p) => p.jasa_berkas);
  const etalaseJasa = produk.length > 0 && jasa.length === produk.length;

  return (
    <>
      {!tanpaKepala && (
      <section className="bg-brand-50 px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-0.5 w-8 rounded-full bg-brand" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand">
              {etalaseJasa ? "Layanan Jasa" : "Katalog"}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight text-slate-900 lg:text-4xl">
            {etalase.nama}
          </h1>
          {etalase.deskripsi && (
            <p className="mt-3 max-w-2xl whitespace-pre-line leading-relaxed text-slate-600">
              {etalase.deskripsi}
            </p>
          )}
          {produk.length > 0 && (
            <p className="mt-4 text-sm font-semibold text-slate-500">
              {produk.length} {etalaseJasa ? "pilihan jasa" : "produk"}
            </p>
          )}
          {jasa.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Cara pesan</p>
              <AlurJasa estimasi={jasa[0].estimasi_proses} />
            </div>
          )}
        </div>
      </section>
      )}

      <div className="mx-auto max-w-6xl px-4 py-12">
        {kelompok.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="font-semibold text-slate-900">
              Belum ada produk di etalase ini
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
              Hubungi kami lewat WhatsApp untuk menanyakan apa yang tersedia.
            </p>
            <a
              href={waLink(`Halo ${BRAND.name}, saya mau tanya soal ${etalase.nama}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-light"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Tanya lewat WhatsApp
            </a>
          </div>
        ) : (
          <div className="space-y-12">
            {kelompok.map((g) => (
              <section key={g.nama}>
                <h2 className="mb-5 flex items-center gap-2 text-lg font-extrabold text-slate-900">
                  {g.nama}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                    {g.isi.length}
                  </span>
                </h2>
                {/* Produk bergambar tanpa daftar fitur (merchandise) → 2 kolom di HP. */}
                <ul className={`grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4 ${
                  g.isi.every((p) => p.gambar.length > 0 && p.fitur.length === 0) ? "grid-cols-2" : "grid-cols-1"
                }`}>
                  {g.isi.map((p) => (
                    <li key={p.id}>
                      <KartuProduk produk={p} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {!tanpaPenutup && (
      <div className="border-t border-slate-100 px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke beranda
          </Link>
        </div>
      </div>
      )}
    </>
  );
}
