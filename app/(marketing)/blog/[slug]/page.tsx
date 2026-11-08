import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft, CalendarDays, Clock, ArrowRight, MessageCircle, Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import { NavbarUtama } from "@/components/ui/NavbarUtama";
import { createClient } from "@/lib/supabase/server";
import { BRAND, waLink } from "@/lib/brand";

export const revalidate = 120;

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

type Artikel = {
  title: string; excerpt: string; cover: string; category: string;
  readTime: string; date: string; author: string; content: string;
};

function tanggalId(nilai: string | null): string {
  if (!nilai) return "";
  const d = new Date(nilai);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

/**
 * Artikel dari basis data lebih dulu, baru artikel bawaan.
 *
 * Sebelumnya halaman ini sama sekali tidak menyentuh blog_posts — isinya
 * hanya objek `articles` di berkas ini. Akibatnya artikel yang ditulis admin
 * muncul di daftar /blog tapi halamannya 404: daftarnya baca basis data,
 * halamannya tidak. Artikel bawaan tetap dipertahankan sebagai cadangan
 * supaya /blog tidak kosong sebelum ada tulisan sungguhan.
 */
async function ambilArtikel(slug: string): Promise<Artikel | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("title, excerpt, content, cover_url, category, read_time, author, published_at")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (data) {
      return {
        title: data.title,
        excerpt: data.excerpt ?? "",
        cover: data.cover_url ?? "/promo-bimbingan.jpeg",
        category: data.category,
        readTime: data.read_time,
        date: tanggalId(data.published_at),
        author: data.author,
        content: data.content,
      };
    }
  } catch (e) {
    console.error("[blog]", e);
  }
  return articles[slug] ?? null;
}

/** Artikel lain untuk sidebar: basis data dulu, lalu dilengkapi bawaan. */
async function ambilLainnya(kecuali: string, batas = 4) {
  const hasil: { slug: string; title: string; category: string; date: string }[] = [];
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("slug, title, category, published_at")
      .eq("is_published", true)
      .neq("slug", kecuali)
      .order("published_at", { ascending: false })
      .limit(batas);
    for (const a of data ?? []) {
      hasil.push({
        slug: a.slug, title: a.title, category: a.category,
        date: tanggalId(a.published_at),
      });
    }
  } catch {
    // Basis data tidak terjangkau — cukup pakai artikel bawaan di bawah.
  }

  for (const [slug, a] of Object.entries(articles)) {
    if (hasil.length >= batas) break;
    if (slug === kecuali || hasil.some((h) => h.slug === slug)) continue;
    hasil.push({ slug, title: a.title, category: a.category, date: a.date });
  }
  return hasil;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = await ambilArtikel(params.slug);
  if (!article) return { title: `Artikel tidak ditemukan | ${BRAND.name}` };
  return {
    title: `${article.title} | Blog ${BRAND.name}`,
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

export default async function BlogPostPage({
  params,
}: { params: { slug: string } }) {
  const article = await ambilArtikel(params.slug);
  if (!article) return notFound();

  const lainnya = await ambilLainnya(params.slug);

  return (
    <div className="min-h-screen bg-white">
      <NavbarUtama />

      {/*
        Dua kolom: isi artikel dan sisi kanan yang ikut menggulir.

        Satu kolom sempit di tengah membuat seluruh ajakan — bimbingan,
        konsultasi, artikel lain — baru muncul setelah pembaca sampai ke
        dasar halaman, dan sebagian besar pembaca tidak sampai ke sana.
        Sisi kanan yang lengket membuatnya terlihat sepanjang bacaan tanpa
        memotong tulisannya.
      */}
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <article className="min-w-0">
          <Link
            href="/blog"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-brand"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Kembali ke Blog
          </Link>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
              {article.category}
            </span>
            {article.date && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {article.date}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {article.readTime}
            </span>
          </div>

          <h1 className="mb-4 text-2xl font-extrabold leading-snug text-slate-900 lg:text-4xl">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="mb-6 text-lg leading-relaxed text-slate-600">
              {article.excerpt}
            </p>
          )}

          <div className="mb-6 flex items-center gap-2 border-b border-slate-100 pb-6">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {article.author.trim().charAt(0).toUpperCase() || "R"}
            </span>
            <span className="text-sm font-medium text-slate-700">{article.author}</span>
          </div>

          <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl shadow-card">
            <Image
              src={article.cover}
              alt={article.title}
              fill
              className="object-cover object-top"
              sizes="(max-width: 1023px) 100vw, 760px"
              priority
            />
          </div>

          <div
            className="prose-kalibri leading-relaxed text-slate-600"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
          />

          <div className="mt-10 rounded-2xl bg-brand p-6 text-center shadow-card">
            <p className="mb-1 text-lg font-extrabold text-white">
              Mentok di bagian yang dibahas tadi?
            </p>
            <p className="mb-4 text-sm text-white/75">
              Bimbingan privat per jam, mulai Rp60.000. Ambil hanya bagian yang
              sedang kamu butuhkan.
            </p>
            <Link
              href="/bimbingan"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-extrabold text-brand shadow-md transition-colors hover:bg-brand-50"
            >
              Lihat paket bimbingan <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </article>

        {/* ── Sisi kanan ── */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="space-y-5">
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
              <span className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Bimbingan
              </span>
              <p className="font-extrabold leading-snug text-slate-900">
                Dibimbing sampai sanggup menulisnya sendiri
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Skripsi, tesis, dan disertasi. Privat per jam atau langganan
                sebulan penuh.
              </p>
              <Link
                href="/bimbingan"
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-light"
              >
                Lihat paket <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            <a
              href={waLink(`Halo ${BRAND.name}, saya mau konsultasi.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition-colors hover:border-brand"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50">
                <MessageCircle className="h-5 w-5 text-brand" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold text-slate-900">
                  Konsultasi awal gratis
                </span>
                <span className="block text-xs text-slate-500">
                  Tanya dulu lewat WhatsApp
                </span>
              </span>
            </a>

            {lainnya.length > 0 && (
              <div className="rounded-2xl border border-slate-200 p-5">
                <h2 className="mb-3 text-sm font-extrabold text-slate-900">
                  Artikel lainnya
                </h2>
                <ul className="space-y-3">
                  {lainnya.map((a) => (
                    <li key={a.slug}>
                      <Link href={`/blog/${a.slug}`} className="group block">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-brand">
                          {a.category}
                        </span>
                        <span className="mt-0.5 block text-sm font-semibold leading-snug text-slate-800 transition-colors group-hover:text-brand">
                          {a.title}
                        </span>
                        {a.date && (
                          <span className="mt-0.5 block text-[11px] text-slate-400">
                            {a.date}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/blog"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                >
                  Lihat semua artikel <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
