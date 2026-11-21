import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BayarUlangPesanan } from "@/components/katalog/BayarUlangPesanan";
import { CalendarDays, FileText, ShoppingBag, Wallet, FileSearch } from "lucide-react";
import type { Metadata } from "next";
import { formatRupiah } from "@/lib/utils/format-currency";

export const metadata: Metadata = { title: "Riwayat Pesanan" };
export const dynamic = "force-dynamic";

/**
 * Semua transaksi customer dalam satu daftar, bersumber dari tabel payments:
 * sesi bimbingan (booking), produk katalog, isi saldo, dan pesanan cek naskah.
 * Versi lama hanya membaca tabel orders (alur cek naskah lama), sehingga
 * booking & pembelian paket tidak pernah muncul di sini.
 */

type Purpose = "booking" | "produk" | "saldo" | "order";

const JENIS: Record<Purpose, { label: string; icon: React.ElementType; detail: string }> = {
  booking: { label: "Sesi Bimbingan", icon: CalendarDays, detail: "/dashboard/sesi-saya" },
  produk:  { label: "Produk / Paket", icon: ShoppingBag, detail: "/dashboard/pesanan-produk" },
  saldo:   { label: "Isi Saldo",      icon: Wallet,       detail: "/dashboard/isi-saldo" },
  order:   { label: "Cek Naskah",     icon: FileSearch,   detail: "/dashboard/riwayat-pesanan" },
};

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "info" | "destructive" | "secondary" | "outline" }> = {
  pending:   { label: "Menunggu Bayar", variant: "warning" },
  paid:      { label: "Lunas",          variant: "success" },
  expired:   { label: "Kedaluwarsa",    variant: "secondary" },
  failed:    { label: "Gagal",          variant: "destructive" },
  cancelled: { label: "Dibatalkan",     variant: "destructive" },
  refunded:  { label: "Dikembalikan",   variant: "outline" },
};

const FILTER: Record<string, { label: string; status: string[] | null }> = {
  semua:      { label: "Semua",          status: null },
  menunggu:   { label: "Menunggu Bayar", status: ["pending"] },
  lunas:      { label: "Lunas",          status: ["paid"] },
  batal:      { label: "Batal / Kedaluwarsa", status: ["expired", "failed", "cancelled", "refunded"] },
};

const WIB: Intl.DateTimeFormatOptions = { timeZone: "Asia/Jakarta" };

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    ...WIB, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatSlot(tgl?: string | null, jam?: string | null) {
  if (!tgl) return null;
  const d = new Date(`${tgl}T00:00:00+07:00`).toLocaleDateString("id-ID", {
    ...WIB, weekday: "short", day: "numeric", month: "short",
  });
  return `${d}${jam ? `, ${jam.slice(0, 5)} WIB` : ""}`;
}

type Pay = {
  id: string;
  purpose: Purpose;
  reference_id: string;
  amount_idr: number;
  status: string;
  snap_token: string | null;
  item_snapshot: Array<{ name?: string }> | null;
  receipt_number: string | null;
  created_at: string;
};

