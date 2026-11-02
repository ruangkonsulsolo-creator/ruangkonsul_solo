import Image from "next/image";

/**
 * Ikon lini Ruang Konsul Solo, dipasang di atas judul halaman.
 *
 * Satu halaman menampilkan satu ikon saja — ikonnya menandai halaman itu
 * sendiri, bukan daftar pilihan, jadi tidak bisa diklik dan tidak
 * mengarah ke mana-mana.
 *
 * Berkas PNG-nya berlatar transparan. Logo aslinya berlatar putih; kalau
 * dipakai apa adanya, di atas hero yang merah muda akan terlihat sebagai
 * kotak putih.
 *
 * alt dikosongkan dengan sengaja: nama lininya sudah tertulis di dalam
 * gambar dan diulang di judul halaman tepat di bawahnya, jadi pembaca
 * layar tidak perlu mendengarnya tiga kali.
 */

export type LiniBrand = "merch" | "service" | "news" | "events";

const LOGO: Record<LiniBrand, string> = {
  merch: "/sub-brand/rk-merch.png",
  service: "/sub-brand/rk-service.png",
  news: "/sub-brand/rk-news.png",
  events: "/sub-brand/rk-events.png",
};

export function IkonLini({ lini }: { lini: LiniBrand }) {
  return (
    <Image
      src={LOGO[lini]}
      alt=""
      width={512}
      height={512}
      sizes="160px"
      priority
      className="mx-auto h-28 w-28 object-contain lg:h-32 lg:w-32"
    />
  );
}
