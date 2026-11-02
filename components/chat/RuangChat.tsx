"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Loader2, ArrowLeft, Search } from "lucide-react";

/**
 * Ruang chat konsultasi bimbingan, dipakai sisi mentor maupun customer.
 *
 * Komponen yang sama melayani keduanya karena percakapannya memang satu
 * benda yang sama dilihat dari dua arah — membuat dua komponen terpisah
 * berarti dua tempat yang harus diperbaiki setiap kali ada perubahan, dan
 * dua tempat yang bisa berbeda perilakunya tanpa ketahuan.
 *
 * ── SOAL PEMBARUAN ────────────────────────────────────────────────────────
 *
 * Pesan baru diambil dengan polling tiap 4 detik, bukan Supabase Realtime.
 * Realtime perlu dinyalakan per tabel di dasbor dan menambah sambungan
 * WebSocket yang harus dijaga; untuk percakapan konsultasi yang ramainya
 * sedang, jeda 4 detik tidak terasa. Polling hanya meminta pesan yang lebih
 * baru dari yang sudah ada di layar, jadi tiap denyutnya murah.
 *
 * Polling berhenti saat tab tidak terlihat. Tanpa itu, tab yang tertinggal
 * terbuka semalaman tetap memanggil server tiap 4 detik tanpa ada yang
 * membacanya.
 */

const JEDA_POLLING = 4000;

type Percakapan = {
  id: string;
  mentorId: string;
  lawan: { nama: string; avatar: string | null; keterangan: string };
  terakhir: { isi: string; dibuat: string } | null;
  belumDibaca: number;
  pesanTerakhirPada: string;
};

type Pesan = {
  id: string;
  saya: boolean;
  isi: string;
  dibacaPada: string | null;
  dibuatPada: string;
};

