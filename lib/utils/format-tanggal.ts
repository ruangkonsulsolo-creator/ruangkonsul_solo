/**
 * Tanggal Indonesia yang hasilnya sama di server dan di peramban.
 *
 * Ada dua sumber selisih yang harus ditutup sekaligus, dan menutup salah
 * satunya saja tidak cukup:
 *
 * 1. Nama bulan. Singkatan "id-ID" tidak selalu sama antar mesin
 *    ("Agu" vs "Agt"). Jadi nama bulannya ditulis sendiri di sini.
 *
 * 2. Zona waktu. Server berjalan di UTC, peramban pengguna di WIB. Untuk
 *    data pukul 20.00 UTC, getDate() di server memberi tanggal 8 dan di
 *    peramban tanggal 9 — selisih sehari penuh. Jadi bagian tanggalnya
 *    diambil lewat Asia/Jakarta secara eksplisit, bukan mengikuti zona
 *    waktu mesin.
 *
 * Keduanya penting karena di Next.js HTML dibuat di server lalu dicocokkan
 * ulang di peramban; satu karakter berbeda membuat React melempar
 * "Text content does not match server-rendered HTML".
 *
 * "en-CA" dipakai hanya untuk mengambil angkanya, karena keluarannya
 * berbentuk YYYY-MM-DD dan bentuk itu seragam di semua mesin. Yang dibaca
 * pengguna tetap nama bulan Indonesia di bawah.
 */

const BULAN_PANJANG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const BULAN_PENDEK = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const WIB = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 2026-11-08T20:00Z -> "9 Nov 2026" (pendek) atau "9 November 2026". */
export function formatTanggal(
  nilai: string | Date | null | undefined,
  gaya: "pendek" | "panjang" = "pendek"
): string {
  if (!nilai) return "";
  const d = nilai instanceof Date ? nilai : new Date(nilai);
  if (Number.isNaN(d.getTime())) return "";

  // "2026-11-09" -> ["2026", "11", "09"]
  const [tahun, bulan, tanggal] = WIB.format(d).split("-");
  const nama = (gaya === "panjang" ? BULAN_PANJANG : BULAN_PENDEK)[
    Number(bulan) - 1
  ];

  return `${Number(tanggal)} ${nama} ${tahun}`;
}
