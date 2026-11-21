"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2, Save, CheckCircle2, Camera, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils/format-currency";

/**
 * Formulir profil mentor.
 *
 * Tarif per jam, rating, dan jumlah sesi ditampilkan tapi tidak bisa disunting
 * di sini — tarif keputusan admin, rating dan jumlah sesi dihitung dari data
 * nyata. Menampilkannya tetap berguna supaya mentor tahu angkanya, tapi
 * membuatnya bisa diketik akan membuat angka itu tidak berarti.
 */

type Pengalaman = { posisi: string; instansi: string; mulai: string; selesai: string; catatan: string };
type Pendidikan = { jenjang: string; program: string; kampus: string; tahun: string };

type Profil = {
  headline: string | null;
  bio: string | null;
  gelar: string | null;
  education: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  specializations: string[];
  pencapaian: string[];
  pengalaman: Pengalaman[];
  pendidikan: Pendidikan[];
  experience_years: number;
  is_available: boolean;
  price_per_hour: number;
  rating_avg: number;
  session_count: number;
};

const KOSONG_PENGALAMAN: Pengalaman = { posisi: "", instansi: "", mulai: "", selesai: "", catatan: "" };
const KOSONG_PENDIDIKAN: Pendidikan = { jenjang: "", program: "", kampus: "", tahun: "" };

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
      {children}
    </label>
  );
}

const inputKelas =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none";

function Bagian({ judul, anak }: { judul: string; anak: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 font-extrabold text-slate-900">{judul}</h3>
      {anak}
    </section>
  );
}

