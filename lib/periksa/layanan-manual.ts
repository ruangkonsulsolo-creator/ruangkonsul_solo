import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SEMUA_SLUG_MANUAL } from "./manual";

/** Id layanan laporan manual (Turnitin/DrillBit), untuk memisahkan pesanannya. */
export async function idLayananManual(db: SupabaseClient<any, any, any>): Promise<string[]> {
  const { data } = await db.from("services").select("id").in("slug", [...SEMUA_SLUG_MANUAL]);
  return (data ?? []).map((r) => r.id as string);
}
