"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Loader2, MessageCircle, Plus, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";

export type KodeMentor = {
  id: string;
  kode: string;
  untuk_nama: string | null;
  created_at: string;
  kedaluwarsa_at: string | null;
  aktif: boolean;
  dipakai_at: string | null;
  pemakai: { full_name: string | null } | null;
};

const KOLOM =
  "id, kode, untuk_nama, created_at, kedaluwarsa_at, aktif, dipakai_at, " +
  "pemakai:profiles!kode_mentor_dipakai_oleh_fkey(full_name)";

// Tanpa huruf/angka yang mirip (0/O, 1/I/L) supaya mudah diketik ulang.
const HURUF = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function buatKode(): string {
  const acak = new Uint32Array(6);
  crypto.getRandomValues(acak);
  return "MTR-" + Array.from(acak, (n) => HURUF[n % HURUF.length]).join("");
}

const tgl = (s: string) =>
  new Date(s).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

function statusKode(k: KodeMentor): { label: string; kelas: string } {
  if (k.dipakai_at) return { label: "Terpakai", kelas: "bg-green-100 text-green-700" };
  if (!k.aktif) return { label: "Nonaktif", kelas: "bg-slate-100 text-slate-500" };
  if (k.kedaluwarsa_at && new Date(k.kedaluwarsa_at) < new Date())
    return { label: "Kedaluwarsa", kelas: "bg-amber-100 text-amber-700" };
  return { label: "Siap dipakai", kelas: "bg-blue-100 text-blue-700" };
}

/** Hak akses ditegakkan RLS (kode_mentor_staff_*). */
export function KodeMentorPanel({ awal }: { awal: KodeMentor[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState(awal);
  const [nama, setNama] = useState("");
  const [hari, setHari] = useState(7);
  const [busy, setBusy] = useState<string | null>(null);
  const [disalin, setDisalin] = useState<string | null>(null);
  const [pesan, setPesan] = useState<{ teks: string; ok: boolean } | null>(null);

  async function buat() {
    setBusy("baru");
    setPesan(null);
    const { data: { user } } = await supabase.auth.getUser();
    const kedaluwarsa = hari > 0 ? new Date(Date.now() + hari * 86_400_000).toISOString() : null;
    // Ulangi bila (sangat jarang) kode bentrok dengan yang sudah ada.
    for (let i = 0; i < 3; i++) {
      const { data, error } = await supabase
        .from("kode_mentor")
        .insert({ kode: buatKode(), untuk_nama: nama.trim() || null, kedaluwarsa_at: kedaluwarsa, dibuat_oleh: user?.id })
        .select(KOLOM)
        .single();
      if (!error && data) {
        const baru = data as unknown as KodeMentor;
        setRows((r) => [baru, ...r]);
        setNama("");
        setPesan({ teks: `Kode ${baru.kode} dibuat. Salin atau kirim lewat WhatsApp.`, ok: true });
        setBusy(null);
        return;
      }
      if (error?.code !== "23505") {
        setPesan({ teks: `Gagal membuat kode: ${error?.message}`, ok: false });
        break;
      }
    }
    setBusy(null);
  }

  async function nonaktifkan(k: KodeMentor) {
    if (!confirm(`Nonaktifkan kode ${k.kode}? Kode tidak bisa dipakai lagi.`)) return;
    setBusy(k.id);
    const { error } = await supabase.from("kode_mentor").update({ aktif: false }).eq("id", k.id);
    setBusy(null);
    if (error) return setPesan({ teks: `Gagal: ${error.message}`, ok: false });
    setRows((r) => r.map((x) => (x.id === k.id ? { ...x, aktif: false } : x)));
  }

  async function salin(k: KodeMentor) {
    try {
      await navigator.clipboard.writeText(k.kode);
      setDisalin(k.id);
      setTimeout(() => setDisalin(null), 1500);
    } catch {
      setPesan({ teks: `Salin manual: ${k.kode}`, ok: true });
    }
  }

  function linkWa(k: KodeMentor) {
    const asal = typeof window !== "undefined" ? window.location.origin : "";
    const teks =
      `Halo${k.untuk_nama ? " " + k.untuk_nama : ""}, berikut kode pendaftaran mentor ${BRAND.name}: *${k.kode}*\n\n` +
      `Cara daftar:\n1. Buka ${asal}/login?sebagai=mentor\n2. Klik "Masuk dengan Google"\n` +
      `3. Isi nama, WhatsApp, password, dan kode di atas` +
      (k.kedaluwarsa_at ? `\n\nBerlaku sampai ${tgl(k.kedaluwarsa_at)}.` : "");
    return `https://wa.me/?text=${encodeURIComponent(teks)}`;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <KeyRound className="h-4 w-4 text-[#8B0000]" aria-hidden="true" /> Buat kode baru
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Untuk (opsional)
            <input value={nama} onChange={(e) => setNama(e.target.value)} maxLength={120}
              placeholder="Nama calon mentor"
              className="w-full rounded-md border border-input px-3 py-2 text-sm font-normal" />
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Masa berlaku
            <select value={hari} onChange={(e) => setHari(Number(e.target.value))}
              className="w-full rounded-md border border-input px-3 py-2 text-sm font-normal">
              <option value={1}>1 hari</option>
              <option value={3}>3 hari</option>
              <option value={7}>7 hari</option>
              <option value={30}>30 hari</option>
              <option value={0}>Tanpa batas</option>
            </select>
          </label>
          <button type="button" onClick={buat} disabled={busy === "baru"}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#8B0000] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6B0000] disabled:opacity-60">
            {busy === "baru" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Buat Kode
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Setiap kode hanya bisa dipakai oleh satu akun.</p>
      </div>

      {pesan && (
        <p role="status" className={`rounded-xl px-4 py-2.5 text-sm ${pesan.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {pesan.teks}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-4 py-3">Kode</th>
              <th className="px-4 py-3">Untuk</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Berlaku sampai</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Belum ada kode.</td></tr>
            )}
            {rows.map((k) => {
              const s = statusKode(k);
              const bisaDipakai = s.label === "Siap dipakai";
              return (
                <tr key={k.id}>
                  <td className="px-4 py-3 font-mono font-semibold tracking-wider text-slate-800">{k.kode}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {k.untuk_nama ?? "-"}
                    {k.dipakai_at && (
                      <div className="text-[11px] text-green-700">
                        Dipakai {k.pemakai?.full_name ?? "akun"} · {tgl(k.dipakai_at)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.kelas}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{k.kedaluwarsa_at ? tgl(k.kedaluwarsa_at) : "Tanpa batas"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {bisaDipakai && (
                        <>
                          <button type="button" onClick={() => salin(k)} title="Salin kode"
                            className="rounded-md border px-2 py-1.5 text-slate-600 hover:bg-slate-50">
                            {disalin === k.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                          </button>
                          <a href={linkWa(k)} target="_blank" rel="noopener noreferrer" title="Kirim lewat WhatsApp"
                            className="rounded-md border px-2 py-1.5 text-green-700 hover:bg-green-50">
                            <MessageCircle className="h-4 w-4" />
                          </a>
                          <button type="button" onClick={() => nonaktifkan(k)} disabled={busy === k.id} title="Nonaktifkan"
                            className="rounded-md border px-2 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50">
                            {busy === k.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
