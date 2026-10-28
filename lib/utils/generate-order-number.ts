/**
 * Generate order number dengan format: KLB-YYYYMMDD-XXXX
 * Contoh: KLB-20260815-0042
 */
export function generateOrderNumber(sequence: number): string {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = String(sequence).padStart(4, "0");
  return `KLB-${dateStr}-${seq}`;
}
