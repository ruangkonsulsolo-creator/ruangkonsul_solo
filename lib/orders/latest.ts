import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { PanelOrder } from "@/components/dashboard/ServiceOrderPanel";

const COLS = "id, order_number, status, result, detection_error, detection_started_at, report_storage_path, output_storage_path";

/** Pesanan terfokus (?order=) atau pesanan terakhir user untuk layanan ini. */
export async function getLatestServiceOrder(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  serviceId: string | undefined,
  focusId?: string | null
): Promise<PanelOrder | null> {
  if (focusId && /^[0-9a-f-]{36}$/i.test(focusId)) {
    const { data } = await supabase.from("orders").select(COLS).eq("id", focusId).eq("user_id", userId).maybeSingle();
    if (data) return data as PanelOrder;
  }
  if (!serviceId) return null;
  const { data } = await supabase
    .from("orders")
    .select(COLS)
    .eq("user_id", userId)
    .eq("service_id", serviceId)
    .in("status", ["diproses", "selesai", "processing_failed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as PanelOrder | null) ?? null;
}
