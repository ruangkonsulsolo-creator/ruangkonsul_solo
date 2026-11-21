"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatRupiah } from "@/lib/utils/format-currency";
import { WhatsAppField } from "@/components/payment/WhatsAppField";
import { openSnap, syncPaymentStatus } from "@/lib/payment/use-snap";

/**
 * Kalender pemilihan jadwal bimbingan.
 *
 * Semua jam ditampilkan dalam WIB dan diberi label eksplisit. Target pasarnya
 * Solo, Jogja, Jakarta dan Bekasi — semuanya WIB — tapi label tetap ditulis
 * supaya mahasiswa yang sedang di luar zona itu tidak salah hitung.
 */

type Slot = {
  slot_id: string;
  mentor_id: string;
  mentor_name: string | null;
  slot_date: string;
  slot_start: string;
  slot_end: string;
  price_per_hour: number;
};

type Hari = { date: string; slots: Slot[] };



const namaHari = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  timeZone: "Asia/Jakarta",
});
const tanggalPendek = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  timeZone: "Asia/Jakarta",
});
const tanggalPanjang = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Asia/Jakarta",
});

function parseTanggal(iso: string) {
  return new Date(`${iso}T00:00:00+07:00`);
}

/** "09:00:00" -> "09.00" (konvensi penulisan jam Indonesia) */
function jam(t: string) {
  return t.slice(0, 5).replace(":", ".");
}

type Paket = { id: string; nama: string; harga: number };

