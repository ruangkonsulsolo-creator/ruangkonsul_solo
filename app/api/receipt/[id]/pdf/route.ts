import { NextRequest, NextResponse } from "next/server";
import { getReceiptForViewer } from "@/lib/receipt/access";
import { renderReceiptPdf } from "@/lib/receipt/pdf";

export const dynamic = "force-dynamic";

/** GET /api/receipt/{paymentId}/pdf — unduh receipt PDF (pemilik / staff). */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const res = await getReceiptForViewer(params.id);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  if (res.receipt.status !== "paid" && res.receipt.status !== "refunded") {
    return NextResponse.json({ error: "Receipt tersedia setelah pembayaran lunas." }, { status: 409 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const pdf = await renderReceiptPdf(res.receipt, appUrl);
  const name = `receipt-${res.receipt.receiptNumber ?? res.receipt.midtransOrderId}.pdf`;

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
