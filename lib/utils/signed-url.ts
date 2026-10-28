import { createClient } from "@/lib/supabase/server";

/**
 * Generate Supabase Storage signed URL untuk laporan.
 * @param storagePath - path di bucket "reports", misal: "{order_id}/laporan.pdf"
 * @param expiresInSeconds - default 3600 (1 jam)
 */
export async function getReportSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("reports")
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Gagal membuat signed URL: ${error?.message}`);
  }

  return data.signedUrl;
}
