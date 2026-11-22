import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserTermasukTamu } from "@/lib/supabase/tamu";

export const dynamic = "force-dynamic";

export type ItemRiwayat = {
  id: string;
  jenis: "ai" | "parafrase" | "kemiripan" | "turnitin" | "drillbit";
  judul: string;
  kode: string | null;
  waktu: string;
  tahap: "menunggu" | "diproses" | "selesai" | "batal" | "gagal";
  skor: number | null;
  href: string | null;
};

const TAHAP_ORDER: Record<string, ItemRiwayat["tahap"]> = {
  menunggu_pembayaran: "menunggu",
  dibayar: "diproses",
  diproses: "diproses",
  selesai: "selesai",
  dibatalkan: "batal",
  processing_failed: "diproses",
};

/**
 * Riwayat layanan pemeriksa milik sesi ini — akun biasa atau sesi tamu
 * (tanpa daftar). RLS tabel pemeriksaan/orders memastikan hanya milik sendiri.
 */
export async function GET() {
  const supabase = createClient({ tamu: true });
  const user = await getUserTermasukTamu(supabase);
  if (!user) return NextResponse.json({ data: { item: [], sesi: false, tamu: true } });

  const [instan, manual] = await Promise.all([
    supabase
      .from("pemeriksaan")
      .select("id, jenis, status, jumlah_kata, cuplikan, hasil, dibuat_pada")
      .eq("user_id", user.id)
      .order("dibuat_pada", { ascending: false })
      .limit(40),
    supabase
      .from("orders")
      .select("id, order_number, status, created_at, persen_kemiripan, mesin_laporan, report_storage_path, uploaded_files ( original_name )")
      .eq("user_id", user.id)
      .not("mesin_laporan", "is", null)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const item: ItemRiwayat[] = [];

  for (const r of instan.data ?? []) {
    const h = (r.hasil ?? {}) as Record<string, unknown>;
    const ai = (h.ai ?? null) as { skor?: number } | null;
    const kemiripan = (h.kemiripan ?? null) as { persen?: number } | null;
    const parafrase = (h.parafrase ?? null) as { persenBerubah?: number } | null;
    const jenisHasil = typeof h.jenis === "string" ? h.jenis : r.jenis;
    const jenis: ItemRiwayat["jenis"] =
      parafrase || jenisHasil === "parafrase" ? "parafrase" : jenisHasil === "kemiripan" ? "kemiripan" : "ai";
    const skor = ai?.skor ?? kemiripan?.persen ?? parafrase?.persenBerubah ?? null;
    const tahap: ItemRiwayat["tahap"] = r.status === "selesai" ? "selesai" : r.status === "gagal" ? "gagal" : "diproses";
    item.push({
      id: r.id,
      jenis,
      judul: (r.cuplikan as string | null)?.slice(0, 90) || `${Number(r.jumlah_kata).toLocaleString("id-ID")} kata`,
      kode: null,
      waktu: r.dibuat_pada as string,
      tahap,
      skor: typeof skor === "number" ? Math.round(skor) : null,
      href: tahap === "selesai" ? `/cek-plagiarisme/hasil/${r.id}` : null,
    });
  }

  for (const o of manual.data ?? []) {
    const berkas = (o.uploaded_files as unknown as { original_name: string } | null)?.original_name;
    const tahapDasar = TAHAP_ORDER[o.status as string] ?? "diproses";
    const tahap = tahapDasar === "selesai" && !o.report_storage_path ? "diproses" : tahapDasar;
    item.push({
      id: o.id,
      jenis: o.mesin_laporan === "DrillBit" ? "drillbit" : "turnitin",
      judul: berkas ?? "Naskah",
      kode: o.order_number as string,
      waktu: o.created_at as string,
      tahap,
      skor: tahap === "selesai" && o.persen_kemiripan != null ? Math.round(Number(o.persen_kemiripan)) : null,
      href: `/cek-plagiarisme/pesanan/${o.id}`,
    });
  }

  item.sort((a, b) => (a.waktu < b.waktu ? 1 : -1));
  return NextResponse.json({ data: { item: item.slice(0, 60), sesi: true, tamu: user.is_anonymous === true } });
}
