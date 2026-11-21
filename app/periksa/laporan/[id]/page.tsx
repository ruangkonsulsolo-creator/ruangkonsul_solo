import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/brand";
import { formatRupiah } from "@/lib/utils/format-currency";
import { TombolCetak } from "@/components/periksa/TombolCetak";
import type { HasilPeriksa } from "@/lib/periksa/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Laporan Pemeriksaan Naskah",
  // Laporan berisi hasil pemeriksaan naskah orang; jangan sampai terindeks.
  robots: { index: false, follow: false },
};

const JUDUL_JENIS: Record<string, string> = {
  kemiripan: "Cek Plagiarisme",
  ai: "Cek Indikasi AI",
  parafrase: "Parafrase",
};

function tanggalId(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });
}

export default async function HalamanLaporan({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  // RLS membatasi baris ke pemiliknya, jadi tidak perlu memeriksa user_id
  // lagi di sini: pengguna lain tidak akan mendapat baris apa pun.
  const { data: baris } = await supabase
    .from("pemeriksaan")
    .select(
      "id, jenis, status, jumlah_kata, biaya_idr, cuplikan, sidik_teks, hasil, penyedia, dibuat_pada, selesai_pada"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!baris || baris.status !== "selesai" || !baris.hasil) notFound();

  const h = baris.hasil as HasilPeriksa;
  const judul = JUDUL_JENIS[baris.jenis] ?? baris.jenis;

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-4 print:max-w-none print:px-0">
        <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
          <Link
            href="/#periksa"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali
          </Link>
          <TombolCetak />
        </div>

        <article className="rounded-2xl bg-white p-8 shadow-card print:rounded-none print:p-0 print:shadow-none">
          {/* ── Kepala ── */}
          <header className="border-b-2 border-brand pb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">
              {BRAND.name}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
              Laporan {judul}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {BRAND.domain} · {BRAND.instagram}
            </p>
          </header>

          {/* ── Pernyataan sumber ──
              Ini bagian terpenting di seluruh halaman. Laporan ini dibuat
              Ruang Konsul Solo berdasarkan hasil dari penyedia pihak ketiga,
              dan BUKAN sertifikat resmi penyedia itu. Tanpa kalimat ini,
              mahasiswa bisa menyodorkannya ke dosen seolah dokumen resmi. */}
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs leading-relaxed text-amber-900">
              <strong>Tentang dokumen ini.</strong> Laporan ini diterbitkan oleh{" "}
              {BRAND.name} berdasarkan hasil pemeriksaan dari{" "}
              <strong>{h.penyedia ?? baris.penyedia ?? "penyedia pihak ketiga"}</strong>.
              Dokumen ini <strong>bukan</strong> sertifikat resmi dari penyedia
              tersebut, bukan laporan Turnitin, dan bukan dokumen resmi kampus
              mana pun. Kalau institusimu meminta hasil dari sistem tertentu,
              mintalah lewat jalur resmi institusi itu.
            </p>
          </div>

          {/* ── Keterangan kiriman ── */}
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-500">
              Keterangan Kiriman
            </h2>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
              {[
                ["Nomor laporan", baris.id],
                ["Tanggal periksa", tanggalId(baris.selesai_pada ?? baris.dibuat_pada)],
                ["Jenis", judul],
                ["Jumlah kata", `${baris.jumlah_kata.toLocaleString("id-ID")} kata`],
                ["Penyedia", h.penyedia ?? baris.penyedia ?? "—"],
                ["Biaya", formatRupiah(baris.biaya_idr)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-slate-100 py-1.5 text-sm">
                  <dt className="font-semibold text-slate-500">{k}</dt>
                  <dd className="text-right font-medium text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* ── Sidik jari naskah ── */}
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">
              Sidik Jari Naskah
            </h2>
            <p className="mb-2 text-xs leading-relaxed text-slate-600">
              Naskahmu tidak kami simpan. Yang tersimpan hanya sidik jari
              SHA-256 di bawah — kalau naskah yang sama diperiksa ulang,
              sidik jarinya akan sama persis. Satu huruf berubah, sidik
              jarinya berubah total.
            </p>
            <code className="block break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-[10px] leading-relaxed text-slate-700">
              {baris.sidik_teks}
            </code>
          </section>

          {/* ── Hasil ── */}
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-500">
              Hasil
            </h2>

            {h.kemiripan && (
              <div className="mb-5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-bold text-slate-900">
                    Kemiripan dengan sumber lain
                  </span>
                  <span className="text-3xl font-extrabold text-brand">
                    {h.kemiripan.persen}%
                  </span>
                </div>
                {h.kemiripan.persenBersitasi > 0 && (
                  <p className="mt-1 text-xs text-slate-600">
                    {h.kemiripan.persenBersitasi}% di antaranya berasal dari
                    kutipan yang sudah bersitasi — bagian itu wajar.
                  </p>
                )}
                {h.kemiripan.sumber.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {h.kemiripan.sumber.slice(0, 10).map((s, i) => (
                      <li key={i} className="border-l-2 border-slate-200 pl-3 text-xs">
                        <div className="flex justify-between gap-3">
                          <span className="font-semibold text-slate-900">{s.judul}</span>
                          <span className="font-bold text-brand">{s.persen}%</span>
                        </div>
                        <p className="mt-0.5 text-slate-600">{s.cuplikan}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {h.ai && (
              <div className="mb-5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-bold text-slate-900">Indikasi gaya AI</span>
                  <span className="text-3xl font-extrabold text-slate-800">
                    {h.ai.skor}%
                  </span>
                </div>

                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-700"
                    aria-hidden="true"
                  />
                  <p className="text-xs leading-relaxed text-amber-900">
                    {h.ai.peringatan}
                  </p>
                </div>

                {h.ai.bagianDitandai.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {h.ai.bagianDitandai.slice(0, 10).map((b, i) => (
                      <li
                        key={i}
                        className="flex justify-between gap-3 border-l-2 border-amber-300 pl-3 text-xs text-slate-700"
                      >
                        <span>{b.teks}</span>
                        <span className="flex-shrink-0 font-bold text-slate-500">
                          {b.skor}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {h.parafrase && (
              <div className="mb-5">
                <span className="font-bold text-slate-900">Naskah hasil parafrase</span>
                <div className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800">
                  {h.parafrase.teks}
                </div>
              </div>
            )}
          </section>

          {/* ── Saran ── */}
          {h.saran?.length > 0 && (
            <section className="mt-6 break-inside-avoid">
              <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-500">
                Yang Bisa Dikerjakan
              </h2>
              <ul className="space-y-2">
                {h.saran.map((s, i) => (
                  <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-700">
                    <span className="font-bold text-brand">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer className="mt-8 border-t border-slate-200 pt-4 text-[10px] leading-relaxed text-slate-500">
            Diterbitkan {BRAND.name} · {BRAND.address} · WhatsApp{" "}
            {BRAND.whatsappDisplay}. Angka pada laporan ini bersifat indikatif
            dan tidak menggantikan penilaian pembimbing maupun pemeriksaan
            resmi institusi.
          </footer>
        </article>
      </div>
    </div>
  );
}
