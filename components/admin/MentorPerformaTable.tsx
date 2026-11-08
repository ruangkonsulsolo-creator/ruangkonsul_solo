"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Star, CalendarDays, TrendingUp, AlertTriangle,
  UserPlus, EyeOff, Eye, ArrowDownCircle, Phone,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils/format-currency";
import { formatTanggal } from "@/lib/utils/format-tanggal";

export type Performa = {
  mentor_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  specializations: string[] | null;
  price_per_hour: number;
  is_available: boolean;
  whatsapp: string | null;
  sesi_selesai: number;
  sesi_terkonfirmasi: number;
  sesi_menunggu: number;
  sesi_batal: number;
  sesi_bolos: number;
  selesai_bulan_ini: number;
  pendapatan_total: number;
  pendapatan_bulan_ini: number;
  rating_rata: number | null;
  jumlah_penilaian: number;
  sesi_terakhir: string | null;
  slot_terbuka: number;
};

export type CalonMentor = { id: string; full_name: string | null; email: string | null };



function inisial(n: string) {
  return n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function MentorPerformaTable({
  performa, calon,
}: { performa: Performa[]; calon: CalonMentor[] }) {
  const router = useRouter();
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [pesan, setPesan] = useState<{ teks: string; galat: boolean } | null>(null);
  const [bukaForm, setBukaForm] = useState(false);
  const [pilih, setPilih] = useState("");
  const [harga, setHarga] = useState("150000");
  const [bidang, setBidang] = useState("");

  async function kirim(body: Record<string, unknown>, kunci: string) {
    setSibuk(kunci);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan.");
      setPesan({ teks: json.message, galat: false });
      router.refresh();
    } catch (e) {
      setPesan({ teks: e instanceof Error ? e.message : "Gagal.", galat: true });
    } finally {
      setSibuk(null);
    }
  }

  return (
    <div className="space-y-6">
      {pesan && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            pesan.galat
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {pesan.teks}
        </p>
      )}

      {/* ── Angkat mentor baru ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <button
          type="button"
          onClick={() => setBukaForm((v) => !v)}
          className="flex items-center gap-2 text-sm font-bold text-brand"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {bukaForm ? "Tutup form" : "Angkat mentor baru"}
        </button>

        {bukaForm && (
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!pilih) return;
              void kirim(
                {
                  user_id: pilih,
                  aksi: "angkat",
                  price_per_hour: Number(harga),
                  specializations: bidang
                    .split(",").map((s) => s.trim()).filter(Boolean),
                },
                "angkat"
              );
              setBukaForm(false);
              setPilih("");
              setBidang("");
            }}
          >
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-semibold text-slate-700">
                Pilih akun
              </span>
              <select
                required
                value={pilih}
                onChange={(e) => setPilih(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">— pilih customer —</option>
                {calon.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name || "(tanpa nama)"} — {c.email}
                  </option>
                ))}
              </select>
              {calon.length === 0 && (
                <span className="mt-1 block text-xs text-slate-400">
                  Belum ada customer yang bisa diangkat. Mereka harus mendaftar
                  lebih dulu lewat halaman daftar.
                </span>
              )}
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-semibold text-slate-700">
                Tarif per sesi (Rp)
              </span>
              <input
                type="number" min={0} step={1000} required
                value={harga} onChange={(e) => setHarga(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-semibold text-slate-700">
                Bidang <span className="font-normal text-slate-400">(pisahkan koma)</span>
              </span>
              <input
                type="text" placeholder="Metodologi Kuantitatif, SPSS"
                value={bidang} onChange={(e) => setBidang(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>

            <button
              type="submit"
              disabled={sibuk === "angkat" || !pilih}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2 sm:justify-self-start"
            >
              {sibuk === "angkat" ? "Menyimpan…" : "Angkat jadi mentor"}
            </button>
          </form>
        )}
      </div>

      {/* ── Daftar kinerja ── */}
      {performa.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Belum ada mentor. Angkat satu customer jadi mentor untuk mulai.
        </p>
      ) : (
        <div className="space-y-4">
          {performa.map((m) => {
            const nama = m.display_name ?? "Mentor";
            const totalSesi =
              m.sesi_selesai + m.sesi_batal + m.sesi_bolos;
            const persenBatal =
              totalSesi > 0
                ? Math.round(((m.sesi_batal + m.sesi_bolos) / totalSesi) * 100)
                : 0;

            return (
              <div
                key={m.mentor_id}
                className={`rounded-2xl border bg-white p-5 ${
                  m.is_available ? "border-slate-200" : "border-slate-200 opacity-60"
                }`}
              >
                <div className="flex flex-wrap items-start gap-4">
                  {m.avatar_url ? (
                    <Image
                      src={m.avatar_url} alt={`Foto ${nama}`} width={56} height={56}
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-brand-100"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-lg font-extrabold text-brand ring-2 ring-brand-100">
                      {inisial(nama)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-slate-900">{nama}</h3>
                      {!m.is_available && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                          Nonaktif
                        </span>
                      )}
                      {m.slot_terbuka === 0 && m.is_available && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                          Tidak ada slot terbuka
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-400">
                      {(m.specializations ?? []).join(" · ") || "Belum ada bidang"}
                      {" · "}
                      {formatRupiah(m.price_per_hour)} / sesi
                    </p>
                    {m.whatsapp && (
                      <a
                        href={`https://wa.me/${m.whatsapp.replace(/\D/g, "")}`}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                      >
                        <Phone className="h-3 w-3" aria-hidden="true" /> {m.whatsapp}
                      </a>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={sibuk === m.user_id}
                      onClick={() =>
                        void kirim(
                          { user_id: m.user_id, aksi: m.is_available ? "nonaktifkan" : "aktifkan" },
                          m.user_id
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {m.is_available ? (
                        <><EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> Sembunyikan</>
                      ) : (
                        <><Eye className="h-3.5 w-3.5" aria-hidden="true" /> Tampilkan</>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={sibuk === m.user_id}
                      onClick={() => {
                        if (!confirm(`Turunkan ${nama} dari mentor? Riwayat sesinya tetap tersimpan.`)) return;
                        void kirim({ user_id: m.user_id, aksi: "turunkan" }, m.user_id);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    >
                      <ArrowDownCircle className="h-3.5 w-3.5" aria-hidden="true" /> Turunkan
                    </button>
                  </div>
                </div>

                {/* Angka kinerja */}
                <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    { label: "Sesi selesai", val: m.sesi_selesai, icon: CalendarDays },
                    { label: "Bulan ini", val: m.selesai_bulan_ini, icon: TrendingUp },
                    { label: "Menunggu", val: m.sesi_menunggu + m.sesi_terkonfirmasi },
                    { label: "Slot terbuka", val: m.slot_terbuka },
                    {
                      label: `Batal & bolos${persenBatal > 0 ? ` (${persenBatal}%)` : ""}`,
                      val: m.sesi_batal + m.sesi_bolos,
                      waspada: persenBatal >= 20,
                    },
                    {
                      label: `Rating (${m.jumlah_penilaian})`,
                      val: m.rating_rata ?? "—",
                      icon: Star,
                    },
                  ].map((s) => (
                    <div key={s.label}>
                      <dd
                        className={`text-xl font-extrabold ${
                          s.waspada ? "text-red-600" : "text-slate-900"
                        }`}
                      >
                        {s.val}
                      </dd>
                      <dt className="text-xs text-slate-400">{s.label}</dt>
                    </div>
                  ))}
                </dl>

                <div className="mt-4 flex flex-wrap gap-5 border-t border-slate-100 pt-3 text-sm">
                  <span className="text-slate-500">
                    Pendapatan total{" "}
                    <strong className="font-bold text-slate-900">
                      {formatRupiah(m.pendapatan_total)}
                    </strong>
                  </span>
                  <span className="text-slate-500">
                    Bulan ini{" "}
                    <strong className="font-bold text-brand">
                      {formatRupiah(m.pendapatan_bulan_ini)}
                    </strong>
                  </span>
                  <span className="text-slate-400">
                    Sesi terakhir{" "}
                    {m.sesi_terakhir
                      ? formatTanggal(m.sesi_terakhir)
                      : "belum ada"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
