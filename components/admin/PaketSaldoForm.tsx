"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils/format-currency";

type Paket = {
  id: string;
  nama: string;
  harga_idr: number;
  saldo_idr: number;
  is_active: boolean;
  is_populer: boolean;
  urutan: number;
};

/** Kelola paket isi saldo. Hak akses ditegakkan RLS (paket_saldo_all_staff). */
export function PaketSaldoForm({ paket: awal }: { paket: Paket[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [rows, setRows] = useState(awal);
  const [busy, setBusy] = useState<string | null>(null);
  const [pesan, setPesan] = useState<{ teks: string; ok: boolean } | null>(null);

  const ubah = (id: string, f: keyof Paket, v: unknown) =>
    setRows((r) => r.map((p) => (p.id === id ? { ...p, [f]: v } : p)));

  async function simpan(p: Paket) {
    if (p.harga_idr < 10000) return setPesan({ teks: "Harga minimal Rp10.000.", ok: false });
    if (p.saldo_idr < p.harga_idr) return setPesan({ teks: "Saldo yang didapat tidak boleh lebih kecil dari harga.", ok: false });
    setBusy(p.id);
    const { error } = await supabase
      .from("paket_saldo")
      .update({ nama: p.nama, harga_idr: p.harga_idr, saldo_idr: p.saldo_idr, is_active: p.is_active, is_populer: p.is_populer, urutan: p.urutan })
      .eq("id", p.id);
    setBusy(null);
    setPesan(error ? { teks: `Gagal menyimpan: ${error.message}`, ok: false } : { teks: `${p.nama} tersimpan.`, ok: true });
  }

  async function tambah() {
    setBusy("baru");
    const urutan = Math.max(0, ...rows.map((r) => r.urutan)) + 1;
    const { data, error } = await supabase
      .from("paket_saldo")
      .insert({ nama: "Paket baru", harga_idr: 20000, saldo_idr: 20000, is_active: false, urutan })
      .select("id, nama, harga_idr, saldo_idr, is_active, is_populer, urutan")
      .single();
    setBusy(null);
    if (error || !data) return setPesan({ teks: `Gagal menambah: ${error?.message}`, ok: false });
    setRows((r) => [...r, data as Paket]);
    setPesan({ teks: "Paket baru ditambahkan (nonaktif). Atur lalu simpan.", ok: true });
  }

  async function hapus(p: Paket) {
    if (!confirm(`Hapus ${p.nama}? Pembelian lama tetap tercatat.`)) return;
    setBusy(p.id);
    const { error } = await supabase.from("paket_saldo").delete().eq("id", p.id);
    setBusy(null);
    if (error) return setPesan({ teks: `Gagal menghapus: ${error.message}`, ok: false });
    setRows((r) => r.filter((x) => x.id !== p.id));
    router.refresh();
  }

  const input = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none";
  return (
    <div className="space-y-4">
      {rows.map((p) => {
        const bonus = p.saldo_idr - p.harga_idr;
        return (
          <div key={p.id} className={`rounded-2xl border bg-white ${p.is_active ? "border-slate-200" : "border-dashed border-slate-300 opacity-70"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
              <input className="rounded-md border border-transparent bg-transparent px-1 font-bold text-slate-900 hover:border-slate-200 focus:border-brand focus:outline-none" value={p.nama} onChange={(e) => ubah(p.id, "nama", e.target.value)} aria-label="Nama paket" />
              <div className="flex items-center gap-2 text-xs">
                <button type="button" onClick={() => ubah(p.id, "is_populer", !p.is_populer)} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-bold ${p.is_populer ? "border-brand bg-brand text-white" : "border-slate-200 text-slate-500"}`}>
                  <Star className="h-3 w-3" aria-hidden="true" /> Populer
                </button>
                <button type="button" onClick={() => ubah(p.id, "is_active", !p.is_active)} className={`rounded-full border px-2.5 py-1 font-bold ${p.is_active ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 text-slate-500"}`}>
                  {p.is_active ? "Aktif" : "Nonaktif"}
                </button>
                <button type="button" onClick={() => hapus(p)} disabled={busy === p.id} className="rounded-full p-1.5 text-slate-400 hover:text-red-600" aria-label={`Hapus ${p.nama}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-4">
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                Harga dibayar (Rp)
                <input type="number" min={10000} step={1000} className={input} value={p.harga_idr} onChange={(e) => ubah(p.id, "harga_idr", parseInt(e.target.value) || 0)} />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                Saldo didapat (Rp)
                <input type="number" min={p.harga_idr} step={500} className={input} value={p.saldo_idr} onChange={(e) => ubah(p.id, "saldo_idr", parseInt(e.target.value) || 0)} />
              </label>
              <div className="space-y-1 text-xs font-semibold text-slate-600">
                Bonus
                <p className={`rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold ${bonus > 0 ? "text-green-700" : "text-slate-500"}`}>
                  {bonus > 0 ? `+${formatRupiah(bonus)} (${Math.round((bonus / Math.max(1, p.harga_idr)) * 100)}%)` : "Tanpa bonus"}
                </p>
              </div>
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                Urutan tampil
                <input type="number" className={input} value={p.urutan} onChange={(e) => ubah(p.id, "urutan", parseInt(e.target.value) || 0)} />
              </label>
            </div>
            <div className="flex justify-end px-5 pb-4">
              <button type="button" onClick={() => simpan(p)} disabled={busy === p.id} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
              </button>
            </div>
          </div>
        );
      })}
      <button type="button" onClick={tambah} disabled={busy === "baru"} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-brand hover:text-brand">
        {busy === "baru" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Tambah paket
      </button>
      {pesan && <p role="status" className={`text-sm ${pesan.ok ? "text-green-700" : "text-red-600"}`}>{pesan.teks}</p>}
    </div>
  );
}
