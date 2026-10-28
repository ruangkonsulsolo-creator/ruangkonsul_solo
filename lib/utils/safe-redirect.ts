/**
 * Validasi nilai `next` dari query parameter sebelum dipakai sebagai redirect target.
 *
 * Aturan:
 * 1. Harus berupa string
 * 2. Harus diawali dengan "/" (path relatif)
 * 3. TIDAK boleh diawali dengan "//" (protocol-relative URL → domain luar)
 * 4. TIDAK boleh mengandung ":" sebelum "/" pertama (mencegah `javascript:`, `data:`, dll.)
 * 5. TIDAK boleh berupa full URL (http://, https://)
 *
 * Jika tidak valid → fallback ke /dashboard
 *
 * @param next  - Raw value dari query param ?next=
 * @param fallback - Path fallback jika tidak valid (default: /dashboard)
 */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!next || typeof next !== "string") return fallback;

  const trimmed = next.trim();

  // Harus dimulai dengan "/" tapi BUKAN "//"
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;

  // Cegah protocol injection: "javascript:", "data:", dll.
  // Cek apakah ada karakter ":" sebelum "/" pertama
  const colonIndex = trimmed.indexOf(":");
  const firstSlash = trimmed.indexOf("/");
  if (colonIndex !== -1 && colonIndex < firstSlash) return fallback;

  // Pastikan bukan full URL yang lolos (tambahan defense-in-depth)
  try {
    // Jika bisa di-parse sebagai URL absolut → tolak
    new URL(trimmed); // akan throw jika bukan absolute URL
    return fallback;  // berhasil parse → berarti absolute URL → tolak
  } catch {
    // Gagal parse → bukan absolute URL → aman dilanjutkan
  }

  return trimmed;
}
