"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, X, Loader2, Save, AlertCircle, EyeOff,
} from "lucide-react";

/**
 * Pengelolaan testimoni yang tampil sebagai notifikasi di pojok kiri bawah.
 *
 * Tidak ada tombol "isi contoh". Testimoni adalah keterangan tentang
 * pengalaman konsumen, dan contoh karangan yang terlanjur tayang hampir
 * tidak pernah sempat diganti.
 */

export type Testimoni = {
  id: string;
  isi: string;
  penulis: string | null;
  layanan: string | null;
  tautan: string | null;
  urutan: number;
  is_active: boolean;
};

const KOSONG = {
  isi: "", penulis: "", layanan: "", tautan: "", urutan: 0, is_active: true,
};

const input =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none";
const label = "mb-1 block text-xs font-bold text-slate-600";

export function KelolaTestimoni({ awal }: { awal: Testimoni[] }) {
  const router = useRouter();
  const [form, setForm] = useState<(typeof KOSONG & { id?: string }) | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function simpan() {
    if (!form) return;
    setSibuk(true);
    setGalat(null);
    try {
      const r = await fetch("/api/admin/katalog?jenis=testimoni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          isi: form.isi,
          penulis: form.penulis || null,
          layanan: form.layanan || null,
          tautan: form.tautan || null,
          urutan: form.urutan,
          is_active: form.is_active,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setGalat([j.error ?? "Gagal menyimpan.", ...(j.rinci ?? [])].join(" "));
        return;
      }
      setForm(null);
      router.refresh();
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setSibuk(false);
    }
  }

  async function hapus(t: Testimoni) {
    if (!window.confirm("Hapus testimoni ini?")) return;
    setSibuk(true);
    setGalat(null);
    try {
      const r = await fetch(`/api/admin/katalog?jenis=testimoni&id=${t.id}`, {
        method: "DELETE",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setGalat(j.error ?? "Gagal menghapus.");
      else router.refresh();
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="space-y-4">
      {galat && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="flex-1">{galat}</span>
          <button type="button" onClick={() => setGalat(null)} aria-label="Tutup">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setForm({ ...KOSONG, urutan: (awal.length + 1) * 10 })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-light"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Tambah testimoni
        </button>
      </div>

      {awal.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
          <p className="font-semibold text-slate-900">Belum ada testimoni</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-500">
            Selama kosong, notifikasi di pojok kiri bawah situs tidak muncul
            sama sekali. Isi dengan kalimat yang benar-benar dikirim orang —
            dan minta izinnya dulu kalau diambil dari WhatsApp.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {awal.map((t) => (
            <li
              key={t.id}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-slate-800">
                  &ldquo;{t.isi}&rdquo;
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {[t.penulis, t.layanan].filter(Boolean).join(" · ") || "tanpa keterangan"}
                  {!t.is_active && (
                    <span className="ml-2 inline-flex items-center gap-1 font-semibold text-slate-400">
                      <EyeOff className="h-3 w-3" aria-hidden="true" /> nonaktif
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    id: t.id,
                    isi: t.isi,
                    penulis: t.penulis ?? "",
                    layanan: t.layanan ?? "",
                    tautan: t.tautan ?? "",
                    urutan: t.urutan,
                    is_active: t.is_active,
                  })
                }
                className="rounded p-1 text-slate-400 hover:text-brand"
                aria-label="Edit testimoni"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => void hapus(t)}
                className="rounded p-1 text-slate-400 hover:text-red-600"
                aria-label="Hapus testimoni"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900">
                {form.id ? "Edit testimoni" : "Testimoni baru"}
              </h3>
              <button type="button" onClick={() => setForm(null)} aria-label="Tutup">
                <X className="h-4 w-4 text-slate-400 hover:text-slate-700" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className={label}>Isi testimoni</span>
                <textarea
                  rows={3}
                  className={input}
                  maxLength={400}
                  value={form.isi}
                  onChange={(e) => setForm({ ...form, isi: e.target.value })}
                  placeholder="Bimbingannya rapi, jadi tidak macet lagi di BAB 3."
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  {form.isi.length}/400 karakter
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className={label}>Penulis</span>
                  <input
                    className={input}
                    value={form.penulis}
                    placeholder="Mahasiswa S1"
                    onChange={(e) => setForm({ ...form, penulis: e.target.value })}
                  />
                </div>
                <div>
                  <span className={label}>Layanan</span>
                  <input
                    className={input}
                    value={form.layanan}
                    placeholder="Bimbingan Skripsi"
                    onChange={(e) => setForm({ ...form, layanan: e.target.value })}
                  />
                </div>
              </div>
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-900">
                Tulis keterangan umum saja, bukan nama lengkap atau nomor HP.
                UU No. 27 Tahun 2022 memperlakukan keduanya sebagai data
                pribadi, dan untuk menayangkannya kamu perlu izin orangnya.
              </p>
              <div>
                <span className={label}>Tautan saat diklik</span>
                <input
                  className={input}
                  value={form.tautan}
                  placeholder="/bimbingan"
                  onChange={(e) => setForm({ ...form, tautan: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className={label}>Urutan</span>
                  <input
                    type="number"
                    className={input}
                    value={form.urutan}
                    onChange={(e) =>
                      setForm({ ...form, urutan: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  Tampilkan di situs
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void simpan()}
                disabled={sibuk}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-light disabled:opacity-50"
              >
                {sibuk ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
