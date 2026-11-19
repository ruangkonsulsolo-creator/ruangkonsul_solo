import { NextRequest, NextResponse } from "next/server";
import { requireUser, STAFF_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { productSchema } from "@/lib/merch/schema";

export const dynamic = "force-dynamic";

/** Ubah produk (harga, stok, aktif, dll.). */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(STAFF_ROLES);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = productSchema.partial().safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 422 });
  const { error } = await createAdminClient().from("merch_products").update(parsed.data).eq("id", params.id);
  if (error) return NextResponse.json({ error: "Gagal memperbarui produk." }, { status: 500 });
  return NextResponse.json({ data: "ok" });
}
