-- Migration: 029_katalog_terpadu
--
-- Satu katalog untuk semua yang dijual Ruang Konsul Solo.
--
-- Sebelum ini produk tersebar di empat tempat dengan empat bentuk berbeda:
-- services, quota_packages, kelas_bimbingan, dan merchandise. Lebih buruk
-- lagi, hampir semua halaman publik tidak membaca satu pun dari tabel itu —
-- daftar produknya ditulis langsung di berkas TypeScript. Jadi menambah satu
-- produk berarti menyunting kode dan deploy ulang, bukan pekerjaan admin.
--
-- Tiga tabel di bawah menggantikan semuanya:
--
--   etalase          — kelompok besar: Merchandise, Bimbingan Online, dll.
--   kategori_produk  — rak di dalam etalase: Buket Bunga, Buket Uang, dll.
--   produk           — barang atau jasa yang dijual.
--
-- Kategori sengaja dibuat sebagai baris tabel, bukan ENUM. kelas_bimbingan
-- memakai ENUM (kelas_tab) untuk kategorinya, dan akibatnya admin tidak bisa
-- menambah kategori baru tanpa migration. Nilai ENUM juga tidak bisa dipakai
-- di transaksi yang sama dengan saat ia ditambahkan, jadi menambahnya lewat
-- aplikasi pun berisiko. Baris tabel tidak punya dua masalah itu.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Etalase
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.etalase (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        UNIQUE NOT NULL,
  nama        TEXT        NOT NULL,
  deskripsi   TEXT,
  ikon        TEXT,                 -- nama ikon lucide-react, mis. "ShoppingBag"
  urutan      INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.etalase IS
  'Kelompok besar produk. Satu etalase = satu halaman katalog di situs.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Kategori
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.kategori_produk (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  etalase_id  UUID        NOT NULL REFERENCES public.etalase(id) ON DELETE CASCADE,
  slug        TEXT        NOT NULL,
  nama        TEXT        NOT NULL,
  urutan      INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (etalase_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_kategori_etalase
  ON public.kategori_produk(etalase_id, urutan);

-- Hapus etalase ikut menghapus kategorinya (ON DELETE CASCADE di atas), tapi
-- tidak boleh ikut menghapus produknya diam-diam — lihat produk.etalase_id.

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Produk
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.produk (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  etalase_id     UUID        NOT NULL REFERENCES public.etalase(id) ON DELETE RESTRICT,
  kategori_id    UUID        REFERENCES public.kategori_produk(id) ON DELETE SET NULL,

  slug           TEXT        UNIQUE NOT NULL,
  nama           TEXT        NOT NULL,
  subjudul       TEXT,
  deskripsi      TEXT,

  -- [{"label": "Panjang", "nilai": "±9 cm"}, ...]
  spesifikasi    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  fitur          TEXT[]      NOT NULL DEFAULT '{}',

  harga          INTEGER     NOT NULL DEFAULT 0 CHECK (harga >= 0),
  harga_coret    INTEGER     CHECK (harga_coret IS NULL OR harga_coret > 0),
  -- true -> tampil "mulai dari Rp…", untuk produk yang harganya mengikuti
  -- isi pesanan (buket snack, misalnya).
  harga_mulai    BOOLEAN     NOT NULL DEFAULT false,
  satuan         TEXT,                  -- "per jam", "per bulan", "per sesi"

  gambar         TEXT[]      NOT NULL DEFAULT '{}',
  berat_gram     INTEGER     CHECK (berat_gram IS NULL OR berat_gram > 0),
  -- NULL = dibuat setelah dipesan (tidak ada stok siap kirim)
  stok           INTEGER     CHECK (stok IS NULL OR stok >= 0),

  badge          TEXT,                  -- "Best Seller", "Populer"
  catatan        TEXT,                  -- peringatan kecil di halaman produk
  wa_pesan       TEXT,                  -- teks WhatsApp yang sudah terisi

  is_active      BOOLEAN     NOT NULL DEFAULT true,
  urutan         INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_produk_etalase
  ON public.produk(etalase_id, urutan);
CREATE INDEX IF NOT EXISTS idx_produk_kategori
  ON public.produk(kategori_id);
CREATE INDEX IF NOT EXISTS idx_produk_aktif
  ON public.produk(is_active, urutan);

-- ON DELETE RESTRICT di etalase_id disengaja. Menghapus etalase yang masih
-- berisi produk akan ditolak, bukan diam-diam menghapus 23 produk bersamanya.
-- Panel admin menangkap penolakan itu dan memberi tahu berapa produk yang
-- harus dipindah atau dihapus lebih dulu.

COMMENT ON COLUMN public.produk.harga_mulai IS
  'true -> harga tampil sebagai "mulai dari", bukan harga pasti.';
COMMENT ON COLUMN public.produk.stok IS
  'NULL berarti dibuat setelah dipesan; 0 berarti habis.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. updated_at
-- ═══════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS etalase_updated_at ON public.etalase;
CREATE TRIGGER etalase_updated_at
  BEFORE UPDATE ON public.etalase
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS kategori_produk_updated_at ON public.kategori_produk;
CREATE TRIGGER kategori_produk_updated_at
  BEFORE UPDATE ON public.kategori_produk
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS produk_updated_at ON public.produk;
CREATE TRIGGER produk_updated_at
  BEFORE UPDATE ON public.produk
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. RLS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Empat role, satu aturan sederhana:
--
--   native (belum login) -> baca yang aktif
--   user (customer)      -> baca yang aktif
--   mentor               -> baca yang aktif
--   admin / superadmin   -> baca semua, tulis semua
--
-- is_staff() dipakai, bukan subquery ke profiles. Subquery ke profiles di
-- dalam policy pernah membuat rekursi tak berujung (42P17) di proyek ini;
-- is_staff() SECURITY DEFINER memutus rantai itu.

ALTER TABLE public.etalase         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kategori_produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produk          ENABLE ROW LEVEL SECURITY;

-- Berkas ini harus aman dijalankan dua kali.
DROP POLICY IF EXISTS etalase_select_public  ON public.etalase;
DROP POLICY IF EXISTS etalase_all_staff      ON public.etalase;
DROP POLICY IF EXISTS kategori_select_public ON public.kategori_produk;
DROP POLICY IF EXISTS kategori_all_staff     ON public.kategori_produk;
DROP POLICY IF EXISTS produk_select_public   ON public.produk;
DROP POLICY IF EXISTS produk_all_staff       ON public.produk;

CREATE POLICY etalase_select_public ON public.etalase
  FOR SELECT USING (is_active = true OR public.is_staff());

CREATE POLICY etalase_all_staff ON public.etalase
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY kategori_select_public ON public.kategori_produk
  FOR SELECT USING (is_active = true OR public.is_staff());

CREATE POLICY kategori_all_staff ON public.kategori_produk
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY produk_select_public ON public.produk
  FOR SELECT USING (is_active = true OR public.is_staff());

CREATE POLICY produk_all_staff ON public.produk
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- RLS menyaring baris, bukan hak tabel. Tanpa GRANT di bawah, PostgREST
-- menolak lebih dulu dengan "permission denied for table" dan policy di atas
-- tidak pernah sempat dievaluasi.
GRANT SELECT ON public.etalase, public.kategori_produk, public.produk
  TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.etalase, public.kategori_produk, public.produk
  TO authenticated;
