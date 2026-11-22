import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { HalamanLegal, type BagianLegal } from "@/components/legal/HalamanLegal";

export const metadata: Metadata = {
  title: `Kebijakan Privasi | ${BRAND.name}`,
  description: `Bagaimana ${BRAND.name} mengumpulkan, memakai, dan melindungi data pribadimu.`,
};

const bagian: BagianLegal[] = [
  {
    judul: "Data yang kami kumpulkan",
    isi: (
      <ul>
        <li><b>Data akun:</b> nama, email, nomor WhatsApp, foto profil (bila masuk lewat Google), dan kata sandi dalam bentuk terenkripsi.</li>
        <li><b>Data transaksi:</b> pesanan, pembayaran, receipt, saldo, dan riwayat referral. Kami tidak menyimpan data kartu atau rekeningmu; pembayaran diproses Midtrans.</li>
        <li><b>Dokumen dan teks</b> yang kamu unggah atau tempel untuk diperiksa.</li>
        <li><b>Percakapan</b> dengan mentor di fitur chat, dan alamat pengiriman untuk produk fisik.</li>
      </ul>
    ),
  },
  {
    judul: "Untuk apa data dipakai",
    isi: (
      <p>
        Untuk memproses pesanan dan pembayaran, mengirim notifikasi status pesanan (di situs, email, dan WhatsApp),
        menjadwalkan bimbingan, memberikan komisi referral, menangani keluhan, dan menjaga keamanan layanan. Kami tidak
        mengirim promosi ke WhatsApp-mu tanpa persetujuan.
      </p>
    ),
  },
  {
    judul: "Dokumen dan naskah",
    isi: (
      <ul>
        <li>
          <b>Cek AI dan parafrase:</b> teks naskah dikirim ke penyedia teknologi untuk diperiksa. Yang kami simpan hanya
          jumlah kata, cuplikan 200 karakter pertama, dan hasil pemeriksaan, supaya laporannya bisa kamu unduh lagi.
        </li>
        <li>
          <b>Laporan Turnitin dan DrillBit:</b> berkas aslimu dan berkas laporan disimpan di penyimpanan privat. Berkas hanya
          bisa dibuka olehmu dan tim pemeriksa, melalui tautan sementara yang dibuat setelah kepemilikan dicek.
        </li>
        <li>Berkas disimpan selama akunmu aktif agar laporan bisa diunduh ulang. Kamu bisa meminta berkas tertentu dihapus kapan saja.</li>
      </ul>
    ),
  },
  {
    judul: "Pihak ketiga yang membantu kami",
    isi: (
      <>
        <p>Kami tidak menjual data pribadimu. Data dibagikan seperlunya kepada penyedia berikut:</p>
        <ul>
          <li><b>Supabase</b> (basis data dan penyimpanan berkas) dan <b>Vercel</b> (hosting situs).</li>
          <li><b>Midtrans</b> untuk memproses pembayaran.</li>
          <li><b>Google</b> untuk masuk dengan akun Google, dan model AI Google untuk layanan parafrase.</li>
          <li><b>Penyedia deteksi AI</b> (misalnya GPTZero) untuk layanan Cek AI.</li>
          <li><b>Fonnte</b> untuk mengirim notifikasi WhatsApp (nomor dan isi notifikasi), dan penyedia email untuk receipt.</li>
        </ul>
        <p>Kami juga dapat membuka data bila diwajibkan hukum.</p>
      </>
    ),
  },
  {
    judul: "Chat dengan mentor",
    isi: (
      <p>
        Pesan di fitur chat tersimpan agar percakapan bisa dilanjutkan. Admin dapat membuka percakapan bila ada laporan
        masalah, sengketa, atau dugaan penyalahgunaan. Jangan kirim kata sandi atau data sensitif lewat chat.
      </p>
    ),
  },
  {
    judul: "Cookie",
    isi: (
      <p>
        Kami memakai cookie yang diperlukan agar kamu tetap masuk ke akun, dan satu cookie referral (30 hari) untuk
        mencatat kode referral saat kamu mendaftar. Kami tidak memasang cookie iklan atau pelacak pihak ketiga.
      </p>
    ),
  },
  {
    judul: "Keamanan",
    isi: (
      <p>
        Semua koneksi memakai enkripsi HTTPS. Akses data dibatasi per peran (pengguna, mentor, admin) di tingkat basis data,
        berkas disimpan di penyimpanan privat, dan kunci rahasia layanan hanya ada di server. Tidak ada sistem yang
        sepenuhnya kebal; kalau terjadi insiden yang memengaruhi datamu, kami memberi tahu kamu.
      </p>
    ),
  },
  {
    judul: "Hak kamu",
    isi: (
      <p>
        Kamu dapat melihat dan memperbarui data akun di halaman Profil, meminta salinan data, meminta berkas atau akunmu
        dihapus, serta menolak pesan selain notifikasi pesanan. Kirim permintaan ke {BRAND.email}; kami memprosesnya paling
        lambat 30 hari.
      </p>
    ),
  },
  {
    judul: "Masa simpan",
    isi: (
      <p>
        Data akun dan berkas disimpan selama akun aktif. Setelah akun dihapus, data dan berkas dihapus dalam 30 hari,
        kecuali catatan transaksi yang wajib disimpan untuk keperluan pajak dan pembukuan sesuai peraturan yang berlaku.
      </p>
    ),
  },
  {
    judul: "Pengguna di bawah umur",
    isi: (
      <p>
        Layanan ini ditujukan untuk mahasiswa dan pengguna berusia 17 tahun ke atas. Kalau kamu mengetahui ada data anak di
        bawah umur di layanan kami, hubungi kami agar segera kami hapus.
      </p>
    ),
  },
  {
    judul: "Perubahan kebijakan",
    isi: <p>Kebijakan ini dapat diperbarui. Perubahan penting diumumkan di situs atau lewat notifikasi sebelum berlaku.</p>,
  },
];

export default function KebijakanPrivasiPage() {
  return <HalamanLegal judul="Kebijakan Privasi" diperbarui="22 November 2026" bagian={bagian} aktif="/kebijakan-privasi" />;
}
