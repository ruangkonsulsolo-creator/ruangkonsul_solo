import Link from "next/link";
import Image from "next/image";
import { BRAND, waLink } from "@/lib/brand";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Syarat & Ketentuan | ${BRAND.name}`,
  description: `Syarat dan ketentuan penggunaan layanan ${BRAND.name}.`,
};

const sections = [
  { title: "1. Definisi", content: `Dalam Syarat & Ketentuan ini, "${BRAND.name}", "kami", atau "platform" merujuk pada layanan yang dioperasikan oleh tim ${BRAND.name}. "Pengguna" atau "kamu" merujuk pada individu yang mengakses atau menggunakan layanan ${BRAND.name}.` },
  { title: "2. Layanan yang Disediakan", content: `${BRAND.name} menyediakan layanan cek plagiasi, AI detector, DrillBit checker, jasa parafrase, dan program bimbingan akademik. Semua layanan bersifat bayar per penggunaan (pay-per-use) atau melalui paket hemat (bundle).` },
  { title: "3. Pendaftaran Akun", content: `Untuk menggunakan layanan berbayar, kamu perlu membuat akun dengan email aktif. Kamu bertanggung jawab menjaga kerahasiaan kredensial akun dan seluruh aktivitas yang terjadi di bawah akunmu.` },
  { title: "4. Pembayaran", content: `Pembayaran diproses melalui Midtrans dengan metode transfer bank, QRIS, dan dompet digital. Setelah pembayaran dikonfirmasi, pesanan tidak dapat dibatalkan kecuali file yang dikirim terbukti corrupt atau tidak dapat diproses.` },
  { title: "5. Kebijakan Refund", content: `${BRAND.name} tidak menyediakan refund setelah proses dimulai. Jika file kamu corrupt atau tidak dapat dibaca oleh sistem kami, pesanan akan dibatalkan dan pembayaran dikembalikan sepenuhnya dalam 3–7 hari kerja.` },
  { title: "6. Kerahasiaan Dokumen", content: `Semua dokumen yang kamu upload disimpan di server terenkripsi dan hanya dapat diakses oleh tim ${BRAND.name} untuk keperluan pemrosesan. Kami tidak akan membagikan, menjual, atau menggunakan dokumenmu untuk tujuan lain tanpa izin eksplisit.` },
  { title: "7. Kekayaan Intelektual", content: `Seluruh konten platform ${BRAND.name} — termasuk logo, desain, teks, dan kode — adalah milik ${BRAND.name} dan dilindungi hukum hak cipta Indonesia. Kamu tidak diizinkan menyalin, mendistribusikan, atau mereproduksi konten tanpa izin tertulis.` },
  { title: "8. Larangan Penggunaan", content: `Pengguna dilarang menggunakan layanan ${BRAND.name} untuk: (a) melanggar hak kekayaan intelektual pihak lain, (b) menyebarkan konten ilegal, (c) melakukan penipuan atau aktivitas yang merugikan pihak lain, (d) mencoba meretas atau merusak sistem ${BRAND.name}.` },
  { title: "9. Program Referral", content: `Komisi referral diberikan sebesar 10% dari nilai transaksi pertama teman yang mendaftar via link referralmu. Komisi dikreditkan ke saldo akun dan dapat digunakan untuk pembelian layanan. ${BRAND.name} berhak mengubah ketentuan referral sewaktu-waktu.` },
  { title: "10. Perubahan Layanan", content: `${BRAND.name} berhak mengubah, menangguhkan, atau menghentikan layanan kapan saja dengan pemberitahuan minimal 7 hari melalui email atau notifikasi platform.` },
  { title: "11. Batasan Tanggung Jawab", content: `${BRAND.name} tidak bertanggung jawab atas kerugian tidak langsung, konsekuensial, atau insidensi yang timbul dari penggunaan layanan. Tanggung jawab maksimal kami dibatasi pada nilai transaksi yang terkait.` },
  { title: "12. Hukum yang Berlaku", content: `Syarat & Ketentuan ini diatur oleh hukum Republik Indonesia. Setiap sengketa diselesaikan melalui musyawarah atau, jika perlu, melalui Badan Arbitrase Nasional Indonesia (BANI).` },
];

export default function SyaratPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src={BRAND.logoPng} alt={BRAND.name} width={28} height={28} unoptimized className="object-contain" />
            <span className="text-lg font-extrabold text-[#8B0000]">{BRAND.shortName}</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-[#8B0000] transition-colors flex items-center gap-1.5">
            ← Kembali ke Beranda
          </Link>
        </div>
      </nav>
      <div className="mx-auto max-w-2xl px-4 py-14">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Syarat &amp; Ketentuan</h1>
          <p className="text-sm text-muted-foreground">
            Terakhir diperbarui: 15 Agustus {BRAND.year} · Berlaku untuk semua pengguna {BRAND.domain}
          </p>
        </div>
        <div className="space-y-8">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="text-base font-extrabold text-slate-900 mb-2">{s.title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{s.content}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-2xl border border-brand-200 bg-brand-50 p-5 text-sm text-[#8B0000]">
          <p className="font-semibold mb-1">Ada pertanyaan tentang Syarat &amp; Ketentuan ini?</p>
          <p>
            Hubungi kami di{" "}
            <a href={`mailto:${BRAND.email}`} className="font-semibold underline">{BRAND.email}</a>{" "}atau via{" "}
            <a href={waLink()} target="_blank" rel="noopener noreferrer" className="font-semibold underline">WhatsApp</a>.
          </p>
        </div>
      </div>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {BRAND.year} {BRAND.name} ·{" "}
        <Link href="/syarat" className="text-[#8B0000]">Syarat &amp; Ketentuan</Link>
        {" · "}
        <Link href="/kebijakan-privasi" className="hover:text-[#8B0000]">Kebijakan Privasi</Link>
      </footer>
    </div>
  );
}
