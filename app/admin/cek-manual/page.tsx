import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { idLayananManual } from "@/lib/periksa/layanan-manual";
import { BarisCekManual, type BarisManual } from "@/components/admin/BarisCekManual";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Cek Turnitin & DrillBit | Admin ${BRAND.name}` };

const TAB = {
  pending: { label: "Perlu dikirim", status: ["dibayar", "diproses", "processing_failed"] },
  terkirim: { label: "Terkirim", status: ["selesai"] },
  bayar: { label: "Menunggu bayar", status: ["menunggu_pembayaran"] },
  batal: { label: "Dibatalkan", status: ["dibatalkan"] },
} as const;
type KunciTab = keyof typeof TAB;

/**
 * Antrean laporan manual (Turnitin / DrillBit), terpisah dari pesanan lain.
 * "Perlu dikirim" = sudah dibayar tapi laporan belum diunggah; "Terkirim" =
 * laporan sudah diunggah & customer sudah diberi tahu.
 */
export default async function AdminCekManualPage({ searchParams }: { searchParams: { tab?: string; q?: string } }) {
  const supabase = createClient();
  const tab: KunciTab = (searchParams.tab as KunciTab) in TAB ? (searchParams.tab as KunciTab) : "pending";
  const q = searchParams.q?.trim();
  const idManual = await idLayananManual(supabase);

  const hitung = await Promise.all(
    (Object.keys(TAB) as KunciTab[]).map(async (k) => {
      if (!idManual.length) return [k, 0] as const;
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("service_id", idManual)
        .in("status", [...TAB[k].status]);
      return [k, count ?? 0] as const;
    })
  );
  const jumlah = Object.fromEntries(hitung) as Record<KunciTab, number>;

  let rows: BarisManual[] = [];
  let galat: string | null = null;
  if (idManual.length) {
    let query = supabase
      .from("orders")
      .select(
        "id, order_number, status, price_idr, created_at, paid_at, completed_at, format_laporan, persen_kemiripan, jumlah_kata, mesin_laporan, report_storage_path, " +
          "services ( slug, name ), profiles:profiles!orders_user_id_fkey ( full_name, whatsapp ), uploaded_files ( original_name, storage_path )"
      )
      .in("service_id", idManual)
      .in("status", [...TAB[tab].status])
      .order(tab === "pending" ? "paid_at" : "created_at", { ascending: tab === "pending" })
      .limit(100);
    if (q) query = query.ilike("order_number", `%${q}%`);
    const { data, error } = await query;
    if (error) galat = error.message;

    // Link unduh naskah & laporan (privat) berlaku 1 jam.
    const admin = createAdminClient();
    rows = await Promise.all(
      ((data ?? []) as unknown as Array<Record<string, any>>).map(async (o) => {
        const naskah = o.uploaded_files?.storage_path
          ? (await admin.storage.from("documents").createSignedUrl(o.uploaded_files.storage_path, 3600)).data?.signedUrl ?? null
          : null;
        const laporan = o.report_storage_path
          ? (await admin.storage.from("reports").createSignedUrl(o.report_storage_path, 3600)).data?.signedUrl ?? null
          : null;
        return {
          id: o.id,
          nomor: o.order_number,
          status: o.status,
          harga: o.price_idr,
          dibuat: o.created_at,
          dibayar: o.paid_at,
          selesai: o.completed_at,
          jenis: o.services?.slug === "drillbit-manual" ? "DrillBit" : "Turnitin",
          format: o.format_laporan,
          persen: o.persen_kemiripan != null ? Number(o.persen_kemiripan) : null,
          kata: o.jumlah_kata,
          mesin: o.mesin_laporan,
          customer: o.profiles?.full_name ?? "Customer",
          wa: o.profiles?.whatsapp ?? null,
          berkas: o.uploaded_files?.original_name ?? "-",
          urlNaskah: naskah,
          urlLaporan: laporan,
        } satisfies BarisManual;
      })
    );
  }

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Cek Turnitin & DrillBit</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Unduh naskah → cek di Turnitin/DrillBit → unggah PDF laporan asli + isi persentase → Kirim. Customer langsung diberi tahu.
          </p>
        </div>
        <form method="GET" className="flex gap-2">
          <input type="hidden" name="tab" value={tab} />
          <input name="q" defaultValue={q} placeholder="Cari no. pesanan" className="rounded-lg border px-3 py-1.5 text-sm" />
          <button className="rounded-lg border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">Cari</button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {(Object.keys(TAB) as KunciTab[]).map((k) => {
          const aktif = k === tab;
          return (
            <Link key={k} href={`/admin/cek-manual?tab=${k}`} role="tab" aria-selected={aktif}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${aktif ? "border-[#8B0000] bg-[#8B0000] text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
              {TAB[k].label}
              <span className={`rounded-full px-1.5 text-xs ${aktif ? "bg-white/20" : k === "pending" && jumlah[k] > 0 ? "bg-red-100 text-red-700" : "bg-slate-100"}`}>{jumlah[k]}</span>
            </Link>
          );
        })}
      </div>

      {!idManual.length && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Layanan laporan manual belum ada. Jalankan migration 042 & 044 di Supabase SQL Editor.
        </p>
      )}
      {galat && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Gagal memuat: {galat}</p>}

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-white px-4 py-10 text-center text-sm text-muted-foreground">
          {tab === "pending" ? "Tidak ada laporan yang perlu dikirim. 🎉" : "Belum ada pesanan di tab ini."}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <BarisCekManual r={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
