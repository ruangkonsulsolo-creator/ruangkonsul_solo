import Link from "next/link";
import type { Metadata } from "next";
import { BRAND, waLink } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Layanan",
  description:
    "Bimbingan skripsi dan tesis, mentoring tatap muka di Solo, pendampingan " +
    "revisi dan publikasi jurnal, desain presentasi sidang, serta merchandise wisuda.",
};

/**
 * Katalog layanan.
 *
 * Halaman ini sebelumnya memuat empat layanan pemrosesan dokumen dengan
 * struktur per-file (SLA, format, ukuran maksimum). Struktur itu tidak cocok
 * untuk bimbingan, yang dijual per sesi dan per pendampingan, jadi halamannya
 * ditulis ulang alih-alih diisi ulang.
 */
type Layanan = {
  nama: string;
  ringkas: string;
  deskripsi: string;
  harga: string;
  satuan: string;
  isi: string[];
  href: string;
  cta: string;
  utama?: boolean;
};

const LAYANAN: Layanan[] = [
  {
    nama: "Bimbingan Skripsi & Tesis",
    ringkas: "Sesi satu lawan satu bersama mentor",
    deskripsi:
      "Kamu yang menulis, mentor yang menunjukkan jalan keluar saat buntu. " +
      "Mulai dari menajamkan rumusan masalah, memilih metode yang cocok dengan " +
      "datamu, sampai menyiapkan diri menghadapi pertanyaan penguji.",
    harga: "Rp 150.000",
    satuan: "per sesi 60 menit",
    isi: [
      "Daring atau tatap muka di Solo",
      "Mentor sesuai bidang dan metodemu",
      "Catatan dan tindak lanjut setelah sesi",
      "Jadwal dipilih sendiri lewat kalender",
    ],
    href: "/booking",
    cta: "Lihat jadwal mentor",
    utama: true,
  },
  {
    nama: "Paket Bimbingan Bulanan",
    ringkas: "Pendampingan berkelanjutan sampai sidang",
    deskripsi:
      "Untuk yang sedang mengejar target wisuda. Kuota sesi per bulan dengan " +
      "mentor tetap, supaya tidak perlu menjelaskan ulang penelitianmu dari awal " +
      "setiap kali bertemu.",
    harga: "Rp 500.000",
    satuan: "per bulan, 4 sesi",
    isi: [
      "Mentor tetap selama paket berjalan",
      "Tanya jawab singkat di antara sesi",
      "Rekap progres tiap akhir bulan",
      "Sisa kuota terlihat di dashboard",
    ],
    href: "/booking",
    cta: "Mulai berlangganan",
  },
  {
    nama: "Pendampingan Revisi",
    ringkas: "Membedah catatan pembimbing bersama",
    deskripsi:
      "Catatan dosen sering singkat dan sulit diterjemahkan jadi langkah konkret. " +
      "Mentor membaca draf dan catatanmu, lalu membantu menyusun rencana perbaikan " +
      "yang kamu kerjakan sendiri.",
    harga: "Rp 150.000",
    satuan: "per sesi",
    isi: [
      "Draf dibaca sebelum sesi dimulai",
      "Prioritas revisi disusun bersama",
      "Penjelasan alasan di balik tiap catatan",
    ],
    href: "/booking",
    cta: "Pesan sesi revisi",
  },
  {
    nama: "Pendampingan Publikasi Jurnal",
    ringkas: "Memilih jurnal dan menyiapkan naskah",
    deskripsi:
      "Memahami perbedaan jurnal bereputasi dan predator, menyesuaikan naskah " +
      "dengan template dan gaya selingkung, serta menyiapkan respons untuk " +
      "komentar reviewer.",
    harga: "Rp 350.000",
    satuan: "per pendampingan",
    isi: [
      "Peninjauan kecocokan jurnal tujuan",
      "Penyesuaian format dan sitasi",
      "Latihan menanggapi komentar reviewer",
    ],
    href: "/booking",
    cta: "Konsultasikan naskahmu",
  },
  {
    nama: "Desain Presentasi Sidang",
    ringkas: "Slide yang membantumu menjelaskan",
    deskripsi:
      "Penelitian yang baik sering kalah di ruang sidang karena slide yang penuh " +
      "teks. Kami menyusun ulang alurnya supaya penguji mengerti kontribusimu " +
      "dalam lima menit pertama.",
    harga: "Rp 250.000",
    satuan: "per deck",
    isi: [
      "Alur cerita disusun ulang, bukan sekadar dipercantik",
      "Grafik data dibuat terbaca dari kursi belakang",
      "Dua kali revisi",
    ],
    href: waLink("Halo, saya ingin tanya soal desain presentasi sidang."),
    cta: "Tanya lewat WhatsApp",
  },
  {
    nama: "Merchandise & Buket Wisuda",
    ringkas: "Untuk hari yang sudah lama ditunggu",
    deskripsi:
      "Buket wisuda, tumbler, dan kaus Ruang Konsul. Bisa diantar di Solo atau " +
      "dikirim ke luar kota.",
    harga: "Mulai Rp 85.000",
    satuan: "per item",
    isi: ["Buket bunga dan snack", "Tumbler dan kaus", "Pengiriman seluruh Indonesia"],
    href: "/dashboard/merchandise",
    cta: "Lihat katalog",
  },
];

