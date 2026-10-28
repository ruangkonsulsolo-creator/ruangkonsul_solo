import type { Metadata } from "next";
import KalenderBooking from "@/components/booking/KalenderBooking";
import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Pesan jadwal bimbingan",
  description:
    "Pilih mentor dan jam yang cocok, lalu kerjakan tulisanmu dengan arahan yang jelas. " +
    "Sesi daring maupun tatap muka di Solo.",
};

export const dynamic = "force-dynamic";

type MentorRow = {
  id: string;
  display_name: string | null;
  bio: string | null;
  specializations: string[] | null;
  price_per_hour: number;
  experience_years: number;
  session_count: number;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default async function BookingPage() {
  const supabase = createClient();

  // Versi sebelumnya memfilter .eq("is_active", true) pada mentor_profiles,
  // kolom yang tidak ada di tabel itu. Error-nya ditelan try/catch kosong,
  // jadi daftar mentor selalu kosong tanpa ada yang menyadari. Kolom yang
  // benar adalah is_available, dan error sekarang dicatat.
  const { data, error } = await supabase
    .from("mentor_profiles")
    .select(
      "id, display_name, bio, specializations, price_per_hour, experience_years, session_count"
    )
    .eq("is_available", true)
    .order("session_count", { ascending: false });

  if (error) console.error("[booking] gagal memuat mentor:", error.message);

  const mentors = (data ?? []) as MentorRow[];

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-20">
      <header className="rail-layout">
        <p className="rail-note">Bimbingan</p>
        <div>
          <h1 className="max-w-prose text-3xl md:text-4xl">
            Pilih mentor dan jam yang cocok
          </h1>
          <p className="mt-4 max-w-measure text-lg text-ink-soft">
            Sesi satu jam, daring atau tatap muka di {BRAND.address.split(",")[0]}.
            Kamu yang menulis; mentor yang menunjukkan jalan keluar saat kamu
            buntu.
          </p>
        </div>
      </header>

      {mentors.length > 0 && (
        <section className="mt-14" aria-labelledby="mentor">
          <div className="rail-layout">
            <p className="rail-note" id="mentor">
              Mentor
            </p>
            <ul className="divide-y divide-paper-edge border-y border-paper-edge">
              {mentors.map((m) => (
                <li key={m.id} className="flex flex-wrap gap-x-6 gap-y-2 py-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold">
                      {m.display_name ?? "Mentor Ruang Konsul"}
                    </h2>
                    {m.specializations && m.specializations.length > 0 && (
                      <p className="mt-0.5 text-sm text-ink-faint">
                        {m.specializations.join(" · ")}
                      </p>
                    )}
                    {m.bio && (
                      <p className="mt-2 max-w-measure text-sm text-ink-soft">
                        {m.bio}
                      </p>
                    )}
                  </div>
                  <div className="text-sm">
                    <p data-numeric className="font-semibold">
                      {rupiah.format(m.price_per_hour)}
                      <span className="font-normal text-ink-faint"> / jam</span>
                    </p>
                    <p data-numeric className="mt-0.5 text-ink-faint">
                      {m.session_count} sesi selesai
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="mt-14" aria-labelledby="jadwal">
        <h2 id="jadwal" className="sr-only">
          Jadwal tersedia
        </h2>
        <KalenderBooking />
      </section>

      <aside className="rail-layout mt-16 border-t border-paper-edge pt-6">
        <p className="rail-note">Catatan</p>
        <p className="max-w-measure text-sm text-ink-soft">
          Bimbingan di Ruang Konsul berarti kamu dibimbing mengerjakan
          tulisanmu sendiri — mentor membantu menajamkan rumusan masalah,
          memilih metode, membaca draf, dan menyiapkanmu menghadapi sidang.
          Kalau yang kamu cari adalah naskah jadi, kami bukan tempatnya.
        </p>
      </aside>
    </main>
  );
}
