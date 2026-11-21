import { NotifTestimoni } from "@/components/landing/NotifTestimoni";

/**
 * Pembungkus semua halaman publik.
 *
 * Dibuat supaya notifikasi testimoni cukup dipasang sekali, bukan ditempel
 * satu per satu di enam belas halaman — yang berarti enam belas tempat yang
 * bisa ketinggalan saat ada perubahan.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <NotifTestimoni />
    </>
  );
}
