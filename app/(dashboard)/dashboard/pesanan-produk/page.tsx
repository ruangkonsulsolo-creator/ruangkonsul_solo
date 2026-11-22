import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils/format-currency";
import { STATUS_PESANAN } from "@/lib/katalog/status-pesanan";
import { BayarUlangPesanan } from "@/components/katalog/BayarUlangPesanan";
import { ReceiptPendingSync } from "@/components/payment/ReceiptPendingSync";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Pesanan Produk | ${BRAND.name}` };

export default async function PesananProdukPage({ searchParams }: { searchParams: { pesanan?: string; pending?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/pesanan-produk");

  const [{ data: pesanan }, { data: payments }] = await Promise.all([
    supabase
      .from("pesanan_produk")
      .select("*") // "*": kolom jasa_berkas (048) mungkin belum ada
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("payments")
      .select("id, reference_id, status, created_at")
      .eq("user_id", user.id)
      .eq("purpose", "produk")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  // payment terbaru per pesanan
  const payBy = new Map<string, { id: string; status: string }>();
  for (const p of payments ?? []) if (!payBy.has(p.reference_id)) payBy.set(p.reference_id, p);
  const fokus = searchParams.pesanan ? payBy.get(searchParams.pesanan) : undefined;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Pesanan Produk</h2>
          <p className="mt-0.5 text-sm text-slate-500">Bimbingan, kelas, dan merchandise yang kamu beli dari katalog.</p>
        </div>
        <Link href="/dashboard/receipt" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
          <Receipt className="h-4 w-4" aria-hidden="true" /> Receipt
        </Link>
      </div>

      {fokus?.status === "pending" && searchParams.pending && <ReceiptPendingSync paymentId={fokus.id} />}

      {(pesanan ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <Package className="h-10 w-10 text-slate-200" aria-hidden="true" />
          <p className="text-sm text-slate-500">Belum ada pesanan.</p>
          <Link href="/bimbingan" className="text-sm font-semibold text-brand hover:underline">Lihat katalog →</Link>
        </div>
      ) : (
        <div className="divide-y rounded-2xl border border-slate-200 bg-white">
          {pesanan!.map((o) => {
            const st = STATUS_PESANAN[o.status] ?? { label: o.status, cls: "bg-slate-100 text-slate-700 border-slate-200" };
            const pay = payBy.get(o.id);
            return (
              <div key={o.id} className={`flex flex-wrap items-start justify-between gap-3 px-5 py-4 ${searchParams.pesanan === o.id ? "bg-brand-50" : ""}`}>
                <div>
                  <p className="font-semibold text-slate-900">{o.jumlah}× {o.nama_produk}{o.satuan ? <span className="font-normal text-slate-500"> · {o.satuan}</span> : null}</p>
                  <p className="font-mono text-xs text-slate-500">{o.nomor}</p>
                  {o.no_resi && <p className="mt-1 text-xs font-semibold text-slate-700">Resi {o.kurir ?? ""}: <span className="font-mono">{o.no_resi}</span></p>}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                  <span className="text-sm font-bold text-slate-900">{formatRupiah(o.total)}</span>
                  {o.status === "menunggu_pembayaran" && o.midtrans_snap_token && (
                    <BayarUlangPesanan pesananId={o.id} snapToken={o.midtrans_snap_token} paymentId={pay?.id ?? null} />
                  )}
                  <Link href={`/dashboard/pesanan-produk/${o.id}`} className="text-xs font-bold text-brand hover:underline">
                    {o.jasa_berkas ? (o.status === "selesai" ? "Unduh hasil →" : "Lihat status →") : "Detail →"}
                  </Link>
                  {pay && pay.status === "paid" && !o.jasa_berkas && (
                    <Link href={`/receipt/${pay.id}`} className="text-xs font-semibold text-brand hover:underline">Receipt & konfirmasi WA →</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
