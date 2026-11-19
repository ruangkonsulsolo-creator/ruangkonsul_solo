import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OrderDetailPanel } from "@/components/admin/OrderDetailPanel";
import { ReprocessButton } from "@/components/admin/ReprocessButton";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePageRole } from "@/lib/auth/page-guard";
import { AUTO_SERVICES } from "@/lib/processing/runner";
import { ChevronLeft } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { PREVIEW_MODE } from "@/lib/utils/preview-mode";
import type { Metadata } from "next";

export const metadata: Metadata = { title: `Detail Pesanan | ${BRAND.name}` };

export default async function AdminPesananDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requirePageRole(["admin", "superadmin"]);
  const supabase = createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, price_idr, payment_method,
      created_at, completed_at, admin_notes,
      report_storage_path, report_uploaded_at, detection_error, processing_attempts, output_storage_path,
      services ( name, slug ),
      profiles:profiles!orders_user_id_fkey ( full_name, whatsapp ),
      uploaded_files ( original_name, storage_path )
    `)
    .eq("id", params.id)
    .single();

  if (!order) {
    if (PREVIEW_MODE) {
      return (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Link href="/admin/pesanan" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-800">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Kembali ke Pesanan
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">Preview mode — data pesanan tidak tersedia tanpa database.</p>
        </div>
      );
    }
    notFound();
  }

  // Generate signed URL untuk dokumen user (10 menit)
  let documentDownloadUrl: string | null = null;
  const filePath = (order.uploaded_files as any)?.storage_path;
  if (filePath) {
    // Bucket privat: policy storage hanya untuk pemilik → signed URL via service role
    const { data } = await createAdminClient().storage
      .from("documents")
      .createSignedUrl(filePath, 600);
    documentDownloadUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/pesanan"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-800"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Pesanan
        </Link>
      </div>

      {AUTO_SERVICES.has((order.services as any)?.slug) && ["diproses", "processing_failed", "selesai"].includes(order.status) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <div className="text-xs text-slate-600">
            <p className="font-semibold text-slate-900">Engine otomatis</p>
            <p>Percobaan: {(order as any).processing_attempts ?? 0}/3{(order as any).detection_error ? ` · Error terakhir: ${(order as any).detection_error}` : ""}</p>
            {(order as any).output_storage_path && <a href={`/api/order/${order.id}/output`} className="font-semibold text-[#8B0000] hover:underline">Unduh hasil .docx</a>}
          </div>
          <ReprocessButton orderId={order.id} />
        </div>
      )}

      <OrderDetailPanel
        order={order as any}
        documentDownloadUrl={documentDownloadUrl}
      />
    </div>
  );
}
