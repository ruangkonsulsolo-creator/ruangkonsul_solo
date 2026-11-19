export const STATUS_PESANAN: Record<string, { label: string; cls: string }> = {
  menunggu_pembayaran: { label: "Menunggu Bayar", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  dibayar:             { label: "Lunas",          cls: "bg-green-50 text-green-800 border-green-200" },
  diproses:            { label: "Diproses",       cls: "bg-blue-50 text-blue-800 border-blue-200" },
  dikirim:             { label: "Dikirim",        cls: "bg-blue-50 text-blue-800 border-blue-200" },
  selesai:             { label: "Selesai",        cls: "bg-slate-100 text-slate-700 border-slate-200" },
  dibatalkan:          { label: "Dibatalkan",     cls: "bg-red-50 text-red-700 border-red-200" },
};
