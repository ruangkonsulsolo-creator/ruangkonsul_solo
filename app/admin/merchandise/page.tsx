import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Package, ShoppingBag, Store, TrendingUp, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils/format-currency";
import { ETALASE } from "@/lib/katalog/tipe";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Penjualan Merchandise | ${BRAND.name}` };
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
 * Penjualan merchandise.
 *
 * Halaman ini dulu juga mengelola daftar produknya, dan membaca tabel
 * `merchandise` lama. Setelah katalog disatukan, tabel itu dikosongkan dan
 * halaman ini jadi menampilkan "0 produk" — padahal 23 produk merchandise
 * ada dan aktif, hanya di tabel `produk`. Angka nol tanpa keterangan itu
 * membuat orang menyimpulkan datanya hilang.
 *
 * Sekarang pengelolaan produk sepenuhnya di /admin/katalog, dan halaman ini
 * hanya mengurus penjualannya. Angka produknya pun dibaca dari katalog yang
 * sama, supaya tidak ada dua versi kebenaran.
 */
export default async function AdminPenjualanMerchPage() {
  const supabase = createClient();

  const { data: etalaseMerch } = await supabase
    .from("etalase")
    .select("id")
    .eq("slug", ETALASE.merchandise)
    .maybeSingle();

  const [{ data: produk }, { data: pesanan }] = await Promise.all([
    etalaseMerch
      ? supabase
          .from("produk")
          .select("id, nama, stok, is_active")
          .eq("etalase_id", etalaseMerch.id)
      : Promise.resolve({ data: [] as { id: string; nama: string; stok: number | null; is_active: boolean }[] }),
    supabase
      .from("merchandise_orders")
      .select("id, order_number, total_idr, status, created_at, shipping_name")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const daftar = produk ?? [];
  const order = pesanan ?? [];

  // Omset hanya menghitung pesanan yang benar-benar dibayar. Memasukkan yang
  // masih menunggu pembayaran membuat angkanya lebih besar dari uang masuk.
  const sudahBayar = order.filter(
    (o) => !["menunggu_pembayaran", "dibatalkan"].includes(o.status)
  );
  const omset = sudahBayar.reduce((s, o) => s + (o.total_idr ?? 0), 0);
  const perluKirim = order.filter((o) => ["dibayar", "diproses"].includes(o.status)).length;
  const stokMenipis = daftar.filter(
    (p) => p.is_active && p.stok !== null && p.stok > 0 && p.stok <= 3
  ).length;

  const kartu = [
    { icon: TrendingUp, nilai: formatRupiah(omset), label: "Omset terbayar" },
    { icon: ShoppingBag, nilai: String(sudahBayar.length), label: "Pesanan terbayar" },
    { icon: Truck, nilai: String(perluKirim), label: "Perlu dikirim" },
    { icon: Package, nilai: String(stokMenipis), label: "Stok menipis (≤3)" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Penjualan Merchandise</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Pantau pesanan yang masuk. Produknya dikelola di Katalog Produk.
        </p>
      </div>

      <Link
        href="/admin/katalog"
        className="flex items-center justify-between gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-4 transition-colors hover:border-brand"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white">
            <Store className="h-5 w-5 text-brand" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-bold text-slate-900">
              {daftar.length} produk merchandise di katalog
            </span>
            <span className="block text-sm text-slate-600">
              Tambah, edit, dan hapus produknya di Katalog Produk.
            </span>
          </span>
        </span>
        <ArrowRight className="h-5 w-5 flex-shrink-0 text-brand" aria-hidden="true" />
      </Link>

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
        <h3 className="mb-3 font-extrabold text-slate-900">Penjualan terbaru</h3>
        {order.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
            <p className="font-semibold text-slate-900">Belum ada pesanan</p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
              Pesanan merchandise muncul di sini begitu ada pembeli. Saat ini
              pemesanan masih lewat WhatsApp, jadi tabel ini baru terisi setelah
              alur pembayaran di situs diaktifkan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  {["No. Pesanan", "Pembeli", "Total", "Status", "Tanggal"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.map((o) => (
                  <tr key={o.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {o.order_number}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{o.shipping_name ?? "—"}</td>
                    <td className="px-4 py-3 font-bold text-brand">
                      {formatRupiah(o.total_idr)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {LABEL_STATUS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(o.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
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
