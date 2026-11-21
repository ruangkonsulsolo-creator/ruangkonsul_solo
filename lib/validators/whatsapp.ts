import { z } from "zod";

/**
 * Normalisasi nomor WhatsApp Indonesia ke format 62xxxxxxxxxx.
 * Menerima: 0812..., +62 812..., 62812..., 812...
 * Return null jika tidak valid.
 */
export function normalizeWhatsApp(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = String(input).replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return /^628\d{7,12}$/.test(d) ? d : null;
}

export const whatsappSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizeWhatsApp(v);
    if (!n) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nomor WhatsApp tidak valid (contoh: 0812xxxxxxxx)." });
      return z.NEVER;
    }
    return n;
  });

/** Tampilkan 6281234567890 → 0812-3456-7890 */
export function formatWhatsApp(n: string | null | undefined): string {
  if (!n) return "-";
  const local = n.startsWith("62") ? "0" + n.slice(2) : n;
  return local.replace(/(\d{4})(\d{4})(\d+)/, "$1-$2-$3");
}
