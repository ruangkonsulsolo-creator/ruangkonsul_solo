import { NextRequest, NextResponse } from "next/server";
import { requireUser, STAFF_ROLES } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { bacaBerkas } from "@/lib/katalog/berkas-jasa";

export const dynamic = "force-dynamic";

/**
 * Unduh berkas pesanan jasa lewat signed URL baru (berlaku 5 menit).
 * ?i=<n>          → file hasil ke-n (pemilik pesanan atau staf)
 * ?naskah=<n>     → naskah customer ke-n (staf saja, atau pemiliknya)
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: "Id tidak valid." }, { status: 400 });

  const admin = createAdminClient();
  const { data: o } = await admin.from("pesanan_produk").select("*").eq("id", params.id).maybeSingle();
  const staf = STAFF_ROLES.includes(auth.ctx.role);
  if (!o || (!staf && o.user_id !== auth.ctx.user.id)) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  const sp = request.nextUrl.searchParams;
  const naskah = sp.has("naskah");
  const idx = Number(naskah ? sp.get("naskah") : sp.get("i"));
  if (!naskah && !staf && o.status !== "selesai") {
    return NextResponse.json({ error: "File hasil belum dirilis." }, { status: 403 });
  }
  const daftar = bacaBerkas(naskah ? o.berkas_pelanggan : o.berkas_hasil);
  const b = Number.isInteger(idx) && idx >= 0 ? daftar[idx] : undefined;
  if (!b) return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });

  const { data, error } = await admin.storage
    .from(naskah ? "documents" : "hasil-jasa")
    .createSignedUrl(b.path, 300, { download: b.nama });
  if (error || !data?.signedUrl) return NextResponse.json({ error: "Berkas tidak tersedia." }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