export function FormProfilMentor() {
  const [p, setP] = useState<Profil | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);
  const [aksi, setAksi] = useState<string | null>(null);
  const [mengunggah, setMengunggah] = useState(false);
  const fileFoto = useRef<HTMLInputElement>(null);

  async function unggahFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
      setGalat("Foto harus JPG, PNG, WebP, atau AVIF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setGalat("Ukuran foto maksimal 5 MB.");
      return;
    }
    setMengunggah(true);
    setGalat(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi berakhir. Masuk lagi.");
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `mentor/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("public-assets").upload(path, file, { contentType: file.type });
      if (error) throw new Error(`Gagal mengunggah foto: ${error.message}`);
      ubah("avatar_url", supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl);
    } catch (err) {
      setGalat(err instanceof Error ? err.message : "Gagal mengunggah foto.");
    } finally {
      setMengunggah(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/mentor/profil");
        const j = await r.json();
        if (!r.ok) {
          setAksi(j.action ?? null);
          throw new Error(j.error ?? "Gagal memuat profil.");
        }
        setP({
          ...j.data,
          specializations: j.data.specializations ?? [],
          pencapaian: j.data.pencapaian ?? [],
          pengalaman: j.data.pengalaman ?? [],
          pendidikan: j.data.pendidikan ?? [],
        });
      } catch (e) {
        setGalat(e instanceof Error ? e.message : "Gagal memuat profil.");
      } finally {
        setMemuat(false);
      }
    })();
  }, []);

  function ubah<K extends keyof Profil>(k: K, v: Profil[K]) {
    setP((s) => (s ? { ...s, [k]: v } : s));
    setSukses(false);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!p) return;
    if (!p.avatar_url) {
      setGalat("Foto profil wajib diunggah sebelum menyimpan.");
      return;
    }
    setMenyimpan(true);
    setGalat(null);
    try {
      const r = await fetch("/api/mentor/profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: p.headline, bio: p.bio, gelar: p.gelar,
          education: p.education, linkedin_url: p.linkedin_url,
          avatar_url: p.avatar_url, specializations: p.specializations,
          pencapaian: p.pencapaian.filter((x) => x.trim()),
          pengalaman: p.pengalaman.filter((x) => x.posisi.trim() || x.instansi.trim()),
          pendidikan: p.pendidikan.filter((x) => x.program.trim() || x.kampus.trim()),
          experience_years: p.experience_years,
          is_available: p.is_available,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.rinci?.join(" · ") ?? j.error ?? "Gagal menyimpan.");
      setSukses(true);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan profil.");
    } finally {
      setMenyimpan(false);
    }
  }

  if (memuat) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="h-5 w-5 animate-spin text-slate-300" aria-hidden="true" />
      </div>
    );
  }

  if (!p) {
    // Judulnya mengikuti penyebab sebenarnya. Versi sebelumnya selalu
    // menulis "profil mentor belum aktif" apa pun galatnya, dan itu
    // menuduh peran mentor padahal masalahnya bisa di tempat lain.
    const kurangMigration = aksi === "migration_kurang";
    return (
      <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="font-bold text-amber-900">
          {kurangMigration
            ? "Basis data belum diperbarui"
            : "Profil mentor belum bisa dibuka"}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-amber-800">
          {galat ?? "Terjadi galat yang tidak dikenali."}
        </p>
        {!kurangMigration && (
          <p className="mt-2 text-xs leading-relaxed text-amber-700">
            Kalau pesan di atas menyebut kolom yang tidak ada, jalankan
            migration 023 dan 026 di SQL Editor Supabase.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={simpan} className="space-y-5 pb-24">
      <Bagian
        judul="Identitas"
        anak={
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="headline">Headline</Label>
              <input id="headline" value={p.headline ?? ""} maxLength={160}
                onChange={(e) => ubah("headline", e.target.value)}
                placeholder="Mentor Metodologi Kuantitatif" className={inputKelas} />
            </div>
            <div>
              <Label htmlFor="gelar">Gelar</Label>
              <input id="gelar" value={p.gelar ?? ""} maxLength={80}
                onChange={(e) => ubah("gelar", e.target.value)}
                placeholder="S.Pd., M.Pd." className={inputKelas} />
            </div>
            <div className="sm:col-span-2">
              <Label>Foto profil <span className="text-red-500">*</span></Label>
              <div className="flex items-center gap-4">
                <div className="relative h-28 w-[5.6rem] shrink-0 overflow-hidden rounded-xl border bg-brand-50">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt="Foto profil" className="h-full w-full object-cover object-top" />
                  ) : (
                    <UserRound className="absolute bottom-0 left-1/2 h-20 w-20 -translate-x-1/2 text-brand-200" strokeWidth={1} />
                  )}
                </div>
                <div>
                  <input ref={fileFoto} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={unggahFoto} />
                  <button type="button" onClick={() => fileFoto.current?.click()} disabled={mengunggah}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand disabled:opacity-60">
                    {mengunggah ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    {p.avatar_url ? "Ganti foto" : "Unggah foto"}
                  </button>
                  <p className="mt-1.5 max-w-sm text-xs text-slate-500">
                    Wajib. Foto formal setengah badan, latar polos, potret 4:5 (mis. 800 × 1000 px), maks 5 MB.
                    Foto ini tampil di beranda & halaman Mentor Kami.
                  </p>
                  {!p.avatar_url && (
                    <p className="mt-1 text-xs font-semibold text-red-600">Belum ada foto — profilmu tampil tanpa foto.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="bio">Biodata</Label>
              <textarea id="bio" value={p.bio ?? ""} rows={5} maxLength={3000}
                onChange={(e) => ubah("bio", e.target.value)}
                placeholder="Ceritakan pendekatanmu saat membimbing, bukan sekadar daftar gelar."
                className={inputKelas} />
            </div>
            <div>
              <Label htmlFor="tahun">Lama pengalaman (tahun)</Label>
              <input id="tahun" type="number" min={0} max={70} value={p.experience_years}
                onChange={(e) => ubah("experience_years", Number(e.target.value) || 0)}
                className={inputKelas} />
            </div>
            <div>
              <Label htmlFor="linkedin">LinkedIn</Label>
              <input id="linkedin" value={p.linkedin_url ?? ""} maxLength={300}
                onChange={(e) => ubah("linkedin_url", e.target.value)}
                placeholder="https://linkedin.com/in/…" className={inputKelas} />
            </div>
          </div>
        }
      />

      <Bagian
        judul="Bidang yang dibimbing"
        anak={
          <DaftarTeks
            nilai={p.specializations}
            onUbah={(v) => ubah("specializations", v)}
            contoh="Analisis SEM dengan SmartPLS"
            labelTambah="Tambah bidang"
          />
        }
      />

      <Bagian
        judul="Pencapaian"
        anak={
          <DaftarTeks
            nilai={p.pencapaian}
            onUbah={(v) => ubah("pencapaian", v)}
            contoh="Juara 1 LKTI Nasional 2021"
            labelTambah="Tambah pencapaian"
          />
        }
      />

      <Bagian
        judul="Pengalaman"
        anak={
          <div className="space-y-3">
            {p.pengalaman.map((x, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={x.posisi} placeholder="Posisi" maxLength={160} className={inputKelas}
                    onChange={(e) => {
                      const d = [...p.pengalaman]; d[i] = { ...x, posisi: e.target.value };
                      ubah("pengalaman", d);
                    }} />
                  <input value={x.instansi} placeholder="Instansi" maxLength={160} className={inputKelas}
                    onChange={(e) => {
                      const d = [...p.pengalaman]; d[i] = { ...x, instansi: e.target.value };
                      ubah("pengalaman", d);
                    }} />
                  <input value={x.mulai} placeholder="Mulai (2019)" maxLength={20} className={inputKelas}
                    onChange={(e) => {
                      const d = [...p.pengalaman]; d[i] = { ...x, mulai: e.target.value };
                      ubah("pengalaman", d);
                    }} />
                  <input value={x.selesai} placeholder="Selesai (2023 / sekarang)" maxLength={20} className={inputKelas}
                    onChange={(e) => {
                      const d = [...p.pengalaman]; d[i] = { ...x, selesai: e.target.value };
                      ubah("pengalaman", d);
                    }} />
                  <textarea value={x.catatan} placeholder="Keterangan singkat" rows={2} maxLength={500}
                    className={`${inputKelas} sm:col-span-2`}
                    onChange={(e) => {
                      const d = [...p.pengalaman]; d[i] = { ...x, catatan: e.target.value };
                      ubah("pengalaman", d);
                    }} />
                </div>
                <button type="button"
                  onClick={() => ubah("pengalaman", p.pengalaman.filter((_, j) => j !== i))}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:underline">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Hapus
                </button>
              </div>
            ))}
            <button type="button"
              onClick={() => ubah("pengalaman", [...p.pengalaman, { ...KOSONG_PENGALAMAN }])}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:border-brand hover:text-brand">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Tambah pengalaman
            </button>
          </div>
        }
      />

      <Bagian
        judul="Perjalanan pendidikan"
        anak={
          <div className="space-y-3">
            {p.pendidikan.map((x, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={x.jenjang} placeholder="Jenjang (S1 / S2 / S3)" maxLength={40} className={inputKelas}
                    onChange={(e) => {
                      const d = [...p.pendidikan]; d[i] = { ...x, jenjang: e.target.value };
                      ubah("pendidikan", d);
                    }} />
                  <input value={x.program} placeholder="Program studi" maxLength={160} className={inputKelas}
                    onChange={(e) => {
                      const d = [...p.pendidikan]; d[i] = { ...x, program: e.target.value };
                      ubah("pendidikan", d);
                    }} />
                  <input value={x.kampus} placeholder="Kampus" maxLength={160} className={inputKelas}
                    onChange={(e) => {
                      const d = [...p.pendidikan]; d[i] = { ...x, kampus: e.target.value };
                      ubah("pendidikan", d);
                    }} />
                  <input value={x.tahun} placeholder="Tahun lulus" maxLength={20} className={inputKelas}
                    onChange={(e) => {
                      const d = [...p.pendidikan]; d[i] = { ...x, tahun: e.target.value };
                      ubah("pendidikan", d);
                    }} />
                </div>
                <button type="button"
                  onClick={() => ubah("pendidikan", p.pendidikan.filter((_, j) => j !== i))}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:underline">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Hapus
                </button>
              </div>
            ))}
            <button type="button"
              onClick={() => ubah("pendidikan", [...p.pendidikan, { ...KOSONG_PENDIDIKAN }])}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:border-brand hover:text-brand">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Tambah pendidikan
            </button>
          </div>
        }
      />

      <Bagian
        judul="Ketersediaan"
        anak={
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={p.is_available}
                onChange={(e) => ubah("is_available", e.target.checked)}
                className="h-4 w-4 accent-[#8B0000]" />
              <span className="text-sm font-medium text-slate-700">
                Terima booking baru
              </span>
            </label>

            <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
              {[
                ["Tarif per jam", formatRupiah(p.price_per_hour)],
                ["Rating", p.session_count || p.rating_avg ? p.rating_avg.toFixed(2) : "—"],
                ["Total sesi", String(p.session_count)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold text-slate-500">{k}</dt>
                  <dd className="text-lg font-extrabold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs leading-relaxed text-slate-500">
              Ketiganya tidak bisa diubah dari sini. Tarif ditetapkan admin,
              sedangkan rating dan jumlah sesi dihitung dari booking dan ulasan
              yang benar-benar terjadi.
            </p>
          </div>
        }
      />

      {galat && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {galat}
        </p>
      )}

      {/* Tombol simpan menempel di bawah layar supaya tidak perlu menggulir
          ke ujung formulir yang panjang ini setiap kali mengubah satu isian. */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-sm lg:left-64">
        <div className="mx-auto flex max-w-4xl items-center justify-end gap-3">
          {sukses && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Tersimpan
            </span>
          )}
          <button type="submit" disabled={menyimpan}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-light disabled:opacity-40">
            {menyimpan ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Simpan profil
          </button>
        </div>
      </div>
    </form>
  );
}

/** Daftar teks sederhana yang bisa ditambah dan dihapus barisnya. */
function DaftarTeks({
  nilai, onUbah, contoh, labelTambah,
}: {
  nilai: string[];
  onUbah: (v: string[]) => void;
  contoh: string;
  labelTambah: string;
}) {
  return (
    <div className="space-y-2">
      {nilai.map((v, i) => (
        <div key={i} className="flex gap-2">
          <input value={v} placeholder={contoh} maxLength={240} className={inputKelas}
            onChange={(e) => {
              const d = [...nilai]; d[i] = e.target.value; onUbah(d);
            }} />
          <button type="button" onClick={() => onUbah(nilai.filter((_, j) => j !== i))}
            className="flex-shrink-0 rounded-xl border border-slate-200 px-3 text-slate-500 hover:border-red-300 hover:text-red-700"
            aria-label="Hapus baris">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onUbah([...nilai, ""])}
        className="inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:border-brand hover:text-brand">
        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> {labelTambah}
      </button>
    </div>
  );
}
