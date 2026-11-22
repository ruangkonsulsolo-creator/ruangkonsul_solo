// Fonnte WhatsApp API — https://fonnte.com/docs
import { BRAND } from "@/lib/brand";
import { normalizeWhatsApp } from "@/lib/validators/whatsapp";

const FONNTE_API_URL = "https://api.fonnte.com/send";

/**
 * Kirim WhatsApp lewat Fonnte. Tidak pernah melempar error: notifikasi
 * adalah pelengkap, jadi kegagalannya (token belum diisi, nomor tidak valid,
 * Fonnte sedang gangguan) hanya dicatat dan tidak menggagalkan proses utama
 * seperti pembayaran atau pengiriman laporan.
 */
export async function sendWhatsApp(params: {
  to: string | null | undefined; // 08xx / 628xx / +62 8xx
  message: string;
}): Promise<boolean> {
  const token = process.env.FONNTE_API_KEY;
  const target = normalizeWhatsApp(params.to);
  if (!token || !target) {
    if (!token) console.info("[wa] FONNTE_API_KEY belum diisi — WhatsApp tidak dikirim.");
    return false;
  }
  try {
    const res = await fetch(FONNTE_API_URL, {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({ target, message: params.message, countryCode: "62" }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[wa] Fonnte ${res.status}: ${res.statusText}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[wa] gagal kirim:", e);
    return false;
  }
}

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? `https://${BRAND.domain}`).replace(/\/$/, "");
}

// Template pesan
export const waTemplates = {
  orderReceived: (orderNumber: string, layanan = "Pesanan") =>
    `✅ *${BRAND.name}*\n\n${layanan} *${orderNumber}* sudah dibayar dan masuk antrean tim. ` +
    `Laporan dikirim maksimal 1×24 jam — kami kabari lagi lewat WhatsApp ini.`,

  orderCompleted: (orderNumber: string, linkOrId: string, persen?: number | null) =>
    `🎉 *${BRAND.name}*\n\nLaporan pesanan *${orderNumber}* sudah siap` +
    (persen != null ? ` — similarity *${persen}%*` : "") +
    `.\n\nLihat & unduh di sini:\n${linkOrId.startsWith("http") ? linkOrId : `${appUrl()}/cek-plagiarisme/pesanan/${linkOrId}`}\n\n` +
    `Laporan tersimpan di Riwayat Pesanan dan bisa diunduh lagi kapan saja.`,

  referralCredited: (jumlah: string) =>
    `🎁 *${BRAND.name}*\n\nTemanmu baru saja menyelesaikan pembayaran pertamanya. ` +
    `Komisi referral *${jumlah}* sudah masuk ke saldomu.\n\nCek saldo: ${appUrl()}/dashboard`,
};
