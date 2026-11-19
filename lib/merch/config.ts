/** Ongkir flat (Rp). Ubah lewat env NEXT_PUBLIC_MERCH_SHIPPING_FEE (dipakai server & UI). */
export function merchShippingFee(): number {
  const v = Number(process.env.NEXT_PUBLIC_MERCH_SHIPPING_FEE ?? 15000);
  return Number.isFinite(v) && v >= 0 ? Math.round(v) : 15000;
}

export const MERCH_STATUS: Record<string, { label: string; variant: "warning" | "info" | "success" | "destructive" | "secondary" }> = {
  menunggu_pembayaran: { label: "Menunggu Bayar", variant: "warning" },
  dibayar:             { label: "Dikemas",        variant: "info" },
  dikirim:             { label: "Dikirim",        variant: "info" },
  selesai:             { label: "Selesai",        variant: "success" },
  dibatalkan:          { label: "Dibatalkan",     variant: "destructive" },
};