export default function LayananPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-20">
      <header className="rail-layout">
        <p className="rail-note">Layanan</p>
        <div>
          <h1 className="max-w-prose text-3xl md:text-4xl">
            Pendampingan untuk tulisan yang kamu kerjakan sendiri
          </h1>
          <p className="mt-4 max-w-measure text-lg text-ink-soft">
            Semua layanan di bawah bertumpu pada hal yang sama: kamu tetap penulis
            karyamu. Mentor membantu kamu melewati bagian yang macet, bukan
            menggantikanmu mengerjakannya.
          </p>
        </div>
      </header>

      <section className="mt-16" aria-labelledby="daftar-layanan">
        <h2 id="daftar-layanan" className="sr-only">
          Daftar layanan
        </h2>

        <ul className="border-t border-paper-edge">
          {LAYANAN.map((l) => (
            <li key={l.nama} className="rail-layout border-b border-paper-edge py-8">
              <div className="rail-note">
                <span data-numeric className="block font-medium text-ink">
                  {l.harga}
                </span>
                <span className="block">{l.satuan}</span>
                {l.utama && (
                  <span className="mt-1 block text-koreksi-deep">Produk utama</span>
                )}
              </div>

              <div>
                <h3 className="text-xl md:text-2xl">{l.nama}</h3>
                <p className="mt-1 text-ink-faint">{l.ringkas}</p>
                <p className="mt-3 max-w-measure text-ink-soft">{l.deskripsi}</p>

                <ul className="mt-4 max-w-measure space-y-1.5 text-sm text-ink-soft">
                  {l.isi.map((i) => (
                    <li key={i} className="flex gap-2.5">
                      <span aria-hidden="true" className="text-ink-ghost">
                        —
                      </span>
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={l.href}
                  className="mt-5 inline-block border-b-2 border-koreksi pb-0.5 font-medium"
                >
                  {l.cta}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <aside className="rail-layout mt-14">
        <p className="rail-note">Catatan</p>
        <div className="max-w-measure">
          <p className="text-ink-soft">
            Ruang Konsul tidak mengerjakan skripsi, tesis, atau disertasi untuk
            diserahkan atas namamu, dan tidak menyediakan jasa untuk meloloskan
            tulisan dari pemeriksaan kemiripan. Kalau itu yang kamu cari, kami
            bukan tempatnya.
          </p>
          <p className="mt-4 text-sm text-ink-faint">
            Ada kebutuhan yang belum tercakup di atas? Hubungi kami di{" "}
            <a
              href={waLink("Halo, saya ingin bertanya soal layanan Ruang Konsul.")}
              className="border-b border-ink-ghost"
            >
              WhatsApp {BRAND.whatsappDisplay}
            </a>
            .
          </p>
        </div>
      </aside>
    </main>
  );
}