export default async function RiwayatPesananPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/riwayat-pesanan");

  const pageSize = 15;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const filterKey = FILTER[searchParams.status ?? ""] ? (searchParams.status as string) : "semua";
  const filter = FILTER[filterKey];

  let q = supabase
    .from("payments")
    .select("id, purpose, reference_id, amount_idr, status, snap_token, item_snapshot, receipt_number, created_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (filter.status) q = q.in("status", filter.status);

  const { data, count, error } = await q;
  if (error) console.error("[riwayat-pesanan]", error.message);
  const rows = (data ?? []) as Pay[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));

  // Lengkapi baris booking dengan mentor & jadwal.
  const idBooking = rows.filter((r) => r.purpose === "booking").map((r) => r.reference_id);
  const infoBooking = new Map<string, { mentor?: string | null; jadwal?: string | null; nomor?: string | null }>();
  if (idBooking.length) {
    const { data: bk } = await supabase
      .from("bookings")
      .select("id, booking_number, booking_slots:booking_slots!bookings_slot_id_fkey ( slot_date, slot_start ), mentor_profiles ( display_name )")
      .in("id", idBooking);
    for (const b of (bk ?? []) as unknown as Array<{
      id: string; booking_number: string | null;
      booking_slots: { slot_date: string; slot_start: string } | null;
      mentor_profiles: { display_name: string | null } | null;
    }>) {
      infoBooking.set(b.id, {
        nomor: b.booking_number,
        mentor: b.mentor_profiles?.display_name,
        jadwal: formatSlot(b.booking_slots?.slot_date, b.booking_slots?.slot_start),
      });
    }
  }

  // Lengkapi baris cek plagiarisme manual dengan status laporan.
  const idOrder = rows.filter((r) => r.purpose === "order").map((r) => r.reference_id);
  const infoOrder = new Map<string, { status: string; persen: number | null; adaLaporan: boolean; format: string | null; berkas: string | null }>();
  if (idOrder.length) {
    const { data: od } = await supabase
      .from("orders")
      .select("id, status, persen_kemiripan, report_storage_path, format_laporan, uploaded_files ( original_name )")
      .in("id", idOrder);
    for (const o of (od ?? []) as unknown as Array<{
      id: string; status: string; persen_kemiripan: number | null; report_storage_path: string | null;
      format_laporan: string | null; uploaded_files: { original_name: string } | null;
    }>) {
      infoOrder.set(o.id, {
        status: o.status,
        persen: o.persen_kemiripan != null ? Number(o.persen_kemiripan) : null,
        adaLaporan: o.status === "selesai" && !!o.report_storage_path,
        format: o.format_laporan,
        berkas: o.uploaded_files?.original_name ?? null,
      });
    }
  }

  const href = (k: string, p = 1) => `/dashboard/riwayat-pesanan?status=${k}&page=${p}`;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Riwayat Pesanan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Semua transaksi kamu: sesi bimbingan, produk & paket, isi saldo, dan cek naskah.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter status pesanan">
        {Object.entries(FILTER).map(([k, f]) => {
          const aktif = filterKey === k;
          return (
            <Link key={k} href={href(k)} aria-current={aktif ? "true" : undefined}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                aktif ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}>
              {f.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText className="h-10 w-10 text-slate-300" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              {filterKey === "semua" ? "Belum ada pesanan." : "Tidak ada pesanan dengan status ini."}
            </p>
            {filterKey === "semua" && (
              <div className="flex flex-wrap justify-center gap-2 text-sm">
                <Link href="/jadwal" className="font-semibold text-brand hover:underline">Pesan bimbingan</Link>
                <span className="text-slate-300">·</span>
                <Link href="/layanan" className="font-semibold text-brand hover:underline">Lihat layanan</Link>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y">
            {rows.map((r) => {
              const j = JENIS[r.purpose] ?? JENIS.order;
              const Icon = j.icon;
              const st = STATUS[r.status] ?? { label: r.status, variant: "outline" as const };
              const bk = r.purpose === "booking" ? infoBooking.get(r.reference_id) : undefined;
              const nama = (r.item_snapshot?.[0]?.name ?? j.label).replace(/\s*\(per jam\)\s*$/i, "");
              const od = r.purpose === "order" ? infoOrder.get(r.reference_id) : undefined;
              const bisaBayar = r.status === "pending" && !!r.snap_token && (r.purpose === "booking" || r.purpose === "produk" || r.purpose === "order");
              return (
                <li key={r.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{j.label}</span>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      <p className="truncate font-semibold text-slate-800">{nama}</p>
                      <p className="text-xs text-muted-foreground">
                        {[bk?.mentor && `Mentor ${bk.mentor}`, bk?.jadwal, od?.berkas, od?.format && `tampilan ${od.format}`, formatTanggal(r.created_at)]
                          .filter(Boolean).join(" · ")}
                      </p>
                      {od && r.status === "paid" && (
                        <p className="mt-1 text-xs font-semibold">
                          {od.adaLaporan ? (
                            <span className="text-brand">Kemiripan {od.persen ?? "-"}% · laporan siap</span>
                          ) : (
                            <span className="text-amber-700">Sedang diperiksa tim (maks. 1×24 jam)</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="whitespace-nowrap font-bold text-slate-900">{formatRupiah(r.amount_idr)}</span>
                    <div className="flex items-center gap-2">
                      {bisaBayar && (
                        <BayarUlangPesanan pesananId={r.reference_id} snapToken={r.snap_token!} paymentId={r.id}
                          purpose={r.purpose as "booking" | "produk" | "order"} />
                      )}
                      {r.status === "paid" && (
                        <Link href={`/receipt/${r.id}`} className="text-xs font-semibold text-brand hover:underline">Receipt</Link>
                      )}
                      {od?.adaLaporan && (
                        <a href={`/api/report/${r.reference_id}`} className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1 text-xs font-bold text-white hover:bg-brand-light">
                          Unduh laporan
                        </a>
                      )}
                      {r.purpose !== "order" && (
                        <Link href={j.detail} className="text-xs font-semibold text-slate-500 hover:text-slate-800">Detail →</Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">Halaman {page} dari {totalPages}</p>
              <div className="flex gap-2">
                {page > 1 && <Link href={href(filterKey, page - 1)} className="rounded-md border px-3 py-1 text-xs hover:bg-slate-50">← Sebelumnya</Link>}
                {page < totalPages && <Link href={href(filterKey, page + 1)} className="rounded-md border px-3 py-1 text-xs hover:bg-slate-50">Berikutnya →</Link>}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
