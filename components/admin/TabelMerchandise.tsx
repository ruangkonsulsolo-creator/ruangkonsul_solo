"use client";

import { useState } from "react";
import { Plus, Save, Loader2, EyeOff, Pencil, X } from "lucide-react";
import { formatRupiah } from "@/lib/utils/format-currency";

export type Produk = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price_idr: number;
  stock: number;
  weight_gram: number | null;
  images: string[];
  is_active: boolean;
  sort_order: number;
};

const KOSONG = {
  name: "", description: "", category: "", price_idr: 0,
  stock: 0, weight_gram: 0, images: [] as string[],
  is_active: true, sort_order: 0,
};

const inputKelas =
  "w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-brand focus:outline-none";

export function TabelMerchandise({ awal }: { awal: Produk[] }) {
  const [daftar, setDaftar] = useState(awal);
  const [sunting, setSunting] = useState<string | "baru" | null>(null);
  const [draf, setDraf] = useState<typeof KOSONG & { id?: string }>(KOSONG);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  function mulaiSunting(p?: Produk) {
    setGalat(null);
    if (p) {
      setSunting(p.id);
      setDraf({
        id: p.id, name: p.name, description: p.description ?? "",
        category: p.category ?? "", price_idr: p.price_idr, stock: p.stock,
        weight_gram: p.weight_gram ?? 0, images: p.images ?? [],
        is_active: p.is_active, sort_order: p.sort_order,
      });
    } else {
      setSunting("baru");
      setDraf({ ...KOSONG });
    }
  }

  async function simpan() {
    setMenyimpan(true);
    setGalat(null);
    try {
      const r = await fetch("/api/admin/merchandise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draf,
          description: draf.description || null,
          category: draf.category || null,
          weight_gram: draf.weight_gram || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.rinci?.join(" · ") ?? j.error ?? "Gagal menyimpan.");
      // Dimuat ulang dari server, bukan ditambal di klien: baris yang baru
      // disimpan bisa berbeda dari yang dikirim (nilai bawaan, trigger).
      window.location.reload();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan produk.");
      setMenyimpan(false);
    }
  }

  async function nonaktifkan(id: string) {
    setMenyimpan(true);
    try {
      const r = await fetch(`/api/admin/merchandise?id=${id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal menonaktifkan.");
      setDaftar((d) => d.map((p) => (p.id === id ? { ...p, is_active: false } : p)));
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menonaktifkan produk.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {daftar.length} produk · {daftar.filter((p) => p.is_active).length} aktif
        </p>
        <button type="button" onClick={() => mulaiSunting()}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-light">
          <Plus className="h-4 w-4" aria-hidden="true" /> Tambah Produk
        </button>
      </div>

      {galat && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {galat}
        </p>
      )}

      {sunting && (
        <div className="rounded-2xl border-2 border-brand bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900">
              {sunting === "baru" ? "Produk Baru" : "Sunting Produk"}
            </h3>
            <button type="button" onClick={() => setSunting(null)}
              className="rounded-lg p-1 text-slate-400 hover:text-slate-700" aria-label="Tutup">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="m-nama" className="mb-1 block text-xs font-bold text-slate-500">Nama produk</label>
              <input id="m-nama" value={draf.name} maxLength={160} className={inputKelas}
                onChange={(e) => setDraf({ ...draf, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="m-kat" className="mb-1 block text-xs font-bold text-slate-500">Kategori</label>
              <input id="m-kat" value={draf.category} maxLength={80} className={inputKelas}
                placeholder="Wisuda / Pakaian / Aksesoris"
                onChange={(e) => setDraf({ ...draf, category: e.target.value })} />
            </div>
            <div>
              <label htmlFor="m-harga" className="mb-1 block text-xs font-bold text-slate-500">Harga (Rp)</label>
              <input id="m-harga" type="number" min={0} value={draf.price_idr} className={inputKelas}
                onChange={(e) => setDraf({ ...draf, price_idr: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <label htmlFor="m-stok" className="mb-1 block text-xs font-bold text-slate-500">Stok</label>
              <input id="m-stok" type="number" min={0} value={draf.stock} className={inputKelas}
                onChange={(e) => setDraf({ ...draf, stock: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <label htmlFor="m-berat" className="mb-1 block text-xs font-bold text-slate-500">Berat kirim (gram)</label>
              <input id="m-berat" type="number" min={0} value={draf.weight_gram} className={inputKelas}
                onChange={(e) => setDraf({ ...draf, weight_gram: Number(e.target.value) || 0 })} />
              <p className="mt-1 text-[10px] text-slate-500">
                Dipakai pembeli memperkirakan ongkir. Salah berat berarti salah ongkir.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="m-desk" className="mb-1 block text-xs font-bold text-slate-500">Deskripsi</label>
              <textarea id="m-desk" value={draf.description} rows={3} maxLength={3000} className={inputKelas}
                onChange={(e) => setDraf({ ...draf, description: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="m-foto" className="mb-1 block text-xs font-bold text-slate-500">
                URL foto (satu per baris)
              </label>
              <textarea id="m-foto" rows={3} className={inputKelas}
                value={draf.images.join("\n")}
                placeholder={"https://…/1.jpg\nhttps://…/2.jpg"}
                onChange={(e) =>
                  setDraf({ ...draf, images: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })
                } />
              <p className="mt-1 text-[10px] text-slate-500">
                Unggah ke Supabase Storage lalu tempel tautannya. Persegi, 1000 × 1000 piksel.
              </p>
            </div>
            <label className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" checked={draf.is_active} className="h-4 w-4 accent-[#8B0000]"
                onChange={(e) => setDraf({ ...draf, is_active: e.target.checked })} />
              <span className="text-sm font-medium text-slate-700">Tampilkan di etalase</span>
            </label>
          </div>

          <button type="button" onClick={() => void simpan()}
            disabled={menyimpan || draf.name.trim().length < 2}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-light disabled:opacity-40">
            {menyimpan ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                       : <Save className="h-4 w-4" aria-hidden="true" />}
            Simpan
          </button>
        </div>
      )}

      {daftar.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
          <p className="font-semibold text-slate-900">Etalase masih kosong</p>
          <p className="mt-1 text-sm text-slate-500">
            Klik &ldquo;Tambah Produk&rdquo; untuk mengisi.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {["Produk", "Kategori", "Harga", "Stok", "Status", "Aksi"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {daftar.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.category ?? "—"}</td>
                  <td className="px-4 py-3 font-bold text-brand">{formatRupiah(p.price_idr)}</td>
                  <td className="px-4 py-3 text-slate-600">{p.stock}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      p.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {p.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => mulaiSunting(p)}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-brand hover:text-brand"
                        aria-label={`Sunting ${p.name}`}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      {p.is_active && (
                        <button type="button" onClick={() => void nonaktifkan(p.id)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-red-300 hover:text-red-700"
                          aria-label={`Nonaktifkan ${p.name}`}>
                          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
