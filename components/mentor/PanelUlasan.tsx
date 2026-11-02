"use client";

import { useEffect, useState } from "react";
import { Star, Loader2, MessageSquare, Send } from "lucide-react";

/**
 * Daftar ulasan untuk mentor, lengkap dengan kotak balasan.
 *
 * Ringkasan rating dihitung di server dari ulasan yang benar-benar ada —
 * tidak ada angka yang bisa diketik tangan di mana pun pada alur ini.
 */

type Ulasan = {
  id: string;
  rating: number;
  komentar: string | null;
  balasan: string | null;
  penulis: string;
  dibuatPada: string;
};

type Ringkas = { total: number; rata: number; sebaran: number[] };

function Bintang({ nilai, ukuran = "h-4 w-4" }: { nilai: number; ukuran?: string }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${nilai} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((b) => (
        <Star
          key={b}
          className={`${ukuran} ${
            b <= nilai ? "fill-amber-400 text-amber-400" : "text-slate-200"
          }`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export function PanelUlasan() {
  const [data, setData] = useState<Ulasan[]>([]);
  const [ringkas, setRingkas] = useState<Ringkas | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [membalas, setMembalas] = useState<string | null>(null);
  const [draf, setDraf] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

  async function muat() {
    try {
      const r = await fetch("/api/ulasan");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal memuat ulasan.");
      setData(j.data ?? []);
      setRingkas(j.ringkas ?? null);
      setGalat(null);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal memuat ulasan.");
    } finally {
      setMemuat(false);
    }
  }

  useEffect(() => {
    void muat();
  }, []);

  async function simpanBalasan(id: string) {
    const isi = draf.trim();
    if (!isi) return;
    setMenyimpan(true);
    try {
      const r = await fetch("/api/ulasan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, balasan: isi }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal menyimpan balasan.");
      setMembalas(null);
      setDraf("");
      await muat();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan balasan.");
    } finally {
      setMenyimpan(false);
    }
  }

  if (memuat) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="h-5 w-5 animate-spin text-slate-300" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {galat && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {galat}
        </p>
      )}

      {/* ── Ringkasan ── */}
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-[auto_1fr] sm:gap-8">
        <div className="text-center sm:border-r sm:border-slate-100 sm:pr-8">
          <p className="text-4xl font-extrabold text-slate-900">
            {ringkas?.total ? ringkas.rata.toFixed(1) : "—"}
          </p>
          <div className="mt-1 flex justify-center">
            <Bintang nilai={Math.round(ringkas?.rata ?? 0)} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {ringkas?.total ?? 0} ulasan
          </p>
        </div>

        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((b) => {
            const jumlah = ringkas?.sebaran[b - 1] ?? 0;
            const persen = ringkas?.total ? (jumlah / ringkas.total) * 100 : 0;
            return (
              <div key={b} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-slate-500">{b}</span>
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-amber-400"
                    style={{ width: `${persen}%` }}
                  />
                </span>
                <span className="w-6 text-right text-slate-500">{jumlah}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Daftar ── */}
      {data.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
          <p className="font-semibold text-slate-900">Belum ada ulasan</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
            Ulasan muncul setelah klien menyelesaikan sesi bimbingan denganmu.
            Hanya sesi berstatus selesai yang bisa diulas.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((u) => (
            <li key={u.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{u.penulis}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Bintang nilai={u.rating} ukuran="h-3.5 w-3.5" />
                    <span className="text-xs text-slate-400">
                      {new Date(u.dibuatPada).toLocaleDateString("id-ID", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {u.komentar && (
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{u.komentar}</p>
              )}

              {u.balasan ? (
                <div className="mt-4 rounded-xl border-l-2 border-brand bg-brand-50 p-3">
                  <p className="mb-1 text-xs font-bold text-brand">Balasanmu</p>
                  <p className="text-sm leading-relaxed text-slate-700">{u.balasan}</p>
                </div>
              ) : membalas === u.id ? (
                <div className="mt-4">
                  <label htmlFor={`balas-${u.id}`} className="sr-only">Tulis balasan</label>
                  <textarea
                    id={`balas-${u.id}`}
                    value={draf}
                    onChange={(e) => setDraf(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Terima kasih atas masukannya…"
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-brand focus:outline-none"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void simpanBalasan(u.id)}
                      disabled={!draf.trim() || menyimpan}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-light disabled:opacity-40"
                    >
                      {menyimpan ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      Kirim balasan
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMembalas(null); setDraf(""); }}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:border-slate-400"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setMembalas(u.id); setDraf(""); }}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                >
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  Balas ulasan
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
