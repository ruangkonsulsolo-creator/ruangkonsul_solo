import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Isi pesan dibatasi sama dengan CHECK di basis data (migration 023). */
const MAKS_ISI = 4000;

/**
 * Pesan dalam satu percakapan.
 *
 * `sejak` dipakai polling untuk hanya mengambil pesan yang lebih baru dari
 * yang sudah ada di layar. Tanpa itu, setiap denyut polling menarik ulang
 * seluruh riwayat percakapan.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });
  }

  const percakapanId = request.nextUrl.searchParams.get("percakapan");
  const sejak = request.nextUrl.searchParams.get("sejak");

  if (!percakapanId) {
    return NextResponse.json(
      { error: "Percakapan tidak disebut." },
      { status: 422 }
    );
  }

  let q = supabase
    .from("pesan")
    .select("id, pengirim_id, isi, dibaca_pada, dibuat_pada")
    .eq("percakapan_id", percakapanId)
    .order("dibuat_pada", { ascending: true })
    .limit(500);

  if (sejak) q = q.gt("dibuat_pada", sejak);

  const { data, error } = await q;

  if (error) {
    console.error("[chat] gagal memuat pesan:", error);
    return NextResponse.json({ error: "Gagal memuat pesan." }, { status: 500 });
  }

  // Pesan dari lawan bicara ditandai sudah dibaca saat percakapan dibuka.
  // Dijalankan tanpa menunggu hasilnya: gagal menandai tidak boleh membuat
  // pesannya ikut gagal tampil.
  void supabase
    .from("pesan")
    .update({ dibaca_pada: new Date().toISOString() })
    .eq("percakapan_id", percakapanId)
    .neq("pengirim_id", user.id)
    .is("dibaca_pada", null)
    .then(({ error: e }) => {
      if (e) console.error("[chat] gagal menandai dibaca:", e);
    });

  return NextResponse.json({
    data: (data ?? []).map((p) => ({
      id: p.id,
      saya: p.pengirim_id === user.id,
      isi: p.isi,
      dibacaPada: p.dibaca_pada,
      dibuatPada: p.dibuat_pada,
    })),
  });
}

const skema = z.object({
  percakapanId: z.string().uuid(),
  isi: z.string().trim().min(1).max(MAKS_ISI),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Data tidak terbaca." }, { status: 400 });
  }

  const parsed = skema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Pesan kosong atau lebih dari ${MAKS_ISI} karakter.` },
      { status: 422 }
    );
  }

  // pengirim_id diambil dari sesi, tidak pernah dari badan permintaan.
  // Kebijakan RLS juga menolak yang tidak cocok, tapi nilai yang benar
  // seharusnya tidak pernah sampai ke sana dalam keadaan salah.
  const { data, error } = await supabase
    .from("pesan")
    .insert({
      percakapan_id: parsed.data.percakapanId,
      pengirim_id: user.id,
      isi: parsed.data.isi,
    })
    .select("id, isi, dibuat_pada")
    .single();

  if (error) {
    // 42501 = RLS menolak: pengirim bukan peserta percakapan ini.
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Kamu bukan peserta percakapan ini." },
        { status: 403 }
      );
    }
    console.error("[chat] gagal mengirim pesan:", error);
    return NextResponse.json(
      { error: "Pesan gagal terkirim. Coba lagi." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: { id: data.id, saya: true, isi: data.isi, dibacaPada: null, dibuatPada: data.dibuat_pada },
  });
}