export default function KalenderBooking({
  mentorId,
  paket: paketAwal,
  pilihanPaket = [],
  tanggalAwal,
  slotAwal,
}: {
  mentorId?: string;
  /** Paket katalog per jam yang sudah dipilih (dari halaman produk). */
  paket?: Paket;
  /** Daftar paket per jam yang bisa dipilih di langkah konfirmasi. */
  pilihanPaket?: Paket[];
  tanggalAwal?: string;
  /** slot_id yang langsung dipilih (dari klik jam di halaman Jadwal). */
  slotAwal?: string;
}) {
  const [hari, setHari] = useState<Hari[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  const [tanggalAktif, setTanggalAktif] = useState<string | null>(null);
  const [slotTerpilih, setSlotTerpilih] = useState<Slot | null>(null);
  // "" = sesi umum (tarif mentor); selain itu id paket.
  const [paketId, setPaketId] = useState<string>(paketAwal?.id ?? "");
  const daftarPaket = useMemo(() => {
    const semua = [...pilihanPaket];
    if (paketAwal && !semua.some((p) => p.id === paketAwal.id)) semua.unshift(paketAwal);
    return semua;
  }, [pilihanPaket, paketAwal]);
  const paket = daftarPaket.find((p) => p.id === paketId);
  const hargaSesi = paket ? paket.harga : (slotTerpilih?.price_per_hour ?? 0);
  const [topik, setTopik] = useState("");
  const [catatan, setCatatan] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const [berhasil, setBerhasil] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [galatWa, setGalatWa] = useState<string | null>(null);

  const muatSlot = useCallback(async () => {
    setMemuat(true);
    setGalat(null);
    try {
      const params = new URLSearchParams({ days: "14" });
      if (mentorId) params.set("mentor_id", mentorId);

      const res = await fetch(`/api/booking/slots?${params}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? "Gagal memuat jadwal.");

      const days: Hari[] = json.days ?? [];
      setHari(days);
      setTanggalAktif((kini) => {
        const ada = (d?: string | null) => !!d && days.some((h) => h.date === d);
        if (ada(kini)) return kini;
        if (ada(tanggalAwal)) return tanggalAwal!;
        return days[0]?.date ?? null;
      });
      if (slotAwal) {
        const s = days.flatMap((h) => h.slots).find((x) => x.slot_id === slotAwal);
        if (s) {
          setTanggalAktif(s.slot_date);
          setSlotTerpilih((kini) => kini ?? s);
        }
      }
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal memuat jadwal.");
    } finally {
      setMemuat(false);
    }
  }, [mentorId, tanggalAwal, slotAwal]);

  useEffect(() => {
    void muatSlot();
  }, [muatSlot]);

  const slotHariIni = useMemo(
    () => hari.find((h) => h.date === tanggalAktif)?.slots ?? [],
    [hari, tanggalAktif]
  );

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (!slotTerpilih) return;

    setMengirim(true);
    setGalat(null);
    setGalatWa(null);

    try {
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: slotTerpilih.slot_id,
          mentor_id: slotTerpilih.mentor_id,
          topik,
          catatan: catatan.trim() || undefined,
          whatsapp,
          produk_id: paket?.id,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.action === "login") {
          window.location.href = `/login?next=${encodeURIComponent(
            `${window.location.pathname}${window.location.search}`
          )}`;
          return;
        }
        if (json.code === "WHATSAPP_REQUIRED") {
          setGalatWa(json.error);
          return;
        }
        if (json.action === "refresh_slots") {
          setSlotTerpilih(null);
          await muatSlot();
        }
        throw new Error(json.error ?? "Gagal menyimpan pesanan.");
      }

      // Sesi berbayar → buka Midtrans. Slot sudah dikunci untuk kita.
      if (json.data.snap_token) {
        const bookingId: string = json.data.id;
        const paymentId: string | undefined = json.data.payment_id;
        const outcome = await openSnap(json.data.snap_token);
        let status: string | null = outcome === "success" ? "paid" : null;
        if (outcome !== "closed") {
          for (let i = 0; i < 4 && status !== "paid"; i++) {
            const s = await syncPaymentStatus({ purpose: "booking", referenceId: bookingId });
            if (s && s !== "pending") { status = s; break; }
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
        window.location.href =
          status === "paid" && paymentId
            ? `/receipt/${paymentId}`
            : `/dashboard/sesi-saya?booking=${bookingId}`;
        return;
      }

      setBerhasil(json.data.booking_number);
      setSlotTerpilih(null);
      setTopik("");
      await muatSlot();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan pesanan.");
    } finally {
      setMengirim(false);
    }
  }

  if (berhasil) {
    return (
      <div className="grid gap-4 border border-brand-200 bg-brand-50 p-6">
        <p className="text-xs text-muted-foreground text-green-700">Tersimpan</p>
        <div>
          <h3 className="text-xl">Jadwalmu sudah masuk</h3>
          <p className="mt-2 max-w-xl text-slate-600">
            Nomor pesanan <span data-numeric className="font-medium text-slate-900">{berhasil}</span>.
            Admin akan mengonfirmasi lewat WhatsApp sebelum sesi dimulai, dan
            kamu akan diingatkan sehari sebelumnya.
          </p>
          <a
            href="/dashboard/sesi-saya"
            className="mt-4 inline-block border-b-2 border-brand pb-0.5 font-medium"
          >
            Lihat sesi saya
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Pemilih tanggal ─────────────────────────────────────────── */}
      <section aria-labelledby="pilih-tanggal">
        <div className="grid gap-4">
          <p className="text-xs text-muted-foreground" id="pilih-tanggal">
            Tanggal
          </p>
          <div>
            {memuat ? (
              <p className="text-muted-foreground">Memuat jadwal…</p>
            ) : hari.length === 0 ? (
              <p className="max-w-xl text-slate-600">
                Belum ada jadwal terbuka dua minggu ke depan. Hubungi admin lewat
                WhatsApp untuk mencari waktu lain.
              </p>
            ) : (
              <ul
                className="-mx-1 flex gap-1 overflow-x-auto pb-2"
                role="tablist"
                aria-label="Pilih tanggal sesi"
              >
                {hari.map((h) => {
                  const aktif = h.date === tanggalAktif;
                  const d = parseTanggal(h.date);
                  return (
                    <li key={h.date} className="shrink-0">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={aktif}
                        onClick={() => {
                          setTanggalAktif(h.date);
                          setSlotTerpilih(null);
                        }}
                        className={[
                          "flex w-16 flex-col items-center gap-0.5 border px-2 py-2.5 transition-colors",
                          aktif
                            ? "border-brand bg-brand text-white"
                            : "border-brand-200 bg-brand-50 hover:border-slate-400",
                        ].join(" ")}
                      >
                        <span className="text-2xs uppercase tracking-wide opacity-70">
                          {namaHari.format(d)}
                        </span>
                        <span data-numeric className="text-lg font-semibold leading-none">
                          {tanggalPendek.format(d)}
                        </span>
                        <span
                          className={[
                            "text-2xs",
                            aktif ? "opacity-70" : "text-muted-foreground",
                          ].join(" ")}
                        >
                          {h.slots.length} slot
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ── Pemilih jam ─────────────────────────────────────────────── */}
      {tanggalAktif && slotHariIni.length > 0 && (
        <section aria-labelledby="pilih-jam">
          <div className="grid gap-4">
            <p className="text-xs text-muted-foreground" id="pilih-jam">
              Jam
              <span className="mt-0.5 block text-2xs text-slate-400">WIB</span>
            </p>
            <div>
              <h3 className="sr-only">
                Slot tersedia {tanggalPanjang.format(parseTanggal(tanggalAktif))}
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {slotHariIni.map((s) => {
                  const dipilih = slotTerpilih?.slot_id === s.slot_id;
                  return (
                    <li key={s.slot_id}>
                      <button
                        type="button"
                        aria-pressed={dipilih}
                        onClick={() => setSlotTerpilih(dipilih ? null : s)}
                        className={[
                          "relative border px-3 py-2 text-sm transition-colors",
                          dipilih
                            ? "border-brand bg-brand-50 font-medium"
                            : "border-brand-200 bg-brand-50 hover:border-slate-400",
                        ].join(" ")}
                      >
                        <span data-numeric>
                          {jam(s.slot_start)}–{jam(s.slot_end)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* ── Konfirmasi ──────────────────────────────────────────────── */}
      {slotTerpilih && (
        <form onSubmit={kirim} className="grid gap-4 border-t border-brand-200 pt-6">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">
            Langkah terakhir · Request &amp; pembayaran
          </p>
          <div className="max-w-xl">
            {daftarPaket.length > 0 && (
              <fieldset className="mb-5">
                <legend className="block font-medium">Jenis bimbingan</legend>
                <div className="mt-2 grid gap-2">
                  {slotTerpilih.price_per_hour > 0 && (
                    <label className={`flex cursor-pointer items-center justify-between gap-3 border px-3 py-2 text-sm ${paketId === "" ? "border-brand bg-brand-50" : "border-brand-200"}`}>
                      <span className="flex items-center gap-2">
                        <input type="radio" name="paket" checked={paketId === ""} onChange={() => setPaketId("")} />
                        Konsultasi umum dengan mentor
                      </span>
                      <span data-numeric className="font-semibold">{formatRupiah(slotTerpilih.price_per_hour)}</span>
                    </label>
                  )}
                  {daftarPaket.map((p) => (
                    <label key={p.id} className={`flex cursor-pointer items-center justify-between gap-3 border px-3 py-2 text-sm ${paketId === p.id ? "border-brand bg-brand-50" : "border-brand-200"}`}>
                      <span className="flex items-center gap-2">
                        <input type="radio" name="paket" checked={paketId === p.id} onChange={() => setPaketId(p.id)} />
                        {p.nama.replace(/^Paket Daily Bimbingan Online\s*/i, "")}
                      </span>
                      <span data-numeric className="font-semibold">{formatRupiah(p.harga)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <label htmlFor="topik" className="block font-medium">
              Topik yang ingin dibahas
            </label>
            <p className="mt-1 text-sm text-muted-foreground">
              Tulis sedetail mungkin supaya mentor bisa menyiapkan bahan.
              Misalnya: &ldquo;Bab 3, bingung menentukan teknik sampling untuk
              populasi 2.400 mahasiswa.&rdquo;
            </p>
            <textarea
              id="topik"
              required
              minLength={4}
              maxLength={300}
              rows={3}
              value={topik}
              onChange={(e) => setTopik(e.target.value)}
              className="mt-2 w-full border border-brand-200 bg-brand-50 px-3 py-2 text-base"
            />

            <label htmlFor="catatan" className="mt-4 block font-medium">
              Request / catatan untuk mentor{" "}
              <span className="text-sm font-normal text-muted-foreground">(opsional)</span>
            </label>
            <p className="mt-1 text-sm text-muted-foreground">
              Misalnya: minta sesi lewat Zoom, kirim file draf sebelumnya, atau
              bagian yang ingin difokuskan.
            </p>
            <textarea
              id="catatan"
              maxLength={1000}
              rows={3}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="mt-2 w-full border border-brand-200 bg-brand-50 px-3 py-2 text-base"
            />

            <dl className="mt-4 space-y-1 text-sm">
              {paket && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Paket</dt>
                  <dd className="text-right">{paket.nama}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Mentor</dt>
                <dd>{slotTerpilih.mentor_name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Waktu</dt>
                <dd data-numeric>
                  {tanggalPanjang.format(parseTanggal(slotTerpilih.slot_date))},{" "}
                  {jam(slotTerpilih.slot_start)} WIB
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-brand-200 pt-1">
                <dt className="text-muted-foreground">Biaya</dt>
                <dd data-numeric className="font-semibold">
                  {formatRupiah(hargaSesi)}
                </dd>
              </div>
            </dl>

            {hargaSesi > 0 && (
              <div className="mt-4">
                <WhatsAppField value={whatsapp} onChange={setWhatsapp} error={galatWa} />
              </div>
            )}

            {galat && (
              <p
                role="alert"
                className="mt-4 border-l-2 border-brand bg-brand-50 px-3 py-2 text-sm text-brand"
              >
                {galat}
              </p>
            )}

            <button
              type="submit"
              disabled={mengirim}
              className="mt-4 w-full bg-brand px-5 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
            >
              {mengirim
                ? "Memproses…"
                : hargaSesi > 0
                  ? `Bayar ${formatRupiah(hargaSesi)} & kunci jadwal`
                  : "Pesan jadwal ini"}
            </button>
            <p className="mt-2 text-sm text-muted-foreground">
              {hargaSesi > 0
                ? "Jadwal dikunci untukmu selama 60 menit. Selesaikan pembayaran agar sesi terkonfirmasi; jika tidak, jadwal dilepas otomatis."
                : "Sesi ini gratis. Admin mengonfirmasi lewat WhatsApp."}
            </p>
          </div>
        </form>
      )}

      {galat && !slotTerpilih && (
        <p
          role="alert"
          className="border-l-2 border-brand bg-brand-50 px-3 py-2 text-sm text-brand"
        >
          {galat}
        </p>
      )}
    </div>
  );
}
