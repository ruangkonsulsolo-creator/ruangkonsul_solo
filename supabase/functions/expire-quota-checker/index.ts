// Supabase Edge Function: expire-quota-checker
// Jadwal: setiap hari 00:00 WIB (17:00 UTC) via pg_cron atau Supabase Cron
// Fungsi: set is_expired = true pada kuota yang sudah melewati expires_at

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("user_quotas")
    .update({ is_expired: true })
    .eq("is_expired", false)
    .lt("expires_at", now)
    .select("id, user_id, service_id");

  if (error) {
    console.error("expire-quota-checker error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  console.log(`Expired ${data?.length ?? 0} quota records.`);

  // TODO: kirim notifikasi ke user yang kuotanya baru expired

  return new Response(
    JSON.stringify({ expired_count: data?.length ?? 0 }),
    { headers: { "Content-Type": "application/json" } }
  );
});
