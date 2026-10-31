import Image from "next/image";
import { Star } from "lucide-react";

/**
 * Deretan logo kampus + rating, mengikuti pola bukti sosial yang lazim di
 * situs jasa akademik.
 *
 * Penting soal penulisannya: logo kampus di sini menerangkan ASAL peserta,
 * bukan kemitraan atau dukungan resmi. Logo universitas adalah merek
 * terdaftar, dan memajangnya tanpa keterangan mudah dibaca sebagai klaim
 * kerja sama yang tidak ada. Label "Peserta kami berasal dari" menjaga
 * maksudnya tetap jujur. Jangan ganti jadi "partner", "bekerja sama
 * dengan", atau sejenisnya tanpa perjanjian tertulis dari kampusnya.
 */

const KAMPUS = [
  { nama: "Universitas Indonesia", file: "/kampus/ui.png" },
  { nama: "Universitas Gadjah Mada", file: "/kampus/ugm.png" },
  { nama: "Institut Teknologi Bandung", file: "/kampus/itb.png" },
  { nama: "Universitas Airlangga", file: "/kampus/unair.png" },
  { nama: "Universitas Brawijaya", file: "/kampus/ub.png" },
  { nama: "Universitas Sebelas Maret", file: "/kampus/uns.png" },
];

export function LogoKampus({
  jumlahPeserta = "10.000+",
  rating = "4,9",
}: {
  jumlahPeserta?: string;
  rating?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      {/* Logo bertumpuk */}
      <ul className="flex -space-x-3">
        {KAMPUS.map((k) => (
          <li
            key={k.nama}
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-white shadow-card"
            title={k.nama}
          >
            <Image
              src={k.file}
              alt={k.nama}
              width={44}
              height={44}
              className="h-9 w-9 object-contain"
            />
          </li>
        ))}
      </ul>

      <div className="text-center sm:text-left">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <span className="flex" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
            ))}
          </span>
          <span className="text-lg font-extrabold text-slate-900">
            {rating}/5
          </span>
        </div>
        <p className="mt-0.5 text-sm font-bold text-slate-700">
          Dipercaya {jumlahPeserta} Peserta
        </p>
        <p className="text-xs font-medium text-slate-500">
          Peserta kami berasal dari berbagai kampus di Indonesia
        </p>
      </div>
    </div>
  );
}
