// order_status type — akan di-generate otomatis setelah supabase gen types

const statusConfig: Record<string, { label: string; className: string }> = {
  menunggu_pembayaran: { label: "Menunggu Pembayaran", className: "bg-yellow-100 text-yellow-800" },
  dibayar:            { label: "Dibayar",              className: "bg-brand-50 text-brand" },
  diproses:           { label: "Diproses",             className: "bg-indigo-100 text-indigo-800" },
  selesai:            { label: "Selesai",              className: "bg-brand-50 text-brand" },
  dibatalkan:         { label: "Dibatalkan",           className: "bg-red-100 text-red-800" },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: "bg-gray-100 text-gray-800" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
