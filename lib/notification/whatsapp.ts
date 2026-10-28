// Fonnte WhatsApp API
// Docs: https://fonnte.com/docs

const FONNTE_API_URL = "https://api.fonnte.com/send";

export async function sendWhatsApp(params: {
  to: string;   // format: 628xxxxxxxxx
  message: string;
}): Promise<void> {
  const response = await fetch(FONNTE_API_URL, {
    method: "POST",
    headers: {
      Authorization: process.env.FONNTE_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: params.to,
      message: params.message,
    }),
  });

  if (!response.ok) {
    throw new Error(`Fonnte error: ${response.statusText}`);
  }
}

// Template pesan
export const waTemplates = {
  orderReceived: (orderNumber: string) =>
    `✅ *Kalibri* — Pesanan *${orderNumber}* telah diterima dan sedang dalam antrian proses. Kami akan segera memberitahu Anda saat laporan selesai.`,

  orderCompleted: (orderNumber: string, downloadUrl: string) =>
    `🎉 *Kalibri* — Laporan pesanan *${orderNumber}* sudah siap!\n\nUnduh laporan Anda di dashboard: ${downloadUrl}\n\n_Link berlaku 1 jam._`,
};
