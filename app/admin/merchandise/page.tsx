import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@/lib/brand";
import { requirePageRole } from "@/lib/auth/page-guard";
import { formatRupiah } from "@/lib/utils/format-currency";
import { formatWhatsApp } from "@/lib/validators/whatsapp";
import { MERCH_STATUS } from "@/lib/merch/config";
import { MerchOrderActions, MerchProductTable } from "@/components/admin/MerchAdmin";
import type { Metadata } from "next";

export const metadata: Metadata = { title: `Merchandise | Admin ${BRAND.name}` };

export default async function AdminMerchPage({ searchParams }: { searchParams: { status?: string } }) {
  await requirePageRole(["admin", "superadmin"]);
  const supabase = createClient();

  let q = supabase
    .from("merch_orders")
    .select("id, order_number, status, total_idr, items, recipient_name, recipient_phone, shipping_address, city, postal_code, notes, courier, tracking_number, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const status = searchParams.status ?? "dibayar";
  if (status !== "semua") q = q.eq("status", status);

  const [{ data: products }, { data: orders }] = await Promise.all([
    supabase.from("merch_products").select("id, name, category, description, price_idr, stock, is_active, image_url").order("sort_order"),
    q,
  ]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-xl font-extrabold text-slate-900">Pesanan Merchandise</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {["dibayar", "dikirim", "selesai", "menunggu_pembayaran", "dibatalkan", "semua"].map((s) => (
            <a key={s} href={`?status=${s}`} className={`rounded-full border px-3 py-1 ${status === s ? "bg-slate-900 text-white" : "bg-white"}`}>
              {MERCH_STATUS[s]?.label ?? "Semua"}
            </a>
          ))}
        </div>
        <div className="divide-y rounded-2xl border bg-white">
          {(orders ?? []).length === 0 && <p className="px-5 py-10 text-center text-sm text-muted-foreground">Tidak ada pesanan.</p>}
          {(orders ?? []).map((o) => {
            const st = MERCH_STATUS[o.status] ?? { label: o.status, variant: "secondary" as const };
            const items = o.items as { name: string; quantity: number }[];
            return (
              <div key={o.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_1fr_auto]">
                <div>
                  <p className="font-mono text-xs font-bold">{o.order_number} <Badge variant={st.variant} className="ml-1">{st.label}</Badge></p>
                  <p className="mt-1 text-sm">{items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</p>
                  <p className="text-sm font-bold">{formatRupiah(o.total_idr)}</p>
                  {o.notes && <p className="text-xs text-amber-700">Catatan: {o.notes}</p>}
                </div>
                <div className="text-xs text-slate-600">
                  <p className="font-semibold text-slate-900">{o.recipient_name} · {formatWhatsApp(o.recipient_phone)}</p>
                  <p>{o.shipping_address}</p>
                  <p>{o.city} {o.postal_code}</p>
                  {o.tracking_number && <p className="mt-1 font-semibold">Resi {o.courier}: {o.tracking_number}</p>}
                </div>
                <MerchOrderActions id={o.id} status={o.status} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-slate-900">Produk</h2>
        <MerchProductTable products={products ?? []} />
      </section>
    </div>
  );
}
