"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import {
  AlertTriangle, CheckCircle2,
  ArrowRight, Loader2, FileText, Upload, Copy, Check, X, FileDown,
  Clock, ShieldCheck,
  History,
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
import { RiwayatPeriksa } from "@/components/periksa/RiwayatPeriksa";
import { StatusPesanan } from "@/components/periksa/StatusPesanan";
import { AjakSimpanWa } from "@/components/periksa/AjakSimpanWa";

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
/** Maksimal file per transaksi laporan manual. */
const MAKS_FILE = 5;

/** Satu file di antrean pesanan laporan manual. */
type ItemBerkas = {
  kunci: string;
  file: File;
  /** null = kata tak terhitung (PDF/DOC) — ukuran dipilih customer lewat `besar`. */
  kata: number | null;
  besar: boolean;
  membaca: boolean;
};

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
  awalRiwayat = false,
}: {
  /** Buka sub tab Riwayat Pesanan lebih dulu (?tab=riwayat). */
  awalRiwayat?: boolean;
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
  const [riwayat, setRiwayat] = useState(awalRiwayat);
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
  const [wa, setWa] = useState("");
  const [pesananManual, setPesananManual] = useState<{ id: string; nomor: string; lunas: boolean; waktu: string; jumlah: number; namaPertama: string; paymentId?: string } | null>(null);
  // Pembayaran QRIS yang sedang ditunggu (Cek AI / Parafrase). Disimpan juga di
  // localStorage supaya pindah tab / muat ulang halaman tidak menghilangkannya.
  const [tunggu, setTunggu] = useState<Tertunda | null>(null);
  const [pemicu, setPemicu] = useState(0);
  const [pesanProses, setPesanProses] = useState(PESAN_PERIKSA);
  const [daftar, setDaftar] = useState<ItemBerkas[]>([]);
  const inputBerkas = useRef<HTMLInputElement>(null);
  const panelHasil = useRef<HTMLDivElement>(null);
  const akar = useRef<HTMLDivElement>(null);
  const [namaHasil, setNamaHasil] = useState("Teks ditempel");

  const instan = tab === "ai" || tab === "parafrase";
  const jenis: JenisPeriksa = tab === "parafrase" ? "parafrase" : "ai";
  const jenisManual = tab === "drillbit" ? "drillbit" : "turnitin";

  const jumlahKata = useMemo(() => hitungKata(teks), [teks]);
  // Kata tidak bisa dihitung dari PDF/DOC lama; customer memilih sendiri ukurannya.
  const kataDiketahui = jumlahKata > 0;

  const biayaInstan = jumlahKata > 0 ? hitungBiaya(jumlahKata, jenis, tarif, minimum) : 0;
  const hargaItem = (it: ItemBerkas) =>
    jenisManual === "drillbit"
      ? manual.drillbit
      : (it.kata != null ? it.kata > BATAS_KATA_BESAR : it.besar) ? manual.besar : manual.kecil;
  const totalManual = daftar.reduce((s, it) => s + hargaItem(it), 0);
  const kataManual = daftar.reduce((s, it) => s + (it.kata ?? 0), 0);
  const adaMembaca = daftar.some((it) => it.membaca);
  const total = instan ? biayaInstan : totalManual;

  const terlaluPendek = jumlahKata > 0 && jumlahKata < MIN_KATA;
  const terlaluPanjang = instan && jumlahKata > MAKS_KATA;
  const waValid = wa.replace(/\D/g, "").length >= 9;
  const siap = instan
    ? jumlahKata >= MIN_KATA && !terlaluPanjang && !memproses && !membaca && !tunggu
    : daftar.length > 0 && waValid && !memproses && !adaMembaca;

  const adaPanel = memproses || !!tunggu || !!galat || !!hasil || !!pesananManual;

  useEffect(() => {
    if (hasil || pesananManual || galat || tunggu) {
      panelHasil.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hasil, pesananManual, galat, tunggu]);

  function gantiTab(t: Tab) {
    setRiwayat(false);
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

  function orderBaru() {
    batalTunggu();
    setHasil(null);
    setGalat(null);
    setAksi(null);
    setPesananManual(null);
    setTempel(false);
    hapusBerkas();
    setDaftar([]);
    akar.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function hapusBerkas() {
    setBerkas(null);
    setTeks("");
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

  /** Tambah satu/lebih file ke antrean laporan manual (maks MAKS_FILE). */
  function tambahBerkasManual(files: File[]) {
    setGalat(null);
    setPesananManual(null);
    const sisa = MAKS_FILE - daftar.length;
    if (sisa <= 0) {
      setGalat(`Maksimal ${MAKS_FILE} file per pesanan.`);
      return;
    }
    const diterima: ItemBerkas[] = [];
    const ditolak: string[] = [];
    for (const f of files) {
      const ext = ekstensi(f.name);
      if (!EKSTENSI_MANUAL.includes(ext)) { ditolak.push(`${f.name} (format)`); continue; }
      if (f.size > MAKS_UKURAN) { ditolak.push(`${f.name} (>50 MB)`); continue; }
      if (daftar.some((d) => d.file.name === f.name && d.file.size === f.size)) continue;
      if (diterima.length >= sisa) { ditolak.push(`${f.name} (lebih dari ${MAKS_FILE} file)`); continue; }
      const bisaDibaca = (EKSTENSI_DIDUKUNG as readonly string[]).includes(ext);
      diterima.push({ kunci: `${Date.now()}-${Math.random()}`, file: f, kata: null, besar: false, membaca: bisaDibaca });
    }
    if (ditolak.length) setGalat(`Tidak ditambahkan: ${ditolak.join(", ")}. Format yang diterima PDF, DOCX, DOC, maks 50 MB.`);
    if (!diterima.length) return;
    setDaftar((d) => [...d, ...diterima]);
    // Hitung kata untuk DOCX/TXT di latar; PDF/DOC memakai pilihan ukuran.
    for (const it of diterima.filter((x) => x.membaca)) {
      void (async () => {
        let kata: number | null = null;
        try {
          kata = hitungKata(await ekstrakTeks(it.file.name, await it.file.arrayBuffer())) || null;
        } catch {
          kata = null;
        }
        setDaftar((d) => d.map((x) => (x.kunci === it.kunci ? { ...x, kata, membaca: false } : x)));
      })();
    }
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setSeret(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.length) return;
    if (instan) void pilihBerkas(files[0]);
    else tambahBerkasManual(files);
  }

  /** Laporan manual: unggah semua berkas ke penyimpanan privat, buat pesanan, satu QRIS. */
  async function kirimManual() {
    if (!daftar.length) return;
    setMemproses(true);
    setPesanProses("Mengunggah berkas & membuat pesanan…");
    setGalat(null);
    setAksi(null);
    setHasil(null);
    setPesananManual(null);
    try {
      const { supabase, user } = await pastikanSesi();
      const unggahan = [];
      for (const [i, it] of daftar.entries()) {
        const ext = ekstensi(it.file.name);
        const mime = MIME_MANUAL[ext] ?? it.file.type;
        const aman = it.file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
        const path = `${user.id}/${Date.now()}_${i}_${aman}`;
        const { error: eUp } = await supabase.storage
          .from("documents")
          .upload(path, it.file, { contentType: mime, upsert: false });
        if (eUp) throw new Error(`Gagal mengunggah ${it.file.name}: ${eUp.message}`);
        unggahan.push({
          storage_path: path,
          nama_berkas: it.file.name,
          ukuran: it.file.size,
          mime,
          // PDF/DOC: kata tak terhitung — pakai pilihan ukuran dari customer.
          jumlah_kata: it.kata ?? (it.besar ? BATAS_KATA_BESAR + 1 : 0),
        });
      }

      const res = await fetch("/api/periksa/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          berkas: unggahan,
          jenis_manual: jenisManual,
          format_laporan: jenisManual === "turnitin" ? formatLaporan : undefined,
          whatsapp: wa,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal membuat pesanan.");
      // Pesanan sudah tersimpan (muncul di Riwayat). Tampilkan statusnya dulu,
      // lalu buka QR; status dipantau otomatis sampai lunas.
      setPesananManual({
        id: json.data.orderId,
        nomor: json.data.orderNumber,
        lunas: false,
        waktu: new Date().toISOString(),
        jumlah: daftar.length,
        namaPertama: daftar[0].file.name,
        paymentId: json.data.paymentId,
      });
      setMemproses(false);
      void bukaQr(json.data.snapToken);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal membuat pesanan.");
    } finally {
      setMemproses(false);
    }
  }

  /**
   * Layanan pemeriksa tidak wajib login: tanpa sesi, dibuat sesi tamu
   * (Supabase anonymous sign-in) yang tersimpan di browser ini. Riwayatnya
   * tampil di tab Riwayat Pesanan.
   */
  async function pastikanSesi() {
    const { createClient } = await import("@/lib/supabase/client");
    const { getUserTermasukTamu } = await import("@/lib/supabase/tamu");
    const supabase = createClient();
    const ada = await getUserTermasukTamu(supabase);
    if (ada) return { supabase, user: ada };
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      setAksi("login");
      throw new Error("Tidak bisa memulai sesi tamu. Silakan masuk atau daftar untuk melanjutkan.");
    }
    return { supabase, user: data.user };
  }

  /**
   * Pemeriksaan instan. Saldo dipakai lebih dulu; kalau kurang, QRIS untuk
   * kekurangannya langsung dibuka (satu klik), lalu pemeriksaan diulang.
   */
  async function kirim(bolehBayar = true, teksPakai = teks, jenisPakai: JenisPeriksa = jenis, namaPakai?: string) {
    setMemproses(true);
    setPesanProses(PESAN_PERIKSA);
    setGalat(null);
    setAksi(null);
    setHasil(null);
    let butuhBayar = 0;
    try {
      await pastikanSesi();
      const res = await fetch("/api/periksa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teks: teksPakai, jenis: jenisPakai }),
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
        hapusTertunda();
        setNamaHasil(namaPakai ?? berkas?.name ?? "Teks ditempel");
        setHasil(json.data);
      }
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Pemeriksaan gagal.");
    } finally {
      setMemproses(false);
    }
    if (butuhBayar > 0) await bayarLaluPeriksa(butuhBayar);
  }

  /**
   * Bayar kekurangan saldo via QRIS. Popup Midtrans dibuka, lalu halaman
   * menunggu (panel "Menunggu pembayaran") dan mengecek status berulang —
   * juga saat pengguna kembali dari tab lain. Begitu lunas, pemeriksaan
   * berjalan otomatis dengan naskah yang sama.
   */
  async function bayarLaluPeriksa(nominal = kurang) {
    setMemproses(true);
    setPesanProses("Membuka pembayaran QRIS…");
    setGalat(null);
    setAksi(null);
    try {
      await pastikanSesi();
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
      if (json.data?.sudah_lunas) {
        // Pembayaran sebelumnya ternyata sudah lunas → saldo sudah ditambahkan.
        setMemproses(false);
        await kirim(false);
        return;
      }
      const job: Tertunda = {
        paymentId: json.data.payment_id,
        snapToken: json.data.snap_token,
        nominal: json.data.nominal ?? nominal,
        jenis,
        teks,
        nama: berkas?.name ?? "Teks ditempel",
        waktu: Date.now(),
      };
      simpanTertunda(job);
      setMemproses(false);
      setTunggu(job);
      void bukaQr(job.snapToken);
    } catch (e) {
      setKurang(nominal);
      setGalat(e instanceof Error ? e.message : "Gagal membuka pembayaran.");
      setMemproses(false);
    }
  }

  async function bukaQr(token: string) {
    try {
      const { openSnap } = await import("@/lib/payment/use-snap");
      await openSnap(token);
    } catch {
      /* popup gagal dimuat: panel tunggu tetap menyediakan tombol buka lagi */
    }
    // Apa pun hasil popup (sukses, ditutup, pending), cek status sekarang.
    setPemicu((n) => n + 1);
  }

  function batalTunggu() {
    hapusTertunda();
    setTunggu(null);
    try { window.snap?.hide(); } catch { /* popup sudah tertutup */ }
  }

  // Lanjutkan pembayaran yang tertunda setelah pindah tab / muat ulang halaman.
  useEffect(() => {
    const job = bacaTertunda();
    if (!job) return;
    setTab(job.jenis === "parafrase" ? "parafrase" : "ai");
    setRiwayat(false);
    setBerkas(null);
    setTeks(job.teks);
    setTempel(true);
    setNamaHasil(job.nama);
    setTunggu(job);
  }, []);

  // Cek status pembayaran yang ditunggu: tiap 3 detik selama tab aktif,
  // langsung saat tab kembali aktif, dan saat popup Midtrans selesai.
  useEffect(() => {
    if (!tunggu) return;
    let selesai = false;
    let jalan = false;
    const job = tunggu;
    const cek = async () => {
      if (selesai || jalan) return;
      jalan = true;
      const { syncPaymentStatus } = await import("@/lib/payment/use-snap");
      const st = await syncPaymentStatus({ paymentId: job.paymentId });
      jalan = false;
      if (selesai) return;
      if (st === "paid") {
        selesai = true;
        hapusTertunda();
        setTunggu(null);
        try { window.snap?.hide(); } catch { /* sudah tertutup */ }
        await kirim(false, job.teks, job.jenis, job.nama);
      } else if (st && st !== "pending") {
        selesai = true;
        hapusTertunda();
        setTunggu(null);
        setKurang(job.nominal);
        setAksi("isi_saldo");
        setGalat("Pembayaran kedaluwarsa atau dibatalkan. Naskahmu belum diperiksa — klik bayar untuk mencoba lagi.");
      }
    };
    void cek();
    const t = window.setInterval(() => { if (document.visibilityState === "visible") void cek(); }, 3000);
    const saatKembali = () => { if (document.visibilityState === "visible") void cek(); };
    document.addEventListener("visibilitychange", saatKembali);
    window.addEventListener("focus", saatKembali);
    return () => {
      selesai = true;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", saatKembali);
      window.removeEventListener("focus", saatKembali);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tunggu, pemicu]);

  // Laporan manual yang belum lunas: pantau sampai pembayaran terkonfirmasi.
  useEffect(() => {
    const p = pesananManual;
    if (!p || p.lunas || !p.paymentId) return;
    let selesai = false;
    const cek = async () => {
      if (selesai) return;
      const { syncPaymentStatus } = await import("@/lib/payment/use-snap");
      const st = await syncPaymentStatus({ paymentId: p.paymentId! });
      if (selesai) return;
      if (st === "paid") {
        selesai = true;
        setPesananManual((x) => (x && x.id === p.id ? { ...x, lunas: true } : x));
      } else if (st && st !== "pending") {
        selesai = true;
      }
    };
    void cek();
    const t = window.setInterval(() => { if (document.visibilityState === "visible") void cek(); }, 4000);
    const saatKembali = () => { if (document.visibilityState === "visible") void cek(); };
    document.addEventListener("visibilitychange", saatKembali);
    window.addEventListener("focus", saatKembali);
    const henti = window.setTimeout(() => { selesai = true; }, 35 * 60 * 1000);
    return () => {
      selesai = true;
      window.clearInterval(t);
      window.clearTimeout(henti);
      document.removeEventListener("visibilitychange", saatKembali);
      window.removeEventListener("focus", saatKembali);
    };
  }, [pesananManual, pemicu]);

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
      chips: [`${rupiah(tarif.parafrase)} / 1.000 kata`, "Hasil 1–5 menit", "File Word (.docx)"],
      rumus: rumusInstan("parafrase"),
      badge: "Hasil 1–5 menit",
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
    <div ref={akar} className="scroll-mt-24">
      {/* ── Tab layanan ── */}
      <div className="pb-1">
        <div role="tablist" aria-label="Layanan cek naskah" className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:inline-flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={!riwayat && tab === t.id}
              onClick={() => gantiTab(t.id)}
              className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-bold transition-colors sm:px-5 ${
                !riwayat && tab === t.id ? "bg-brand text-white shadow-brand-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            role="tab"
            aria-selected={riwayat}
            onClick={() => setRiwayat(true)}
            className={`col-span-2 inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-bold transition-colors sm:col-span-1 sm:ml-1 sm:border-l sm:border-slate-200 sm:px-5 ${
              riwayat ? "bg-brand text-white shadow-brand-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <History className="h-4 w-4" aria-hidden="true" /> Riwayat Pesanan
          </button>
        </div>
      </div>

      {riwayat ? (
        <RiwayatPeriksa
          tertunda={tunggu ? { layanan: tunggu.jenis === "parafrase" ? "Jasa Parafrase" : "Cek AI", nominal: tunggu.nominal, nama: tunggu.nama, waktu: tunggu.waktu } : null}
          onLanjut={() => setRiwayat(false)}
        />
      ) : (
      <>

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
              multiple={!instan}
              accept={(instan ? [...EKSTENSI_DIDUKUNG] : EKSTENSI_MANUAL).join(",")}
              className="sr-only"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) {
                  if (instan) void pilihBerkas(files[0]);
                  else tambahBerkasManual(files);
                }
                e.target.value = "";
              }}
            />

            {!instan && daftar.length > 0 && (
              <ul className="mt-4 space-y-2" aria-label="File yang akan diperiksa">
                {daftar.map((it) => (
                  <li key={it.kunci} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-brand">
                        {it.membaca ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <FileText className="h-5 w-5" aria-hidden="true" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-900">{it.file.name}</span>
                        <span className="block text-xs text-slate-500">
                          {(it.file.size / 1024 / 1024).toFixed(2)} MB
                          {it.membaca ? " · menghitung kata…" : it.kata != null ? ` · ${angka(it.kata)} kata` : ""}
                        </span>
                      </span>
                      <span className="text-sm font-bold text-slate-900">{rupiah(hargaItem(it))}</span>
                      <button type="button" onClick={() => setDaftar((d) => d.filter((x) => x.kunci !== it.kunci))} aria-label={`Hapus ${it.file.name}`}
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-brand">
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    {tab === "plagiasi" && !it.membaca && it.kata == null && (
                      <label className="mt-2 flex items-start gap-2 pl-[3.25rem] text-xs text-slate-700">
                        <input type="checkbox" checked={it.besar}
                          onChange={(e) => setDaftar((d) => d.map((x) => (x.kunci === it.kunci ? { ...x, besar: e.target.checked } : x)))}
                          className="mt-0.5 h-3.5 w-3.5 accent-[#8B0000]" />
                        <span>Lebih dari ±100 halaman ({angka(BATAS_KATA_BESAR)} kata)</span>
                      </label>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {!instan && daftar.length > 0 && daftar.length < MAKS_FILE ? (
              <label htmlFor="berkas-periksa"
                onDragOver={(e) => { e.preventDefault(); setSeret(true); }}
                onDragLeave={() => setSeret(false)}
                onDrop={onDrop}
                className={`mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-3 text-sm font-bold text-brand transition-colors ${
                  seret ? "border-brand bg-brand-50" : "border-brand-200 hover:border-brand hover:bg-brand-50/40"
                }`}>
                <Upload className="h-4 w-4" aria-hidden="true" /> Tambah file ({daftar.length}/{MAKS_FILE})
              </label>
            ) : !instan && daftar.length >= MAKS_FILE ? (
              <p className="mt-3 text-center text-xs font-semibold text-slate-500">Maksimal {MAKS_FILE} file per pesanan.</p>
            ) : instan && berkas ? (
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
            ) : !(instan && tempel) && !(!instan && daftar.length > 0) ? (
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
                <span className="mt-3 text-xs text-slate-500">{instan ? "Satu file per pemeriksaan" : `Maksimal 50 MB per file · hingga ${MAKS_FILE} file sekaligus`}</span>
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
              <AjakSimpanWa className="mt-4" />
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
                <dd className="font-semibold text-slate-900">{instan ? (kataDiketahui ? angka(jumlahKata) : "—") : kataManual > 0 ? angka(kataManual) : "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">File</dt>
                <dd className="min-w-0 truncate font-semibold text-slate-900">
                  {instan
                    ? berkas ? berkas.name : tempel && teks ? "Teks ditempel" : "Belum ada file"
                    : daftar.length === 0 ? "Belum ada file" : daftar.length === 1 ? daftar[0].file.name : `${daftar.length} file`}
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
            {!instan && !waValid && daftar.length > 0 && (
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

      {/* ── Hasil / status pesanan ── */}
      {adaPanel && (
        <div ref={panelHasil} className="mt-8 scroll-mt-24" aria-live="polite">
          {memproses ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6"><PanelMemproses pesan={pesanProses} /></div>
          ) : tunggu ? (
            <PanelTunggu
              nominal={tunggu.nominal}
              layanan={tunggu.jenis === "parafrase" ? "Jasa Parafrase" : "Cek AI"}
              onBukaQr={() => void bukaQr(tunggu.snapToken)}
              onCek={() => setPemicu((n) => n + 1)}
              onBatal={batalTunggu}
            />
          ) : galat ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <PanelGalat pesan={galat} aksi={aksi} kurang={kurang} onBayar={() => void kirim(true)} />
            </div>
          ) : pesananManual ? (
            <StatusPesanan
              layanan={tab === "drillbit" ? "Cek DrillBit" : "Cek Plagiasi"}
              waktu={pesananManual.waktu}
              tahap={pesananManual.lunas ? "dibayar" : "menunggu"}
              judul={pesananManual.lunas ? "Sedang diperiksa tim" : "Menunggu pembayaran"}
              namaBerkas={pesananManual.jumlah > 1 ? `${pesananManual.jumlah} file` : pesananManual.namaPertama}
              keterangan={
                pesananManual.jumlah > 1
                  ? "Tiap file diperiksa terpisah; laporan dikirim maks. 1×24 jam setelah dibayar."
                  : "Laporan dikirim maks. 1×24 jam setelah dibayar."
              }
              kode={pesananManual.nomor}
              skor={{ label: "Similarity Score", persen: null, vonis: "Skor muncul setelah laporan selesai", jenis: "kemiripan" }}
              info={
                pesananManual.lunas
                  ? { judul: "Pembayaran diterima", teks: "Naskahmu masuk antrean tim. Kami kabari lewat notifikasi & WhatsApp begitu laporan siap." }
                  : { judul: "Belum dibayar", teks: "Pesanan tersimpan. Selesaikan pembayaran QRIS agar naskahmu diproses." }
              }
              ajakSimpanWa
              lanjut={{
                href: pesananManual.jumlah > 1 ? "/cek-plagiarisme?tab=riwayat" : `/cek-plagiarisme/pesanan/${pesananManual.id}`,
                label: pesananManual.lunas ? "Pantau Status Pesanan" : "Bayar Sekarang",
              }}
              onOrderBaru={orderBaru}
            />
          ) : hasil ? (
            <HasilInstan hasil={hasil} nama={namaHasil} onOrderBaru={orderBaru} />
          ) : null}
        </div>
      )}
      </>
      )}
    </div>
  );
}

/**
 * Tampilan hasil Cek AI / Parafrase: kartu status (skor + unduh laporan asli
 * penyedia) dan detail. Dipakai langsung setelah bayar dan di halaman
 * /cek-plagiarisme/hasil/[id] (dari Riwayat Pesanan).
 */
export function HasilInstan({
  hasil, nama, onOrderBaru, orderBaru, kembali,
}: {
  hasil: HasilPeriksa;
  nama: string;
  onOrderBaru?: () => void;
  orderBaru?: string;
  kembali?: { href: string; label: string };
}) {
  const pAI = penyediaAktif("ai");
  return (
    <>
      <StatusPesanan
        layanan={hasil.jenis === "parafrase" ? "Jasa Parafrase" : "Cek AI"}
        waktu={hasil.diperiksaPada}
        tahap="selesai"
        judul={hasil.jenis === "parafrase" ? "Parafrase selesai" : "Hasil Cek AI siap"}
        namaBerkas={nama}
        keterangan={`${angka(hasil.jumlahKata)} kata diperiksa${hasil.jenis === "ai" && pAI ? ` · ${pAI.nama}` : ""}`}
        kode={`RK-${hasil.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`}
        skor={
          hasil.jenis === "parafrase"
            ? { label: "Kalimat Berubah", persen: hasil.parafrase?.persenBerubah ?? null, vonis: "Makna & sitasi dipertahankan — baca ulang sebelum dipakai", jenis: "parafrase" }
            : { label: "AI Score", persen: hasil.ai?.skor ?? null, vonis: hasil.ai ? labelAi(hasil.ai.skor) : "", jenis: "ai" }
        }
        unduh={{ href: `/api/periksa/${hasil.id}/unduh`, label: labelUnduh(hasil) }}
        info={{ judul: "Tersimpan di Riwayat Pesanan", teks: "Hasil & laporan ini bisa dibuka dan diunduh lagi kapan saja dari tab Riwayat Pesanan." }}
        onOrderBaru={onOrderBaru}
        orderBaru={orderBaru}
        kembali={kembali}
      />
      <section className="mx-auto mt-6 max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="mb-4 text-lg font-extrabold text-slate-900">Detail hasil</h3>
        <IsiHasil h={hasil} />
      </section>
    </>
  );
}

function labelUnduh(h: HasilPeriksa): string {
  if (h.jenis === "parafrase") return "Unduh Hasil Parafrase (Word)";
  return h.ai?.rujukan?.penyedia === "zerogpt" ? "Unduh Laporan ZeroGPT (PDF)" : "Unduh AI Report (PDF)";
}

function PanelMemproses({ pesan = PESAN_PERIKSA }: { pesan?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-600">{pesan}</p>
    </div>
  );
}

/** Menunggu pembayaran QRIS: status dicek otomatis; bisa buka QR lagi atau batal. */
function PanelTunggu({
  nominal, layanan, onBukaQr, onCek, onBatal,
}: { nominal: number; layanan: string; onBukaQr: () => void; onCek: () => void; onBatal: () => void }) {
  return (
    <div className="rounded-3xl border border-amber-200 bg-white p-6 text-center sm:p-8">
      <Clock className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true" />
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{layanan}</p>
      <h3 className="mt-1 text-2xl font-extrabold text-slate-900">Menunggu pembayaran {rupiah(nominal)}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        Scan QR di jendela Midtrans. Setelah dibayar, pemeriksaan berjalan otomatis. Kamu boleh pindah tab;
        status dicek lagi begitu kamu kembali.
      </p>
      <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Mengecek status pembayaran…
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onBukaQr}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-light">
          Buka QR lagi
        </button>
        <button type="button" onClick={onCek}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
          Sudah bayar? Cek sekarang
        </button>
        <button type="button" onClick={onBatal}
          className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-red-600">
          Batalkan
        </button>
      </div>
      <p className="mx-auto mt-4 max-w-md text-[11px] leading-relaxed text-slate-400">
        Kalau dibatalkan padahal sudah terlanjur membayar, saldonya tetap tersimpan dan otomatis dipakai saat kamu klik bayar lagi.
      </p>
    </div>
  );
}

const PESAN_PERIKSA = "Sedang diperiksa. Naskah panjang bisa sampai satu menit.";

/** Pembayaran Cek AI/Parafrase yang sedang ditunggu (disimpan di browser ini saja). */
type Tertunda = {
  paymentId: string;
  snapToken: string;
  nominal: number;
  jenis: JenisPeriksa;
  teks: string;
  nama: string;
  waktu: number;
};
const KUNCI_TERTUNDA = "rk_periksa_tertunda";
const UMUR_TERTUNDA = 60 * 60 * 1000;

function simpanTertunda(job: Tertunda) {
  try { localStorage.setItem(KUNCI_TERTUNDA, JSON.stringify(job)); } catch { /* storage diblokir */ }
}
function hapusTertunda() {
  try { localStorage.removeItem(KUNCI_TERTUNDA); } catch { /* storage diblokir */ }
}
function bacaTertunda(): Tertunda | null {
  try {
    const raw = localStorage.getItem(KUNCI_TERTUNDA);
    if (!raw) return null;
    const j = JSON.parse(raw) as Tertunda;
    if (!j.paymentId || !j.snapToken || !j.teks || Date.now() - j.waktu > UMUR_TERTUNDA) {
      localStorage.removeItem(KUNCI_TERTUNDA);
      return null;
    }
    return j;
  } catch {
    return null;
  }
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

function IsiHasil({ h }: { h: HasilPeriksa }) {
  return (
    <div className="space-y-5">
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
          <a
            href={`/api/periksa/${h.id}/unduh`}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-brand px-4 py-2 text-xs font-bold text-brand transition-colors hover:bg-brand-50"
          >
            <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
            {labelUnduh(h)}
          </a>
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
