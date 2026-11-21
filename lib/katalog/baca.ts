import { createClient } from "@/lib/supabase/server";
import { fotoDariFolder } from "@/lib/katalog/foto";
import {
  KOLOM_ETALASE,
  KOLOM_KATEGORI,
  KOLOM_PRODUK,
  type Etalase,
  type Kategori,
  type Produk,
} from "@/lib/katalog/tipe";

/**
 * Pembacaan katalog untuk halaman publik.
 *
 * Semua fungsi di sini memakai klien anon, jadi RLS yang menyaring: yang
 * nonaktif tidak akan ikut terbaca. Tidak perlu lagi menambahkan
 * .eq("is_active", true) di setiap pemanggilan — dan kalau ditambahkan pun
 * tidak salah, cuma mubazir.
 *
 * Kalau tabelnya belum ada (migration 029 belum dijalankan), Supabase
 * menjawab galat dan fungsi-fungsi ini mengembalikan daftar kosong, bukan
 * melempar. Halaman tetap tampil dengan keadaan kosong yang jujur, tidak
 * berubah jadi layar galat.
 */

type IsiEtalase = {
  etalase: Etalase | null;
  kategori: Kategori[];
  produk: Produk[];
};

const KOSONG: IsiEtalase = { etalase: null, kategori: [], produk: [] };

function rapikan(baris: Record<string, unknown>[]): Produk[] {
  return baris.map((b) => {
    const gambar = Array.isArray(b.gambar) ? (b.gambar as string[]) : [];
    return {
      ...b,
      spesifikasi: Array.isArray(b.spesifikasi) ? b.spesifikasi : [],
      fitur: Array.isArray(b.fitur) ? b.fitur : [],
      // Kolom "Foto" di panel admin menang. Kalau kosong, folder
      // /public/produk/<slug>/ dipakai. Penggabungannya di sini, bukan di
      // tiap halaman, supaya kartu di daftar dan halaman detail tidak bisa
      // lagi menampilkan foto yang berbeda.
      gambar: gambar.length > 0 ? gambar : fotoDariFolder(b.slug as string),
    };
  }) as Produk[];
}

/** Satu etalase beserta kategori dan produknya, sudah urut. */
export async function ambilEtalase(slug: string): Promise<IsiEtalase> {
  const supabase = createClient();

  const { data: etalase, error } = await supabase
    .from("etalase")
    .select(KOLOM_ETALASE)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !etalase) return KOSONG;

  const [kategoriRes, produkRes] = await Promise.all([
    supabase
      .from("kategori_produk")
      .select(KOLOM_KATEGORI)
      .eq("etalase_id", etalase.id)
      .order("urutan"),
    supabase
      .from("produk")
      .select(KOLOM_PRODUK)
      .eq("etalase_id", etalase.id)
      .order("urutan"),
  ]);

  return {
    etalase: etalase as Etalase,
    kategori: (kategoriRes.data ?? []) as Kategori[],
    produk: rapikan(produkRes.data ?? []),
  };
}

/** Produk dari beberapa etalase sekaligus, untuk beranda. */
export async function ambilProdukEtalase(
  slugEtalase: string[]
): Promise<Produk[]> {
  const supabase = createClient();

  const { data: etalase } = await supabase
    .from("etalase")
    .select("id, slug")
    .in("slug", slugEtalase);

  if (!etalase || etalase.length === 0) return [];

  const { data } = await supabase
    .from("produk")
    .select(KOLOM_PRODUK)
    .in(
      "etalase_id",
      etalase.map((e) => e.id as string)
    )
    .order("urutan");

  return rapikan(data ?? []);
}

/** Satu produk lewat slug-nya. */
export async function ambilProduk(slug: string): Promise<Produk | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("produk")
    .select(KOLOM_PRODUK)
    .eq("slug", slug)
    .maybeSingle();
  return data ? rapikan([data])[0] : null;
}

/** Produk lain di kategori yang sama, untuk bagian "Lainnya". */
export async function ambilSekategori(
  kategoriId: string | null,
  kecualiSlug: string,
  batas = 4
): Promise<Produk[]> {
  if (!kategoriId) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("produk")
    .select(KOLOM_PRODUK)
    .eq("kategori_id", kategoriId)
    .neq("slug", kecualiSlug)
    .order("urutan")
    .limit(batas);
  return rapikan(data ?? []);
}
