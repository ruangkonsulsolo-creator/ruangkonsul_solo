/** @type {import('tailwindcss').Config} */

/**
 * Sistem desain Ruang Konsul Solo.
 *
 * Konsep: draf skripsi yang sudah diberi tanda koreksi pembimbing.
 * Halaman berperilaku seperti dokumen yang tertata — margin kiri membawa
 * anotasi (status, harga, nomor sesi), badan halaman membawa isi.
 *
 * Aturan yang ditegakkan sistem ini:
 *   - Merah koreksi dipakai sebagai TANDA, tidak pernah sebagai background
 *     besar. Begitu dia jadi hamparan, dia berhenti berarti "perhatikan ini".
 *   - Tidak ada gradient. Tiga preset gradient 135deg di versi lama adalah
 *     penanda paling kentara halaman buatan generator.
 *   - Radius kecil. Manuskrip tidak membulat.
 */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Netral: kertas fotokopi, bukan krem hangat ── */
        paper: {
          DEFAULT: "#EFF1F0",
          raised:  "#F7F8F7", // kartu & panel yang naik dari kertas
          sunken:  "#E4E7E5", // bidang yang masuk ke dalam
          edge:    "#D3D8D5", // garis pembatas
        },

        /* ── Tinta: hitam kehijauan, bukan abu netral ── */
        ink: {
          DEFAULT: "#141A17",
          soft:    "#3D4642", // teks sekunder
          faint:   "#6B7571", // keterangan, placeholder
          ghost:   "#9AA39F", // teks nonaktif
        },

        /* ── Merah koreksi: tanda, bukan hamparan ── */
        koreksi: {
          DEFAULT: "#C8322C",
          deep:    "#9B2420", // teks di atas kertas, kontras AA
          wash:    "#F6E3E1", // latar paling tipis, untuk highlight baris
        },

        /* ── Hijau: slot tersedia, sesi selesai, pembayaran lunas ── */
        setuju: {
          DEFAULT: "#3F6B52",
          deep:    "#2C4C3A",
          wash:    "#E2EBE5",
        },

        /* ── Kuning tanda: menunggu konfirmasi, jadwal hampir tiba ── */
        tunda: {
          DEFAULT: "#A87417",
          deep:    "#7A540F",
          wash:    "#F4EBD6",
        },
      },

      fontFamily: {
        /* Literata — dirancang untuk membaca panjang, punya karakter tanpa
           jadi serif display yang genit. Judul dan paragraf editorial. */
        serif: ["var(--font-literata)", "Georgia", "serif"],
        /* Archivo — grotesk dengan lebar ketat; menolong untuk kata Indonesia
           yang panjang seperti "Pembayaran" dan "Bimbingan" di kolom sempit. */
        sans: ["var(--font-archivo)", "system-ui", "sans-serif"],
      },

      /**
       * Skala tipe modular, rasio 1.25 (major third), basis 16px.
       * line-height ditulis eksplisit agar tidak mengandalkan default Tailwind
       * yang terlalu longgar untuk teks UI padat.
       */
      fontSize: {
        "2xs":    ["0.6875rem", { lineHeight: "1rem",     letterSpacing: "0.01em" }],
        xs:       ["0.75rem",   { lineHeight: "1.125rem", letterSpacing: "0.005em" }],
        sm:       ["0.875rem",  { lineHeight: "1.375rem" }],
        base:     ["1rem",      { lineHeight: "1.625rem" }],
        lg:       ["1.125rem",  { lineHeight: "1.75rem" }],
        xl:       ["1.375rem",  { lineHeight: "1.875rem", letterSpacing: "-0.01em" }],
        "2xl":    ["1.75rem",   { lineHeight: "2.125rem", letterSpacing: "-0.015em" }],
        "3xl":    ["2.1875rem", { lineHeight: "2.5rem",   letterSpacing: "-0.02em" }],
        "4xl":    ["2.75rem",   { lineHeight: "3rem",     letterSpacing: "-0.025em" }],
        "5xl":    ["3.4375rem", { lineHeight: "3.625rem", letterSpacing: "-0.03em" }],
      },

      borderRadius: {
        none: "0",
        sm:   "2px",
        DEFAULT: "3px",
        md:   "4px",
        lg:   "6px",
        /* Hanya untuk avatar dan pil status. */
        full: "9999px",
      },

      spacing: {
        /* Lebar rail margin kiri — perangkat struktural utama. */
        rail: "4.5rem",
        "rail-lg": "7rem",
      },

      maxWidth: {
        /* Panjang baris di bawah 80 karakter untuk teks panjang. */
        prose: "68ch",
        measure: "58ch",
      },

      boxShadow: {
        /* Satu bayangan, dipakai hemat. Bukan shadow abu seragam di tiap
           kartu — itu tampilan kit SaaS. */
        lift: "0 1px 0 0 #D3D8D5, 0 2px 8px -4px rgba(20,26,23,0.12)",
        none: "none",
      },

      keyframes: {
        /* Satu-satunya animasi non-interaksi: tanda koreksi yang tergores
           masuk saat slot dipilih. Dipakai sekali, bukan di tiap bagian. */
        strike: {
          "0%":   { transform: "scaleX(0)", transformOrigin: "left" },
          "100%": { transform: "scaleX(1)", transformOrigin: "left" },
        },
      },
      animation: {
        strike: "strike 180ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
