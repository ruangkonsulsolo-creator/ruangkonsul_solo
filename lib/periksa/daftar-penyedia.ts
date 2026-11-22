/**
 * Penyedia yang dikenali, beserta logonya.
 *
 * ── ATURAN PENTING ────────────────────────────────────────────────────────
 *
 * Logo penyedia hanya tampil kalau penyedia itu BENAR-BENAR dipakai, yaitu
 * saat variabel lingkungannya disetel ke penyedia tersebut. Memasang logo
 * penyedia pada fitur yang sebenarnya dijalankan pihak lain adalah
 * menyesatkan pembeli — dia membayar mengira mendapat hasil dari merek itu
 * — dan menyiratkan kemitraan yang tidak ada.
 *
 * Karena itu kaitan logo ke penyedia dibuat otomatis lewat env, bukan
 * ditulis manual di komponen. Jangan mengakalinya dengan menaruh logo
 * langsung di antarmuka.
 *
 * Turnitin tidak ada dalam daftar ini dan tidak akan ditambahkan: Turnitin
 * tidak menjual akses API untuk layanan pihak ketiga, jadi tidak ada cara
 * sah membuat tombol di situs ini benar-benar menjalankan Turnitin.
 */

export type ProfilPenyedia = {
  kunci: string;
  nama: string;
  /** Berkas di /public/penyedia/, atau null kalau belum ada logonya. */
  logo: string | null;
  /** Untuk apa penyedia ini dipakai. */
  untuk: ("kemiripan" | "ai")[];
};

export const PENYEDIA_DIKENAL: Record<string, ProfilPenyedia> = {
  gptzero: {
    kunci: "gptzero",
    nama: "GPTZero",
    logo: "/penyedia/gptzero.png",
    untuk: ["ai"],
  },
  zerogpt: {
    kunci: "zerogpt",
    nama: "ZeroGPT",
    logo: null, // bukan GPTZero; taruh /public/penyedia/zerogpt.png kalau ada izin pakai logonya
    untuk: ["ai"],
  },
  copyleaks: {
    kunci: "copyleaks",
    nama: "Copyleaks",
    logo: null, // taruh /public/penyedia/copyleaks.png kalau dipakai
    untuk: ["kemiripan", "ai"],
  },
  winston: {
    kunci: "winston",
    nama: "Winston AI",
    logo: null,
    untuk: ["kemiripan", "ai"],
  },
  plagiarismcheck: {
    kunci: "plagiarismcheck",
    nama: "PlagiarismCheck.org",
    logo: null,
    untuk: ["kemiripan"],
  },
  originality: {
    kunci: "originality",
    nama: "Originality.ai",
    logo: null,
    untuk: ["kemiripan", "ai"],
  },
};

/**
 * Penyedia yang sedang aktif untuk tiap jenis pemeriksaan.
 *
 * Dibaca dari env supaya nilainya sama di server dan saat dirender, dan
 * supaya menggantinya tidak perlu menyentuh kode.
 */
export function penyediaAktif(jenis: "kemiripan" | "ai"): ProfilPenyedia | null {
  const kunci =
    jenis === "ai"
      ? process.env.NEXT_PUBLIC_PERIKSA_PENYEDIA_AI
      : process.env.NEXT_PUBLIC_PERIKSA_PENYEDIA_KEMIRIPAN;

  if (!kunci) return null;
  const profil = PENYEDIA_DIKENAL[kunci.toLowerCase()];
  if (!profil) return null;
  // Jaga-jaga kalau env disetel ke penyedia yang tidak melayani jenis itu.
  return profil.untuk.includes(jenis) ? profil : null;
}
