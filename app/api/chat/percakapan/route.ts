import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pastikanPercakapan } from "@/lib/chat/pastikan-percakapan";

export const dynamic = "force-dynamic";

/**
 * Daftar percakapan milik pengguna yang sedang masuk.
 *
 * Satu rute melayani kedua sisi: mentor melihat percakapan dengan para
 * kliennya, customer melihat percakapan dengan para mentornya. RLS yang
 * memutuskan baris mana yang terlihat (kebijakan percakapan_select_peserta),
 * jadi tidak ada penyaringan peran di sini yang bisa lupa diterapkan.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });
  }

  // Sesi yang sudah lunas otomatis membuka percakapan dengan mentornya
  // (termasuk booking yang dibayar sebelum fitur ini ada).
  const { data: sesiLunas } = await supabase
    .from("bookings")
    .select("mentor_id")
    .eq("customer_id", user.id)
    .in("status", ["confirmed", "completed"]);
  const mentorSesi = Array.from(new Set((sesiLunas ?? []).map((b) => b.mentor_id).filter(Boolean)));
  for (const m of mentorSesi) await pastikanPercakapan(supabase, m as string, user.id);

  const { data: baris, error } = await supabase
    .from("percakapan")
    .select(
      `id, mentor_id, customer_id, pesan_terakhir_pada,
       mentor:mentor_profiles!percakapan_mentor_id_fkey (
         id, user_id, avatar_url, headline, display_name
       )`
    )
    .order("pesan_terakhir_pada", { ascending: false });

  if (error) {
    console.error("[chat] gagal memuat percakapan:", error);
    return NextResponse.json(
      { error: "Gagal memuat percakapan." },
      { status: 500 }
    );
  }

  // Pesan terakhir dan jumlah yang belum dibaca diambil terpisah supaya
  // kueri di atas tetap sederhana. Daftar percakapan satu orang tidak akan
  // panjang, jadi ini tidak jadi masalah kinerja.
  const ids = (baris ?? []).map((b) => b.id);
  const cuplikan = new Map<string, { isi: string; dibuat: string }>();
  const belumDibaca = new Map<string, number>();

  if (ids.length > 0) {
    const { data: pesan } = await supabase
      .from("pesan")
      .select("percakapan_id, isi, pengirim_id, dibaca_pada, dibuat_pada")
      .in("percakapan_id", ids)
      .order("dibuat_pada", { ascending: false });

    for (const p of pesan ?? []) {
      if (!cuplikan.has(p.percakapan_id)) {
        cuplikan.set(p.percakapan_id, { isi: p.isi, dibuat: p.dibuat_pada });
      }
      // Yang dihitung hanya pesan dari lawan bicara yang belum dibaca.
      if (!p.dibaca_pada && p.pengirim_id !== user.id) {
        belumDibaca.set(
          p.percakapan_id,
          (belumDibaca.get(p.percakapan_id) ?? 0) + 1
        );
      }
    }
  }

  // Nama lawan bicara. RLS profiles hanya membuka baris milik sendiri, jadi
  // nama dibaca dengan service role — terbatas pada peserta percakapan yang
  // sudah lolos RLS di atas, sehingga tidak membocorkan profil lain.
  const idNama = new Set<string>();
  for (const b of baris ?? []) {
    const m = b.mentor as unknown as { user_id: string | null } | null;
    idNama.add(b.customer_id);
    if (m?.user_id) idNama.add(m.user_id);
  }
  const nama = new Map<string, string>();
  if (idNama.size > 0) {
    const { data: prof } = await createAdminClient()
      .from("profiles")
      .select("id, full_name")
      .in("id", Array.from(idNama));
    for (const p of prof ?? []) if (p.full_name) nama.set(p.id, p.full_name);
  }

  const data = (baris ?? []).map((b) => {
    const m = b.mentor as unknown as {
      id: string;
      user_id: string | null;
      avatar_url: string | null;
      headline: string | null;
      display_name: string | null;
    } | null;

    // "Lawan bicara" berbeda tergantung siapa yang membuka. Pengguna yang
    // sama tidak boleh melihat namanya sendiri sebagai judul percakapan.
    const sayaMentor = b.customer_id !== user.id;
    const namaMentor = m?.display_name || (m?.user_id ? nama.get(m.user_id) : undefined) || "Mentor";

    return {
      id: b.id,
      mentorId: b.mentor_id,
      lawan: {
        nama: sayaMentor
          ? nama.get(b.customer_id) ?? "Customer"
          : namaMentor,
        avatar: sayaMentor ? null : m?.avatar_url ?? null,
        keterangan: sayaMentor ? "Customer" : m?.headline ?? "Mentor",
      },
      terakhir: cuplikan.get(b.id) ?? null,
      belumDibaca: belumDibaca.get(b.id) ?? 0,
      pesanTerakhirPada: b.pesan_terakhir_pada,
    };
  });

  return NextResponse.json({ data });
}

const skema = z.object({ mentorId: z.string().uuid() });

/**
 * Membuka percakapan dengan seorang mentor.
 *
 * Hanya customer yang boleh memulai — kebijakan RLS percakapan_insert_customer
 * yang menegakkannya. Mentor tidak bisa menghubungi sembarang orang lebih
 * dulu, dan itu disengaja.
 */
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
    return NextResponse.json({ error: "Mentor tidak valid." }, { status: 422 });
  }

  // Percakapan dengan mentor yang sama dipakai ulang, bukan dibuat baru.
  // Riwayat bimbingan yang terpecah-pecah membuat mentor kehilangan konteks.
  const { data: adaDulu } = await supabase
    .from("percakapan")
    .select("id")
    .eq("mentor_id", parsed.data.mentorId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (adaDulu) {
    return NextResponse.json({ data: { id: adaDulu.id } });
  }

  const { data: baru, error } = await supabase
    .from("percakapan")
    .insert({ mentor_id: parsed.data.mentorId, customer_id: user.id })
    .select("id")
    .single();

  if (error) {
    // 23505 = balapan dengan permintaan lain yang membuat percakapan sama.
    if (error.code === "23505") {
      const { data: lagi } = await supabase
        .from("percakapan")
        .select("id")
        .eq("mentor_id", parsed.data.mentorId)
        .eq("customer_id", user.id)
        .maybeSingle();
      if (lagi) return NextResponse.json({ data: { id: lagi.id } });
    }
    console.error("[chat] gagal membuka percakapan:", error);
    return NextResponse.json(
      { error: "Gagal membuka percakapan." },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: baru });
}
