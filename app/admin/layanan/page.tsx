import { createClient } from "@/lib/supabase/server";
import { LayananConfigForm } from "@/components/admin/LayananConfigForm";
import { BRAND } from "@/lib/brand";
import { SLUG_PERIKSA } from "@/lib/periksa/tarif";
import { SLUG_MANUAL } from "@/lib/periksa/manual";
import type { Metadata } from "next";
export const metadata: Metadata = { title: `Konfigurasi Layanan | Admin ${BRAND.name}` };

export default async function AdminLayananPage() {
  const supabase = createClient();
  // Hanya layanan yang benar-benar dipakai cek naskah real-time (lib/periksa/tarif.ts).
  // Layanan lama (plagiasi, ai-detector, drillbit) tidak lagi dibaca alur mana pun.
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .in("slug", [...Object.values(SLUG_PERIKSA), SLUG_MANUAL.kecil, SLUG_MANUAL.besar, SLUG_MANUAL.drillbit])
    .order("created_at", { ascending: true });
  return (
    <div className="space-y-6 max-w-7xl">
      <div><h2 className="text-xl font-extrabold text-slate-900">Tarif Pemeriksaan Naskah</h2><p className="text-sm text-muted-foreground mt-1">Tarif per 1.000 kata untuk cek naskah real-time (dipotong dari saldo customer), dan tarif per berkas untuk cek plagiarisme manual (laporan diunggah tim, dibayar QRIS). Perubahan langsung berlaku di beranda dan saat pemeriksaan. Nonaktifkan untuk menyembunyikan jenis pemeriksaan.</p></div>
      {(services ?? []).length === 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Layanan periksa belum ada di basis data. Jalankan migration 035 di Supabase SQL Editor.
        </p>
      )}
      <LayananConfigForm services={services ?? []} />
    </div>
  );
}
