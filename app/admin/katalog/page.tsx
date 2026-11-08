import type { Metadata } from "next";
import { Store, Tags, Package, ImageOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { KelolaKatalog } from "@/components/admin/KelolaKatalog";
import {
  KOLOM_ETALASE, KOLOM_KATEGORI, KOLOM_PRODUK,
  type Etalase, type Kategori, type Produk,
} from "@/lib/katalog/tipe";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Katalog | ${BRAND.name}` };
export const dynamic = "force-dynamic";

/**
 * Satu halaman untuk seluruh barang dan jasa yang dijual.
 *
 * Sebelumnya produk tersebar di empat tabel dengan empat panel berbeda, dan
 * halaman publiknya malah tidak membaca satu pun dari situ. Sekarang apa
 * yang disunting di sini itulah yang tayang di situs.
 */
export default async function AdminKatalogPage() {
  const supabase = createClient();

  const [etalaseRes, kategoriRes, produkRes] = await Promise.all([
    supabase.from("etalase").select(KOLOM_ETALASE).order("urutan"),
    supabase.from("kategori_produk").select(KOLOM_KATEGORI).order("urutan"),
    supabase.from("produk").select(KOLOM_PRODUK).order("urutan"),
  ]);

  // Tabelnya belum ada kalau migration 029 belum dijalankan. Lebih baik
  // mengatakannya terus terang daripada menampilkan panel kosong yang
  // terlihat seperti katalog yang memang belum diisi.
  if (etalaseRes.error) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-extrabold text-slate-900">Katalog</h2>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-bold text-amber-900">Tabel katalog belum ada</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900">
            Jalankan migration{" "}
            <code className="rounded bg-amber-100 px-1 font-mono text-xs">
              029_katalog_terpadu.sql
            </code>{" "}
            lalu{" "}
            <code className="rounded bg-amber-100 px-1 font-mono text-xs">
              031_seed_katalog.sql
            </code>{" "}
            di SQL Editor Supabase, lalu muat ulang halaman ini.
          </p>
          <p className="mt-2 font-mono text-xs text-amber-800">
            {etalaseRes.error.message}
          </p>
        </div>
      </div>
    );
  }

  const etalase = (etalaseRes.data ?? []) as Etalase[];
  const kategori = (kategoriRes.data ?? []) as Kategori[];
  const produk = ((produkRes.data ?? []) as Record<string, unknown>[]).map((p) => ({
    ...p,
    spesifikasi: Array.isArray(p.spesifikasi) ? p.spesifikasi : [],
    fitur: Array.isArray(p.fitur) ? p.fitur : [],
    gambar: Array.isArray(p.gambar) ? p.gambar : [],
  })) as Produk[];

  const tanpaFoto = produk.filter((p) => p.gambar.length === 0).length;

  const kartu = [
    { icon: Store, nilai: String(etalase.length), label: "Etalase" },
    { icon: Tags, nilai: String(kategori.length), label: "Kategori" },
    { icon: Package, nilai: String(produk.length), label: "Produk" },
    { icon: ImageOff, nilai: String(tanpaFoto), label: "Belum ada foto" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Katalog</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Etalase, kategori, dan produk. Perubahan di sini langsung tayang di situs.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kartu.map((k) => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <k.icon className="h-4 w-4 text-brand" aria-hidden="true" />
            </span>
            <p className="text-xl font-extrabold text-slate-900">{k.nilai}</p>
            <p className="text-xs text-slate-500">{k.label}</p>
          </div>
        ))}
      </div>

      <KelolaKatalog etalase={etalase} kategori={kategori} produk={produk} />
    </div>
  );
}
