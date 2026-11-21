import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NavbarUtama } from "@/components/ui/NavbarUtama";
import { IsiEtalase } from "@/components/katalog/IsiEtalase";
import { ambilEtalase } from "@/lib/katalog/baca";
import { BRAND } from "@/lib/brand";

export const revalidate = 120;

/**
 * Halaman daftar untuk satu etalase, apa pun etalasenya.
 *
 * Dibuat umum supaya etalase baru yang dibuat admin lewat panel langsung
 * punya halamannya sendiri tanpa perlu menulis kode. Itu syarat supaya
 * "admin bisa menambah etalase" benar-benar berarti sesuatu — menambah
 * baris di basis data percuma kalau halamannya tetap harus dibuat
 * programmer.
 */

export async function generateMetadata({
  params,
}: { params: { slug: string } }): Promise<Metadata> {
  const { etalase } = await ambilEtalase(params.slug);
  if (!etalase) return { title: "Etalase tidak ditemukan" };
  return {
    title: etalase.nama,
    description: etalase.deskripsi ?? `${etalase.nama} — ${BRAND.name}.`,
  };
}

export default async function HalamanEtalase({
  params,
}: { params: { slug: string } }) {
  const { etalase, kategori, produk } = await ambilEtalase(params.slug);
  if (!etalase) return notFound();

  return (
    <div className="min-h-screen bg-white">
      <NavbarUtama />
      <IsiEtalase etalase={etalase} kategori={kategori} produk={produk} />
    </div>
  );
}
