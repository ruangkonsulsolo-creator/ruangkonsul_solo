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
  "menyusun-rumusan-masalah-yang-tidak-ditolak": {
    title: "Menyusun Rumusan Masalah yang Tidak Ditolak Pembimbing",
    excerpt: "Kebanyakan proposal ditolak bukan karena topiknya buruk, tapi karena rumusan masalahnya belum menunjukkan ada yang benar-benar perlu dijawab.",
    cover: "/promo-konsultasi.jpeg",
    category: "Metodologi",
    readTime: "7 menit",
    date: "20 Oktober 2026",
    author: "Tim Ruang Konsul Solo",
    content: `
## Kenapa proposal ditolak

Pembimbing jarang menolak topik. Yang ditolak biasanya rumusan masalah yang
belum menunjukkan adanya persoalan nyata — hanya menyebut sebuah tema.

"Pengaruh media sosial terhadap perilaku konsumen" itu tema, bukan masalah.
Tidak ada ketegangan di dalamnya, tidak ada yang mengganjal, tidak ada yang
perlu dijawab.

## Tiga bahan yang harus ada

**Kesenjangan.** Ada yang belum diketahui, atau ada temuan yang saling
bertentangan. Dari mana tahu? Dari membaca bagian "saran penelitian
selanjutnya" di lima sampai sepuluh skripsi dan jurnal terbaru di bidangmu.
Penulis sebelumnya sudah menunjukkan lubangnya.

**Alasan kenapa penting.** Kalau pertanyaanmu terjawab, siapa yang terbantu
dan apa yang berubah? Kalau tidak ada jawaban untuk ini, pertanyaannya
mungkin memang belum layak diteliti.

**Kemungkinan dikerjakan.** Datanya bisa kamu ambil, dalam waktu yang kamu
punya, dengan biaya yang kamu sanggupi. Rumusan masalah paling bagus pun
tidak berguna kalau datanya mustahil diperoleh.

## Pola yang bisa dipakai

Satu kalimat: "Meskipun [yang sudah diketahui], belum diketahui [yang belum
terjawab], padahal [kenapa itu penting]."

Contoh: "Meskipun banyak penelitian menunjukkan media sosial meningkatkan
minat beli, belum diketahui apakah pola yang sama berlaku pada produk dengan
nilai transaksi tinggi, padahal justru di segmen itu keputusan konsumen
paling sulit diprediksi."

Perhatikan bedanya dengan tema tadi: ada yang menggantung, dan terasa perlu
dijawab.

## Uji sendiri sebelum maju

Bacakan rumusan masalahmu ke teman yang bukan satu jurusan. Kalau dia bisa
mengulanginya dengan kalimatnya sendiri, rumusannya sudah jelas. Kalau dia
bingung, pembimbingmu juga akan bingung.

Satu pertanyaan terakhir: apakah jawabannya sudah bisa kamu tebak sekarang?
Kalau ya, itu bukan pertanyaan penelitian — itu pernyataan yang tinggal
dibuktikan.
`,
  },

  "memilih-uji-statistik-sesuai-data": {
    title: "Memilih Uji Statistik yang Sesuai dengan Datamu",
    excerpt: "Pohon keputusan sederhana: dari jenis variabel dan jumlah kelompok, sampai ke uji yang tepat — lengkap dengan syarat yang sering terlewat.",
    cover: "/promo-bimbingan.jpeg",
    category: "Olah Data",
    readTime: "9 menit",
    date: "14 Oktober 2026",
    author: "Tim Ruang Konsul Solo",
    content: `
## Mulai dari pertanyaanmu, bukan dari ujinya

Kesalahan paling umum: memilih uji lebih dulu karena pernah dipakai senior,
baru memaksa data menyesuaikan. Urutannya terbalik.

Mulailah dari pertanyaan: kamu ingin **membandingkan kelompok**, melihat
**hubungan antarvariabel**, atau **memprediksi** sesuatu?

## Kalau membandingkan kelompok

Dua kelompok yang tidak berhubungan, data numerik dan sebarannya normal:
**uji t sampel bebas**. Sebarannya tidak normal: **Mann-Whitney**.

Dua pengukuran pada orang yang sama, misalnya sebelum dan sesudah perlakuan:
**uji t berpasangan**, atau **Wilcoxon** kalau tidak normal.

Tiga kelompok atau lebih: **ANOVA satu arah**, atau **Kruskal-Wallis** untuk
data yang tidak normal. Kalau ANOVA-mu signifikan, lanjutkan dengan uji
lanjutan seperti Tukey untuk tahu kelompok mana yang sebenarnya berbeda —
ANOVA sendiri hanya bilang "ada beda", bukan "di mana bedanya".

## Kalau melihat hubungan

Dua variabel numerik: **korelasi Pearson** bila keduanya normal, **Spearman**
bila tidak atau bila datanya berupa peringkat.

Dua variabel kategorik: **chi-square**. Syaratnya frekuensi harapan minimal 5
di sebagian besar sel; kalau tidak terpenuhi, pakai **Fisher exact**.

## Kalau memprediksi

Variabel terikat numerik: **regresi linear**. Variabel terikat berupa dua
kategori, misalnya lulus dan tidak lulus: **regresi logistik**.

Model dengan variabel laten dan banyak jalur: **SEM**. Pakai **SmartPLS**
untuk sampel kecil dan tujuan prediksi, **AMOS** atau **Lisrel** untuk sampel
besar dan pengujian teori.

## Syarat yang sering dilewati

Uji normalitas dilakukan pada **residual**, bukan pada data mentah — ini
kekeliruan yang sangat sering muncul di bab 4.

Untuk regresi, periksa juga multikolinearitas lewat nilai VIF (di bawah 10,
lebih aman di bawah 5) dan heteroskedastisitas lewat pola sebaran residual.

Dan satu hal yang sering dilupakan: nilai signifikansi hanya memberi tahu
apakah ada efek, bukan seberapa besar. Laporkan juga ukuran efeknya —
Cohen's d, eta kuadrat, atau R² — karena itu yang menjawab "jadi, seberapa
berpengaruh?"

## Kalau masih ragu

Hal yang paling mahal bukan salah memilih uji, tapi menyadarinya setelah
seluruh bab 4 selesai ditulis. Cek pilihanmu sebelum mulai mengolah.
`,
  },

  "menerjemahkan-catatan-dosen-pembimbing": {
    title: "Menerjemahkan Catatan Dosen Pembimbing Jadi Langkah Konkret",
    excerpt: "\u201cPerdalam lagi\u201d dan \u201ckurang tajam\u201d sebenarnya menunjuk masalah yang spesifik. Begini cara membacanya.",
    cover: "/promo-bundling.jpeg",
    category: "Bimbingan",
    readTime: "6 menit",
    date: "7 Oktober 2026",
    author: "Tim Ruang Konsul Solo",
    content: `
## Catatan singkat bukan berarti tidak jelas

Dosen pembimbing menulis singkat karena waktunya terbatas, bukan karena
masalahnya samar. Hampir selalu ada persoalan spesifik di balik catatan yang
terasa umum.

## Beberapa yang paling sering muncul

**"Perdalam lagi."** Biasanya berarti kamu menyebut sebuah konsep tanpa
menjelaskan cara kerjanya, atau mengutip satu sumber untuk klaim yang
seharusnya ditopang beberapa sumber. Periksa paragraf yang ditandai: ada
berapa sitasi di situ?

**"Kurang tajam."** Argumenmu melebar ke mana-mana. Satu paragraf
seharusnya membawa satu gagasan. Kalau ada tiga gagasan berdesakan, pecah
jadi tiga paragraf.

**"Kaitkan dengan teori."** Kamu melaporkan temuan tanpa menjelaskannya.
"Hasil menunjukkan X" perlu dilanjutkan dengan "ini sejalan dengan teori Y
karena…" atau "ini bertentangan dengan Z, kemungkinan karena…".

**"Metodenya belum pas."** Ini yang paling berat karena bisa berarti
perombakan besar. Jangan ditunda — temui pembimbing dan minta penjelasan
sebelum menulis lebih jauh.

**"Perbaiki sitasi."** Bisa soal gaya penulisan yang tidak konsisten, bisa
juga soal sumber yang terlalu tua atau tidak kredibel.

## Cara bertanya yang membuahkan jawaban

Jangan datang dengan "Pak, maksudnya bagaimana ya?" Datanglah dengan
tafsiranmu sendiri:

"Pak, catatan 'perdalam' di bagian 2.3 saya tafsirkan sebagai kurangnya
dukungan empiris. Saya berencana menambah tiga penelitian terbaru tentang
ini. Apakah arahnya sudah benar?"

Pertanyaan seperti itu menunjukkan kamu sudah berpikir, dan jauh lebih mudah
dijawab.

## Catat, jangan mengandalkan ingatan

Setelah tiap sesi bimbingan, tulis ulang catatannya jadi daftar tindakan
dengan tenggat. Bawa daftar itu di pertemuan berikutnya dan tunjukkan mana
yang sudah selesai. Pembimbing akan melihat kamu bergerak, dan itu mengubah
suasana bimbingan.
`,
  },

  "menghindari-jurnal-predator": {
    title: "Cara Mengenali Jurnal Predator Sebelum Naskahmu Terlanjur Masuk",
    excerpt: "Biaya publikasi murah dan janji terbit seminggu adalah tanda bahaya. Ini daftar periksa sebelum submit.",
    cover: "/promo-konsultasi.jpeg",
    category: "Publikasi",
    readTime: "8 menit",
    date: "29 September 2026",
    author: "Tim Ruang Konsul Solo",
    content: `
## Kenapa ini penting

Naskah yang sudah terbit di jurnal predator tidak bisa ditarik lalu
dikirimkan ke jurnal lain — itu terhitung publikasi ganda. Satu keputusan
keliru bisa menghanguskan naskah yang kamu kerjakan berbulan-bulan.

Sebagian kampus juga tidak mengakui publikasi di jurnal semacam itu untuk
syarat kelulusan, jadi uang dan waktumu habis tanpa hasil.

## Tanda yang perlu diwaspadai

**Dikirimi ajakan lewat surel.** Jurnal bereputasi tidak memburu penulis.
Kalau ada surel memuji "penelitian Anda yang luar biasa" padahal kamu belum
pernah berhubungan dengan mereka, curigai.

**Janji terbit sangat cepat.** Telaah sejawat yang sungguh-sungguh butuh
waktu berminggu-minggu sampai berbulan-bulan. "Terbit dalam 3 hari" berarti
tidak ada telaah sama sekali.

**Cakupan yang terlalu luas.** Satu jurnal yang menerima naskah kedokteran,
teknik, sastra, dan ekonomi sekaligus tidak mungkin punya penelaah yang
kompeten di semuanya.

**Biaya diminta di awal.** Jurnal yang sehat menagih biaya pemrosesan
setelah naskah diterima, bukan sebagai syarat agar naskah dibaca.

**Dewan redaksi yang tidak bisa ditelusuri.** Cari nama-namanya di Google
Scholar. Kalau tidak ditemukan, atau afiliasinya tidak cocok, itu pertanda
buruk.

**Situs yang serampangan.** Banyak salah ketik, tautan mati, atau alamat
kantor yang tidak jelas.

## Cara memeriksa

Untuk jurnal nasional, cari di **SINTA** (sinta.kemdikbud.go.id) — kalau
terindeks, nomor akreditasinya terlihat di sana.

Untuk jurnal internasional, periksa di **DOAJ** (doaj.org) untuk jurnal
akses terbuka, atau di **Scopus** lewat laman Sources. Jangan percaya logo
"Indexed in Scopus" yang dipajang di situs jurnalnya — selalu periksa dari
sisi Scopus.

Tanyakan juga ke perpustakaan kampus atau dosen pembimbingmu. Banyak kampus
punya daftar jurnal yang direkomendasikan dan yang dihindari.

## Kalau terlanjur

Hubungi redaksi dan minta pencabutan secara tertulis sebelum naskah terbit.
Setelah terbit, pilihannya jauh lebih sempit — bicarakan dengan pembimbing
dan bagian akademik kampusmu.
`,
  },

  "menyiapkan-diri-menghadapi-sidang": {
    title: "Menyiapkan Diri Menghadapi Sidang: Pertanyaan yang Hampir Pasti Muncul",
    excerpt: "Penguji jarang menanyakan hal yang tidak terduga. Sembilan pertanyaan ini muncul di hampir semua sidang.",
    cover: "/promo-bimbingan.jpeg",
    category: "Sidang",
    readTime: "10 menit",
    date: "21 September 2026",
    author: "Tim Ruang Konsul Solo",
    content: `
## Penguji tidak sedang mencari celah

Tugas penguji memastikan kamu paham apa yang kamu tulis. Pertanyaan yang
terasa menyudutkan biasanya hanya cara menguji apakah kamu benar-benar
mengerjakannya sendiri.

## Sembilan yang hampir selalu ditanyakan

**"Coba jelaskan penelitian Anda dalam tiga menit."** Latih sampai lancar.
Ini membentuk kesan pertama, dan kesan pertama memengaruhi sisa sidang.

**"Kenapa topik ini penting?"** Jawab dari sisi manfaatnya, bukan dari sisi
"karena belum ada yang meneliti". Belum diteliti saja bukan alasan.

**"Kenapa memakai metode ini, bukan yang lain?"** Sebutkan alternatif yang
kamu pertimbangkan dan kenapa tidak dipilih. Ini menunjukkan kamu memilih,
bukan sekadar mengikuti.

**"Dari mana sampel ini, dan kenapa jumlahnya segitu?"** Siapkan dasar
perhitungannya — rumus Slovin, tabel Krejcie-Morgan, atau analisis daya.

**"Apa keterbatasan penelitian Anda?"** Jangan menjawab "tidak ada".
Penelitian tanpa keterbatasan tidak ada, dan jawaban itu justru menandakan
kamu belum memahami kerjamu sendiri.

**"Apa bedanya dengan penelitian X?"** Kuasai tiga sampai lima penelitian
terdekat dengan topikmu, dan bisa sebutkan bedanya.

**"Kenapa hasilnya begini?"** Terutama kalau temuanmu bertentangan dengan
teori. Siapkan penjelasan yang masuk akal — hasil yang berbeda bukan berarti
salah.

**"Apa sumbangan penelitian ini?"** Pisahkan sumbangan teoretis dan praktis.

**"Kalau mengulang, apa yang akan Anda ubah?"** Jawaban jujur lebih baik
daripada jawaban yang terdengar sempurna.

## Yang perlu disiapkan selain jawaban

Cetak naskahmu dan beri penanda di bagian-bagian penting, supaya bisa
langsung dibuka saat ditanya.

Kuasai bab 3 dan 4 lebih dalam dari bab lain — di situ pertanyaan paling
banyak muncul.

Siapkan slide cadangan berisi tabel detail yang tidak masuk presentasi
utama. Kalau penguji menanyakan angka tertentu, kamu bisa langsung
menunjukkannya.

## Saat tidak tahu jawabannya

Katakan terus terang: "Saya belum memeriksa hal itu, tapi menurut saya
arahnya ke sana karena…" Jauh lebih baik daripada mengarang. Penguji hampir
selalu tahu kalau sedang dikarang.
`,
  },

  "mengutip-dengan-benar": {
    title: "Mengutip dengan Benar: Parafrase, Kutipan Langsung, dan Sitasi",
    excerpt: "Kemiripan tinggi biasanya berakar di cara mengutip, bukan di pilihan kata. Ini bedanya dan kapan memakai yang mana.",
    cover: "/promo-parafrase.jpeg",
    category: "Penulisan",
    readTime: "7 menit",
    date: "12 September 2026",
    author: "Tim Ruang Konsul Solo",
    content: `
## Akar masalahnya bukan pilihan kata

Banyak yang mengira angka kemiripan tinggi bisa diturunkan dengan mengganti
kata demi kata dengan padanannya. Hasilnya biasanya dua-duanya buruk:
angkanya tetap tinggi, dan tulisannya jadi janggal.

Kemiripan tinggi hampir selalu berarti sesuatu yang lebih mendasar — terlalu
banyak mengambil dari sumber dan terlalu sedikit menyuarakan analisis
sendiri.

## Parafrase yang sebenarnya

Parafrase bukan mengganti kata. Parafrase adalah memahami gagasan lalu
menuliskannya ulang dengan susunan pikiranmu sendiri.

Caranya: baca paragraf sumbernya, **tutup sumbernya**, lalu tulis apa yang
kamu pahami. Setelah itu baru bandingkan — bukan untuk menyalin, tapi untuk
memastikan kamu tidak salah menangkap.

Tetap wajib mencantumkan sitasi. Parafrase mengubah kalimatnya, bukan
kepemilikan gagasannya.

## Kapan memakai kutipan langsung

Kutipan langsung hanya untuk tiga keadaan: definisi baku yang tidak boleh
diubah, pernyataan yang kekuatannya justru ada pada susunan katanya, dan
kalimat yang hendak kamu bantah sehingga perlu dikutip persis.

Di luar itu, parafrase lebih baik. Naskah yang penuh kutipan langsung
terbaca seperti kumpulan tempelan, bukan karya yang dipikirkan.

## Mengatur sitasi sejak awal

Pakai Mendeley atau Zotero sejak hari pertama membaca, bukan setelah naskah
jadi. Merapikan 60 sitasi secara manual di akhir adalah pekerjaan berhari-hari
yang sebenarnya bisa dihindari.

## Memeriksa keseimbangan tulisanmu

Ambil satu halaman bab 2. Tandai dengan warna berbeda: mana yang berasal dari
sumber, mana analisismu sendiri.

Kalau hampir seluruh halaman satu warna — warna sumber — di situlah
persoalannya. Yang perlu ditambah bukan sinonim, melainkan suaramu sendiri:
membandingkan temuan antarsumber, menunjukkan yang bertentangan, menarik
simpulan sementara.

## Catatan

Memeriksa kemiripan untuk memperbaiki cara mengutip itu wajar dan sehat.
Yang tidak kami layani adalah jasa menurunkan angka tanpa memperbaiki
tulisannya — itu menyiasati pemeriksaan, bukan belajar menulis.
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
            <Link href="/login" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand transition-colors">Login</Link>
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
        <div className="mt-10 rounded-2xl bg-brand p-6 text-center shadow-card">
          <p className="text-white font-extrabold text-lg mb-1">Siap cek dokumenmu sekarang?</p>
          <p className="text-white/75 text-sm mb-4">Cek plagiarisme dan indikasi AI, Rp3.300 per 1.000 kata.</p>
          <Link
            href="/#periksa"
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
