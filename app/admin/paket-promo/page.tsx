import { createClient } from "@/lib/supabase/server";
import { KelolaPaketPromo, type Paket, type Tujuan } from "@/components/admin/KelolaPaketPromo";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Paket Promo | Admin ${BRAND.name}` };

export default async function AdminPaketPromoPage() {
  const supabase = createClient();
  const [{ data, error }, { data: etalase }, { data: produk }] = await Promise.all([
    supabase
      .from("paket_promo")
      .select("id, judul, harga_mulai, satuan, kategori, image_url, fitur, cta_label, cta_href, sort_order, is_active")
      .order("sort_order", { ascending: true }),
    supabase.from("etalase").select("slug, nama").order("urutan"),
    supabase.from("produk").select("slug, nama").eq("is_active", true).order("nama"),
  ]);

  const tujuan: Tujuan[] = [
    ...(etalase ?? []).map((e) => ({ grup: "Etalase (keterangan & daftar jasa)", label: e.nama, href: `/etalase/${e.slug}` })),
    ...[
      ["Pilih jadwal bimbingan", "/jadwal"],
      ["Cek Plagiarisme (Turnitin / AI / Parafrase)", "/cek-plagiarisme"],
      ["Paket hemat", "/paket-hemat"],
      ["Merchandise", "/merchandise"],
    ].map(([label, href]) => ({ grup: "Halaman lain", label, href })),
    ...(produk ?? []).map((p) => ({ grup: "Satu produk langsung", label: p.nama, href: `/produk/${p.slug}` })),
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Paket Promo (Jasa)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kartu &ldquo;Paket Layanan&rdquo; yang bisa digeser di beranda: harga mulai, poster, judul, poin keunggulan,
          dan tombol. Khusus jasa (bimbingan, konsultasi, olah data, cek naskah); merchandise dikelola di menu lain.
        </p>
      </div>
      {error && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tabel paket promo belum ada. Jalankan migration 041 di Supabase SQL Editor.
        </p>
      )}
      <KelolaPaketPromo awal={(data ?? []) as Paket[]} tujuan={tujuan} />
    </div>
  );
}
