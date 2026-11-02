import type { Metadata } from "next";
import { Package, ShoppingBag, TrendingUp, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils/format-currency";
import { TabelMerchandise, type Produk } from "@/components/admin/TabelMerchandise";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Merchandise | ${BRAND.name}` };
export const dynamic = "force-dynamic";

const LABEL_STATUS: Record<string, string> = {
  menunggu_pembayaran: "Menunggu bayar",
  dibayar: "Dibayar",
  diproses: "Diproses",
  dikirim: "Dikirim",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

/**
 * Panel merchandise admin: etalase dan penjualan dalam satu halaman.
 *
 * Angka penjualan dihitung dari merchandise_orders yang benar-benar ada.
 * Omset hanya menghitung pesanan yang sudah dibayar — memasukkan pesanan
 * yang masih menunggu pembayaran membuat angka omset tampak lebih besar
 * daripada uang yang benar-benar masuk.
 */
export default async function AdminMerchandisePage() {
  const supabase = createClient();

  const [{ data: produk }, { data: pesanan }] = await Promise.all([
    supabase
      .from("merchandise")
      .select("id, name, description, category, price_idr, stock, weight_gram, images, is_active, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("merchandise_orders")
      .select("id, order_number, total_idr, status, created_at, paid_at, shipping_name, items")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const daftar = (produk ?? []) as Produk[];
  const order = pesanan ?? [];

  const sudahBayar = order.filter(
    (o) => !["menunggu_pembayaran", "dibatalkan"].includes(o.status)
  );
  const omset = sudahBayar.reduce((s, o) => s + (o.total_idr ?? 0), 0);
  const perluKirim = order.filter((o) => ["dibayar", "diproses"].includes(o.status)).length;
  const stokMenipis = daftar.filter((p) => p.is_active && p.stock > 0 && p.stock <= 3).length;

  const kartu = [
    { icon: TrendingUp, nilai: formatRupiah(omset), label: "Omset terbayar" },
    { icon: ShoppingBag, nilai: String(sudahBayar.length), label: "Pesanan terbayar" },
    { icon: Truck, nilai: String(perluKirim), label: "Perlu dikirim" },
    { icon: Package, nilai: String(stokMenipis), label: "Stok menipis (≤3)" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Merchandise</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Kelola etalase dan pantau penjualannya.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kartu.map((k) => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <k.icon className="h-4 w-4 text-brand" aria-hidden="true" />
            </span>
            <p className="text-xl font-extrabold text-slate-900">{k.nilai}</p>
            <p className="text-xs text-slate-500">{k.label}</p>
          </div>
        ))}
      </div>

      <section>
        <h3 className="mb-3 font-extrabold text-slate-900">Etalase</h3>
        <TabelMerchandise awal={daftar} />
      </section>

      <section>
        <h3 className="mb-3 font-extrabold text-slate-900">Penjualan terbaru</h3>
        {order.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
            <p className="font-semibold text-slate-900">Belum ada pesanan</p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
              Pesanan merchandise muncul di sini begitu ada pembeli. Saat ini
              pemesanan masih lewat WhatsApp, jadi tabel ini baru terisi setelah
              alur checkout di situs diaktifkan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  {["No. Pesanan", "Pembeli", "Total", "Status", "Tanggal"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.map((o) => (
                  <tr key={o.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{o.order_number}</td>
                    <td className="px-4 py-3 text-slate-700">{o.shipping_name ?? "—"}</td>
                    <td className="px-4 py-3 font-bold text-brand">{formatRupiah(o.total_idr)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {LABEL_STATUS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(o.created_at).toLocaleDateString("id-ID", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
