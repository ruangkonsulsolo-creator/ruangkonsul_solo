import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

/* ─── Same seed data ─── */
const articles: Record<string, {
  title: string; excerpt: string; cover: string; category: string;
  readTime: string; date: string; author: string; content: string;
}> = {
  "perbedaan-turnitin-repository-no-repository": {
    title: "Perbedaan Turnitin Repository dan No Repository, Mana yang Harus Dipilih?",
    excerpt: "Banyak mahasiswa bingung soal perbedaan Turnitin Repository vs No Repository.",
    cover: "/promo-bimbingan.jpeg",
    category: "Panduan Akademik",
    readTime: "5 menit",
    date: "10 Agustus 2026",
    author: "Tim Ruang Konsul Solo",
    content: `
## Apa Itu Turnitin Repository?

Turnitin Repository adalah fitur di mana dokumen yang kamu submit akan **disimpan secara permanen** di database Turnitin. Artinya, karya tulismu bisa menjadi referensi pembanding untuk cek plagiasi mahasiswa lain di masa depan.

### Kapan Menggunakan Repository?

- Saat kampusmu **mewajibkan** submit ke repository untuk sidang
- Untuk karya ilmiah yang sudah **final dan dipublikasikan**
- Saat kamu ingin karya tulismu terdaftar sebagai referensi

## Apa Itu No Repository?

**No Repository** berarti dokumenmu dicek similaritynya **tanpa disimpan** ke database Turnitin. Hasilnya tetap akurat, tapi tidak meninggalkan jejak di sistem.

### Kapan Menggunakan No Repository?

- Saat kamu masih dalam **tahap revisi** dan tidak ingin dokumenmu tersimpan
- Untuk **cek awal** sebelum submit resmi ke kampus
- Jika kampusmu tidak mewajibkan repository

## Mana yang Harus Dipilih?

Ruang Konsul Solo menggunakan **No Repository** untuk semua layanan cek plagiasi. Ini berarti:

✅ Dokumenmu tidak tersimpan di database  
✅ Bisa dicek berkali-kali tanpa khawatir terdeteksi self-plagiarism  
✅ Tetap mendapat laporan similarity yang akurat dan detail  

Kalau kampusmu membutuhkan submit ke repository untuk sidang resmi, kamu tetap bisa melakukannya melalui portal kampus setelah revisi selesai.
    `,
  },
  "apa-itu-cek-drillbit-pengertian-fungsi": {
    title: "Apa Itu Cek DrillBit? Pengertian, Fungsi, dan Cara Kerjanya",
    excerpt: "DrillBit adalah platform deteksi plagiasi yang banyak digunakan universitas di Indonesia.",
    cover: "/promo-bundling.jpeg",
    category: "Panduan Layanan",
    readTime: "4 menit",
    date: "5 Agustus 2026",
    author: "Tim Ruang Konsul Solo",
    content: `
## Apa Itu DrillBit?

DrillBit adalah platform deteksi plagiasi berbasis cloud yang dikembangkan khusus untuk institusi akademik di Asia Tenggara, termasuk Indonesia.

## Mengapa Kampus Menggunakan DrillBit?

Berbeda dengan Turnitin yang berbasis di AS, DrillBit:

- Memiliki **database konten lokal** yang lebih relevan untuk karya ilmiah Indonesia
- Mendukung **Bahasa Indonesia** lebih baik
- Harga langganan yang lebih **terjangkau** untuk universitas
- Laporan yang diakui oleh banyak kampus di Indonesia

## Cara Kerja DrillBit

1. Dokumen diupload ke sistem DrillBit
2. Teks dipecah dan dianalisis menggunakan algoritma NLP
3. Dibandingkan dengan database jurnal, artikel, dan karya ilmiah
4. Laporan similarity dihasilkan dengan highlight sumber

## Layanan Ruang Konsul Solo untuk DrillBit

Ruang Konsul Solo menyediakan **Cek DrillBit** dengan akses ke sistem DrillBit institusi. Kamu mendapat laporan resmi yang sama dengan yang dihasilkan oleh portal kampus, sehingga bisa langsung digunakan untuk keperluan sidang.
    `,
  },
  "cara-membaca-laporan-turnitin-similarity": {
    title: "Cara Membaca Laporan Turnitin agar Tidak Salah Menilai Plagiarisme",
    excerpt: "Persentase similarity di Turnitin tidak selalu berarti plagiat.",
    cover: "/promo-konsultasi.jpeg",
    category: "Tips Skripsi",
    readTime: "6 menit",
    date: "1 Agustus 2026",
    author: "Tim Ruang Konsul Solo",
    content: `
## Similarity Score ≠ Plagiat

Ini kesalahpahaman paling umum. Turnitin hanya mengukur **kemiripan teks** (similarity), bukan plagiarisme. Perbedaannya:

- **Similarity tinggi** bisa karena kutipan resmi, terminologi baku, atau referensi daftar pustaka
- **Plagiarisme** adalah mengambil karya orang lain tanpa atribusi yang tepat

## Warna di Laporan Turnitin

Turnitin menggunakan sistem warna untuk menunjukkan similarity:

- 🔵 **Biru (0%)** — Tidak ada similarity
- 🟢 **Hijau (1–24%)** — Similarity rendah, umumnya aman
- 🟡 **Kuning (25–49%)** — Perlu diperiksa lebih lanjut
- 🟠 **Oranye (50–74%)** — Perhatikan sumber kutipan
- 🔴 **Merah (75–100%)** — Perlu revisi serius

## Berapa Batas Aman Similarity?

Setiap kampus punya kebijakan berbeda, tapi umumnya:
- **S1 (Skripsi):** ≤ 25–30%
- **S2 (Tesis):** ≤ 20–25%  
- **Jurnal ilmiah:** ≤ 15–20%

## Tips Menurunkan Similarity

1. **Parafrase** kutipan langsung menggunakan kata-katamu sendiri
2. **Hapus atau kurangi** daftar pustaka yang panjang berulang
3. **Gunakan kutipan tidak langsung** daripada kutipan langsung
4. **Exclude bibliography** saat submit ke Turnitin
    `,
  },
  "tips-menurunkan-plagiasi-skripsi": {
    title: "7 Tips Efektif Menurunkan Persentase Plagiasi Skripsimu",
    excerpt: "Nilai similarity masih tinggi? Berikut 7 cara praktis yang bisa kamu lakukan sendiri.",
    cover: "/promo-parafrase.jpeg",
    category: "Tips Skripsi",
    readTime: "7 menit",
    date: "28 Juli 2026",
    author: "Tim Ruang Konsul Solo",
    content: `
## 7 Tips Menurunkan Plagiasi Skripsi

### 1. Parafrase Setiap Kutipan

Alih-alih menyalin langsung, tulis ulang dengan gaya bahasamu sendiri sambil mempertahankan makna aslinya.

### 2. Gunakan Kutipan Tidak Langsung

Ubah kutipan langsung menjadi kutipan tidak langsung dengan menambahkan interpretasimu.

### 3. Exclude Daftar Pustaka

Saat submit ke Turnitin, aktifkan opsi "Exclude Bibliography" agar daftar pustaka tidak dihitung.

### 4. Exclude Kutipan Langsung

Aktifkan "Exclude Quoted" untuk mengecualikan teks yang sudah menggunakan tanda kutip.

### 5. Perhatikan Terminologi Teknis

Terminologi baku tidak perlu diparafrase. Tapi pastikan tidak mengulangnya terlalu sering.

### 6. Cek Per Bab

Identifikasi bab mana yang paling tinggi similaritynya dan fokus revisi di sana.

### 7. Gunakan Jasa Parafrase Profesional

Kalau sudah maksimal tapi similarity masih tinggi, pertimbangkan [jasa parafrase Ruang Konsul Solo](/dashboard/jasa-parafrase) yang dikerjakan oleh tim berpengalaman.
    `,
  },
  "ai-detector-tools-terbaik-mahasiswa": {
    title: "Rekomendasi AI Detector Terbaik untuk Mahasiswa 2026",
    excerpt: "Kenali tool AI detector terbaik yang bisa mendeteksi teks buatan AI dalam karya ilmiahmu.",
    cover: "/promo-bimbingan.jpeg",
    category: "Teknologi",
    readTime: "5 menit",
    date: "22 Juli 2026",
    author: "Tim Ruang Konsul Solo",
    content: `
## Kenapa AI Detector Makin Penting?

Sejak ChatGPT dan AI writing tools meledak, banyak dosen dan institusi akademik mulai menggunakan AI detector untuk memastikan keaslian karya mahasiswa.

## AI Detector Terpopuler 2026

### GPTZero
Tool paling populer untuk deteksi teks AI. Memberikan skor "perplexity" dan "burstiness" yang mengindikasikan apakah teks ditulis manusia atau AI.

### Turnitin AI Detection
Turnitin kini memiliki modul AI detection bawaan yang terintegrasi langsung dengan laporan similarity.

### Originality.ai
Cocok untuk blogger dan akademisi. Memberikan persentase teks AI per paragraf.

## Layanan AI Detector Ruang Konsul Solo

Ruang Konsul Solo menggunakan mesin AI detector yang setara dengan GPTZero untuk memberikan laporan lengkap:

✅ Skor AI per paragraf  
✅ Overall AI percentage  
✅ Laporan PDF siap pakai  
✅ Harga mulai Rp 25.000/file  
    `,
  },
  "persiapan-sidang-skripsi-checklist": {
    title: "Checklist Persiapan Sidang Skripsi yang Wajib Kamu Punya",
    excerpt: "Jangan sampai ada yang terlewat. Gunakan checklist lengkap ini untuk memastikan semua persiapanmu matang.",
    cover: "/promo-konsultasi.jpeg",
    category: "Tips Skripsi",
    readTime: "8 menit",
    date: "15 Juli 2026",
    author: "Tim Ruang Konsul Solo",
    content: `
## Checklist Dokumen

- [ ] Naskah skripsi final (sudah di-ACC pembimbing)
- [ ] Laporan cek plagiasi (Turnitin / DrillBit)
- [ ] Laporan cek AI (jika diminta)
- [ ] Lembar persetujuan pembimbing
- [ ] Form pendaftaran sidang
- [ ] Hardcover / softcover sesuai ketentuan kampus

## Checklist Presentasi

- [ ] File PowerPoint/Keynote siap dan sudah dibackup
- [ ] Latihan presentasi minimal 3 kali
- [ ] Siapkan jawaban untuk pertanyaan umum penguji
- [ ] Cek durasi presentasi (biasanya 15–20 menit)

## Checklist Teknis

- [ ] Laptop + charger
- [ ] Flashdisk berisi file presentasi
- [ ] Dress code sesuai aturan kampus
- [ ] Datang minimal 30 menit sebelum jadwal

## Tips Hari-H Sidang

1. **Tidur cukup** malam sebelumnya
2. **Sarapan** — jangan sidang dalam keadaan lapar
3. **Bawa air minum** ke ruang sidang
4. **Tenang dan percaya diri** — kamu sudah persiapkan segalanya

## Setelah Sidang

Jika ada revisi, jangan tunda. Segera kerjakan dan manfaatkan [konsultasi Ruang Konsul Solo](/daftar) untuk membantu proses revisi lebih cepat.
    `,
  },
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = articles[params.slug];
  if (!article) return { title: "Artikel tidak ditemukan | Ruang Konsul Solo" };
  return {
    title: `${article.title} | Blog Ruang Konsul Solo`,
    description: article.excerpt,
  };
}

