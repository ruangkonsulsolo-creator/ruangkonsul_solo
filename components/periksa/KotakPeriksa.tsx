"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import {
  AlertTriangle, CheckCircle2,
  ArrowRight, Loader2, FileText, Upload, Copy, Check, X, FileDown,
  Download, Clock, ShieldCheck,
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
const angka = (n: number) => n.toLocaleString("id-ID");

type Tab = "plagiasi" | "ai" | "drillbit" | "parafrase";

/** Berkas yang diterima pesanan laporan manual (sama dengan /api/periksa/manual). */
const EKSTENSI_MANUAL = [".pdf", ".doc", ".docx"];
const MIME_MANUAL: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
const MAKS_UKURAN = 50 * 1024 * 1024;

function ekstensi(nama: string) {
  const i = nama.lastIndexOf(".");
  return i < 0 ? "" : nama.slice(i).toLowerCase();
}

/**
 * Halaman layanan cek naskah dalam bentuk tab: Cek Plagiasi, Cek AI,
 * Cek DrillBit, Jasa Parafrase.
 *
 * Tiap tab memakai susunan yang sama supaya customer tidak perlu belajar
 * ulang: judul + ringkasan harga di atas, lalu dua kolom —
 * kiri unggah dokumen (dengan rumus harga yang jelas), kanan kontak dan
 * ringkasan pesanan dengan total bayar dan satu tombol bayar.
 *
 * Plagiasi & DrillBit = laporan dikerjakan tim (berkas asli diunggah).
 * AI & Parafrase = instan; dibayar dari saldo, kekurangannya lewat QRIS.
 */
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
  // Nama penyedia hanya tampil kalau penyedianya benar-benar dikonfigurasi.
  const pAI = penyediaAktif("ai");

  const TABS = (
    [
      manual.aktif && { id: "plagiasi", label: "Cek Plagiasi" },
      aktif.ai && { id: "ai", label: "Cek AI" },
      manual.drillbitAktif && { id: "drillbit", label: "Cek DrillBit" },
      aktif.parafrase && { id: "parafrase", label: "Jasa Parafrase" },
    ].filter(Boolean) as { id: Tab; label: string }[]
  );

  const [tab, setTab] = useState<Tab>(TABS[0]?.id ?? "ai");
  const [teks, setTeks] = useState("");
  const [tempel, setTempel] = useState(false);
  const [memproses, setMemproses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [aksi, setAksi] = useState<string | null>(null);
  const [kurang, setKurang] = useState<number>(0);
  const [hasil, setHasil] = useState<HasilPeriksa | null>(null);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [membaca, setMembaca] = useState(false);
  const [seret, setSeret] = useState(false);
  const [formatLaporan, setFormatLaporan] = useState<"baru" | "lama">("baru");
  const [lebih100Hal, setLebih100Hal] = useState(false);
  const [wa, setWa] = useState("");
  const [pesananManual, setPesananManual] = useState<{ nomor: string; lunas: boolean } | null>(null);
  const inputBerkas = useRef<HTMLInputElement>(null);
  const panelHasil = useRef<HTMLDivElement>(null);

  const instan = tab === "ai" || tab === "parafrase";
  const jenis: JenisPeriksa = tab === "parafrase" ? "parafrase" : "ai";
  const jenisManual = tab === "drillbit" ? "drillbit" : "turnitin";

  const jumlahKata = useMemo(() => hitungKata(teks), [teks]);
  // Kata tidak bisa dihitung dari PDF/DOC lama; customer memilih sendiri ukurannya.
  const kataDiketahui = jumlahKata > 0;

  const biayaInstan = jumlahKata > 0 ? hitungBiaya(jumlahKata, jenis, tarif, minimum) : 0;
  const besar = kataDiketahui ? jumlahKata > BATAS_KATA_BESAR : lebih100Hal;
  const hargaManual = jenisManual === "drillbit" ? manual.drillbit : besar ? manual.besar : manual.kecil;
  const total = instan ? biayaInstan : berkas ? hargaManual : 0;

  const terlaluPendek = jumlahKata > 0 && jumlahKata < MIN_KATA;
  const terlaluPanjang = instan && jumlahKata > MAKS_KATA;
  const waValid = wa.replace(/\D/g, "").length >= 9;
  const siap = instan
    ? jumlahKata >= MIN_KATA && !terlaluPanjang && !memproses && !membaca
    : !!berkas && waValid && !memproses && !membaca;

  const adaPanel = memproses || !!galat || !!hasil || !!pesananManual;

  useEffect(() => {
    if (hasil || pesananManual || galat) {
      panelHasil.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hasil, pesananManual, galat]);

  function gantiTab(t: Tab) {
    setTab(t);
    setHasil(null);
    setGalat(null);
    setAksi(null);
    setPesananManual(null);
    // Berkas PDF/DOC tidak bisa dipakai di tab instan (teksnya tidak terbaca).
    if ((t === "ai" || t === "parafrase") && berkas && !EKSTENSI_DIDUKUNG.includes(ekstensi(berkas.name) as (typeof EKSTENSI_DIDUKUNG)[number])) {
      hapusBerkas();
    }
  }

  function hapusBerkas() {
    setBerkas(null);
    setTeks("");
    setLebih100Hal(false);
  }

  async function pilihBerkas(f: File) {
    setGalat(null);
    setHasil(null);
    setPesananManual(null);
    const ext = ekstensi(f.name);
    const bisaDibaca = (EKSTENSI_DIDUKUNG as readonly string[]).includes(ext);

    if (!instan) {
      if (!EKSTENSI_MANUAL.includes(ext)) {
        setGalat(`Format berkas tidak didukung. Unggah ${EKSTENSI_MANUAL.join(", ").toUpperCase()}.`);
        return;
      }
      if (f.size > MAKS_UKURAN) {
        setGalat("Ukuran berkas maksimal 50 MB.");
        return;
      }
    } else if (!bisaDibaca) {
      setGalat(
        `Untuk ${tab === "ai" ? "Cek AI" : "parafrase"}, unggah ${EKSTENSI_DIDUKUNG.join(" / ").toUpperCase()} ` +
          `atau tempel teksnya langsung. PDF belum bisa dibaca otomatis.`
      );
      return;
    }

    setBerkas(f);
    setTeks("");
    setLebih100Hal(false);
    if (!bisaDibaca) return; // PDF/DOC: cukup berkasnya, tanpa hitung kata.

    setMembaca(true);
    try {
      const isi = await ekstrakTeks(f.name, await f.arrayBuffer());
      if (!isi.trim()) {
        throw new BerkasTidakDidukung(
          "Berkasnya terbaca, tapi isinya kosong. Kalau naskahmu berupa hasil " +
            "pindaian, teksnya perlu diketik atau disalin dulu."
        );
      }
      setTeks(isi);
    } catch (e) {
      if (instan) setBerkas(null);
      setGalat(e instanceof Error ? e.message : "Berkas tidak bisa dibaca.");
    } finally {
      setMembaca(false);
    }
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setSeret(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void pilihBerkas(f);
  }

  /** Laporan manual: unggah berkas asli ke penyimpanan privat, buat pesanan, bayar QRIS. */
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
        throw new Error("Masuk dulu untuk memesan laporan.");
      }
      const ext = ekstensi(berkas.name);
      const mime = MIME_MANUAL[ext] ?? berkas.type;
      const aman = berkas.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
      const path = `${user.id}/${Date.now()}_${aman}`;
      const { error: eUp } = await supabase.storage
        .from("documents")
        .upload(path, berkas, { contentType: mime, upsert: false });
      if (eUp) throw new Error(`Gagal mengunggah berkas: ${eUp.message}`);

      const res = await fetch("/api/periksa/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storage_path: path,
          nama_berkas: berkas.name,
          ukuran: berkas.size,
          mime,
          // PDF/DOC: kata tak terhitung — pakai pilihan ukuran dari customer.
          jumlah_kata: kataDiketahui ? jumlahKata : lebih100Hal ? BATAS_KATA_BESAR + 1 : 0,
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

  /**
   * Pemeriksaan instan. Saldo dipakai lebih dulu; kalau kurang, QRIS untuk
   * kekurangannya langsung dibuka (satu klik), lalu pemeriksaan diulang.
   */
  async function kirim(bolehBayar = true) {
    setMemproses(true);
    setGalat(null);
    setAksi(null);
    setHasil(null);
    let butuhBayar = 0;
    try {
      const res = await fetch("/api/periksa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teks, jenis }),
      });
      const json = await res.json();
      if (!res.ok) {
        const kr = Number(json.kurang ?? 0);
        if (json.action === "isi_saldo" && kr > 0 && bolehBayar) {
          butuhBayar = kr;
        } else {
          setAksi(json.action ?? null);
          setKurang(kr);
          throw new Error(json.error ?? "Pemeriksaan gagal.");
        }
      } else {
        setHasil(json.data);
      }
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Pemeriksaan gagal.");
    } finally {
      setMemproses(false);
    }
    if (butuhBayar > 0) await bayarLaluPeriksa(butuhBayar);
  }

  /** Bayar kekurangan saldo via QRIS, lalu pemeriksaan dijalankan otomatis. */
  async function bayarLaluPeriksa(nominal = kurang) {
    setMemproses(true);
    setGalat(null);
    try {
      const res = await fetch("/api/payment/saldo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nominal: Math.max(1000, nominal) }),
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
      if (!lunas) {
        throw new Error(
          "Pembayaran belum terkonfirmasi. Kalau sudah membayar, tunggu sebentar lalu klik tombol bayar lagi — saldo yang masuk akan dipakai."
        );
      }
    } catch (e) {
      setKurang(nominal);
      setGalat(e instanceof Error ? e.message : "Gagal membuka pembayaran.");
      setMemproses(false);
      return;
    }
    setMemproses(false);
    await kirim(false);
  }

  // ── Isi tiap tab ──────────────────────────────────────────────────────────
  function rumusInstan(j: JenisPeriksa): string[] {
    const t = tarif[j];
    const m = minimum[j];
    const baris: string[] = [];
    if (m > t) {
      const batas = Math.floor(m / t) * 1000;
      baris.push(`Sampai ${angka(batas)} kata = ${rupiah(m)}.`);
      baris.push(`Di atas ${angka(batas)} kata, tiap 1.000 kata ${rupiah(t)}.`);
    } else {
      baris.push(`Tiap 1.000 kata ${rupiah(t)} (dibulatkan ke atas).`);
    }
    baris.push(`Minimal ${angka(MIN_KATA)} kata, maksimal ${angka(MAKS_KATA)} kata sekali cek.`);
    return baris;
  }

  const INFO: Record<Tab, {
    judul: [string, string, string];
    deskripsi: string;
    chips: string[];
    rumus: string[];
    badge: string;
    tombol: string;
    format: string;
  }> = {
    plagiasi: {
      judul: ["Cek ", "Plagiasi", " Turnitin"],
      deskripsi:
        "Unggah naskahmu, tim kami memeriksanya dan mengirim laporan similarity dalam bentuk PDF asli " +
        "beserta persentasenya. Bisa pilih laporan tampilan baru atau lama.",
      chips: [`${rupiah(manual.kecil)} / file`, "Laporan PDF asli", "Maks. 1×24 jam"],
      rumus: [
        `Sampai ${angka(BATAS_KATA_BESAR)} kata (±100 halaman) = ${rupiah(manual.kecil)}.`,
        `Di atas ${angka(BATAS_KATA_BESAR)} kata = ${rupiah(manual.besar)}.`,
        "Laporan dikirim ke Riwayat Pesanan dan dikabari lewat WhatsApp.",
      ],
      badge: "Maks. 1×24 jam",
      tombol: "Bayar Cek Plagiasi (QRIS)",
      format: "PDF, DOCX, DOC · Maks 50 MB",
    },
    ai: {
      judul: ["Cek ", "AI", pAI ? ` ${pAI.nama}` : ""],
      deskripsi:
        `Deteksi indikasi tulisan buatan AI pada skripsi, tugas, atau artikel${pAI ? ` memakai ${pAI.nama}` : ""}. ` +
        "Hasilnya berupa persentase, kalimat yang ditandai, dan laporan PDF yang bisa diunduh.",
      chips: [`${rupiah(tarif.ai)} / 1.000 kata`, "Hasil instan", "Laporan PDF"],
      rumus: rumusInstan("ai"),
      badge: "Hasil instan",
      tombol: "Bayar Cek AI (QRIS)",
      format: `${EKSTENSI_DIDUKUNG.join(", ").toUpperCase().replace(/\./g, "")} atau tempel teks`,
    },
    drillbit: {
      judul: ["Cek ", "DrillBit", ""],
      deskripsi:
        "Laporan DrillBit untuk cek plagiasi sekaligus indikasi AI. Diperiksa tim kami dan dikirim " +
        "sebagai PDF asli beserta persentasenya.",
      chips: [`${rupiah(manual.drillbit)} / file`, "Plagiasi + AI", "Maks. 1×24 jam"],
      rumus: [
        `${rupiah(manual.drillbit)} per file, berapa pun jumlah katanya.`,
        "Laporan dikirim ke Riwayat Pesanan dan dikabari lewat WhatsApp.",
      ],
      badge: "Maks. 1×24 jam",
      tombol: "Bayar Cek DrillBit (QRIS)",
      format: "PDF, DOCX, DOC · Maks 50 MB",
    },
    parafrase: {
      judul: ["Jasa ", "Parafrase", ""],
      deskripsi:
        "Susun ulang kalimat dengan bahasa yang berbeda tanpa mengubah makna dan tanpa menghapus sitasi. " +
        "Hasilnya bisa disalin atau diunduh sebagai file Word.",
      chips: [`${rupiah(tarif.parafrase)} / 1.000 kata`, "Hasil instan", "File Word (.docx)"],
      rumus: rumusInstan("parafrase"),
      badge: "Hasil instan",
      tombol: "Bayar Parafrase (QRIS)",
      format: `${EKSTENSI_DIDUKUNG.join(", ").toUpperCase().replace(/\./g, "")} atau tempel teks`,
    },
  };

  if (TABS.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-medium text-slate-600">
        Layanan cek naskah sedang tidak tersedia. Hubungi admin lewat WhatsApp.
      </p>
    );
  }

  const info = INFO[tab];
  const nomorKontak = !instan && tab === "plagiasi" ? 3 : 2;

  return (
    <div>
      {/* ── Tab layanan ── */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1">
        <div role="tablist" aria-label="Layanan cek naskah" className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => gantiTab(t.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition-colors sm:px-5 ${
                tab === t.id ? "bg-brand text-white shadow-brand-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Judul layanan ── */}
      <div className="mt-6">
        <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {info.judul[0]}
          <span className="text-brand">{info.judul[1]}</span>
          {info.judul[2]}
        </h3>
        <p className="mt-3 max-w-3xl font-medium leading-relaxed text-slate-600">{info.deskripsi}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {info.chips.map((c) => (
            <span key={c} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* ── Dua kolom ── */}
      <div className="mt-8 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Kiri */}
        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
            <h4 className="text-lg font-extrabold text-slate-900">
              <span className="text-brand">1.</span> Upload Dokumen
            </h4>
            <p className="mt-1 text-sm text-slate-500">{info.format}</p>

            <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3.5">
              <p className="text-sm font-bold text-slate-900">Rumus harga / file:</p>
              <ul className="mt-1 space-y-0.5 text-sm text-brand-dark">
                {info.rumus.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>

            <input
              ref={inputBerkas}
              id="berkas-periksa"
              type="file"
              accept={(instan ? [...EKSTENSI_DIDUKUNG] : EKSTENSI_MANUAL).join(",")}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pilihBerkas(f);
                e.target.value = "";
              }}
            />

            {berkas ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-brand">
                  {membaca ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <FileText className="h-5 w-5" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">{berkas.name}</span>
                  <span className="block text-xs text-slate-500">
                    {(berkas.size / 1024 / 1024).toFixed(2)} MB
                    {membaca ? " · menghitung kata…" : kataDiketahui ? ` · ${angka(jumlahKata)} kata` : ""}
                  </span>
                </span>
                <button type="button" onClick={hapusBerkas} aria-label="Hapus berkas"
                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-brand">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : !(instan && tempel) ? (
              <label
                htmlFor="berkas-periksa"
                onDragOver={(e) => { e.preventDefault(); setSeret(true); }}
                onDragLeave={() => setSeret(false)}
                onDrop={onDrop}
                className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
                  seret ? "border-brand bg-brand-50" : "border-brand-200 hover:border-brand hover:bg-brand-50/40"
                }`}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-brand shadow-sm">
                  <Upload className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="mt-4 font-bold text-slate-900">Pilih atau seret file ke sini</span>
                <span className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {(instan ? [...EKSTENSI_DIDUKUNG] : EKSTENSI_MANUAL).map((x) => (
                    <span key={x} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {x.slice(1).toUpperCase()}
                    </span>
                  ))}
                </span>
                <span className="mt-3 text-xs text-slate-500">{instan ? "Satu file per pemeriksaan" : "Maksimal 50 MB, satu file per pesanan"}</span>
              </label>
            ) : null}

            {instan && !berkas && (
              <div className="mt-3">
                <button type="button" onClick={() => setTempel((v) => !v)} className="text-sm font-bold text-brand hover:underline">
                  {tempel ? "← Unggah file saja" : "+ Atau tempel teks langsung"}
                </button>
                {tempel && (
                  <>
                    <label htmlFor="naskah" className="sr-only">Tempel naskahmu</label>
                    <textarea
                      id="naskah"
                      value={teks}
                      onChange={(e) => { setTeks(e.target.value); setHasil(null); }}
                      placeholder="Tempel naskahmu di sini. Satu bab sekaligus lebih mudah ditindaklanjuti daripada seluruh skripsi."
                      className="mt-2 min-h-[220px] w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none"
                    />
                  </>
                )}
              </div>
            )}

            {(terlaluPendek || terlaluPanjang) && (
              <p className="mt-3 text-sm font-semibold text-amber-700">
                {terlaluPendek
                  ? `Naskah terlalu pendek: minimal ${angka(MIN_KATA)} kata (sekarang ${angka(jumlahKata)}).`
                  : `Naskah terlalu panjang: maksimal ${angka(MAKS_KATA)} kata sekali cek. Pecah per bab.`}
              </p>
            )}

            {!instan && berkas && !kataDiketahui && tab === "plagiasi" && (
              <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={lebih100Hal} onChange={(e) => setLebih100Hal(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#8B0000]" />
                <span>Naskahku lebih dari ±100 halaman ({angka(BATAS_KATA_BESAR)} kata)</span>
              </label>
            )}
          </section>

          {tab === "plagiasi" && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
              <h4 className="text-lg font-extrabold text-slate-900">
                <span className="text-brand">2.</span> Tampilan Laporan
              </h4>
              <div role="radiogroup" aria-label="Tampilan laporan" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(["baru", "lama"] as const).map((f) => (
                  <button key={f} type="button" role="radio" aria-checked={formatLaporan === f} onClick={() => setFormatLaporan(f)}
                    className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-colors ${
                      formatLaporan === f ? "border-brand bg-brand-50" : "border-slate-200 hover:border-slate-300"
                    }`}>
                    <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${formatLaporan === f ? "border-brand" : "border-slate-300"}`}>
                      {formatLaporan === f && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-slate-900">{FORMAT_LAPORAN[f]}</span>
                      <span className="block text-xs text-slate-500">
                        {f === "baru" ? "Sesuai tampilan laporan terkini" : "Untuk kampus yang masih memakai format lama"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Kanan */}
        <div className="space-y-5 lg:sticky lg:top-24">
          {!instan && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
              <h4 className="text-lg font-extrabold text-slate-900">
                <span className="text-brand">{nomorKontak}.</span> Kontak
              </h4>
              <label htmlFor="wa-periksa" className="mt-4 block text-sm font-bold text-slate-800">
                Nomor WhatsApp <span className="font-medium text-slate-500">(untuk kabar laporan)</span>
              </label>
              <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-brand">
                <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-bold text-green-600">WA</span>
                <input id="wa-periksa" type="tel" inputMode="tel" value={wa} onChange={(e) => setWa(e.target.value)}
                  placeholder="0812xxxxxxxx" className="min-w-0 flex-1 px-3 py-2.5 text-sm focus:outline-none" />
              </div>
              {wa && !waValid && <p className="mt-1.5 text-xs font-semibold text-amber-700">Nomor WhatsApp belum lengkap.</p>}
            </section>
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-lg font-extrabold text-slate-900">Ringkasan pesanan</h4>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand">
                <Clock className="h-3 w-3" aria-hidden="true" /> {info.badge}
              </span>
            </div>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Tarif</dt>
                <dd className="text-right font-semibold text-slate-900">
                  {instan ? `${rupiah(tarif[jenis])} / 1.000 kata` : `${rupiah(jenisManual === "drillbit" ? manual.drillbit : manual.kecil)} / file`}
                </dd>
              </div>
              {instan && minimum[jenis] > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Biaya minimum</dt>
                  <dd className="font-semibold text-slate-900">{rupiah(minimum[jenis])}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Jumlah kata</dt>
                <dd className="font-semibold text-slate-900">{kataDiketahui ? angka(jumlahKata) : "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">File</dt>
                <dd className="min-w-0 truncate font-semibold text-slate-900">
                  {berkas ? berkas.name : instan && tempel && teks ? "Teks ditempel" : "Belum ada file"}
                </dd>
              </div>
              {tab === "plagiasi" && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Tampilan</dt>
                  <dd className="font-semibold text-slate-900">{FORMAT_LAPORAN[formatLaporan]}</dd>
                </div>
              )}
            </dl>

            <div className="mt-4 flex items-end justify-between gap-3 border-t border-dashed border-slate-200 pt-4">
              <span className="font-bold text-slate-900">Total Bayar</span>
              <span className="text-3xl font-extrabold text-slate-900">{rupiah(total)}</span>
            </div>

            <button
              type="button"
              onClick={instan ? () => void kirim() : kirimManual}
              disabled={!siap}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 text-base font-bold text-white transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              {memproses ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {instan ? "Memproses…" : "Membuat pesanan…"}
                </>
              ) : (
                info.tombol
              )}
            </button>
            <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
              {instan
                ? "Pembayaran QRIS dikonfirmasi otomatis. Kalau saldomu cukup, dipotong dari saldo tanpa QRIS."
                : "Pembayaran QRIS dikonfirmasi otomatis, lalu pesanan langsung masuk antrean tim."}
            </p>
            {!instan && !waValid && berkas && (
              <p className="mt-2 text-center text-xs font-semibold text-amber-700">Isi nomor WhatsApp dulu.</p>
            )}
          </section>

          <p className="flex items-start gap-1.5 px-1 text-xs font-medium leading-relaxed text-slate-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            {instan
              ? "Naskah aslimu tidak disimpan utuh — yang tersimpan hanya jumlah kata, 200 karakter pertama, dan hasil pemeriksaan."
              : "Berkasmu disimpan privat dan hanya bisa dibuka olehmu dan tim pemeriksa."}
          </p>
        </div>
      </div>

      {/* ── Hasil ── */}
      {adaPanel && (
        <div ref={panelHasil} className="mt-6 scroll-mt-24 rounded-3xl border border-slate-200 bg-white" aria-live="polite">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
            <CheckCircle2 className="h-4 w-4 text-brand" aria-hidden="true" />
            <span className="text-sm font-bold text-slate-900">
              {hasil ? (hasil.jenis === "ai" ? "Hasil Cek AI" : hasil.jenis === "parafrase" ? "Hasil Parafrase" : "Hasil") : "Status"}
            </span>
            {hasil && (
              <span className="ml-auto text-xs font-medium text-slate-400">{angka(hasil.jumlahKata)} kata diperiksa</span>
            )}
          </div>
          <div className="px-5 py-5">
            {memproses ? (
              <PanelMemproses />
            ) : galat ? (
              <PanelGalat pesan={galat} aksi={aksi} kurang={kurang} onBayar={() => void bayarLaluPeriksa()} />
            ) : pesananManual ? (
              <PanelPesananManual nomor={pesananManual.nomor} lunas={pesananManual.lunas} />
            ) : hasil ? (
              <IsiHasil h={hasil} />
            ) : null}
          </div>
        </div>
      )}
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
