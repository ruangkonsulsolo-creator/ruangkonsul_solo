import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { bacaBerkas, MAKS_NASKAH, periksaNaskah, skemaBerkas } from "@/lib/katalog/berkas-jasa";
import { sendWhatsApp } from "@/lib/notification/whatsapp";
import { rateLimit } from "@/lib/security/rate-limit";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

const skema = z.object({ berkas: z.array(skemaBerkas).min(1).max(MAKS_NASKAH) });

/** Customer mengirim naskah susulan untuk pesanan jasa miliknya. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user } = auth.ctx;
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: "Id tidak valid." }, { status: 400 });
  if (!(await rateLimit(`naskah:${user.id}`, 60, 10))) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi sebentar." }, { status: 429 });
  }

  const parsed = skema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Data berkas tidak valid." }, { status: 422 });

  const admin = createAdminClient();
  const { data: o } = await admin.from("pesanan_produk").select("*").eq("id", params.id).maybeSingle();
  if (!o || o.user_id !== user.id) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  if (o.jasa_berkas !== true) return NextResponse.json({ error: "Pesanan ini bukan jasa berkas." }, { status: 400 });
  if (!["menunggu_pembayaran", "dibayar", "diproses"].includes(o.status)) {
    return NextResponse.json({ error: "Pesanan sudah selesai atau dibatalkan." }, { status: 409 });
  }

  const lama = bacaBerkas(o.berkas_pelanggan);
  const gabung = [...lama, ...parsed.data.berkas];
  if (new Set(gabung.map((b) => b.path)).size !== gabung.length) return NextResponse.json({ error: "Berkas ganda." }, { status: 422 });
  const galat = await periksaNaskah(admin, user.id, gabung);
  if (galat) return NextResponse.json({ error: galat }, { status: 422 });

  const { error } = await admin.from("pesanan_produk").update({ berkas_pelanggan: gabung }).eq("id", o.id);
  if (error) return NextResponse.json({ error: "Gagal menyimpan naskah." }, { status: 500 });

  if (o.status !== "menunggu_pembayaran") {
    sendWhatsApp({
      to: BRAND.whatsapp,
      message: `📎 Naskah baru untuk *${o.nomor}* (${o.nama_produk}): ${parsed.data.berkas.map((b) => b.nama).join(", ")}. Cek di Admin → Pesanan Produk.`,
    }).catch(() => undefined);
  }
  return NextResponse.json({ data: gabung.length });
}
