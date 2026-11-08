import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  CalendarDays, Clock, MapPin, Users, ArrowRight,
  Video, Ticket, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IkonLini } from "@/components/landing/IkonLini";
import { BRAND, waLink } from "@/lib/brand";
import { NavbarUtama } from "@/components/ui/NavbarUtama";
import { formatRupiah } from "@/lib/utils/format-currency";

export const metadata: Metadata = {
  title: "Event & Workshop",
  description:
    "Webinar, bootcamp, dan workshop metodologi penelitian dari Ruang Konsul Solo. " +
    "Daring maupun tatap muka di Solo.",
};

export const dynamic = "force-dynamic";

type Event = {
  slug: string;
  judul: string;
  ringkas: string;
  jenis: "Webinar" | "Bootcamp" | "Workshop";
  tanggal: string;
  /** ISO, dipakai menentukan sudah lewat atau belum. */
  mulai: string;
  jam: string;
  tempat: string;
  daring: boolean;
  harga: number;
  kuota: number;
  terisi: number;
  pemateri: string;
  materi: string[];
  cover: string;
};

/**
 * Daftar event.
 *
 * Masih ditulis langsung di berkas ini. Kalau nanti event jadi rutin,
 * pindahkan ke tabel Supabase supaya admin bisa menambah sendiri tanpa
 * deploy ulang — polanya sama seperti blog_posts.
 *
 * Angka `terisi` hanya tampil sebagai sisa kuota. Isi dengan jumlah
 * pendaftar yang sebenarnya; sisa kuota yang dikarang untuk menciptakan
 * kesan buru-buru adalah informasi menyesatkan, dan calon peserta yang
 * menyadarinya akan berhenti mempercayai angka lain di situs ini.
 */
const EVENT: Event[] = [
  {
    slug: "webinar-metodologi-kuantitatif",
    judul: "Menyusun Bab 3 Kuantitatif dari Nol",
    ringkas:
      "Dari menentukan populasi dan sampel, memilih instrumen, sampai menyusun kerangka analisis yang tidak akan dipersoalkan penguji.",
    jenis: "Webinar",
    tanggal: "Sabtu, 15 November 2026",
    mulai: "2026-11-15T09:00:00+07:00",
    jam: "09.00 – 11.30 WIB",
    tempat: "Zoom",
    daring: true,
    harga: 0,
    kuota: 100,
    terisi: 0,
    pemateri: "Tim Mentor Ruang Konsul",
    materi: [
      "Menentukan populasi dan teknik sampling",
      "Menghitung ukuran sampel dan dasarnya",
      "Menyusun instrumen serta uji validitas dan reliabilitas",
      "Kerangka analisis yang nyambung dengan rumusan masalah",
    ],
    cover: "/promo-konsultasi.jpeg",
  },
  {
    slug: "bootcamp-olah-data-spss",
    judul: "Bootcamp Olah Data SPSS untuk Skripsi",
    ringkas:
      "Dua hari praktik langsung dengan datamu sendiri. Pulang dengan bab 4 yang sudah berjalan, bukan sekadar catatan.",
    jenis: "Bootcamp",
    tanggal: "Sabtu–Minggu, 22–23 November 2026",
    mulai: "2026-11-22T08:00:00+07:00",
    jam: "08.00 – 16.00 WIB",
    tempat: `${BRAND.address.split(",")[0]}, Surakarta`,
    daring: false,
    harga: 350000,
    kuota: 20,
    terisi: 0,
    pemateri: "Tim Mentor Ruang Konsul",
    materi: [
      "Menyiapkan dan membersihkan data",
      "Uji asumsi klasik dan cara membacanya",
      "Uji hipotesis sesuai rancangan penelitian",
      "Menafsirkan keluaran SPSS jadi narasi bab 4",
      "Latihan menjawab pertanyaan penguji soal analisis",
    ],
    cover: "/promo-bimbingan.jpeg",
  },
  {
    slug: "workshop-publikasi-jurnal",
    judul: "Workshop Menyiapkan Naskah untuk Jurnal Nasional",
    ringkas:
      "Mengubah skripsi jadi artikel jurnal: memilih jurnal yang tepat, menyesuaikan format, dan menanggapi reviewer.",
    jenis: "Workshop",
    tanggal: "Sabtu, 6 Desember 2026",
    mulai: "2026-12-06T13:00:00+07:00",
    jam: "13.00 – 16.00 WIB",
    tempat: "Google Meet",
    daring: true,
    harga: 150000,
    kuota: 40,
    terisi: 0,
    pemateri: "Tim Mentor Ruang Konsul",
    materi: [
      "Memilih jurnal yang sesuai dan mengenali jurnal predator",
      "Memadatkan skripsi jadi artikel 6.000 kata",
      "Menyesuaikan gaya selingkung dan sitasi",
      "Menyusun tanggapan atas komentar reviewer",
    ],
    cover: "/promo-bundling.jpeg",
  },
];

const rupiah = (n: number) =>
  n === 0
    ? "Gratis"
    : formatRupiah(n);

const WARNA_JENIS: Record<Event["jenis"], string> = {
  Webinar: "bg-blue-50 text-blue-700",
  Bootcamp: "bg-brand-50 text-brand",
  Workshop: "bg-amber-50 text-amber-700",
};

