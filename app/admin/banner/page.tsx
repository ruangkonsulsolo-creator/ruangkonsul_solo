import { createClient } from "@/lib/supabase/server";
import { KelolaHeroSlide, type Slide } from "@/components/admin/KelolaHeroSlide";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Banner Beranda | Admin ${BRAND.name}` };

export default async function AdminBannerPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("hero_slides")
    .select("id, image_url, alt, badge, hook, cta_label, cta_href, sort_order, is_active")
    .order("sort_order", { ascending: true });

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Banner Beranda</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Slide promo di sebelah kanan judul beranda. Tambah, ganti gambar, ubah teks & tombol, atur urutan,
          sembunyikan, atau hapus. Perubahan langsung tampil di beranda.
        </p>
      </div>
      {error && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tabel banner belum ada. Jalankan migration 040 di Supabase SQL Editor. Sementara itu beranda memakai banner bawaan.
        </p>
      )}
      <KelolaHeroSlide awal={(data ?? []) as Slide[]} />
    </div>
  );
}
