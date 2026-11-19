import { createClient } from "@/lib/supabase/server";
import { PaketSaldoForm } from "@/components/admin/PaketSaldoForm";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Paket Isi Saldo | Admin ${BRAND.name}` };

/**
 * Dulu halaman ini mengelola quota_packages (kuota per layanan) dari alur
 * pesanan lama yang sudah tidak dipakai. Cek naskah real-time memotong saldo
 * kredit, jadi yang dijual sekarang adalah paket isi saldo (migration 035).
 */
export default async function AdminPaketPage() {
  const supabase = createClient();
  const { data: paket, error } = await supabase
    .from("paket_saldo")
    .select("id, nama, harga_idr, saldo_idr, is_active, is_populer, urutan")
    .order("urutan", { ascending: true });

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Paket Isi Saldo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paket top-up saldo untuk cek naskah. Customer membayar lewat QRIS, saldo langsung bertambah setelah lunas.
          Isi &ldquo;Saldo didapat&rdquo; lebih besar dari harga untuk memberi bonus.
        </p>
      </div>
      {error && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tabel paket belum ada. Jalankan migration 035 di Supabase SQL Editor.
        </p>
      )}
      <PaketSaldoForm paket={paket ?? []} />
    </div>
  );
}
