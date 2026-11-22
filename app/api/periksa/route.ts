import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  hitungBiaya,
  hitungKata,
  MAKS_KATA,
  MIN_KATA,
  type HasilPeriksa,
} from "@/lib/periksa/types";
import {
  ambilPenyedia,
  PenyediaBelumSiap,
  susunSaran,
} from "@/lib/periksa/penyedia";
import { ambilTarifPeriksa } from "@/lib/periksa/tarif";
import { persenBerubah } from "@/lib/periksa/persen-berubah";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({
  teks: z.string().min(1),
  jenis: z.enum(["kemiripan", "ai", "parafrase"]),
});

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Data tidak terbaca." }, { status: 400 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data belum lengkap." }, { status: 422 });
  }

  const { teks, jenis } = parsed.data;

  // Jumlah kata dan biaya dihitung ULANG di server. Angka dari klien tidak
  // dipercaya: kalau biaya dikirim dari browser, siapa pun bisa memeriksa
  // naskah 20.000 kata dengan tarif satu rupiah lewat curl.
  const jumlahKata = hitungKata(teks);

  if (jumlahKata < MIN_KATA) {
    return NextResponse.json(
      { error: `Teks terlalu pendek. Minimal ${MIN_KATA} kata agar hasilnya berarti.` },
      { status: 422 }
    );
  }
  if (jumlahKata > MAKS_KATA) {
    return NextResponse.json(
      {
        error:
          `Teks melebihi ${MAKS_KATA.toLocaleString("id-ID")} kata. ` +
          `Kirim per bab supaya hasilnya lebih mudah ditindaklanjuti.`,
      },
      { status: 422 }
    );
  }

  // Tarif dari Admin > Tarif Pemeriksaan (per 1.000 kata), bukan dari klien.
  const { tarif, aktif, minimum } = await ambilTarifPeriksa();
  if (!aktif[jenis]) {
    return NextResponse.json(
      { error: "Layanan ini sedang dinonaktifkan admin. Coba jenis pemeriksaan lain." },
      { status: 409 }
    );
  }
  const biaya = hitungBiaya(jumlahKata, jenis, tarif, minimum);
  // Tamu (sesi anonymous) boleh memakai layanan pemeriksa.
  const supabase = createClient({ tamu: true });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Masuk dulu untuk memeriksa naskah.", action: "login" },
      { status: 401 }
    );
  }

  // Penyedia dicek sebelum saldo dipotong: tidak ada gunanya memotong saldo
  // lalu mengembalikannya sedetik kemudian.
  let penyedia;
  try {
    penyedia = ambilPenyedia();
  } catch (e) {
    if (e instanceof PenyediaBelumSiap) {
      return NextResponse.json(
        {
          error:
            "Pemeriksaan naskah belum aktif. Hubungi admin lewat WhatsApp " +
            "untuk sementara waktu.",
          action: "belum_aktif",
        },
        { status: 503 }
      );
    }
    throw e;
  }

  // Naskah tidak disimpan; yang disimpan sidik jarinya saja.
  const sidik = createHash("sha256").update(teks).digest("hex");
  const cuplikan = teks.trim().slice(0, 200);

  const { data: idPemeriksaan, error: eMulai } = await supabase.rpc(
    "mulai_pemeriksaan",
    {
      p_jenis: jenis,
      p_jumlah_kata: jumlahKata,
      p_biaya: biaya,
      p_cuplikan: cuplikan,
      p_sidik: sidik,
    }
  );

  if (eMulai) {
    // P0001 dipakai fungsi untuk saldo kurang.
    if (eMulai.code === "P0001" || eMulai.message?.includes("Saldo tidak cukup")) {
      const { data: pr } = await supabase.from("profiles").select("credit_balance").eq("id", user.id).maybeSingle();
      const saldo = Number(pr?.credit_balance ?? 0);
      return NextResponse.json(
        {
          error: `Saldo kreditmu belum cukup. Pemeriksaan ini butuh Rp${biaya.toLocaleString("id-ID")}.`,
          action: "isi_saldo",
          biaya,
          saldo,
          kurang: Math.max(0, biaya - saldo),
        },
        { status: 402 }
      );
    }
    console.error("[periksa] gagal memulai:", eMulai);
    return NextResponse.json(
      { error: "Gagal memulai pemeriksaan. Coba lagi sebentar lagi." },
      { status: 500 }
    );
  }

  try {
    const kemiripan =
      jenis === "kemiripan" ? await penyedia.kemiripan(teks) : undefined;
    const ai = jenis === "ai" ? await penyedia.ai(teks) : undefined;
    const parafraseMentah =
      jenis === "parafrase" ? await penyedia.parafrase(teks) : undefined;
    const parafrase = parafraseMentah
      ? { ...parafraseMentah, persenBerubah: persenBerubah(teks, parafraseMentah.teks) }
      : undefined;

    // Nama mesin yang benar-benar dipakai (untuk laporan PDF), bukan "gabungan".
    const PROFIL_AI: Record<string, string> = { gptzero: "GPTZero", zerogpt: "ZeroGPT" };
    const namaMesin =
      penyedia.nama !== "gabungan"
        ? penyedia.nama
        : jenis === "ai"
          ? PROFIL_AI[(process.env.PERIKSA_PENYEDIA_AI ?? "").toLowerCase()] ?? "Detektor AI"
          : jenis === "parafrase"
            ? "Model bahasa AI"
            : process.env.KEMIRIPAN_NAMA ?? "Mesin kemiripan";

    const hasil: HasilPeriksa = {
      id: idPemeriksaan as string,
      jumlahKata,
      jenis,
      biaya,
      kemiripan,
      ai,
      parafrase,
      saran: susunSaran(jenis, kemiripan, ai, parafrase),
      diperiksaPada: new Date().toISOString(),
      penyedia: namaMesin,
    };

    await supabase.rpc("selesaikan_pemeriksaan", {
      p_id: idPemeriksaan,
      p_hasil: hasil,
      p_penyedia: namaMesin,
    });

    return NextResponse.json({ data: hasil });
  } catch (e) {
    // Saldo dikembalikan oleh selesaikan_pemeriksaan saat ada pesan galat.
    const pesan = e instanceof Error ? e.message : "Penyedia tidak merespons.";
    console.error("[periksa] penyedia gagal:", pesan);

    await supabase.rpc("selesaikan_pemeriksaan", {
      p_id: idPemeriksaan,
      p_hasil: null,
      p_penyedia: penyedia.nama,
      p_galat: pesan.slice(0, 500),
    });

    return NextResponse.json(
      {
        error:
          "Pemeriksaan gagal di sisi penyedia. Saldomu sudah dikembalikan " +
          "sepenuhnya — tidak ada yang terpotong.",
      },
      { status: 502 }
    );
  }
}
