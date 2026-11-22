import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Klien = ReturnType<typeof createClient>;
const WIB = 7 * 60 * 60 * 1000;

export const LABEL_SUMBER: Record<string, string> = {
  order: "Cek naskah & layanan",
  booking: "Bimbingan mentor",
  produk: "Produk & paket",
  saldo: "Isi saldo",
};

/** Tanggal (YYYY-MM-DD) menurut WIB. */
export function tanggalWIB(d = new Date()) {
  return new Date(d.getTime() + WIB).toISOString().slice(0, 10);
}

/** Awal hari / bulan menurut WIB, sebagai instan UTC. */
export function awalHariWIB(d = new Date()) {
  return new Date(`${tanggalWIB(d)}T00:00:00+07:00`);
}
export function awalBulanWIB(d = new Date()) {
  return new Date(`${tanggalWIB(d).slice(0, 7)}-01T00:00:00+07:00`);
}

type Baris = { hari?: string; bulan?: string; purpose: string; jumlah: number; transaksi: number };

export type RingkasanOmzet = {
  siap: boolean;
  hariIni: number;
  bulanIni: number;
  total: number;
  transaksiBulanIni: number;
  perSumberBulanIni: { purpose: string; label: string; jumlah: number; transaksi: number }[];
  harian: { tanggal: string; jumlah: number }[]; // 14 hari terakhir, lengkap (0 bila kosong)
  bulanan: { bulan: string; jumlah: number; transaksi: number }[]; // 6 bulan terakhir
};

/**
 * Omzet dari SEMUA pembayaran lunas (tabel payments), per tanggal WIB.
 * Perlu migrasi 046; tanpa itu `siap` = false dan halaman menampilkan petunjuk.
 */
export async function ambilRingkasanOmzet(supabase: Klien): Promise<RingkasanOmzet> {
  const sekarang = new Date();
  const hariIni = tanggalWIB(sekarang);
  const bulanIni = hariIni.slice(0, 7);
  const dari = new Date(Math.min(awalBulanWIB(sekarang).getTime(), awalHariWIB(sekarang).getTime() - 13 * 864e5));

  const [h, b] = await Promise.all([
    supabase.rpc("omzet_harian", { p_dari: dari.toISOString() }),
    supabase.rpc("omzet_bulanan"),
  ]);
  const kosong: RingkasanOmzet = {
    siap: false, hariIni: 0, bulanIni: 0, total: 0, transaksiBulanIni: 0,
    perSumberBulanIni: [], harian: [], bulanan: [],
  };
  if (h.error || b.error) {
    console.warn("[omzet]", h.error?.message ?? b.error?.message);
    return kosong;
  }
  const harianRows = ((h.data ?? []) as Baris[]).map((r) => ({ ...r, jumlah: Number(r.jumlah), transaksi: Number(r.transaksi) }));
  const bulananRows = ((b.data ?? []) as Baris[]).map((r) => ({ ...r, jumlah: Number(r.jumlah), transaksi: Number(r.transaksi) }));

  const perSumber = new Map<string, { jumlah: number; transaksi: number }>();
  let omzetHariIni = 0;
  for (const r of harianRows) {
    if (r.hari === hariIni) omzetHariIni += r.jumlah;
    if (r.hari?.startsWith(bulanIni)) {
      const x = perSumber.get(r.purpose) ?? { jumlah: 0, transaksi: 0 };
      x.jumlah += r.jumlah;
      x.transaksi += r.transaksi;
      perSumber.set(r.purpose, x);
    }
  }

  const harian: RingkasanOmzet["harian"] = [];
  for (let i = 13; i >= 0; i--) {
    const t = tanggalWIB(new Date(sekarang.getTime() - i * 864e5));
    harian.push({ tanggal: t, jumlah: harianRows.filter((r) => r.hari === t).reduce((s, r) => s + r.jumlah, 0) });
  }

  const perBulan = new Map<string, { jumlah: number; transaksi: number }>();
  let total = 0;
  for (const r of bulananRows) {
    total += r.jumlah;
    const k = String(r.bulan).slice(0, 7);
    const x = perBulan.get(k) ?? { jumlah: 0, transaksi: 0 };
    x.jumlah += r.jumlah;
    x.transaksi += r.transaksi;
    perBulan.set(k, x);
  }
  const bulanan = [...perBulan.entries()]
    .sort(([a], [z]) => (a < z ? 1 : -1))
    .slice(0, 6)
    .map(([bulan, v]) => ({ bulan, ...v }));

  const perSumberBulanIni = [...perSumber.entries()]
    .map(([purpose, v]) => ({ purpose, label: LABEL_SUMBER[purpose] ?? purpose, ...v }))
    .sort((a, z) => z.jumlah - a.jumlah);

  return {
    siap: true,
    hariIni: omzetHariIni,
    bulanIni: perSumberBulanIni.reduce((s, r) => s + r.jumlah, 0),
    total,
    transaksiBulanIni: perSumberBulanIni.reduce((s, r) => s + r.transaksi, 0),
    perSumberBulanIni,
    harian,
    bulanan,
  };
}
