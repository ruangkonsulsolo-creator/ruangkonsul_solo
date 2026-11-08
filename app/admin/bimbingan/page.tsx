import { redirect } from "next/navigation";

/**
 * Panel kelas bimbingan lama.
 *
 * Tabel `kelas_bimbingan` dipensiunkan di migration 031 — semua barisnya
 * dinonaktifkan dan isinya digantikan etalase Bimbingan Online Harian dan
 * Bimbingan Online Bulanan di tabel `produk`. Halaman ini tetap bisa dibuka
 * tapi hanya akan menampilkan daftar kosong, yang terbaca seperti data
 * hilang. Diarahkan ke katalog, bukan dibiarkan menyesatkan.
 */
export default function KelasBimbinganLama() {
  redirect("/admin/katalog");
}