function jam(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

function tanggalPendek(iso: string): string {
  const d = new Date(iso);
  const kini = new Date();
  const sameDay = d.toDateString() === kini.toDateString();
  if (sameDay) return jam(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/** Pemisah tanggal di antara pesan, supaya riwayat panjang tetap terbaca. */
function labelHari(iso: string): string {
  const d = new Date(iso);
  const kini = new Date();
  const kemarin = new Date(kini);
  kemarin.setDate(kini.getDate() - 1);
  if (d.toDateString() === kini.toDateString()) return "Hari ini";
  if (d.toDateString() === kemarin.toDateString()) return "Kemarin";
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function RuangChat({ peran }: { peran: "mentor" | "customer" }) {
  const [daftar, setDaftar] = useState<Percakapan[]>([]);
  const [aktif, setAktif] = useState<string | null>(null);
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [draf, setDraf] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [cari, setCari] = useState("");

  const bawah = useRef<HTMLDivElement>(null);
  // Disimpan di ref, bukan state: dipakai di dalam interval dan tidak boleh
  // memicu render ulang setiap kali berubah.
  const pesanTerakhir = useRef<string | null>(null);

  const muatDaftar = useCallback(async () => {
    try {
      const r = await fetch("/api/chat/percakapan");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal memuat percakapan.");
      setDaftar(j.data ?? []);
      setGalat(null);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal memuat percakapan.");
    } finally {
      setMemuat(false);
    }
  }, []);

  const muatPesan = useCallback(
    async (id: string, tambahan = false) => {
      const url = new URL("/api/chat/pesan", window.location.origin);
      url.searchParams.set("percakapan", id);
      if (tambahan && pesanTerakhir.current) {
        url.searchParams.set("sejak", pesanTerakhir.current);
      }

      const r = await fetch(url);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal memuat pesan.");

      const baru: Pesan[] = j.data ?? [];
      if (baru.length > 0) {
        pesanTerakhir.current = baru[baru.length - 1].dibuatPada;
      }

      setPesan((lama) => {
        if (!tambahan) return baru;
        if (baru.length === 0) return lama;
        // Pesan yang dikirim sendiri sudah masuk daftar sebelum polling
        // menariknya, jadi id yang sudah ada disaring agar tidak dobel.
        const adaId = new Set(lama.map((p) => p.id));
        return [...lama, ...baru.filter((p) => !adaId.has(p.id))];
      });
    },
    []
  );

  // Muat daftar percakapan sekali di awal.
  useEffect(() => {
    void muatDaftar();
  }, [muatDaftar]);

  // Ganti percakapan: muat ulang dari awal.
  useEffect(() => {
    if (!aktif) return;
    pesanTerakhir.current = null;
    setPesan([]);
    void muatPesan(aktif).catch((e) =>
      setGalat(e instanceof Error ? e.message : "Gagal memuat pesan.")
    );
  }, [aktif, muatPesan]);

  // Polling.
  useEffect(() => {
    if (!aktif) return;

    const denyut = () => {
      if (document.visibilityState !== "visible") return;
      void muatPesan(aktif, true).catch(() => {
        // Diam saja: kegagalan sesaat tidak perlu mengganggu percakapan,
        // dan denyut berikutnya akan mencoba lagi.
      });
      void muatDaftar();
    };

    const id = setInterval(denyut, JEDA_POLLING);
    // Saat pengguna kembali ke tab, jangan tunggu denyut berikutnya.
    document.addEventListener("visibilitychange", denyut);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", denyut);
    };
  }, [aktif, muatPesan, muatDaftar]);

  // Gulir ke bawah saat ada pesan baru.
  useEffect(() => {
    bawah.current?.scrollIntoView({ behavior: "smooth" });
  }, [pesan.length]);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    const isi = draf.trim();
    if (!isi || !aktif || mengirim) return;

    setMengirim(true);
    setGalat(null);
    try {
      const r = await fetch("/api/chat/pesan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percakapanId: aktif, isi }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Pesan gagal terkirim.");

      setPesan((l) => [...l, j.data]);
      pesanTerakhir.current = j.data.dibuatPada;
      setDraf("");
      void muatDaftar();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Pesan gagal terkirim.");
    } finally {
      setMengirim(false);
    }
  }

  const terpilih = daftar.find((d) => d.id === aktif) ?? null;
  const tersaring = cari.trim()
    ? daftar.filter((d) =>
        d.lawan.nama.toLowerCase().includes(cari.trim().toLowerCase())
      )
    : daftar;

  return (
    // Tinggi dikunci ke sisa layar supaya hanya daftar dan utas yang
    // bergulir — bukan seluruh halaman. Chat yang ikut menggulung halaman
    // membuat kotak ketik hilang dari pandangan saat percakapan panjang.
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* ── Daftar percakapan ── */}
      <aside
        className={`flex w-full flex-col border-r border-slate-100 sm:w-72 lg:w-80 ${
          aktif ? "hidden sm:flex" : "flex"
        }`}
      >
        <div className="border-b border-slate-100 p-3">
          <h2 className="mb-2 font-extrabold text-slate-900">
            {peran === "mentor" ? "Klien" : "Mentor"}
          </h2>
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama…"
              aria-label="Cari percakapan"
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {memuat ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2
                className="h-5 w-5 animate-spin text-slate-300"
                aria-hidden="true"
              />
            </div>
          ) : tersaring.length === 0 ? (
            <p className="p-4 text-center text-xs leading-relaxed text-slate-500">
              {peran === "mentor"
                ? "Belum ada klien yang memulai percakapan. Chat dibuka oleh customer lebih dulu."
                : "Belum ada percakapan. Buka halaman mentor lalu mulai konsultasi."}
            </p>
          ) : (
            <ul>
              {tersaring.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setAktif(p.id)}
                    className={`flex w-full items-start gap-3 border-b border-slate-50 p-3 text-left transition-colors ${
                      p.id === aktif ? "bg-brand-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
                      {p.lawan.nama.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-bold text-slate-900">
                          {p.lawan.nama}
                        </span>
                        <span className="flex-shrink-0 text-[10px] text-slate-400">
                          {tanggalPendek(p.pesanTerakhirPada)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
                          {p.terakhir?.isi ?? "Belum ada pesan"}
                        </span>
                        {p.belumDibaca > 0 && (
                          <span className="flex h-4 min-w-4 flex-shrink-0 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                            {p.belumDibaca}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Utas percakapan ── */}
      <section className={`flex min-w-0 flex-1 flex-col ${aktif ? "flex" : "hidden sm:flex"}`}>
        {!terpilih ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <MessageSquare
              className="h-10 w-10 text-slate-200"
              aria-hidden="true"
            />
            <p className="max-w-xs text-sm text-slate-500">
              Pilih percakapan di sebelah kiri untuk mulai membaca dan membalas.
            </p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-slate-100 p-3">
              <button
                type="button"
                onClick={() => setAktif(null)}
                className="rounded-lg p-1 text-slate-500 hover:text-brand sm:hidden"
                aria-label="Kembali ke daftar"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
                {terpilih.lawan.nama.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold text-slate-900">
                  {terpilih.lawan.nama}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {terpilih.lawan.keterangan}
                </span>
              </span>
            </header>

            <div className="flex-1 space-y-1 overflow-y-auto bg-[#ECE5DD]/30 p-4">
              {pesan.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">
                  Belum ada pesan. Mulai percakapannya di bawah.
                </p>
              ) : (
                pesan.map((p, i) => {
                  const hariBeda =
                    i === 0 ||
                    new Date(p.dibuatPada).toDateString() !==
                      new Date(pesan[i - 1].dibuatPada).toDateString();
                  return (
                    <div key={p.id}>
                      {hariBeda && (
                        <p className="my-3 text-center">
                          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-500 shadow-sm">
                            {labelHari(p.dibuatPada)}
                          </span>
                        </p>
                      )}
                      <div className={`flex ${p.saya ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                            p.saya
                              ? "rounded-br-sm bg-brand text-white"
                              : "rounded-bl-sm bg-white text-slate-800 shadow-sm"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{p.isi}</p>
                          <p
                            className={`mt-1 text-right text-[10px] ${
                              p.saya ? "text-white/60" : "text-slate-400"
                            }`}
                          >
                            {jam(p.dibuatPada)}
                            {p.saya && p.dibacaPada ? " · Dibaca" : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bawah} />
            </div>

            {galat && (
              <p role="alert" className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800">
                {galat}
              </p>
            )}

            <form onSubmit={kirim} className="flex items-end gap-2 border-t border-slate-100 p-3">
              <label htmlFor="draf" className="sr-only">
                Tulis pesan
              </label>
              <textarea
                id="draf"
                value={draf}
                onChange={(e) => setDraf(e.target.value)}
                onKeyDown={(e) => {
                  // Enter mengirim, Shift+Enter membuat baris baru — kebiasaan
                  // yang sudah dikenal dari aplikasi chat lain.
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void kirim(e as unknown as React.FormEvent);
                  }
                }}
                rows={1}
                maxLength={4000}
                placeholder="Tulis pesan… (Enter kirim, Shift+Enter baris baru)"
                className="max-h-32 min-h-[2.5rem] flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
              <button
                type="submit"
                disabled={!draf.trim() || mengirim}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Kirim pesan"
              >
                {mengirim ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
