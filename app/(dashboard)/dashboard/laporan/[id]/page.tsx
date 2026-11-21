import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Download, ExternalLink, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { labelKemiripan } from "@/lib/periksa/persen-berubah";
import { FORMAT_LAPORAN } from "@/lib/periksa/manual";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Laporan Cek Plagiarisme", robots: { index: false } };

/**
 * Pratinjau laporan cek plagiarisme manual: menampilkan berkas PDF asli yang
 * diunggah tim apa adanya (tanpa diubah), plus persentase dan tombol unduh.
 */
export default async function LaporanPage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/dashboard/laporan/${params.id}`);

  const { data: o } = await supabase
    .from("orders")
    .select("id, user_id, order_number, status, persen_kemiripan, report_storage_path, format_laporan, mesin_laporan, completed_at, uploaded_files ( original_name )")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!o) notFound();

  const berkas = (o.uploaded_files as unknown as { original_name: string } | null)?.original_name ?? "Naskah";
  if (o.status !== "selesai" || !o.report_storage_path) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="font-bold text-amber-900">Laporan belum siap</p>
        <p className="mt-1 text-sm text-amber-800">Pesanan {o.order_number} ({berkas}) masih diperiksa tim. Kami kabari lewat notifikasi & WhatsApp.</p>
        <Link href="/dashboard/riwayat-pesanan" className="mt-4 inline-block text-sm font-bold text-brand hover:underline">← Riwayat Pesanan</Link>
      </div>
    );
  }

  // Bucket "reports" privat: URL bertanda tangan berlaku 1 jam, hanya setelah kepemilikan dicek di atas.
  const { data: tanda } = await createAdminClient().storage.from("reports").createSignedUrl(o.report_storage_path, 3600);
  const url = tanda?.signedUrl ?? null;
  const persen = o.persen_kemiripan != null ? Number(o.persen_kemiripan) : null;
  const format = o.format_laporan ? FORMAT_LAPORAN[o.format_laporan as "baru" | "lama"] : null;

  return (
    <div className="space-y-4">
      <Link href="/dashboard/riwayat-pesanan" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Riwayat Pesanan
      </Link>

      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand text-white">
          <span className="text-3xl font-extrabold leading-none">{persen ?? "—"}{persen != null && "%"}</span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/80">Similarity</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-500">
            <FileText className="h-4 w-4 shrink-0" aria-hidden="true" /> {berkas}
          </p>
          <h1 className="mt-0.5 text-xl font-extrabold text-slate-900">
            Laporan Cek Plagiarisme{o.mesin_laporan && o.mesin_laporan !== "Lainnya" ? ` · ${o.mesin_laporan}` : ""}
          </h1>
          <p className="text-sm text-slate-600">
            {persen != null && labelKemiripan(persen)}
            {format && ` · ${format}`} · {o.order_number}
          </p>
        </div>
        {url && (
          <div className="flex flex-wrap gap-2">
            <a href={`/api/report/${o.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-light">
              <Download className="h-4 w-4" aria-hidden="true" /> Unduh PDF
            </a>
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> Buka di tab baru
            </a>
          </div>
        )}
      </section>

      {url ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <iframe src={`${url}#view=FitH`} title={`Laporan ${o.order_number}`} className="h-[80vh] w-full" />
          <p className="bg-white px-4 py-2 text-xs text-slate-500">
            Berkas laporan ditampilkan asli seperti yang diterbitkan mesin pemeriksa. Kalau tidak tampil di HP, gunakan tombol &ldquo;Buka di tab baru&rdquo; atau &ldquo;Unduh PDF&rdquo;.
          </p>
        </div>
      ) : (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Gagal memuat berkas laporan. Coba muat ulang halaman.</p>
      )}
    </div>
  );
}
