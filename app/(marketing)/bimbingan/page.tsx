import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NavbarUtama } from "@/components/ui/NavbarUtama";
import { IsiEtalase } from "@/components/katalog/IsiEtalase";
import { TestimoniWhatsApp } from "@/components/landing/TestimoniWhatsApp";
import { ambilEtalase } from "@/lib/katalog/baca";
import { ETALASE } from "@/lib/katalog/tipe";
import { BRAND, waLink } from "@/lib/brand";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Program Bimbingan",
  description:
    `Bimbingan skripsi, tesis, dan disertasi bersama mentor ${BRAND.name}. ` +
    `Privat per jam maupun langganan bulanan.`,
};

/**
 * Program bimbingan: harian dan bulanan, keduanya dari katalog.
 *
 * Halaman ini sebelumnya memuat daftar kelas yang ditulis langsung di berkas
 * ini, lengkap dengan rating 4.9 dari 234 ulasan dan tiga testimoni atas
 * nama "Rizky A. (UNS)", "Siti M. (UGM)", dan "Budi S. (ITS)". Tidak satu
 * pun orang itu ada. Testimoni karangan bukan sekadar hiasan yang berlebihan
 * — itu keterangan palsu tentang pengalaman konsumen, dan persis yang
 * dilarang UU No. 8 Tahun 1999 Pasal 9. Diganti dengan tangkapan layar
 * WhatsApp sungguhan yang sudah dikumpulkan pemilik.
 */
export default async function HalamanBimbingan() {
  const [harian, bulanan] = await Promise.all([
    ambilEtalase(ETALASE.bimbinganOnline),
    ambilEtalase(ETALASE.bimbinganBulanan),
  ]);

  const kosong = !harian.etalase && !bulanan.etalase;

  return (
    <div className="min-h-screen bg-white">
      <NavbarUtama />

      <div className="flex flex-wrap items-center justify-center gap-3 bg-[#8B0000] px-4 py-2.5 text-center text-sm font-medium text-white">
        <span>
          🎓 Konsultasi awal <strong>GRATIS!</strong> Hubungi kami sekarang
        </span>
        <a
          href={waLink("Halo, saya ingin konsultasi program bimbingan")}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-white/60 px-3 py-0.5 text-xs font-bold transition-colors hover:bg-white hover:text-[#8B0000]"
        >
          Chat WhatsApp →
        </a>
      </div>

      <section className="hero-gradient px-4 py-14">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-4">by {BRAND.name}</Badge>
          <h1 className="mb-3 text-3xl font-extrabold text-slate-900 lg:text-4xl">
            Program <span className="text-[#8B0000]">Bimbingan</span> Akademik
          </h1>
          <p className="mx-auto max-w-xl leading-relaxed text-slate-500">
            Ambil per jam untuk bagian yang sedang macet, atau langganan
            sebulan penuh sampai sidang hasil. Tersedia untuk Skripsi, Tesis,
            dan Disertasi.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 rounded-xl bg-[#8B0000] px-5 py-3 text-sm font-extrabold text-white shadow-md transition-opacity hover:opacity-90"
            >
              Pilih Mentor &amp; Jadwal
            </Link>
            <Link
              href="/jadwal"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Lihat semua jadwal
            </Link>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Pilih jam yang kosong, bayar, dan jadwal langsung terkunci untukmu.
          </p>
        </div>
      </section>

      {kosong ? (
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <p className="font-semibold text-slate-900">Katalog sedang disiapkan</p>
          <p className="mt-1 leading-relaxed text-slate-600">
            Hubungi kami lewat WhatsApp untuk menanyakan program yang tersedia.
          </p>
        </div>
      ) : (
        <>
          {harian.etalase && (
            <IsiEtalase
              etalase={harian.etalase}
              kategori={harian.kategori}
              produk={harian.produk}
              tanpaPenutup
            />
          )}
          {bulanan.etalase && (
            <div className="border-t border-slate-100 bg-slate-50">
              <IsiEtalase
                etalase={bulanan.etalase}
                kategori={bulanan.kategori}
                produk={bulanan.produk}
                tanpaPenutup
              />
            </div>
          )}
        </>
      )}

      <section className="bg-white px-4 py-12">
        <h2 className="mb-6 text-center text-xl font-extrabold text-slate-900">
          Kata Mereka yang Sudah Dibimbing
        </h2>
        <TestimoniWhatsApp />
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-6 rounded-3xl bg-brand-gradient p-10 shadow-brand sm:flex-row">
          <div>
            <h2 className="mb-1 text-xl font-extrabold text-white">
              Masih bingung pilih program? 🎓
            </h2>
            <p className="text-sm text-white/75">
              Konsultasi gratis langsung dengan tim kami lewat WhatsApp.
            </p>
          </div>
          <a
            href={waLink("Halo, saya ingin konsultasi program bimbingan")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-extrabold text-[#8B0000] shadow-md transition-colors hover:bg-brand-50"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Chat Sekarang
          </a>
        </div>
      </section>

      <div className="border-t border-slate-100 px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
