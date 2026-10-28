import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OrderDetailPanel } from "@/components/admin/OrderDetailPanel";
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { if (!PREVIEW_MODE) redirect("/login"); }

  const { data: order } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, price_idr, payment_method,
      created_at, completed_at, admin_notes,
      report_storage_path, report_uploaded_at,
      services ( name, slug ),
      profiles ( full_name, whatsapp ),
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
    const { data } = await supabase.storage
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

      <OrderDetailPanel
        order={order as any}
        documentDownloadUrl={documentDownloadUrl}
      />
    </div>
  );
}
