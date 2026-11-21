"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FileSearch, Bot, Wand2, AlertTriangle, CheckCircle2,
  ArrowRight, Loader2, Info, FileText, Upload, Copy, Check, X, FileDown,
  Download,
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
import {
  BerkasTidakDidukung,
  EKSTENSI_DIDUKUNG,
  ekstrakTeks,
} from "@/lib/periksa/ekstrak";
import { formatRupiah } from "@/lib/utils/format-currency";
import { labelAi, labelKemiripan } from "@/lib/periksa/persen-berubah";
import { BATAS_KATA_BESAR, FORMAT_LAPORAN } from "@/lib/periksa/manual";

const rupiah = (n: number) => formatRupiah(n);

export function KotakPeriksa({
  tarif = TARIF,
  aktif = { kemiripan: true, ai: true, parafrase: true },
  manual = { kecil: 15000, besar: 20000, aktif: false, drillbit: 10000, drillbitAktif: false },
  minimum = { kemiripan: 0, ai: 0, parafrase: 0 },
}: {
  /** Tarif per 1.000 kata dari Admin > Tarif Pemeriksaan. */
  tarif?: Record<JenisPeriksa, number>;
  aktif?: Record<JenisPeriksa, boolean>;
  /** Tarif per berkas cek plagiarisme manual (laporan diunggah tim). */
  manual?: { kecil: number; besar: number; aktif: boolean; drillbit: number; drillbitAktif: boolean };
  /** Biaya minimum per pemeriksaan instan. */
  minimum?: Record<JenisPeriksa, number>;
} = {}) {
  const [teks, setTeks] = useState("");
  const [jenis, setJenis] = useState<JenisPeriksa>(
    (["kemiripan", "ai", "parafrase"] as JenisPeriksa[]).find((j) => aktif[j]) ?? "kemiripan"
  );
  const [memproses, setMemproses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [aksi, setAksi] = useState<string | null>(null);
  const [kurang, setKurang] = useState<number>(0);
  const [hasil, setHasil] = useState<HasilPeriksa | null>(null);
  const [namaBerkas, setNamaBerkas] = useState<string | null>(null);
  const [membaca, setMembaca] = useState(false);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [mode, setMode] = useState<"instan" | "manual">("instan");
  const [formatLaporan, setFormatLaporan] = useState<"baru" | "lama">("baru");
  const [jenisManual, setJenisManual] = useState<"turnitin" | "drillbit">("turnitin");
  const [wa, setWa] = useState("");
  const [pesananManual, setPesananManual] = useState<{ nomor: string; lunas: boolean } | null>(null);
  const inputBerkas = useRef<HTMLInputElement>(null);

  // Logo penyedia hanya muncul kalau penyedianya benar-benar dikonfigurasi.
  const pKemiripan = penyediaAktif("kemiripan");
  const pAI = penyediaAktif("ai");

  /**
   * Tiga pilihan dibuat semirip mungkin dengan kartu produk, bukan sekadar
   * tombol: warna aksen, judul, satu baris penjelas, dan contoh pertanyaan
   * yang dijawabnya. Tujuannya supaya pengguna tidak perlu menebak bedanya.
   *
   * Pembeda utamanya teks dalam bahasa Indonesia, bukan logo. Logo penyedia
   * hanya muncul kalau penyedianya memang dikonfigurasi, dan ditaruh kecil
   * di bawah sebagai keterangan sumber — bukan sebagai penanda jenis.
   */
  const PILIHAN = [
    {
      nilai: "kemiripan" as const,
      label: "Cek Plagiarisme",
      ringkas: "Seberapa mirip tulisanmu dengan karya lain",
      jawab: "Bagian mana yang perlu sitasi?",
      harga: rupiah(tarif.kemiripan),
      icon: FileSearch,
      aksen: "text-brand",
      aksenBg: "bg-brand-50",
      aksenBorder: "border-brand",
      penyedia: pKemiripan,
    },
    {
      nilai: "ai" as const,
      label: "Cek Indikasi AI",
      ringkas: "Seberapa mirip gayanya dengan tulisan mesin",
      jawab: "Kalimat mana yang terbaca kaku?",
      harga: rupiah(tarif.ai),
      icon: Bot,
      aksen: "text-slate-800",
      aksenBg: "bg-slate-100",
      aksenBorder: "border-slate-800",
      penyedia: pAI,
    },
    {
      nilai: "parafrase" as const,
      label: "Parafrase",
      ringkas: "Susun ulang kalimatnya dengan bahasa sendiri",
      jawab: "Bagaimana menuliskan ini tanpa menyalin?",
      harga: rupiah(tarif.parafrase),
      icon: Wand2,
      aksen: "text-brand-dark",
      aksenBg: "bg-brand-100",
      aksenBorder: "border-brand-dark",
      penyedia: null,
    },
  ];

  const jumlahKata = useMemo(() => hitungKata(teks), [teks]);
  const biaya = useMemo(
    () => (jumlahKata > 0 ? hitungBiaya(jumlahKata, jenis, tarif, minimum) : 0),
    [jumlahKata, jenis, tarif, minimum]
  );

  const modeManual = jenis === "kemiripan" && manual.aktif && mode === "manual";
  const hargaManual =
    jenisManual === "drillbit" ? manual.drillbit : jumlahKata > BATAS_KATA_BESAR ? manual.besar : manual.kecil;
  const terlaluPendek = jumlahKata > 0 && jumlahKata < MIN_KATA;
  const terlaluPanjang = !modeManual && jumlahKata > MAKS_KATA;
  const siap = modeManual
    ? !!berkas && !memproses
    : jumlahKata >= MIN_KATA && !terlaluPanjang && !memproses;

  /** Mode manual: unggah berkas asli ke penyimpanan privat, buat pesanan, bayar QRIS. */
  async function kirimManual() {
    if (!berkas) return;
    setMemproses(true);
    setGalat(null);
    setAksi(null);
    setHasil(null);
    setPesananManual(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAksi("login");
        throw new Error("Masuk dulu untuk memesan laporan cek plagiarisme.");
      }
      const aman = berkas.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
      const path = `${user.id}/${Date.now()}_${aman}`;
      const { error: eUp } = await supabase.storage.from("documents").upload(path, berkas, { contentType: berkas.type, upsert: false });
      if (eUp) throw new Error(`Gagal mengunggah berkas: ${eUp.message}`);

      const res = await fetch("/api/periksa/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storage_path: path,
          nama_berkas: berkas.name,
          ukuran: berkas.size,
          mime: berkas.type,
          jumlah_kata: jumlahKata,
          jenis_manual: jenisManual,
          format_laporan: jenisManual === "turnitin" ? formatLaporan : undefined,
          whatsapp: wa,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal membuat pesanan.");
      const { openSnap, syncPaymentStatus } = await import("@/lib/payment/use-snap");
      const hasilBayar = await openSnap(json.data.snapToken);
      const status = hasilBayar === "closed" ? null : await syncPaymentStatus({ paymentId: json.data.paymentId });
      setPesananManual({ nomor: json.data.orderNumber, lunas: hasilBayar === "success" || status === "paid" });
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal membuat pesanan.");
    } finally {
      setMemproses(false);
    }
  }

  async function pilihBerkas(f: File) {
    setMembaca(true);
    setGalat(null);
    try {
      const isi = await ekstrakTeks(f.name, await f.arrayBuffer());
      if (!isi.trim()) {
        throw new BerkasTidakDidukung(
          "Berkasnya terbaca, tapi isinya kosong. Kalau naskahmu berupa hasil " +
            "pindaian, teksnya perlu diketik atau disalin dulu."
        );
      }
      setTeks(isi);
      setNamaBerkas(f.name);
      setBerkas(f);
      setHasil(null);
    } catch (e) {
      setNamaBerkas(null);
      setGalat(
        e instanceof Error ? e.message : "Berkas tidak bisa dibaca."
      );
    } finally {
      setMembaca(false);
      // Direset supaya memilih berkas yang sama dua kali tetap memicu onChange.
      if (inputBerkas.current) inputBerkas.current.value = "";
    }
  }

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
        setKurang(Number(json.kurang ?? 0));
        throw new Error(json.error ?? "Pemeriksaan gagal.");
      }
      setHasil(json.data);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Pemeriksaan gagal.");
    } finally {
      setMemproses(false);
    }
  }

  /** Saldo kurang: bayar kekurangannya via QRIS, lalu pemeriksaan dijalankan otomatis. */
  async function bayarLaluPeriksa() {
    setMemproses(true);
    setGalat(null);
    try {
      const res = await fetch("/api/payment/saldo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nominal: Math.max(1000, kurang) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAksi(json.action ?? null);
        throw new Error(json.error ?? "Gagal membuka pembayaran.");
      }
      const { openSnap, syncPaymentStatus } = await import("@/lib/payment/use-snap");
      const hasilBayar = await openSnap(json.data.snap_token);
      if (hasilBayar === "closed") throw new Error("Pembayaran dibatalkan. Naskahmu belum diperiksa.");
      // Tunggu konfirmasi lunas (QRIS biasanya beberapa detik).
      let lunas = hasilBayar === "success";
      for (let i = 0; i < 10 && !lunas; i++) {
        const st = await syncPaymentStatus({ paymentId: json.data.payment_id });
        lunas = st === "paid";
        if (!lunas) await new Promise((r) => setTimeout(r, 3000));
      }
      if (!lunas) throw new Error("Pembayaran belum terkonfirmasi. Kalau sudah membayar, tunggu sebentar lalu klik Periksa sekarang lagi.");
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal membuka pembayaran.");
      setMemproses(false);
      return;
    }
    setMemproses(false);
    await kirim();
  }

  return (
    <div>
      {/* ── Pilihan jenis ── */}
      <div
        role="radiogroup"
        aria-label="Jenis pemeriksaan"
        className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {PILIHAN.filter((p) => aktif[p.nilai]).map((p) => {
          const Icon = p.icon;
          const aktif = jenis === p.nilai;
          return (
            <button
              key={p.nilai}
              type="button"
              role="radio"
              aria-checked={aktif}
              onClick={() => setJenis(p.nilai)}
              className={`flex flex-col rounded-2xl border-2 p-5 text-left transition-all ${
                aktif
                  ? `${p.aksenBorder} ${p.aksenBg} shadow-card`
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="mb-3 flex items-center justify-between gap-2">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    aktif ? `bg-white ${p.aksen}` : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    aktif ? `${p.aksenBorder} ${p.aksen}` : "border-slate-300"
                  }`}
                >
                  {aktif && (
                    <span className="h-2.5 w-2.5 rounded-full bg-current" />
                  )}
                </span>
              </span>

              <span className="block font-extrabold text-slate-900">
                {p.label}
              </span>
              <span className="mt-0.5 block text-xs font-medium text-slate-600">
                {p.ringkas}
              </span>
              <span className="mt-2 block text-xs italic text-slate-500">
                &ldquo;{p.jawab}&rdquo;
              </span>

              <span className="mt-3 flex items-end justify-between gap-2 border-t border-slate-200/70 pt-3">
                <span className="text-sm">
                  <span className={`font-extrabold ${aktif ? p.aksen : "text-slate-700"}`}>
                    {p.harga}
                  </span>
                  <span className="text-xs font-medium text-slate-500"> / 1.000 kata</span>
                  {minimum[p.nilai] > 0 && (
                    <span className="block text-[11px] font-medium text-slate-500">
                      min. {rupiah(minimum[p.nilai])} (di bawah {Math.round(minimum[p.nilai] / tarif[p.nilai]).toLocaleString("id-ID")}.000 kata)
                    </span>
                  )}
                </span>
                {p.penyedia?.logo && (
                  <span className="flex flex-col items-end">
                    <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                      via
                    </span>
                    <Image
                      src={p.penyedia.logo}
                      alt={p.penyedia.nama}
                      width={112}
                      height={40}
                      className="h-4 w-auto object-contain"
                    />
                  </span>
                )}
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

            <input
              ref={inputBerkas}
              type="file"
              accept={EKSTENSI_DIDUKUNG.join(",")}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pilihBerkas(f);
              }}
            />
            <button
              type="button"
              onClick={() => inputBerkas.current?.click()}
              disabled={membaca}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              {membaca ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {membaca ? "Membaca…" : "Unggah berkas"}
            </button>
          </div>

          {namaBerkas && (
            <div className="flex items-center gap-2 border-b border-slate-100 bg-brand-50 px-4 py-2">
              <FileText className="h-3.5 w-3.5 flex-shrink-0 text-brand" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
                {namaBerkas}
              </span>
              <button
                type="button"
                onClick={() => {
                  setNamaBerkas(null);
                  setBerkas(null);
                  setTeks("");
                }}
                className="flex-shrink-0 rounded p-0.5 text-slate-500 transition-colors hover:text-brand"
                aria-label="Hapus berkas dan kosongkan naskah"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {jenis === "kemiripan" && manual.aktif && (
            <div className="space-y-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
              <div role="radiogroup" aria-label="Cara pemeriksaan" className="grid grid-cols-2 gap-2 text-xs font-semibold">
                {([
                  ["instan", "Instan (otomatis)", `${rupiah(tarif.kemiripan)}/1.000 kata`],
                  ["manual", "Laporan oleh tim", `mulai ${rupiah(manual.kecil)}/berkas`],
                ] as const).map(([v, l, h]) => (
                  <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)}
                    className={`rounded-xl border-2 px-3 py-2 text-left transition-colors ${mode === v ? "border-brand bg-white text-brand" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                    <span className="block">{l}</span>
                    <span className="block text-[11px] font-medium text-slate-500">{h}</span>
                  </button>
                ))}
              </div>
              {mode === "manual" && (
                <>
                  {manual.drillbitAktif && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-600">Jenis laporan:</span>
                      {([["turnitin", "Turnitin"], ["drillbit", "DrillBit (plagiasi + AI)"]] as const).map(([v, l]) => (
                        <button key={v} type="button" onClick={() => setJenisManual(v)} aria-pressed={jenisManual === v}
                          className={`rounded-full border px-3 py-1 font-semibold ${jenisManual === v ? "border-brand bg-brand text-white" : "border-slate-300 bg-white text-slate-600"}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  )}
                  {jenisManual === "turnitin" && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-600">Format laporan:</span>
                    {(["baru", "lama"] as const).map((f) => (
                      <button key={f} type="button" onClick={() => setFormatLaporan(f)} aria-pressed={formatLaporan === f}
                        className={`rounded-full border px-3 py-1 font-semibold ${formatLaporan === f ? "border-brand bg-brand text-white" : "border-slate-300 bg-white text-slate-600"}`}>
                        {FORMAT_LAPORAN[f]}
                      </button>
                    ))}
                  </div>
                  )}
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Unggah berkas Word/PDF aslimu. Tim memeriksa dan mengirim laporan PDF asli + persentase
                    (maks. 1×24 jam) ke Riwayat Pesanan.{" "}
                    {jenisManual === "drillbit"
                      ? `DrillBit ${rupiah(manual.drillbit)} per berkas.`
                      : `Turnitin ${rupiah(manual.kecil)} s.d. ±100 halaman, ${rupiah(manual.besar)} di atasnya.`}
                  </p>
                  <input type="tel" inputMode="tel" value={wa} onChange={(e) => setWa(e.target.value)}
                    placeholder="No. WhatsApp untuk kabar laporan (0812…)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                  {!berkas && <p className="text-[11px] font-semibold text-amber-700">Mode ini butuh berkas — klik “Unggah berkas” di atas.</p>}
                </>
              )}
            </div>
          )}

          <label htmlFor="naskah" className="sr-only">
            Tempel naskahmu
          </label>
          <textarea
            id="naskah"
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            placeholder={`Tempel naskahmu di sini, atau unggah berkas ${EKSTENSI_DIDUKUNG.join(" / ")}.\n\nSatu bab sekaligus lebih baik daripada seluruh skripsi — hasilnya lebih mudah ditindaklanjuti.`}
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
              <span className="font-extrabold text-brand">{rupiah(modeManual ? hargaManual : biaya)}</span>
              {modeManual && <span className="text-xs text-slate-500"> /berkas</span>}
            </span>
          </div>

          <div className="border-t border-slate-100 px-4 py-3">
            <button
              type="button"
              onClick={modeManual ? kirimManual : kirim}
              disabled={!siap}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              {memproses ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {modeManual ? "Memproses…" : "Memeriksa…"}
                </>
              ) : (
                <>
                  {modeManual ? "Pesan laporan & bayar" : "Periksa sekarang"}
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
            <span className="text-sm font-bold text-slate-900">
              {hasil
                ? hasil.jenis === "kemiripan"
                  ? "Hasil Cek Plagiarisme"
                  : hasil.jenis === "ai"
                    ? "Hasil Cek Indikasi AI"
                    : "Hasil Parafrase"
                : "Hasil"}
            </span>
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
              <PanelGalat pesan={galat} aksi={aksi} kurang={kurang} onBayar={bayarLaluPeriksa} />
            ) : pesananManual ? (
              <PanelPesananManual nomor={pesananManual.nomor} lunas={pesananManual.lunas} />
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
        Naskah aslimu tidak disimpan utuh di server kami — yang tersimpan hanya
        jumlah kata, 200 karakter pertama, dan hasil pemeriksaan, supaya
        laporannya bisa kamu unduh lagi dari riwayat.
      </p>
    </div>
  );
}

function PanelPesananManual({ nomor, lunas }: { nomor: string; lunas: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <CheckCircle2 className={`h-10 w-10 ${lunas ? "text-green-600" : "text-amber-500"}`} aria-hidden="true" />
      <p className="font-extrabold text-slate-900">{lunas ? "Pesanan diterima" : "Menunggu pembayaran"}</p>
      <p className="max-w-sm text-sm text-slate-600">
        {lunas
          ? `Pesanan ${nomor} sedang diperiksa tim. Persentase kemiripan dan laporan PDF muncul di Riwayat Pesanan (maks. 1×24 jam); kami kabari lewat notifikasi & WhatsApp.`
          : `Pesanan ${nomor} tersimpan. Selesaikan pembayaran QRIS dari Riwayat Pesanan agar laporan diproses.`}
      </p>
      <Link href="/dashboard/riwayat-pesanan" className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-light">
        Buka Riwayat Pesanan <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
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

function PanelGalat({ pesan, aksi, kurang = 0, onBayar }: { pesan: string; aksi: string | null; kurang?: number; onBayar?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-sm font-medium text-red-800">{pesan}</p>
      {aksi === "login" && (
        <Link href="/login" className="mt-1 inline-block text-sm font-bold text-red-900 underline">
          Masuk dulu
        </Link>
      )}
      {aksi === "isi_saldo" && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {onBayar && kurang > 0 && (
            <button type="button" onClick={onBayar}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-light">
              Bayar {formatRupiah(Math.max(1000, Math.ceil(kurang / 500) * 500))} via QRIS & periksa
            </button>
          )}
          <Link href="/dashboard/isi-saldo" className="text-sm font-bold text-red-900 underline">
            atau isi saldo paket (ada bonus)
          </Link>
        </div>
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

/** Kartu ringkas di atas hasil: persentase besar + tombol unduh berkas. */
function RingkasanHasil({ h }: { h: HasilPeriksa }) {
  const data =
    h.jenis === "ai" && h.ai
      ? { label: "Probabilitas tulisan AI", persen: h.ai.skor, vonis: labelAi(h.ai.skor), unduh: "Unduh laporan (PDF)" }
      : h.jenis === "kemiripan" && h.kemiripan
        ? { label: "Tingkat kemiripan", persen: h.kemiripan.persen, vonis: labelKemiripan(h.kemiripan.persen), unduh: "Unduh laporan (PDF)" }
        : h.parafrase
          ? {
              label: "Perubahan susunan kata",
              persen: h.parafrase.persenBerubah ?? null,
              vonis: "Makna & sitasi dipertahankan — tetap baca ulang sebelum dipakai.",
              unduh: "Unduh hasil (Word)",
            }
          : null;
  if (!data) return null;
  const sudut = data.persen == null ? 0 : Math.min(100, Math.max(0, data.persen)) * 3.6;
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-4 sm:flex-row sm:items-center">
      <div
        className="relative mx-auto flex h-28 w-28 shrink-0 items-center justify-center rounded-full sm:mx-0"
        style={{ background: `conic-gradient(#8B0000 ${sudut}deg, #F1E3E3 ${sudut}deg)` }}
        role="img"
        aria-label={`${data.label} ${data.persen ?? "-"} persen`}
      >
        <div className="flex h-[5.5rem] w-[5.5rem] flex-col items-center justify-center rounded-full bg-white">
          <span className="text-2xl font-extrabold text-brand">{data.persen == null ? "—" : `${data.persen}%`}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{data.label}</p>
        <p className="mt-0.5 font-extrabold text-slate-900">{data.vonis}</p>
        <a
          href={`/api/periksa/${h.id}/unduh`}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-light"
        >
          <Download className="h-4 w-4" aria-hidden="true" /> {data.unduh}
        </a>
      </div>
    </section>
  );
}

function IsiHasil({ h }: { h: HasilPeriksa }) {
  return (
    <div className="space-y-5">
      <RingkasanHasil h={h} />
      {h.kemiripan && (
        <section>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-extrabold text-slate-900">Plagiarisme</h3>
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
            <h3 className="font-extrabold text-slate-900">Indikasi AI</h3>
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

      {h.parafrase && <PanelParafrase teks={h.parafrase.teks} />}

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
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-light"
          >
            Bedah bersama mentor <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <Link
            href={`/periksa/laporan/${h.id}`}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-brand px-4 py-2 text-xs font-bold text-brand transition-colors hover:bg-brand-50"
          >
            <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
            Laporan PDF
          </Link>
        </div>
      </section>
    </div>
  );
}

/**
 * Hasil parafrase.
 *
 * Teksnya ditaruh di kotak yang bisa digulir dan disalin, bukan langsung
 * menimpa naskah di kolom kiri: penulisnya perlu membandingkan dulu versi
 * lama dan baru sebelum memutuskan mana yang dipakai.
 */
function PanelParafrase({ teks }: { teks: string }) {
  const [tersalin, setTersalin] = useState(false);

  async function salin() {
    try {
      await navigator.clipboard.writeText(teks);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      // Beberapa peramban menolak akses papan klip tanpa izin; biarkan
      // pengguna menyalin sendiri dari kotak di bawah.
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-extrabold text-slate-900">Hasil parafrase</h3>
        <button
          type="button"
          onClick={salin}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand"
        >
          {tersalin ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Tersalin
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Salin
            </>
          )}
        </button>
      </div>

      <div className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800">
        {teks}
      </div>
    </section>
  );
}
