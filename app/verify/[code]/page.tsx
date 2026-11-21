import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { verifyReceipt, formatDateTimeWIB } from "@/lib/receipt/data";
import { rateLimit, clientIp } from "@/lib/security/rate-limit";
import { formatRupiah } from "@/lib/utils/format-currency";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Verifikasi Receipt | ${BRAND.name}`, robots: { index: false } };

/** Halaman publik: cek keaslian receipt dari nomornya. Hanya data minimal yang ditampilkan. */
export default async function VerifyReceiptPage({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code).slice(0, 40);
  // Anti brute-force enumerasi nomor receipt
  const allowed = await rateLimit(`verify:${clientIp()}`, 60, 20);
  const r = allowed && /^RCP-\d{8}-[A-Z0-9]{8}$/i.test(code) ? await verifyReceipt(code) : null;
  const valid = r && (r.status === "paid" || r.status === "refunded");

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        {valid ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
            <h1 className="mt-3 text-lg font-extrabold text-slate-900">Receipt Valid</h1>
            <p className="text-sm text-slate-500">Diterbitkan oleh {BRAND.name}</p>
            <dl className="mt-5 space-y-2 text-left text-sm">
              {[
                ["No. Receipt", r!.receiptNumber],
                ["Atas nama", r!.maskedName],
                ["Jenis", r!.purposeLabel],
                ["Jumlah", formatRupiah(r!.amountIdr)],
                ["Tanggal bayar", formatDateTimeWIB(r!.paidAt)],
                ["Status", r!.status === "paid" ? "Lunas" : "Sudah di-refund"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500" aria-hidden="true" />
            <h1 className="mt-3 text-lg font-extrabold text-slate-900">Receipt Tidak Ditemukan</h1>
            <p className="mt-1 text-sm text-slate-500">
              Nomor <span className="font-mono">{code}</span> tidak terdaftar atau belum lunas.
            </p>
          </>
        )}
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-[#8B0000] hover:underline">← {BRAND.name}</Link>
      </div>
    </main>
  );
}
