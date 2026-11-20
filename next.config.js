/**
 * Header keamanan dasar untuk semua halaman.
 * CSP belum dipasang: popup Midtrans Snap, font, dan gambar Supabase butuh
 * daftar sumber yang diuji di Production dulu agar pembayaran tidak rusak.
 */
const securityHeaders = [
  // Cegah halaman dibingkai situs lain (clickjacking). Snap Midtrans membingkai
  // halaman Midtrans di dalam situs kita, bukan sebaliknya, jadi tetap aman.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Jangan umumkan versi framework ke penyerang.
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
