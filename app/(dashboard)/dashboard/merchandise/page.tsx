import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@/lib/brand";
import { PREVIEW_MODE, PREVIEW_USER } from "@/lib/utils/preview-mode";
import { formatRupiah } from "@/lib/utils/format-currency";
import { MERCH_STATUS } from "@/lib/merch/config";
import { MerchStore, type MerchProduct } from "@/components/merch/MerchStore";
import { PaymentStatusSync } from "@/components/dashboard/PaymentStatusSync";
import type { Metadata } from "next";

export const metadata: Metadata = { title: `Merchandise | ${BRAND.name}` };

export default async function MerchandisePage({
  searchParams,
}: { searchParams: { order?: string; paid?: string; pending?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !PREVIEW_MODE) redirect("/login?next=/dashboard/merchandise");

  const [{ data: products }, { data: orders }] = await Promise.all([
    supabase
      .from("merch_products")
      .select("id, name, description, category, price_idr, stock, image_url")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("merch_orders")
      .select("id, order_number, status, total_idr, items, courier, tracking_number, created_at")
      .eq("user_id", user?.id ?? PREVIEW_USER.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const pendingIds = (orders ?? []).filter((o) => o.status === "menunggu_pembayaran").map((o) => o.id);

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Merchandise {BRAND.shortName}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Produk resmi {BRAND.name}. Bayar via QRIS, VA, atau e-wallet — dikirim ke alamatmu.</p>
      </div>

      <PaymentStatusSync purpose="merch" referenceIds={pendingIds} showBanner={!!(searchParams.paid || searchParams.pending)} />

      {(products ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-white py-12 text-center text-sm text-muted-foreground">Belum ada produk yang dijual.</p>
      ) : (
        <MerchStore products={(products ?? []) as MerchProduct[]} />
      )}

      {(orders ?? []).length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pesanan Saya</h3>
          <div className="divide-y rounded-2xl border border-slate-200 bg-white">
            {orders!.map((o) => {
              const st = MERCH_STATUS[o.status] ?? { label: o.status, variant: "secondary" as const };
              const items = o.items as { name: string; quantity: number }[];
              return (
                <div key={o.id} className={`flex flex-wrap items-start justify-between gap-3 px-5 py-4 ${searchParams.order === o.id ? "bg-brand-50" : ""}`}>
                  <div>
                    <p className="font-mono text-xs font-bold text-slate-900">{o.order_number}</p>
                    <p className="text-xs text-muted-foreground">{items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</p>
                    {o.tracking_number && (
                      <p className="mt-1 text-xs font-semibold text-slate-700">Resi {o.courier ?? ""}: <span className="font-mono">{o.tracking_number}</span></p>
                    )}
                  </div>
                  <div className="space-y-1 text-right">
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <p className="text-sm font-bold">{formatRupiah(o.total_idr)}</p>
                    {o.status !== "menunggu_pembayaran" && o.status !== "dibatalkan" && (
                      <Link href="/dashboard/receipt" className="text-[11px] font-semibold text-[#8B0000] hover:underline">Receipt</Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
