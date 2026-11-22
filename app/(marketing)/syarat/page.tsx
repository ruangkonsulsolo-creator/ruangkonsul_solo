import Link from "next/link";
import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { HalamanLegal, type BagianLegal } from "@/components/legal/HalamanLegal";

export const metadata: Metadata = {
  title: `Syarat & Ketentuan | ${BRAND.name}`,
  description: `Syarat dan ketentuan penggunaan layanan ${BRAND.name}.`,
};

const bagian: BagianLegal[] = [
  {
    judul: "Definisi",
    isi: (
      <p>
        &ldquo;{BRAND.name}&rdquo;, &ldquo;kami&rdquo;, atau &ldquo;platform&rdquo; adalah layanan yang dioperasikan
        tim {BRAND.name} melalui situs {BRAND.domain}. &ldquo;Pengguna&rdquo; atau &ldquo;kamu&rdquo; adalah setiap
        orang yang mengakses atau memakai layanan kami.
      </p>
    ),
  },
  {
    judul: "Layanan",
    isi: (
      <>
        <p>{BRAND.name} menyediakan:</p>
        <ul>
          <li><b>Bimbingan akademik</b> bersama mentor (sesi terjadwal dan paket pendampingan).</li>
          <li><b>Cek AI dan parafrase</b> otomatis, diproses penyedia teknologi pihak ketiga; hasil keluar dalam hitungan menit.</li>
          <li><b>Laporan cek plagiasi (Turnitin) dan DrillBit</b> yang dikerjakan tim kami; laporan dikirim maksimal 1×24 jam setelah pembayaran terkonfirmasi.</li>
          <li><b>Produk</b> fisik maupun digital di katalog, serta <b>saldo</b> prabayar untuk layanan cek naskah.</li>
        </ul>
      </>
    ),
  },
  {
    judul: "Sifat hasil pemeriksaan",
    isi: (
      <p>
        Skor AI, persentase kemiripan, dan hasil parafrase bersifat <b>indikatif</b> sebagai bahan perbaikan naskah,
        bukan putusan akhir. Mesin pendeteksi dapat keliru, dan setiap kampus dapat memakai pengaturan berbeda. Keputusan
        akademik tetap menjadi kewenangan dosen atau institusimu, dan tanggung jawab atas naskah tetap ada pada penulisnya.
      </p>
    ),
  },
  {
    judul: "Akun",
    isi: (
      <p>
        Layanan berbayar memerlukan akun dengan email aktif dan nomor WhatsApp yang benar. Kamu bertanggung jawab menjaga
        kerahasiaan kata sandi dan atas aktivitas di akunmu. Satu orang sebaiknya memakai satu akun.
      </p>
    ),
  },
  {
    judul: "Harga dan pembayaran",
    isi: (
      <>
        <p>
          Harga tercantum di halaman layanan dalam Rupiah dan dapat berubah sewaktu-waktu; harga yang berlaku adalah yang
          tampil saat kamu membayar. Pembayaran diproses oleh Midtrans melalui QRIS (dan metode lain bila ditampilkan di
          halaman pembayaran). Pesanan diproses setelah pembayaran terkonfirmasi otomatis.
        </p>
        <p>
          Saldo dipakai untuk layanan cek naskah, tidak dapat dicairkan menjadi uang, dan tidak dapat dipindahkan ke akun lain.
        </p>
      </>
    ),
  },
  {
    judul: "Pembatalan dan refund",
    isi: (
      <p>
        Ketentuan pembatalan dan pengembalian dana untuk setiap layanan diatur di{" "}
        <Link href="/kebijakan-refund" className="font-semibold text-brand underline">Kebijakan Refund</Link>.
      </p>
    ),
  },
  {
    judul: "Dokumen dan kerahasiaan",
    isi: (
      <p>
        Dokumenmu hanya dipakai untuk memproses pesananmu dan tidak kami jual atau terbitkan. Cara kami menyimpan dan
        melindungi data dijelaskan di{" "}
        <Link href="/kebijakan-privasi" className="font-semibold text-brand underline">Kebijakan Privasi</Link>.
        Kamu menjamin berhak atas dokumen yang kamu unggah.
      </p>
    ),
  },
  {
    judul: "Program referral",
    isi: (
      <p>
        Pengajak mendapat komisi 10% dari pembayaran lunas pertama teman yang mendaftar lewat link referralnya. Komisi
        masuk otomatis ke saldo pengajak. Akun ganda, mendaftarkan diri sendiri, atau cara curang lain membuat komisi
        dibatalkan. {BRAND.name} dapat mengubah ketentuan referral dengan pemberitahuan di situs.
      </p>
    ),
  },
  {
    judul: "Larangan",
    isi: (
      <p>
        Pengguna dilarang: (a) mengunggah konten yang melanggar hukum atau hak pihak lain, (b) menyalahgunakan pembayaran,
        promo, atau referral, (c) mencoba meretas, membebani, atau merusak sistem, dan (d) memakai layanan untuk merugikan
        pihak lain. Kami dapat menangguhkan akun yang melanggar.
      </p>
    ),
  },
  {
    judul: "Kekayaan intelektual",
    isi: (
      <p>
        Logo, desain, teks, dan kode situs ini milik {BRAND.name}. Naskah dan dokumen yang kamu unggah tetap milikmu.
        Nama merek pihak ketiga (misalnya Turnitin, DrillBit, GPTZero) adalah milik pemiliknya masing-masing.
      </p>
    ),
  },
  {
    judul: "Batas tanggung jawab",
    isi: (
      <p>
        Kami berupaya layanan berjalan baik, tetapi tidak menjamin bebas gangguan. Tanggung jawab kami atas suatu pesanan
        paling besar sebesar nilai pesanan tersebut. Kami tidak bertanggung jawab atas kerugian tidak langsung, termasuk
        keputusan akademik yang diambil pihak lain.
      </p>
    ),
  },
  {
    judul: "Perubahan dan hukum yang berlaku",
    isi: (
      <p>
        Syarat ini dapat diperbarui; perubahan penting diumumkan di situs atau lewat notifikasi. Syarat ini tunduk pada
        hukum Republik Indonesia, dan sengketa diselesaikan lebih dulu secara musyawarah.
      </p>
    ),
  },
];

export default function SyaratPage() {
  return <HalamanLegal judul="Syarat & Ketentuan" diperbarui="22 November 2026" bagian={bagian} aktif="/syarat" />;
}
