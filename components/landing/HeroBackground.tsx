"use client";

/**
 * HeroBackground — Silhouette burung kolibri yang bergerak di background hero section.
 * Pure CSS animation, zero dependencies, accessible (aria-hidden).
 */
export function HeroBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* ── Subtle radial glow kiri ── */}
      <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-brand/5 blur-3xl" />
      <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-brand/4 blur-2xl" />

      {/* ── Silhouette 1 — besar, latar (lambat, transparan) ── */}
      <svg
        className="absolute left-[2%] top-[8%] w-52 lg:w-72 opacity-[0.06] animate-bird-drift-1"
        viewBox="0 0 200 200"
        fill="currentColor"
        style={{ color: "#8B0000" }}
      >
        <KolibriPath />
      </svg>

      {/* ── Silhouette 2 — sedang, tengah kiri ── */}
      <svg
        className="absolute left-[8%] top-[45%] w-28 lg:w-40 opacity-[0.09] animate-bird-drift-2"
        viewBox="0 0 200 200"
        fill="currentColor"
        style={{ color: "#8B0000", transform: "scaleX(-1)" }}
      >
        <KolibriPath />
      </svg>

      {/* ── Silhouette 3 — kecil, pojok kiri bawah ── */}
      <svg
        className="absolute left-[18%] bottom-[10%] w-16 lg:w-24 opacity-[0.07] animate-bird-drift-3"
        viewBox="0 0 200 200"
        fill="currentColor"
        style={{ color: "#8B0000" }}
      >
        <KolibriPath />
      </svg>

      {/* ── Silhouette 4 — sangat kecil, atas tengah ── */}
      <svg
        className="absolute left-[35%] top-[5%] w-10 lg:w-14 opacity-[0.05] animate-bird-drift-4"
        viewBox="0 0 200 200"
        fill="currentColor"
        style={{ color: "#8B0000", transform: "scaleX(-1) rotate(-15deg)" }}
      >
        <KolibriPath />
      </svg>

      {/* ── Silhouette 5 — medium, kanan atas (terlihat sedikit) ── */}
      <svg
        className="absolute right-[5%] top-[12%] w-20 lg:w-28 opacity-[0.04] animate-bird-drift-2"
        viewBox="0 0 200 200"
        fill="currentColor"
        style={{ color: "#8B0000", transform: "rotate(10deg)" }}
      >
        <KolibriPath />
      </svg>

      {/* ── Dot pattern subtle ── */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, #8B0000 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <style>{`
        @keyframes birdDrift1 {
          0%   { transform: translateY(0px) translateX(0px) rotate(0deg); }
          25%  { transform: translateY(-18px) translateX(8px) rotate(3deg); }
          50%  { transform: translateY(-8px) translateX(14px) rotate(-2deg); }
          75%  { transform: translateY(-22px) translateX(4px) rotate(4deg); }
          100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
        }
        @keyframes birdDrift2 {
          0%   { transform: scaleX(-1) translateY(0px) rotate(0deg); }
          30%  { transform: scaleX(-1) translateY(-14px) translateX(-6px) rotate(-3deg); }
          60%  { transform: scaleX(-1) translateY(-20px) translateX(4px) rotate(2deg); }
          100% { transform: scaleX(-1) translateY(0px) rotate(0deg); }
        }
        @keyframes birdDrift3 {
          0%   { transform: translateY(0px) rotate(0deg); }
          40%  { transform: translateY(-10px) translateX(5px) rotate(-5deg); }
          70%  { transform: translateY(-6px) translateX(-3px) rotate(3deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes birdDrift4 {
          0%   { transform: scaleX(-1) rotate(-15deg) translateY(0px); }
          50%  { transform: scaleX(-1) rotate(-10deg) translateY(-12px) translateX(5px); }
          100% { transform: scaleX(-1) rotate(-15deg) translateY(0px); }
        }
        .animate-bird-drift-1 {
          animation: birdDrift1 9s ease-in-out infinite;
        }
        .animate-bird-drift-2 {
          animation: birdDrift2 11s ease-in-out infinite;
        }
        .animate-bird-drift-3 {
          animation: birdDrift3 7s ease-in-out infinite;
          animation-delay: 1.5s;
        }
        .animate-bird-drift-4 {
          animation: birdDrift4 13s ease-in-out infinite;
          animation-delay: 3s;
        }
      `}</style>
    </div>
  );
}

/**
 * Path SVG kolibri — sesuai bentuk logo Kalibri (stilisasi kolibri terbang).
 * Kombinasi beberapa path untuk sayap, ekor, dan tubuh.
 */
function KolibriPath() {
  return (
    <>
      {/* Tubuh utama */}
      <ellipse cx="105" cy="105" rx="22" ry="12" transform="rotate(-35 105 105)" />

      {/* Kepala */}
      <circle cx="128" cy="84" r="11" />

      {/* Paruh panjang kolibri */}
      <path d="M136 80 L172 68 L138 82 Z" />

      {/* Sayap atas — melebar */}
      <path d="M100 98 C80 70 40 55 15 62 C40 65 65 75 85 95 Z" />
      <path d="M98 100 C78 80 50 72 28 78 C50 78 72 85 92 100 Z" />

      {/* Sayap bawah tipis */}
      <path d="M102 108 C88 128 65 138 42 132 C62 126 82 116 98 108 Z" />

      {/* Ekor bercabang kolibri */}
      <path d="M85 112 C70 125 55 145 48 165 C62 148 72 130 86 114 Z" />
      <path d="M88 114 C80 130 75 152 72 172 C80 152 84 132 90 115 Z" />
      <path d="M92 113 C92 132 96 154 100 174 C97 153 94 132 93 114 Z" />
    </>
  );
}
