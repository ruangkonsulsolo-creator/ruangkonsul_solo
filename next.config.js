/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").host;
  } catch {
    return "*.supabase.co";
  }
})();

// Domain Midtrans Snap (popup pembayaran, 3DS kartu, e-wallet) — sesuai rekomendasi Midtrans
const MIDTRANS = [
  "https://*.midtrans.com",
  "https://*.veritrans.co.id",
  "https://*.mdtrns.com",
  "https://*.gopay.co.id",
  "https://*.cardinalcommerce.com",
];

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' dibutuhkan script inline Next.js (tanpa nonce); 'unsafe-eval' hanya saat dev
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} ${MIDTRANS.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} ${MIDTRANS.join(" ")}`,
  `frame-src 'self' ${MIDTRANS.join(" ")}`,
  `form-action 'self' ${MIDTRANS.join(" ")}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
]
  .join("; ")
  .replace(/\s+/g, " ");

const securityHeaders = [
  // CSP_REPORT_ONLY=true → hanya laporan di console (untuk uji awal tanpa memblokir apa pun)
  { key: process.env.CSP_REPORT_ONLY === "true" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // allow-popups: beberapa e-wallet di Snap membuka jendela baru
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig = {
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
    return [
      { source: "/:path*", headers: securityHeaders },
      // Respons API tidak boleh di-cache browser/proxy (berisi data pribadi)
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

module.exports = nextConfig;
