import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { KelolaTestimoni, type Testimoni } from "@/components/admin/KelolaTestimoni";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Testimoni | ${BRAND.name}` };
export const dynamic = "force-dynamic";

export default async function AdminTestimoniPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("testimoni")
    .select("id, isi, penulis, layanan, tautan, urutan, is_active")
    .order("urutan");

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-extrabold text-slate-900">Testimoni</h2>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-bold text-amber-900">Tabel testimoni belum ada</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900">
            Jalankan migration{" "}
            <code className="rounded bg-amber-100 px-1 font-mono text-xs">
              032_testimoni_notif.sql
            </code>{" "}
            di SQL Editor Supabase, lalu muat ulang halaman ini.
          </p>
          <p className="mt-2 font-mono text-xs text-amber-800">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Testimoni</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Muncul sebagai notifikasi kecil di pojok kiri bawah halaman publik,
          bergantian setiap 12 detik dan bisa ditutup pembaca.
        </p>
      </div>

      <KelolaTestimoni awal={(data ?? []) as Testimoni[]} />
    </div>
  );
}
