/**
 * Format angka ke Rupiah. Contoh: 35000 → "Rp 35.000"
 *
 * Ditulis tangan, bukan dengan Intl.NumberFormat, karena hasil Intl untuk
 * mata uang IDR berbeda antara Node dan peramban:
 *
 *   Node   → "Rp 7.000"   (spasi tanpa putus, U+00A0)
 *   Safari → "Rp7.000"    (tanpa spasi sama sekali)
 *
 * Di Next.js, HTML dibuat di server lalu dicocokkan ulang di peramban.
 * Dua hasil yang berbeda membuat React melempar "Text content does not
 * match server-rendered HTML" dan seluruh halaman gagal dimuat — bukan
 * sekadar angkanya yang salah tampil.
 *
 * Fungsi ini memakai spasi biasa (U+0020) dan titik sebagai pemisah ribuan,
 * jadi keluarannya sama persis di mana pun ia dijalankan.
 */
export function formatRupiah(jumlah: number): string {
  const angka = Number.isFinite(jumlah) ? Math.round(jumlah) : 0;
  const negatif = angka < 0;

  // Dipotong di 1e15 supaya tidak pernah masuk notasi eksponen (1e21),
  // yang akan membuat pemisah ribuannya kacau.
  const utuh = Math.min(Math.abs(angka), 1e15).toFixed(0);
  const ribuan = utuh.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${negatif ? "-" : ""}Rp ${ribuan}`;
}