/* Simple markdown → HTML renderer (no external deps) */
function renderMarkdown(md: string): string {
  return md
    .trim()
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-extrabold text-slate-900 mt-8 mb-3">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-slate-800 mt-5 mb-2">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="font-semibold text-brand hover:underline">$1</a>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="flex items-start gap-2 text-slate-700"><span class="mt-1 h-4 w-4 rounded border border-slate-300 flex-shrink-0 inline-block"></span><span>$1</span></li>')
    .replace(/^✅ (.+)$/gm, '<li class="flex items-start gap-2 text-slate-700"><span class="text-brand mt-0.5">✓</span><span>$1</span></li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="flex items-start gap-2 text-slate-700"><span class="font-bold text-brand flex-shrink-0">$1.</span><span>$2</span></li>')
    .replace(/^- (.+)$/gm, '<li class="flex items-start gap-2 text-slate-700"><span class="mt-2 h-1.5 w-1.5 rounded-full bg-brand flex-shrink-0 inline-block"></span><span>$1</span></li>')
    .replace(/(<li .+<\/li>\n?)+/g, (match) => `<ul class="space-y-2 my-4 pl-1">${match}</ul>`)
    .replace(/\n\n/g, '</p><p class="text-slate-600 leading-relaxed my-3">')
    .replace(/^(?!<[h|u|l])(.+)$/gm, (line) =>
      line.startsWith("<") ? line : `<p class="text-slate-600 leading-relaxed my-3">${line}</p>`
    );
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const article = articles[params.slug];
  if (!article) notFound();

  const otherArticles = Object.entries(articles)
    .filter(([slug]) => slug !== params.slug)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-rks.png" alt="Ruang Konsul Solo" width={28} height={28} />
            <span className="text-lg font-extrabold text-brand">{BRAND.shortName}</span>
          </Link>
          <div className="flex gap-2">
            <Link href="/daftar" className="rounded-lg border-2 border-brand px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand-50 transition-colors">Daftar</Link>
            <Link href="/login" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-light transition-colors">Login</Link>
          </div>
        </div>
      </nav>

      <article className="mx-auto max-w-2xl px-4 py-12">
        {/* Breadcrumb */}
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand mb-6 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Kembali ke Blog
        </Link>

        {/* Category + meta */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="rounded-full bg-brand text-white text-xs font-bold px-3 py-1">
            {article.category}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {article.date}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {article.readTime}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 leading-snug mb-4">
          {article.title}
        </h1>

        {/* Author */}
        <div className="flex items-center gap-2 mb-6 pb-6 border-b border-slate-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">
            K
          </div>
          <span className="text-sm font-medium text-slate-700">{article.author}</span>
        </div>

        {/* Cover image */}
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-8 shadow-card">
          <Image
            src={article.cover}
            alt={article.title}
            fill
            className="object-cover object-top"
            sizes="(max-width: 768px) 100vw, 672px"
            priority
          />
        </div>

        {/* Content */}
        <div
          className="prose-kalibri text-slate-600 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
        />

        {/* CTA in-article */}
        <div className="mt-10 rounded-2xl bg-brand-gradient p-6 text-center shadow-brand">
          <p className="text-white font-extrabold text-lg mb-1">Siap cek dokumenmu sekarang?</p>
          <p className="text-white/75 text-sm mb-4">Laporan siap dalam hitungan jam. Mulai dari Rp 25.000.</p>
          <Link
            href="/daftar"
            className="inline-flex items-center gap-2 rounded-xl bg-white text-brand text-sm font-extrabold px-5 py-2.5 hover:bg-brand-50 transition-colors shadow-md"
          >
            Mulai Cek Sekarang <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </article>

      {/* Related articles */}
      <section className="bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-lg font-extrabold text-slate-900 mb-6">Artikel Lainnya</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {otherArticles.map(([slug, a]) => (
              <Link
                key={slug}
                href={`/blog/${slug}`}
                className="group flex flex-col rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-card card-hover"
              >
                <div className="relative aspect-[16/9]">
                  <Image src={a.cover} alt={a.title} fill className="object-cover object-top" sizes="33vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <span className="absolute bottom-2 left-2 rounded-full bg-brand text-white text-[10px] font-bold px-2 py-0.5">
                    {a.category}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand transition-colors line-clamp-2 mb-1">
                    {a.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">{a.date}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
