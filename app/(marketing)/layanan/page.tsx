import type { Metadata } from "next";
import { NavbarUtama } from "@/components/ui/NavbarUtama";
import { IsiEtalase } from "@/components/katalog/IsiEtalase";
import { ambilEtalase } from "@/lib/katalog/baca";
import { ETALASE } from "@/lib/katalog/tipe";
import { BRAND } from "@/lib/brand";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Layanan Utama",
  description:
    `Bimbingan tatap muka Solo-Jogja, penyusunan jurnal penelitian, dan ` +
    `olah data bersama mentor ${BRAND.name}.`,
};

/**
 * Layanan utama, dibaca dari katalog.
 *
 * Daftar harga yang dulu ditulis di berkas ini sudah dihapus. Satu daftar
 * harga di satu tempat — kalau ada dua, cepat atau lambat keduanya berbeda
 * dan pelanggan yang menemukannya.
 */
export default async function HalamanLayanan() {
  const { etalase, kategori, produk } = await ambilEtalase(ETALASE.layananUtama);

  if (!etalase) {
    return (
      <div className="min-h-screen bg-white">
        <NavbarUtama />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-2xl font-extrabold text-slate-900">Layanan Utama</h1>
          <p className="mt-2 leading-relaxed text-slate-600">
            Katalognya sedang disiapkan. Hubungi kami lewat WhatsApp untuk
            menanyakan layanan yang tersedia.
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
