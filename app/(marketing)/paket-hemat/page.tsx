import type { Metadata } from "next";
import { NavbarUtama } from "@/components/ui/NavbarUtama";
import { IsiEtalase } from "@/components/katalog/IsiEtalase";
import { ambilEtalase } from "@/lib/katalog/baca";
import { ETALASE } from "@/lib/katalog/tipe";
import { BRAND } from "@/lib/brand";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Paket Hemat Kejar Lulus",
  description:
    `Paket pendampingan BAB 1-5 sampai lulus bersama mentor ${BRAND.name}.`,
};

/**
 * Paket Hemat, dibaca dari katalog.
 *
 * Isi paketnya sengaja belum diisi: dokumen produk hanya menulis "(isi
 * sesuai di poster)" dan posternya belum ada. Mengarang daftar fiturnya
 * berisiko menjanjikan sesuatu yang tidak disepakati, jadi dibiarkan kosong
 * sampai pemilik mengisinya lewat panel admin.
 */
export default async function HalamanPaketHemat() {
  const { etalase, kategori, produk } = await ambilEtalase(ETALASE.paketHemat);

  if (!etalase) {
    return (
      <div className="min-h-screen bg-white">
        <NavbarUtama />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-2xl font-extrabold text-slate-900">Paket Hemat</h1>
          <p className="mt-2 leading-relaxed text-slate-600">
            Katalognya sedang disiapkan. Hubungi kami lewat WhatsApp untuk
            menanyakan paket yang tersedia.
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
