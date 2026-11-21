import { permanentRedirect } from "next/navigation";

/**
 * Alamat lama halaman produk merchandise.
 *
 * Semua produk — merchandise maupun paket bimbingan — kini punya satu
 * halaman di /produk/<slug>. Tautan yang sudah terlanjur dibagikan ke
 * pelanggan tetap diarahkan ke sana, bukan jatuh ke 404.
 */
export default function ProdukMerchandiseLama({
  params,
}: {
  params: { slug: string };
}) {
  permanentRedirect(`/produk/${params.slug}`);
}
