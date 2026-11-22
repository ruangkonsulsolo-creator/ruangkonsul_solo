import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { HalamanLegal, type BagianLegal } from "@/components/legal/HalamanLegal";

export const metadata: Metadata = {
  title: `Kebijakan Refund | ${BRAND.name}`,
  description: `Ketentuan pembatalan dan pengembalian dana layanan ${BRAND.name}.`,
};

const bagian: BagianLegal[] = [
  {
    judul: "Cek AI dan parafrase (otomatis)",
    isi: (
      <ul>
        <li>Kalau pemeriksaan gagal di sisi sistem atau penyedia, biaya <b>otomatis dikembalikan ke saldomu</b> saat itu juga.</li>
        <li>Kalau hasil sudah keluar, biaya tidak dapat dikembalikan karena layanan sudah diberikan.</li>
        <li>Pembayaran QRIS yang masuk sebagai saldo tetap tersimpan di akunmu dan bisa dipakai untuk pemeriksaan berikutnya.</li>
      </ul>
    ),
  },
  {
    judul: "Laporan Turnitin dan DrillBit (dikerjakan tim)",
    isi: (
      <ul>
        <li>Kalau laporan <b>belum dikirim dalam 1×24 jam</b> setelah pembayaran terkonfirmasi, kamu boleh membatalkan dan menerima pengembalian penuh.</li>
        <li>Kalau berkasmu tidak bisa diproses (rusak, terkunci kata sandi, kosong), kami menghubungimu untuk mengganti berkas atau mengembalikan dana penuh.</li>
        <li>Setelah laporan dikirim, biaya tidak dapat dikembalikan. Kalau ada kesalahan dari pihak kami (misalnya laporan untuk berkas lain atau tampilan laporan tidak sesuai pesanan), kami mengirim ulang laporan yang benar tanpa biaya.</li>
        <li>Salah unggah berkas oleh pengguna setelah laporan diproses dihitung sebagai pesanan baru.</li>
      </ul>
    ),
  },
  {
    judul: "Bimbingan dengan mentor",
    isi: (
      <ul>
        <li>Jadwal ulang dapat diminta lewat admin paling lambat <b>24 jam sebelum sesi</b>, sesuai ketersediaan mentor.</li>
        <li>Kalau sesi dibatalkan oleh kami atau mentor tidak hadir, kamu memilih jadwal pengganti atau pengembalian penuh.</li>
        <li>Kalau kamu tidak hadir tanpa kabar, atau membatalkan kurang dari 24 jam sebelum sesi, biaya sesi tidak dapat dikembalikan.</li>
        <li>Pemesanan yang tidak dibayar sampai batas waktu dibatalkan otomatis tanpa biaya.</li>
      </ul>
    ),
  },
  {
    judul: "Produk dan paket",
    isi: (
      <ul>
        <li><b>Produk fisik:</b> pesanan bisa dibatalkan dengan pengembalian penuh selama belum dikirim. Barang yang rusak atau tidak sesuai dapat dilaporkan maksimal <b>2×24 jam</b> setelah diterima, disertai foto atau video pembukaan paket, untuk ditukar atau dikembalikan dananya.</li>
        <li><b>Produk digital dan paket pendampingan:</b> tidak dapat dikembalikan setelah akses atau sesi pertama diberikan.</li>
      </ul>
    ),
  },
  {
    judul: "Saldo dan komisi referral",
    isi: (
      <p>
        Saldo (termasuk komisi referral) dipakai untuk layanan di {BRAND.name} dan tidak dapat dicairkan menjadi uang.
        Kalau pembayaran isi saldo terpotong dua kali karena gangguan, kelebihannya kami kembalikan.
      </p>
    ),
  },
  {
    judul: "Cara mengajukan refund",
    isi: (
      <>
        <p>
          Hubungi admin lewat WhatsApp {BRAND.whatsappDisplay} atau email {BRAND.email} dengan menyertakan <b>kode
          pesanan / nomor receipt</b> dan alasannya. Kami membalas paling lambat 1×24 jam pada hari kerja.
        </p>
        <p>
          Refund yang disetujui dikembalikan sebagai saldo (langsung) atau ke rekening/e-wallet atas namamu dalam
          <b> 3–7 hari kerja</b>, sesuai pilihanmu.
        </p>
      </>
    ),
  },
];

export default function KebijakanRefundPage() {
  return (
    <HalamanLegal
      judul="Kebijakan Refund"
      diperbarui="22 November 2026"
      aktif="/kebijakan-refund"
      ringkasan={
        <>
          Singkatnya: pemeriksaan otomatis yang gagal langsung dikembalikan ke saldo; laporan tim yang terlambat lebih dari
          1×24 jam boleh dibatalkan dengan pengembalian penuh; layanan yang sudah diberikan tidak dikembalikan, kecuali ada
          kesalahan dari pihak kami.
        </>
      }
      bagian={bagian}
    />
  );
}
