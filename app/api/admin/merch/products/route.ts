import { NextRequest, NextResponse } from "next/server";
import { requireUser, STAFF_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { productSchema } from "@/lib/merch/schema";

export const dynamic = "force-dynamic";

/** Tambah produk merch (admin/superadmin). */
export async function POST(request: NextRequest) {
  const auth = await requireUser(STAFF_ROLES);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = productSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 422 });

  const slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) + "-" + Date.now().toString(36);
  const { data, error } = await createAdminClient().from("merch_products").insert({ ...parsed.data, slug }).select("id").single();
  if (error) return NextResponse.json({ error: "Gagal menyimpan produk." }, { status: 500 });
  return NextResponse.json({ data });
}
