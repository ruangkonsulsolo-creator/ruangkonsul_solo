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
    <span className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-2 border-brand lg:h-32 lg:w-32">
      <Image
        src={LOGO[lini]}
        alt=""
        width={512}
        height={512}
        sizes="128px"
        priority
        className="h-16 w-16 object-contain lg:h-[4.75rem] lg:w-[4.75rem]"
      />
    </span>
  );
}
