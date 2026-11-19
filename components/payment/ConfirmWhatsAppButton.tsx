import { MessageCircle } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { formatRupiah } from "@/lib/utils/format-currency";

interface Props {
  receiptNumber: string;
  purposeLabel: string;
  items: { name: string; quantity: number }[];
  amountIdr: number;
  customerName: string;
  className?: string;
}

/**
 * Tombol "Konfirmasi via WhatsApp" — HANYA ditampilkan setelah pembayaran lunas.
 * Pesan berisi nomor receipt agar admin bisa langsung memverifikasi di /verify.
 */
export function ConfirmWhatsAppButton({ receiptNumber, purposeLabel, items, amountIdr, customerName, className }: Props) {
  const lines = [
    `Halo ${BRAND.name}, saya sudah melakukan pembayaran.`,
    ``,
    `Nama: ${customerName}`,
    `No. Receipt: ${receiptNumber}`,
    `Jenis: ${purposeLabel}`,
    `Item: ${items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}`,
    `Total: ${formatRupiah(amountIdr)}`,
    ``,
    `Mohon konfirmasi & jadwal selanjutnya. Terima kasih!`,
  ];
  const href = `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-bold text-white hover:opacity-90 ${className ?? ""}`}
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      Konfirmasi via WhatsApp
    </a>
  );
}
