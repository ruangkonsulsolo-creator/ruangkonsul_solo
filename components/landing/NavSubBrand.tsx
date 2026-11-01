import Link from "next/link";
import Image from "next/image";

/**
 * Empat lini Ruang Konsul Solo, ditampilkan sebagai logo yang bisa diklik.
 *
 * Logonya berlatar putih, jadi tiap logo duduk di dalam kartu putih —
 * di atas latar brand-50 yang merah muda, logo tanpa kartu akan terlihat
 * seperti kotak putih yang menempel sembarangan.
 *
 * `aktif` menandai lini halaman yang sedang dibuka: kartunya diberi garis
 * tepi brand dan ditandai aria-current, supaya pengunjung tahu posisinya
 * tanpa harus menebak dari logo yang mirip satu sama lain.
 */

export type LiniBrand = "merch" | "service" | "news" | "events";

const LINI: {
  kunci: LiniBrand;
  nama: string;
  logo: string;
  href: string;
}[] = [
  { kunci: "merch",   nama: "RK Merch",   logo: "/sub-brand/rk-merch.png",   href: "/merchandise" },
  { kunci: "service", nama: "RK Service", logo: "/sub-brand/rk-service.png", href: "/layanan" },
  { kunci: "news",    nama: "RK News",    logo: "/sub-brand/rk-news.png",    href: "/blog" },
  { kunci: "events",  nama: "RK Events",  logo: "/sub-brand/rk-events.png",  href: "/event" },
];

export function NavSubBrand({ aktif }: { aktif?: LiniBrand }) {
  return (
    <nav aria-label="Lini Ruang Konsul Solo">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {LINI.map((l) => {
          const ini = l.kunci === aktif;
          return (
            <li key={l.kunci}>
              <Link
                href={l.href}
                aria-current={ini ? "page" : undefined}
                className={`flex items-center justify-center rounded-2xl border-2 bg-white p-3 transition-all sm:p-4 ${
                  ini
                    ? "border-brand shadow-card"
                    : "border-slate-200 hover:border-brand hover:shadow-card"
                }`}
              >
                <Image
                  src={l.logo}
                  alt={l.nama}
                  width={512}
                  height={512}
                  sizes="(min-width: 640px) 160px, 40vw"
                  className="h-20 w-20 object-contain sm:h-24 sm:w-24"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
