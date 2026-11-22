import { createClient } from "@/lib/supabase/server";
import { KelolaHeroSlide, type Slide } from "@/components/admin/KelolaHeroSlide";
import { KelolaBannerStrip, type BannerStrip } from "@/components/admin/KelolaBannerStrip";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Banner Beranda | Admin ${BRAND.name}` };

export default async function AdminBannerPage() {
  const supabase = createClient();
  const [hero, strip] = await Promise.all([
    supabase
      .from("hero_slides")
      .select("id, image_url, alt, badge, hook, cta_label, cta_href, sort_order, is_active")
      .order("sort_order", { ascending: true }),
    supabase
      .from("banners")
      .select("id, title, image_url, link_url, sort_order, is_active")
      .order("sort_order", { ascending: true }),
  ]);

  return (
    <div className="max-w-5xl space-y-10">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Banner Beranda</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dua jenis banner di beranda. Tambah, ganti gambar, ubah teks & link, atur urutan, sembunyikan, atau hapus.
        </p>
        <nav className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <a href="#utama" className="rounded-full border px-3 py-1 text-slate-600 hover:border-[#8B0000] hover:text-[#8B0000]">1. Banner utama (kanan judul)</a>
          <a href="#strip" className="rounded-full border px-3 py-1 text-slate-600 hover:border-[#8B0000] hover:text-[#8B0000]">2. Banner strip (lebar penuh)</a>
        </nav>
      </div>

      <section id="utama" className="scroll-mt-6 space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">1. Banner utama</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Slide potret di sebelah kanan judul besar beranda.</p>
        </div>
        {hero.error && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Tabel banner belum ada. Jalankan migration 040 di Supabase SQL Editor. Sementara itu beranda memakai banner bawaan.
          </p>
        )}
        <KelolaHeroSlide awal={(hero.data ?? []) as Slide[]} />
      </section>

      <section id="strip" className="scroll-mt-6 space-y-4 border-t pt-8">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">2. Banner strip</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Banner memanjang yang bergeser di bawah logo kampus (mis. RK Merchandise).
          </p>
        </div>
        {strip.error && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Tabel banners belum ada. Jalankan migration 016 di Supabase SQL Editor.
          </p>
        )}
        <KelolaBannerStrip awal={(strip.data ?? []) as BannerStrip[]} />
      </section>
    </div>
  );
}