function KartuEvent({ e }: { e: Event }) {
  const sisa = Math.max(0, e.kuota - e.terisi);
  const penuh = sisa === 0;
  const persen = e.kuota > 0 ? Math.round((e.terisi / e.kuota) * 100) : 0;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-brand">
      <div className="relative aspect-[16/9]">
        <Image
          src={e.cover}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 33vw"
          className="object-cover"
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold ${WARNA_JENIS[e.jenis]}`}
        >
          {e.jenis}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-extrabold text-brand backdrop-blur-sm">
          {rupiah(e.harga)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-extrabold leading-snug text-slate-900">
          {e.judul}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {e.ringkas}
        </p>

        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <CalendarDays className="h-4 w-4 flex-shrink-0 text-brand" aria-hidden="true" />
            {e.tanggal}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Clock className="h-4 w-4 flex-shrink-0 text-brand" aria-hidden="true" />
            {e.jam}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            {e.daring ? (
              <Video className="h-4 w-4 flex-shrink-0 text-brand" aria-hidden="true" />
            ) : (
              <MapPin className="h-4 w-4 flex-shrink-0 text-brand" aria-hidden="true" />
            )}
            {e.tempat}
          </div>
        </dl>

        <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
          {e.materi.slice(0, 3).map((m) => (
            <li key={m} className="flex items-start gap-2 text-sm text-slate-600">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand" aria-hidden="true" />
              <span>{m}</span>
            </li>
          ))}
          {e.materi.length > 3 && (
            <li className="pl-5.5 text-xs font-medium text-slate-500">
              +{e.materi.length - 3} materi lainnya
            </li>
          )}
        </ul>

        <div className="mt-auto pt-5">
          {e.terisi > 0 && (
            <>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-slate-500">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {e.terisi} dari {e.kuota} kursi
                </span>
                {sisa <= 5 && sisa > 0 && (
                  <span className="font-bold text-amber-700">Sisa {sisa}</span>
                )}
              </div>
              <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${persen}%` }}
                />
              </div>
            </>
          )}

          <a
            href={
              penuh
                ? waLink(`Halo, saya ingin masuk daftar tunggu event "${e.judul}".`)
                : waLink(`Halo, saya ingin mendaftar event "${e.judul}" pada ${e.tanggal}.`)
            }
            className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-colors ${
              penuh
                ? "border-2 border-slate-200 text-slate-500 hover:bg-slate-50"
                : "bg-brand text-white hover:bg-brand-light"
            }`}
          >
            {penuh ? "Masuk daftar tunggu" : "Daftar sekarang"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}

export default function EventPage() {
  const sekarang = Date.now();
  const mendatang = EVENT.filter((e) => new Date(e.mulai).getTime() >= sekarang);
  const lampau = EVENT.filter((e) => new Date(e.mulai).getTime() < sekarang);

  return (
    <div className="min-h-screen bg-white">
      <NavbarUtama />

      {/* ── Hero ── */}
      <section className="bg-brand-50 px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-4xl text-center">
          <IkonLini lini="events" />
          <h1 className="mt-5 text-3xl font-extrabold leading-tight text-slate-900 lg:text-5xl">
            Webinar, bootcamp, dan{" "}
            <span className="text-brand">workshop penelitian</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-slate-600">
            Belajar bersama peserta lain yang sedang di tahap yang sama. Daring
            maupun tatap muka di Solo.
          </p>
        </div>
      </section>

      {/* ── Event mendatang ── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-8 flex items-center gap-2 text-2xl font-extrabold text-slate-900">
          <Ticket className="h-6 w-6 text-brand" aria-hidden="true" />
          Yang akan datang
        </h2>

        {mendatang.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 p-10 text-center">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 text-brand" aria-hidden="true" />
            <h3 className="mb-2 text-xl font-extrabold text-slate-900">
              Belum ada event terjadwal
            </h3>
            <p className="mb-5 text-sm text-slate-600">
              Gabung saluran WhatsApp kami supaya tidak ketinggalan saat jadwal
              baru dibuka.
            </p>
            <Button asChild>
              <a href={waLink("Halo, saya ingin info event Ruang Konsul berikutnya.")}>
                Hubungi admin
              </a>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mendatang.map((e) => (
              <KartuEvent key={e.slug} e={e} />
            ))}
          </div>
        )}
      </section>

      {/* ── Event lampau ── */}
      {lampau.length > 0 && (
        <section className="bg-slate-50 px-4 py-14">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-2 text-2xl font-extrabold text-slate-900">
              Sudah berlangsung
            </h2>
            <p className="mb-8 text-sm text-slate-500">
              Tertarik dengan salah satunya? Hubungi admin — kalau peminatnya
              cukup, kami buka lagi.
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {lampau.map((e) => (
                <div key={e.slug} className="opacity-60">
                  <KartuEvent e={e} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="px-4 py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-5 rounded-3xl bg-brand p-10 shadow-card sm:flex-row">
          <div className="text-center sm:text-left">
            <h2 className="mb-1.5 text-2xl font-extrabold text-white">
              Butuh pendampingan yang lebih personal?
            </h2>
            <p className="text-sm text-white/75">
              Event bagus untuk gambaran menyeluruh. Untuk kendala khusus
              penelitianmu, satu sesi bimbingan lebih mengena.
            </p>
          </div>
          <Button variant="dark" size="lg" asChild className="flex-shrink-0">
            <Link href="/booking" className="gap-2">
              Pesan jadwal <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
