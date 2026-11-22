import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { labelKemiripan } from "@/lib/periksa/persen-berubah";
import { FORMAT_LAPORAN } from "@/lib/periksa/manual";
import { StatusPesanan, type TahapPesanan } from "@/components/periksa/StatusPesanan";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Status Pesanan Cek Plagiasi", robots: { index: false } };

const TAHAP: Record<string, TahapPesanan> = {
  menunggu_pembayaran: "menunggu",
  dibayar: "dibayar",
  diproses: "diproses",
  selesai: "selesai",
  dibatalkan: "batal",
  processing_failed: "gagal",
};

/**
 * Status satu pesanan laporan (Turnitin/DrillBit): langkah pesanan, kode order,
 * skor similarity, tombol unduh, lalu pratinjau PDF asli yang diunggah tim.
 */
export default async function LaporanPage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/dashboard/laporan/${params.id}`);

  const { data: o } = await supabase
    .from("orders")
    .select("id, order_number, status, created_at, persen_kemiripan, report_storage_path, format_laporan, mesin_laporan, uploaded_files ( original_name )")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!o) notFound();

  const berkas = (o.uploaded_files as unknown as { original_name: string } | null)?.original_name ?? "Naskah";
  const siap = o.status === "selesai" && !!o.report_storage_path;
  const tahap: TahapPesanan = siap ? "selesai" : o.status === "selesai" ? "diproses" : TAHAP[o.status] ?? "diproses";
  const drillbit = o.mesin_laporan === "DrillBit";
  const mesin = o.mesin_laporan && o.mesin_laporan !== "Lainnya" ? o.mesin_laporan : null;
  const format = o.format_laporan ? FORMAT_LAPORAN[o.format_laporan as "baru" | "lama"] : null;
  const persen = o.persen_kemiripan != null ? Number(o.persen_kemiripan) : null;

  // Bucket "reports" privat: URL bertanda tangan 1 jam, hanya setelah kepemilikan dicek di atas.
  let url: string | null = null;
  if (siap) {
    const { data: tanda } = await createAdminClient().storage.from("reports").createSignedUrl(o.report_storage_path!, 3600);
    url = tanda?.signedUrl ?? null;
  }

  const judul = {
    selesai: "Laporan siap",
    menunggu: "Menunggu pembayaran",
    dibayar: "Sedang diperiksa tim",
    diproses: "Sedang diperiksa tim",
    batal: "Pesanan dibatalkan",
    gagal: "Sedang dicek admin",
  }[tahap];

  const info =
    tahap === "selesai"
      ? { judul: "Tersimpan permanen", teks: "Laporan ini bisa kamu unduh lagi kapan saja dari Riwayat Pesanan." }
      : tahap === "menunggu"
        ? { judul: "Belum dibayar", teks: "Selesaikan pembayaran QRIS agar naskahmu masuk antrean pemeriksaan." }
        : tahap === "batal"
          ? { judul: "Pesanan tidak diproses", teks: "Pesanan ini dibatalkan. Hubungi admin kalau sudah terlanjur membayar." }
          : { judul: "Laporan maks. 1×24 jam", teks: "Tim sedang memeriksa naskahmu. Kami kabari lewat notifikasi & WhatsApp begitu laporan siap." };

  return (
    <div className="space-y-6">
      <StatusPesanan
        kembali={{ href: "/dashboard/riwayat-pesanan", label: "Riwayat Pesanan" }}
        layanan={drillbit ? "Cek DrillBit" : "Cek Plagiasi"}
        waktu={o.created_at}
        tahap={tahap}
        judul={judul}
        namaBerkas={berkas}
        keterangan={
          siap
            ? [mesin ? `Laporan ${mesin}` : "Laporan PDF asli", format].filter(Boolean).join(" · ")
            : "Laporan dikirim maks. 1×24 jam setelah dibayar."
        }
        kode={o.order_number}
        skor={{
          label: "Similarity Score",
          persen: siap ? persen : null,
          vonis: siap ? (persen != null ? labelKemiripan(persen) : "Lihat persentase di laporan") : "Skor muncul setelah laporan selesai",
          jenis: "kemiripan",
        }}
        info={info}
        unduh={siap ? { href: `/api/report/${o.id}`, label: `Unduh ${mesin ? `File ${mesin}` : "Laporan"} (PDF)` } : undefined}
        lanjut={tahap === "menunggu" ? { href: "/dashboard/riwayat-pesanan?status=menunggu", label: "Bayar Sekarang" } : undefined}
        bukaTab={url ? { href: url, label: "Buka laporan di tab baru" } : undefined}
        orderBaru="/cek-plagiarisme"
        ajakSimpanWa={tahap === "menunggu" || tahap === "dibayar" || tahap === "diproses"}
      />

      {siap && (
        <section className="mx-auto max-w-3xl">
          <h3 className="mb-3 text-lg font-extrabold text-slate-900">Pratinjau laporan</h3>
          {url ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
              <iframe src={`${url}#view=FitH`} title={`Laporan ${o.order_number}`} className="h-[80vh] w-full" />
              <p className="bg-white px-4 py-2 text-xs text-slate-500">
                Berkas ditampilkan asli seperti yang diterbitkan mesin pemeriksa. Kalau tidak tampil di HP, pakai tombol unduh atau buka di tab baru.
              </p>
            </div>
          ) : (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Gagal memuat pratinjau. Coba muat ulang halaman.</p>
          )}
        </section>
      )}
    </div>
  );
}
