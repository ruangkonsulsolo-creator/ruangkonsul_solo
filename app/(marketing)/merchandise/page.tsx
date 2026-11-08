import type { Metadata } from "next";
import { NavbarUtama } from "@/components/ui/NavbarUtama";
import { IsiEtalase } from "@/components/katalog/IsiEtalase";
import { ambilEtalase } from "@/lib/katalog/baca";
import { ETALASE } from "@/lib/katalog/tipe";
import { BRAND } from "@/lib/brand";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Merchandise",
  description:
    `Buket wisuda, buket uang, buket snack, dan pernak-pernik buatan tangan ` +
    `dari ${BRAND.name}.`,
};

/**
 * Etalase merchandise.
 *
 * Alamatnya dipertahankan di /merchandise meskipun isinya kini datang dari
 * etalase yang sama dengan /etalase/merchandise — tautan lama, navbar, dan
 * apa pun yang sudah dibagikan ke pelanggan tetap bekerja.
 *
 * Isinya dari basis data, bukan lagi daftar yang ditulis di berkas
 * TypeScript. Menambah produk sekarang pekerjaan admin, bukan deploy.
 */
export default async function HalamanMerchandise() {
  const { etalase, kategori, produk } = await ambilEtalase(ETALASE.merchandise);

  if (!etalase) {
    return (
      <div className="min-h-screen bg-white">
        <NavbarUtama />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-2xl font-extrabold text-slate-900">Merchandise</h1>
          <p className="mt-2 leading-relaxed text-slate-600">
            Katalognya sedang disiapkan. Coba lagi sebentar lagi, atau hubungi
            kami lewat WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <NavbarUtama />
      <IsiEtalase etalase={etalase} kategori={kategori} produk={produk} />
    </div>
  );
}
