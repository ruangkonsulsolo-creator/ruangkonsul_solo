import Link from "next/link";
import Image from "next/image";
import { BRAND, waLink } from "@/lib/brand";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Kebijakan Privasi | ${BRAND.name}`,
  description: `Kebijakan privasi ${BRAND.name} — bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadimu.`,
};

const sections = [
  { title: "1. Data yang Kami Kumpulkan", content: `Kami mengumpulkan informasi yang kamu berikan saat mendaftar (nama, email, nomor WhatsApp), data transaksi (pesanan, pembayaran), dokumen yang kamu upload untuk diproses, serta data penggunaan platform secara anonim (halaman yang dikunjungi, durasi sesi).` },
  { title: "2. Cara Kami Menggunakan Data", content: `Data pribadimu digunakan untuk: memproses pesanan dan pembayaran, mengirim notifikasi status pesanan, meningkatkan kualitas layanan, berkomunikasi tentang promo dan update layanan (hanya jika kamu mengizinkan), dan memenuhi kewajiban hukum.` },
  { title: "3. Penyimpanan Dokumen", content: `Dokumen yang kamu upload disimpan di server terenkripsi (Supabase Storage, region Asia Tenggara). Dokumen hanya dapat diakses oleh tim pemrosesan ${BRAND.name} dan dihapus otomatis setelah pesanan selesai dalam 30 hari.` },
  { title: "4. Berbagi Data dengan Pihak Ketiga", content: `Kami tidak menjual data pribadimu. Data hanya dibagikan kepada: (a) penyedia pembayaran (Midtrans) untuk memproses transaksi, (b) penyedia infrastruktur (Supabase, Vercel) untuk operasional platform, (c) otoritas hukum jika diwajibkan oleh peraturan.` },
  { title: "5. Cookie dan Teknologi Pelacakan", content: `${BRAND.name} menggunakan cookie sesi untuk autentikasi dan cookie analitik anonim untuk memahami pola penggunaan. Kamu dapat menonaktifkan cookie di pengaturan browser, namun beberapa fitur platform mungkin tidak berfungsi optimal.` },
  { title: "6. Hak-Hak Pengguna", content: `Kamu berhak untuk: mengakses data pribadi yang kami simpan, memperbarui atau mengoreksi data yang tidak akurat, meminta penghapusan akun dan seluruh data terkait, dan menarik persetujuan pemrosesan data kapan saja.` },
  { title: "7. Keamanan Data", content: `Kami menerapkan enkripsi TLS untuk semua komunikasi, enkripsi data at-rest untuk penyimpanan dokumen, autentikasi dua faktor untuk akses admin, dan pemantauan akses secara berkala.` },
  { title: "8. Retensi Data", content: `Data akun disimpan selama akun aktif. Setelah penghapusan akun, data dihapus permanen dalam 30 hari. Data transaksi disimpan selama 5 tahun untuk keperluan pajak dan audit sesuai ketentuan hukum Indonesia.` },
  { title: "9. Data Anak-Anak", content: `Layanan ${BRAND.name} tidak ditujukan untuk pengguna di bawah 17 tahun. Kami tidak dengan sengaja mengumpulkan data dari anak-anak. Jika kamu yakin kami memiliki data anak di bawah umur, hubungi kami segera.` },
  { title: "10. Perubahan Kebijakan", content: `Kebijakan Privasi ini dapat diperbarui sewaktu-waktu. Perubahan material akan diberitahukan via email atau notifikasi platform minimal 14 hari sebelum berlaku. Penggunaan layanan setelah perubahan berarti kamu menyetujui kebijakan baru.` },
];

export default function KebijakanPrivasiPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src={BRAND.logoPng} alt={BRAND.name} width={28} height={28} unoptimized className="object-contain" />
            <span className="text-lg font-extrabold text-[#8B0000]">{BRAND.shortName}</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-[#8B0000] transition-colors">
            ← Kembali ke Beranda
          </Link>
        </div>
      </nav>
      <div className="mx-auto max-w-2xl px-4 py-14">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Kebijakan Privasi</h1>
          <p className="text-sm text-muted-foreground">
            Terakhir diperbarui: 15 Agustus {BRAND.year} · Berlaku untuk semua pengguna {BRAND.domain}
          </p>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-8">
          {BRAND.name} berkomitmen melindungi privasi dan keamanan data pribadimu. Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasimu saat menggunakan layanan {BRAND.name}.
        </p>
        <div className="space-y-8">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="text-base font-extrabold text-slate-900 mb-2">{s.title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{s.content}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-2xl border border-brand-200 bg-brand-50 p-5 text-sm text-[#8B0000]">
          <p className="font-semibold mb-1">Pertanyaan tentang privasi datamu?</p>
          <p>
            Hubungi kami di{" "}
            <a href={`mailto:${BRAND.email}`} className="font-semibold underline">{BRAND.email}</a>
            {" "}atau via{" "}
            <a href={waLink()} target="_blank" rel="noopener noreferrer" className="font-semibold underline">WhatsApp</a>.
          </p>
        </div>
      </div>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {BRAND.year} {BRAND.name} ·{" "}
        <Link href="/syarat" className="hover:text-[#8B0000]">Syarat &amp; Ketentuan</Link>
        {" · "}
        <Link href="/kebijakan-privasi" className="text-[#8B0000]">Kebijakan Privasi</Link>
      </footer>
    </div>
  );
}
