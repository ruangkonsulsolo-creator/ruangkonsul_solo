/**
 * Transisi antarhalaman.
 *
 * template.tsx dipilih, bukan layout.tsx: Next.js membuat ulang template
 * pada setiap navigasi, sehingga animasi masuknya berjalan lagi tiap kali
 * halaman berpindah. layout.tsx dipertahankan antarnavigasi, jadi animasi
 * di sana hanya jalan sekali seumur sesi.
 *
 * Animasinya CSS murni, tanpa pustaka tambahan: satu gerak naik tipis
 * disertai pudar masuk. Sengaja singkat (260 ms) dan hanya sekali per
 * halaman — transisi yang lama justru membuat situs terasa lambat, bukan
 * halus.
 *
 * Yang memakai preferensi "kurangi gerak" di sistemnya tidak mendapat
 * animasi sama sekali; aturannya ada di globals.css.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="transisi-halaman">{children}</div>;
}
