import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { wajibStaf } from "@/lib/auth/wajib-staf";

export const dynamic = "force-dynamic";

/**
 * Pengelolaan katalog: etalase, kategori, dan produk.
 *
 * Hak akses ditegakkan RLS (policy *_all_staff di migration 029), bukan
 * pemeriksaan peran di rute ini. Satu tempat penegakan lebih mudah dijaga
 * daripada dua yang bisa berbeda — dan rute yang memeriksa sendiri akan
 * tetap bisa ditembus lewat PostgREST kalau RLS-nya longgar, jadi RLS yang
 * harus benar, bukan rute ini.
 */

// ── Skema ──────────────────────────────────────────────────────────────────

const teks = (maks: number) => z.string().trim().max(maks);
const opsional = (maks: number) => teks(maks).nullable().optional();

const skemaEtalase = z.object({
  id: z.string().uuid().optional(),
  slug: teks(80).regex(/^[a-z0-9-]+$/, "Hanya huruf kecil, angka, dan tanda hubung."),
  nama: teks(120).min(2),
  deskripsi: opsional(500),
  ikon: opsional(40),
  urutan: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
});

const skemaKategori = z.object({
  id: z.string().uuid().optional(),
  etalase_id: z.string().uuid(),
  slug: teks(80).regex(/^[a-z0-9-]+$/, "Hanya huruf kecil, angka, dan tanda hubung."),
  nama: teks(120).min(2),
  urutan: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
});

const skemaProduk = z.object({
  id: z.string().uuid().optional(),
  etalase_id: z.string().uuid(),
  kategori_id: z.string().uuid().nullable().optional(),
  slug: teks(120).regex(/^[a-z0-9-]+$/, "Hanya huruf kecil, angka, dan tanda hubung."),
  nama: teks(200).min(2),
  subjudul: opsional(200),
  deskripsi: opsional(4000),
  spesifikasi: z
    .array(z.object({ label: teks(60).min(1), nilai: teks(200).min(1) }))
    .max(20)
    .optional(),
  fitur: z.array(teks(200).min(1)).max(30).optional(),
  harga: z.number().int().min(0).max(1_000_000_000),
  harga_coret: z.number().int().positive().max(1_000_000_000).nullable().optional(),
  harga_mulai: z.boolean().optional(),
  satuan: opsional(40),
  gambar: z.array(teks(500).min(1)).max(10).optional(),
  berat_gram: z.number().int().positive().max(100_000).nullable().optional(),
  stok: z.number().int().min(0).max(1_000_000).nullable().optional(),
  badge: opsional(40),
  catatan: opsional(500),
  wa_pesan: opsional(500),
  is_active: z.boolean().optional(),
  urutan: z.number().int().min(0).max(9999).optional(),
});

const skemaTestimoni = z.object({
  id: z.string().uuid().optional(),
  isi: teks(400).min(3),
  penulis: opsional(80),
  layanan: opsional(80),
  tautan: opsional(300),
  urutan: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
});

const TABEL = {
  etalase: "etalase",
  kategori: "kategori_produk",
  produk: "produk",
  testimoni: "testimoni",
} as const;

type Jenis = keyof typeof TABEL;

function jenisDari(nilai: string | null): Jenis | null {
  return nilai !== null && Object.prototype.hasOwnProperty.call(TABEL, nilai)
    ? (nilai as Jenis)
    : null;
}

/**
 * Menerjemahkan galat Postgres jadi kalimat yang berguna.
 *
 * Tanpa ini admin hanya melihat "Gagal menyimpan", lalu menebak-nebak.
 * Tiga galat di bawah ini yang paling sering muncul dan semuanya punya
 * jalan keluar yang jelas.
 */
function pesanGalat(kode: string | undefined, pesan: string): string | null {
  if (kode === "42501")
    return "Hanya admin yang bisa mengubah katalog.";
  if (kode === "23505")
    return "Slug itu sudah dipakai. Pakai slug lain.";
  if (kode === "23503" && pesan.includes("produk_etalase_id_fkey"))
    return "Etalase ini masih berisi produk. Pindahkan atau hapus produknya dulu.";
  if (kode === "23503")
    return "Masih ada data lain yang menunjuk ke baris ini.";
  if (kode === "23514")
    return "Ada nilai yang di luar batas (harga atau stok negatif, misalnya).";
  return null;
}

// ── Simpan (tambah atau edit) ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const jenis = jenisDari(request.nextUrl.searchParams.get("jenis"));
  if (!jenis)
    return NextResponse.json(
      { error: "Jenis harus etalase, kategori, produk, atau testimoni." },
      { status: 400 }
    );

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });
  const ditolak = await wajibStaf(supabase, user.id);
  if (ditolak) return ditolak;

  let mentah: unknown;
  try {
    mentah = await request.json();
  } catch {
    return NextResponse.json({ error: "Data tidak terbaca." }, { status: 400 });
  }

  const skema =
    jenis === "etalase"
      ? skemaEtalase
      : jenis === "kategori"
        ? skemaKategori
        : jenis === "testimoni"
          ? skemaTestimoni
          : skemaProduk;

  const hasil = skema.safeParse(mentah);
  if (!hasil.success) {
    return NextResponse.json(
      {
        error: "Ada isian yang belum benar.",
        rinci: hasil.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join(".")}: ${i.message}`),
      },
      { status: 422 }
    );
  }

  const { id, ...isi } = hasil.data as { id?: string } & Record<string, unknown>;

  const { error } = id
    ? await supabase.from(TABEL[jenis]).update(isi).eq("id", id)
    : await supabase.from(TABEL[jenis]).insert(isi);

  if (error) {
    const ramah = pesanGalat(error.code, error.message);
    if (ramah)
      return NextResponse.json({ error: ramah }, {
        status: error.code === "42501" ? 403 : 409,
      });
    console.error(`[katalog] gagal menyimpan ${jenis}:`, error);
    return NextResponse.json({ error: "Gagal menyimpan." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ── Hapus ──────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const jenis = jenisDari(request.nextUrl.searchParams.get("jenis"));
  const id = request.nextUrl.searchParams.get("id");

  if (!jenis || !id)
    return NextResponse.json(
      { error: "Jenis dan id wajib diisi." },
      { status: 400 }
    );

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });
  const ditolak = await wajibStaf(supabase, user.id);
  if (ditolak) return ditolak;

  // Etalase yang masih berisi produk ditolak oleh ON DELETE RESTRICT. Lebih
  // baik ditanyakan lebih dulu supaya pesannya menyebut jumlahnya, bukan
  // sekadar "gagal".
  if (jenis === "etalase") {
    const { count } = await supabase
      .from("produk")
      .select("id", { count: "exact", head: true })
      .eq("etalase_id", id);
    if (count && count > 0) {
      return NextResponse.json(
        {
          error:
            `Etalase ini masih berisi ${count} produk. Pindahkan atau hapus ` +
            `produknya dulu, baru etalasenya bisa dihapus.`,
        },
        { status: 409 }
      );
    }
  }

  const { error } = await supabase.from(TABEL[jenis]).delete().eq("id", id);

  if (error) {
    const ramah = pesanGalat(error.code, error.message);
    if (ramah)
      return NextResponse.json({ error: ramah }, {
        status: error.code === "42501" ? 403 : 409,
      });
    console.error(`[katalog] gagal menghapus ${jenis}:`, error);
    return NextResponse.json({ error: "Gagal menghapus." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
