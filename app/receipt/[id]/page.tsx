import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getReceiptForViewer } from "@/lib/receipt/access";
import { formatDateTimeWIB } from "@/lib/receipt/data";
import { formatRupiah } from "@/lib/utils/format-currency";
import { formatWhatsApp } from "@/lib/validators/whatsapp";
import { BRAND } from "@/lib/brand";
import { PrintButton } from "@/components/payment/PrintButton";
import { ConfirmWhatsAppButton } from "@/components/payment/ConfirmWhatsAppButton";
import { ReceiptPendingSync } from "@/components/payment/ReceiptPendingSync";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Receipt | ${BRAND.name}`, robots: { index: false } };

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const res = await getReceiptForViewer(params.id);
  if (!res.ok) {
    if (res.status === 401) redirect(`/login?next=/receipt/${params.id}`);
    notFound();
  }
  const r = res.receipt;
  const paid = r.status === "paid" || r.status === "refunded";

  const info: [string, string, boolean?][] = [
    ["Nama Customer", r.customer.name],
    ["Email", r.customer.email ?? "-"],
    ["WhatsApp", formatWhatsApp(r.customer.whatsapp)],
    ["Jenis Transaksi", r.purposeLabel],
    ["No. Referensi", r.referenceLabel ?? "-", true],
    ["Order ID Midtrans", r.midtransOrderId, true],
    ["ID Transaksi", r.transactionId ?? "-", true],
    ["Metode Pembayaran", r.paymentType ?? "-"],
  ];

  return (
    <main className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:py-0">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link href="/dashboard/receipt" className="text-sm font-semibold text-slate-600 hover:underline">← Semua receipt</Link>
          <div className="flex gap-2">
            <PrintButton />
            {paid && (
              <a href={`/api/receipt/${r.paymentId}/pdf`} className="rounded-lg bg-[#8B0000] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90">
                Unduh PDF
              </a>
            )}
          </div>
        </div>

        <article className="overflow-hidden rounded-2xl bg-white shadow-sm print:shadow-none print:rounded-none">
          <header className="flex items-start justify-between bg-[#8B0000] px-6 py-5 text-white">
            <div>
              <p className="text-lg font-extrabold">{BRAND.name}</p>
              <p className="text-xs text-white/70">{BRAND.domain}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tracking-wide">RECEIPT / KWITANSI</p>
              <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${paid ? "bg-white text-[#8B0000]" : "bg-amber-200 text-amber-900"}`}>
                {r.status === "paid" ? "LUNAS" : r.status === "refunded" ? "REFUND" : r.status.toUpperCase()}
              </p>
            </div>
          </header>

          <div className="space-y-6 p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">No. Receipt</p>
                <p className="font-mono text-xl font-bold text-slate-900">{r.receiptNumber ?? "— menunggu pembayaran —"}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Tanggal Bayar</p>
                <p className="text-sm font-semibold text-slate-900">{formatDateTimeWIB(r.paidAt)}</p>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 border-y border-slate-100 py-4 sm:grid-cols-2">
              {info.map(([k, v, mono]) => (
                <div key={k}>
                  <dt className="text-[11px] text-slate-500">{k}</dt>
                  <dd className={`text-sm font-semibold text-slate-900 break-all ${mono ? "font-mono text-xs" : ""}`}>{v}</dd>
                </div>
              ))}
            </dl>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Harga</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {r.items.map((it, i) => (
                  <tr key={`${it.id}-${i}`} className="border-b border-slate-100">
                    <td className="py-2.5 pr-3">{it.name}</td>
                    <td className="py-2.5 text-right">{it.quantity}</td>
                    <td className="py-2.5 text-right">{formatRupiah(it.price)}</td>
                    <td className="py-2.5 text-right font-medium">{formatRupiah(it.price * it.quantity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Total Dibayar</td>
                  <td className="pt-4 text-right text-lg font-extrabold text-[#8B0000]">{formatRupiah(r.amountIdr)}</td>
                </tr>
              </tfoot>
            </table>

            {r.status === "pending" && <ReceiptPendingSync paymentId={r.paymentId} />}

            {paid && r.receiptNumber && r.status === "paid" && (
              <div className="flex flex-col items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-green-800">Pembayaran lunas. Konfirmasi ke admin untuk penjadwalan / tindak lanjut.</p>
                <ConfirmWhatsAppButton
                  receiptNumber={r.receiptNumber}
                  purposeLabel={r.purposeLabel}
                  items={r.items.filter((i) => i.id !== "ongkir")}
                  amountIdr={r.amountIdr}
                  customerName={r.customer.name}
                />
              </div>
            )}

            {r.receiptNumber && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                Verifikasi keaslian receipt:{" "}
                <Link href={`/verify/${r.receiptNumber}`} className="font-mono font-semibold text-[#8B0000] hover:underline">
                  {BRAND.domain}/verify/{r.receiptNumber}
                </Link>
                <p className="mt-1">Pembayaran diproses oleh Midtrans. Simpan receipt ini sebagai bukti transaksi yang sah.</p>
              </div>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}
