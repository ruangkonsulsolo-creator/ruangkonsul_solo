"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FileSearch, Bot, Sparkles, AlertTriangle, CheckCircle2,
  ArrowRight, Loader2, Info, FileText,
} from "lucide-react";
import {
  hitungBiaya,
  hitungKata,
  MAKS_KATA,
  MIN_KATA,
  TARIF,
  type HasilPeriksa,
  type JenisPeriksa,
} from "@/lib/periksa/types";
import { penyediaAktif } from "@/lib/periksa/daftar-penyedia";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export function KotakPeriksa() {
  const [teks, setTeks] = useState("");
  const [jenis, setJenis] = useState<JenisPeriksa>("kemiripan");
  const [memproses, setMemproses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [aksi, setAksi] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilPeriksa | null>(null);

  // Logo penyedia hanya muncul kalau penyedianya benar-benar dikonfigurasi.
  const pKemiripan = penyediaAktif("kemiripan");
  const pAI = penyediaAktif("ai");

  const PILIHAN = [
    {
      nilai: "kemiripan" as const,
      label: "Cek Kemiripan",
      sub: `${rupiah(TARIF.kemiripan)} / 1.000 kata`,
      icon: FileSearch,
      logo: pKemiripan?.logo ?? null,
      namaPenyedia: pKemiripan?.nama ?? null,
    },
    {
      nilai: "ai" as const,
      label: "Indikasi Gaya AI",
      sub: `${rupiah(TARIF.ai)} / 1.000 kata`,
      icon: Bot,
      logo: pAI?.logo ?? null,
      namaPenyedia: pAI?.nama ?? null,
    },
    {
      nilai: "keduanya" as const,
      label: "Keduanya",
      sub: `${rupiah(TARIF.kemiripan + TARIF.ai)} / 1.000 kata`,
      icon: Sparkles,
      logo: null,
      namaPenyedia: null,
    },
  ];

  const jumlahKata = useMemo(() => hitungKata(teks), [teks]);
  const biaya = useMemo(
    () => (jumlahKata > 0 ? hitungBiaya(jumlahKata, jenis) : 0),
    [jumlahKata, jenis]
  );

  const terlaluPendek = jumlahKata > 0 && jumlahKata < MIN_KATA;
  const terlaluPanjang = jumlahKata > MAKS_KATA;
  const siap = jumlahKata >= MIN_KATA && !terlaluPanjang && !memproses;

  async function kirim() {
    setMemproses(true);
    setGalat(null);
    setAksi(null);
    setHasil(null);
    try {
      const res = await fetch("/api/periksa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teks, jenis }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAksi(json.action ?? null);
        throw new Error(json.error ?? "Pemeriksaan gagal.");
      }
      setHasil(json.data);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Pemeriksaan gagal.");
    } finally {
      setMemproses(false);
    }
  }

  return (
    <div>
      {/* ── Pilihan jenis ── */}
      <div
        role="radiogroup"
        aria-label="Jenis pemeriksaan"
        className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {PILIHAN.map((p) => {
          const Icon = p.icon;
          const aktif = jenis === p.nilai;
          return (
            <button
              key={p.nilai}
              type="button"
              role="radio"
              aria-checked={aktif}
              onClick={() => setJenis(p.nilai)}
              className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                aktif
                  ? "border-brand bg-brand-50"
                  : "border-slate-200 bg-white hover:border-brand-200"
              }`}
            >
              {p.logo ? (
                <span className="flex h-10 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-white p-1">
                  <Image
                    src={p.logo}
                    alt={p.namaPenyedia ?? ""}
                    width={112}
                    height={40}
                    className="max-h-full max-w-full object-contain"
                  />
                </span>
              ) : (
                <span
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                    aktif ? "bg-brand text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              )}
              <span className="min-w-0">
                <span className="block font-bold text-slate-900">{p.label}</span>
                <span className="block text-xs font-medium text-slate-500">
                  {p.sub}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Dua kolom: input kiri, hasil kanan ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Kiri: naskah */}
        <div className="flex flex-col rounded-2xl border-2 border-slate-200 bg-white focus-within:border-brand">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <FileText className="h-4 w-4 text-brand" aria-hidden="true" />
            <span className="text-sm font-bold text-slate-900">Naskahmu</span>
          </div>

          <label htmlFor="naskah" className="sr-only">
            Tempel naskahmu
          </label>
          <textarea
            id="naskah"
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            placeholder="Tempel naskahmu di sini — satu bab sekaligus lebih baik daripada seluruh skripsi, karena hasilnya lebih mudah ditindaklanjuti…"
            className="min-h-[340px] flex-1 resize-y px-4 py-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold text-slate-700">
                {jumlahKata.toLocaleString("id-ID")} kata
              </span>
              {terlaluPendek && (
                <span className="text-xs font-medium text-amber-700">
                  min. {MIN_KATA}
                </span>
              )}
              {terlaluPanjang && (
                <span className="text-xs font-medium text-red-700">
                  maks. {MAKS_KATA.toLocaleString("id-ID")}
                </span>
              )}
            </div>
            <span className="text-sm">
              <span className="text-slate-500">Biaya </span>
              <span className="font-extrabold text-brand">{rupiah(biaya)}</span>
            </span>
          </div>

          <div className="border-t border-slate-100 px-4 py-3">
            <button
              type="button"
              onClick={kirim}
              disabled={!siap}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              {memproses ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Memeriksa…
                </>
              ) : (
                <>
                  Periksa sekarang
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Kanan: hasil */}
        <div className="flex flex-col rounded-2xl border-2 border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-brand" aria-hidden="true" />
            <span className="text-sm font-bold text-slate-900">Hasil</span>
            {hasil && (
              <span className="ml-auto text-xs font-medium text-slate-400">
                {hasil.jumlahKata.toLocaleString("id-ID")} kata diperiksa
              </span>
            )}
          </div>

          <div
            aria-live="polite"
            className="min-h-[340px] flex-1 overflow-y-auto px-4 py-4"
          >
            {memproses ? (
              <PanelMemproses />
            ) : galat ? (
              <PanelGalat pesan={galat} aksi={aksi} />
            ) : hasil ? (
              <IsiHasil h={hasil} />
            ) : (
              <PanelKosong />
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs font-medium text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        Naskahmu tidak disimpan di server kami — yang tersimpan hanya jumlah
        kata dan 200 karakter pertama, supaya kamu bisa mengenali kiriman mana
        ini di riwayat.
      </p>
    </div>
  );
}

function PanelKosong() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <FileSearch className="h-10 w-10 text-slate-200" aria-hidden="true" />
      <p className="max-w-xs text-sm font-medium text-slate-500">
        Hasil pemeriksaan muncul di sini, lengkap dengan bagian mana yang perlu
        kamu perbaiki.
      </p>
    </div>
  );
}

function PanelMemproses() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-600">
        Sedang diperiksa. Naskah panjang bisa sampai satu menit.
      </p>
    </div>
  );
}

function PanelGalat({ pesan, aksi }: { pesan: string; aksi: string | null }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-sm font-medium text-red-800">{pesan}</p>
      {aksi === "login" && (
        <Link href="/login" className="mt-1 inline-block text-sm font-bold text-red-900 underline">
          Masuk dulu
        </Link>
      )}
      {aksi === "isi_saldo" && (
        <Link href="/dashboard/paket-saya" className="mt-1 inline-block text-sm font-bold text-red-900 underline">
          Isi saldo
        </Link>
      )}
      {aksi === "belum_aktif" && (
        <a
          href="https://wa.me/62882007483223"
          className="mt-1 inline-block text-sm font-bold text-red-900 underline"
        >
          Hubungi admin
        </a>
      )}
    </div>
  );
}

function IsiHasil({ h }: { h: HasilPeriksa }) {
  return (
    <div className="space-y-5">
      {h.kemiripan && (
        <section>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-extrabold text-slate-900">Kemiripan</h3>
            <span className="text-2xl font-extrabold text-brand">
              {h.kemiripan.persen}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.min(100, h.kemiripan.persen)}%` }}
            />
          </div>
          {h.kemiripan.persenBersitasi > 0 && (
            <p className="mt-2 text-xs font-medium text-slate-600">
              {h.kemiripan.persenBersitasi}% berasal dari kutipan bersitasi —
              itu wajar.
            </p>
          )}

          {h.kemiripan.sumber.length > 0 && (
            <ul className="mt-4 space-y-3">
              {h.kemiripan.sumber.slice(0, 5).map((s, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate font-semibold text-slate-900">
                      {s.url ? (
                        <a
                          href={s.url}
                          className="hover:text-brand hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {s.judul}
                        </a>
                      ) : (
                        s.judul
                      )}
                    </span>
                    <span className="flex-shrink-0 font-bold text-brand">
                      {s.persen}%
                    </span>
                  </div>
                  <p className="mt-1 border-l-2 border-slate-200 pl-3 text-xs text-slate-600">
                    {s.cuplikan}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {h.ai && (
        <section className={h.kemiripan ? "border-t border-slate-100 pt-5" : ""}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-extrabold text-slate-900">Indikasi Gaya AI</h3>
            <span className="text-2xl font-extrabold text-slate-700">
              {h.ai.skor}%
            </span>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-700"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-amber-900">
              {h.ai.peringatan}
            </p>
          </div>

          {h.ai.bagianDitandai.length > 0 && (
            <ul className="mt-4 space-y-2">
              {h.ai.bagianDitandai.slice(0, 5).map((b, i) => (
                <li
                  key={i}
                  className="border-l-2 border-amber-300 pl-3 text-xs text-slate-600"
                >
                  {b.teks}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="rounded-xl border-2 border-brand-200 bg-brand-50 p-4">
        <h3 className="mb-3 font-extrabold text-slate-900">
          Yang bisa kamu kerjakan
        </h3>
        <ul className="space-y-2.5">
          {h.saran.map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs leading-relaxed text-slate-700"
            >
              <CheckCircle2
                className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand"
                aria-hidden="true"
              />
              <span>{s}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/booking"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-light"
        >
          Bedah bersama mentor <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
