"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, X, Loader2, Save, AlertCircle, Store,
  Tags, Package, EyeOff,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils/format-currency";
import { keSlug, type Etalase, type Kategori, type Produk, type Spesifikasi } from "@/lib/katalog/tipe";

/**
 * Panel katalog: etalase, kategori, dan produk — ketiganya bisa ditambah,
 * diedit, dan dihapus.
 *
 * Bentuknya dua kolom: daftar etalase di kiri sebagai penyaring, isi
 * etalase terpilih di kanan. Dengan 38 produk dalam 5 etalase, menampilkan
 * semuanya sekaligus dalam satu tabel panjang akan membuat admin menggulir
 * mencari satu baris; menyaring dari kiri membuat yang dicari selalu
 * terlihat dalam satu layar.
 */

const input =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none";
const label = "mb-1 block text-xs font-bold text-slate-600";

type Props = { etalase: Etalase[]; kategori: Kategori[]; produk: Produk[] };

const PRODUK_KOSONG = {
  etalase_id: "", kategori_id: null as string | null, slug: "", nama: "",
  subjudul: "", deskripsi: "", spesifikasi: [] as Spesifikasi[],
  fitur: [] as string[], harga: 0, harga_coret: null as number | null,
  harga_mulai: false, satuan: "", gambar: [] as string[],
  berat_gram: null as number | null, stok: null as number | null,
  badge: "", catatan: "", wa_pesan: "", is_active: true, urutan: 0,
};

export function KelolaKatalog({ etalase, kategori, produk }: Props) {
  const router = useRouter();
  const [pilih, setPilih] = useState<string>(etalase[0]?.id ?? "");
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const [formEtalase, setFormEtalase] = useState<Partial<Etalase> | null>(null);
  const [formKategori, setFormKategori] = useState<Partial<Kategori> | null>(null);
  const [formProduk, setFormProduk] = useState<(typeof PRODUK_KOSONG & { id?: string }) | null>(null);

  const kategoriEtalase = useMemo(
    () => kategori.filter((k) => k.etalase_id === pilih),
    [kategori, pilih]
  );
  const produkEtalase = useMemo(
    () => produk.filter((p) => p.etalase_id === pilih),
    [produk, pilih]
  );
  const etalaseTerpilih = etalase.find((e) => e.id === pilih) ?? null;

  async function kirim(jenis: string, isi: unknown) {
    setSibuk(true);
    setGalat(null);
    try {
      const r = await fetch(`/api/admin/katalog?jenis=${jenis}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isi),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setGalat([j.error ?? "Gagal menyimpan.", ...(j.rinci ?? [])].join(" "));
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setGalat("Tidak bisa menghubungi server.");
      return false;
    } finally {
      setSibuk(false);
    }
  }

  async function hapus(jenis: string, id: string, nama: string) {
    if (!window.confirm(`Hapus "${nama}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setSibuk(true);
    setGalat(null);
    try {
      const r = await fetch(`/api/admin/katalog?jenis=${jenis}&id=${id}`, {
        method: "DELETE",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setGalat(j.error ?? "Gagal menghapus.");
      else router.refresh();
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="space-y-5">
      {galat && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="flex-1">{galat}</span>
          <button type="button" onClick={() => setGalat(null)} aria-label="Tutup">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[17rem_1fr]">
        {/* ── Etalase ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
              <Store className="h-4 w-4 text-brand" aria-hidden="true" />
              Etalase
            </h2>
            <button
              type="button"
              onClick={() => setFormEtalase({ slug: "", nama: "", urutan: 0, is_active: true })}
              className="rounded-lg p-1 text-brand transition-colors hover:bg-brand-50"
              aria-label="Tambah etalase"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <ul className="space-y-1">
            {etalase.map((e) => {
              const jml = produk.filter((p) => p.etalase_id === e.id).length;
              return (
                <li key={e.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPilih(e.id)}
                    className={`flex-1 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                      pilih === e.id
                        ? "bg-brand-50 font-bold text-brand"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {e.nama}
                      {!e.is_active && (
                        <EyeOff className="h-3 w-3 text-slate-400" aria-label="Nonaktif" />
                      )}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {jml} produk
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormEtalase(e)}
                    className="rounded p-1 text-slate-400 opacity-0 transition hover:text-brand group-hover:opacity-100"
                    aria-label={`Edit ${e.nama}`}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void hapus("etalase", e.id, e.nama)}
                    className="rounded p-1 text-slate-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                    aria-label={`Hapus ${e.nama}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-5">
          {/* ── Kategori ── */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                <Tags className="h-4 w-4 text-brand" aria-hidden="true" />
                Kategori {etalaseTerpilih ? `· ${etalaseTerpilih.nama}` : ""}
              </h2>
              <button
                type="button"
                disabled={!pilih}
                onClick={() =>
                  setFormKategori({ etalase_id: pilih, slug: "", nama: "", urutan: 0, is_active: true })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-brand px-2.5 py-1 text-xs font-bold text-brand transition-colors hover:bg-brand-50 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Kategori
              </button>
            </div>

            {kategoriEtalase.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada kategori di etalase ini.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {kategoriEtalase.map((k) => (
                  <li
                    key={k.id}
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 py-1 pl-3 pr-1.5 text-sm"
                  >
                    <span className="font-medium text-slate-700">{k.nama}</span>
                    <span className="text-xs text-slate-400">
                      {produk.filter((p) => p.kategori_id === k.id).length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormKategori(k)}
                      className="rounded p-0.5 text-slate-400 hover:text-brand"
                      aria-label={`Edit ${k.nama}`}
                    >
                      <Pencil className="h-3 w-3" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void hapus("kategori", k.id, k.nama)}
                      className="rounded p-0.5 text-slate-400 hover:text-red-600"
                      aria-label={`Hapus ${k.nama}`}
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Menghapus kategori tidak menghapus produknya — produk itu jadi tanpa kategori.
            </p>
          </section>

          {/* ── Produk ── */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                <Package className="h-4 w-4 text-brand" aria-hidden="true" />
                Produk · {produkEtalase.length}
              </h2>
              <button
                type="button"
                disabled={!pilih}
                onClick={() =>
                  setFormProduk({
                    ...PRODUK_KOSONG,
                    etalase_id: pilih,
                    urutan:
                      (produkEtalase.length > 0
                        ? produkEtalase[produkEtalase.length - 1].urutan
                        : 0) + 10,
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-light disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Produk
              </button>
            </div>

            {produkEtalase.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada produk di etalase ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-3 font-bold">Nama</th>
                      <th className="py-2 pr-3 font-bold">Kategori</th>
                      <th className="py-2 pr-3 text-right font-bold">Harga</th>
                      <th className="py-2 pr-3 text-center font-bold">Foto</th>
                      <th className="py-2 pr-3 text-center font-bold">Aktif</th>
                      <th className="py-2 font-bold" />
                    </tr>
                  </thead>
                  <tbody>
                    {produkEtalase.map((p) => (
                      <tr key={p.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 pr-3">
                          <span className="font-semibold text-slate-900">{p.nama}</span>
                          {p.subjudul && (
                            <span className="block text-xs text-slate-500">{p.subjudul}</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-slate-600">
                          {kategori.find((k) => k.id === p.kategori_id)?.nama ?? (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3 text-right font-semibold text-slate-900">
                          {p.harga_mulai && (
                            <span className="mr-1 text-[10px] font-medium text-slate-400">mulai</span>
                          )}
                          {formatRupiah(p.harga)}
                          {p.satuan && (
                            <span className="block text-[10px] font-medium text-slate-400">
                              {p.satuan}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-center">
                          {p.gambar.length > 0 ? (
                            <span className="text-xs font-semibold text-slate-600">
                              {p.gambar.length}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-amber-600">belum</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-center">
                          {p.is_active ? (
                            <span className="text-xs font-bold text-emerald-600">ya</span>
                          ) : (
                            <span className="text-xs font-bold text-slate-400">tidak</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap py-2 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setFormProduk({
                                ...PRODUK_KOSONG,
                                ...p,
                                subjudul: p.subjudul ?? "",
                                deskripsi: p.deskripsi ?? "",
                                satuan: p.satuan ?? "",
                                badge: p.badge ?? "",
                                catatan: p.catatan ?? "",
                                wa_pesan: p.wa_pesan ?? "",
                              })
                            }
                            className="rounded p-1 text-slate-400 hover:text-brand"
                            aria-label={`Edit ${p.nama}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void hapus("produk", p.id, p.nama)}
                            className="rounded p-1 text-slate-400 hover:text-red-600"
                            aria-label={`Hapus ${p.nama}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── Formulir etalase ── */}
      {formEtalase && (
        <Modal judul={formEtalase.id ? "Edit etalase" : "Etalase baru"} tutup={() => setFormEtalase(null)}>
          <div className="space-y-3">
            <div>
              <span className={label}>Nama</span>
              <input
                className={input}
                value={formEtalase.nama ?? ""}
                onChange={(e) =>
                  setFormEtalase((f) => ({
                    ...f,
                    nama: e.target.value,
                    slug: f?.id ? f.slug : keSlug(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <span className={label}>Slug (alamat halaman)</span>
              <input
                className={input}
                value={formEtalase.slug ?? ""}
                onChange={(e) => setFormEtalase((f) => ({ ...f, slug: keSlug(e.target.value) }))}
              />
            </div>
            <div>
              <span className={label}>Deskripsi</span>
              <textarea
                rows={2}
                className={input}
                value={formEtalase.deskripsi ?? ""}
                onChange={(e) => setFormEtalase((f) => ({ ...f, deskripsi: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className={label}>Urutan</span>
                <input
                  type="number"
                  className={input}
                  value={formEtalase.urutan ?? 0}
                  onChange={(e) =>
                    setFormEtalase((f) => ({ ...f, urutan: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={formEtalase.is_active ?? true}
                  onChange={(e) => setFormEtalase((f) => ({ ...f, is_active: e.target.checked }))}
                />
                Tampilkan di situs
              </label>
            </div>
          </div>
          <TombolSimpan
            sibuk={sibuk}
            batal={() => setFormEtalase(null)}
            simpan={async () => {
              const ok = await kirim("etalase", {
                id: formEtalase.id,
                slug: formEtalase.slug,
                nama: formEtalase.nama,
                deskripsi: formEtalase.deskripsi || null,
                urutan: formEtalase.urutan ?? 0,
                is_active: formEtalase.is_active ?? true,
              });
              if (ok) setFormEtalase(null);
            }}
          />
        </Modal>
      )}

      {/* ── Formulir kategori ── */}
      {formKategori && (
        <Modal judul={formKategori.id ? "Edit kategori" : "Kategori baru"} tutup={() => setFormKategori(null)}>
          <div className="space-y-3">
            <div>
              <span className={label}>Etalase</span>
              <select
                className={input}
                value={formKategori.etalase_id ?? pilih}
                onChange={(e) => setFormKategori((f) => ({ ...f, etalase_id: e.target.value }))}
              >
                {etalase.map((e) => (
                  <option key={e.id} value={e.id}>{e.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <span className={label}>Nama</span>
              <input
                className={input}
                value={formKategori.nama ?? ""}
                onChange={(e) =>
                  setFormKategori((f) => ({
                    ...f,
                    nama: e.target.value,
                    slug: f?.id ? f.slug : keSlug(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <span className={label}>Slug</span>
              <input
                className={input}
                value={formKategori.slug ?? ""}
                onChange={(e) => setFormKategori((f) => ({ ...f, slug: keSlug(e.target.value) }))}
              />
            </div>
            <div>
              <span className={label}>Urutan</span>
              <input
                type="number"
                className={input}
                value={formKategori.urutan ?? 0}
                onChange={(e) =>
                  setFormKategori((f) => ({ ...f, urutan: Number(e.target.value) || 0 }))
                }
              />
            </div>
          </div>
          <TombolSimpan
            sibuk={sibuk}
            batal={() => setFormKategori(null)}
            simpan={async () => {
              const ok = await kirim("kategori", {
                id: formKategori.id,
                etalase_id: formKategori.etalase_id ?? pilih,
                slug: formKategori.slug,
                nama: formKategori.nama,
                urutan: formKategori.urutan ?? 0,
                is_active: formKategori.is_active ?? true,
              });
              if (ok) setFormKategori(null);
            }}
          />
        </Modal>
      )}

      {/* ── Formulir produk ── */}
      {formProduk && (
        <Modal lebar judul={formProduk.id ? "Edit produk" : "Produk baru"} tutup={() => setFormProduk(null)}>
          <FormProduk
            nilai={formProduk}
            ubah={setFormProduk}
            etalase={etalase}
            kategori={kategori}
          />
          <TombolSimpan
            sibuk={sibuk}
            batal={() => setFormProduk(null)}
            simpan={async () => {
              const f = formProduk;
              const ok = await kirim("produk", {
                id: f.id,
                etalase_id: f.etalase_id,
                kategori_id: f.kategori_id || null,
                slug: f.slug || keSlug(f.nama),
                nama: f.nama,
                subjudul: f.subjudul || null,
                deskripsi: f.deskripsi || null,
                spesifikasi: f.spesifikasi.filter((s) => s.label && s.nilai),
                fitur: f.fitur.filter(Boolean),
                harga: f.harga,
                harga_coret: f.harga_coret || null,
                harga_mulai: f.harga_mulai,
                satuan: f.satuan || null,
                gambar: f.gambar.filter(Boolean),
                berat_gram: f.berat_gram || null,
                stok: f.stok,
                badge: f.badge || null,
                catatan: f.catatan || null,
                wa_pesan: f.wa_pesan || null,
                is_active: f.is_active,
                urutan: f.urutan,
              });
              if (ok) setFormProduk(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

// ── Potongan yang dipakai ulang ────────────────────────────────────────────

function Modal({
  judul, tutup, anak, lebar = false, children,
}: {
  judul: string; tutup: () => void; anak?: React.ReactNode;
  lebar?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4">
      <div
        className={`my-8 w-full rounded-2xl bg-white p-5 shadow-xl ${
          lebar ? "max-w-3xl" : "max-w-md"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900">{judul}</h3>
          <button type="button" onClick={tutup} aria-label="Tutup">
            <X className="h-4 w-4 text-slate-400 hover:text-slate-700" aria-hidden="true" />
          </button>
        </div>
        {children ?? anak}
      </div>
    </div>
  );
}

function TombolSimpan({
  sibuk, simpan, batal,
}: { sibuk: boolean; simpan: () => void; batal: () => void }) {
  return (
    <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={batal}
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
      >
        Batal
      </button>
      <button
        type="button"
        onClick={simpan}
        disabled={sibuk}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-light disabled:opacity-50"
      >
        {sibuk ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="h-4 w-4" aria-hidden="true" />
        )}
        Simpan
      </button>
    </div>
  );
}

function DaftarTeks({
  judul, nilai, ubah, contoh,
}: {
  judul: string; nilai: string[]; ubah: (v: string[]) => void; contoh: string;
}) {
  return (
    <div>
      <span className={label}>{judul}</span>
      <div className="space-y-1.5">
        {nilai.map((v, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              className={input}
              value={v}
              placeholder={contoh}
              onChange={(e) => {
                const baru = [...nilai];
                baru[i] = e.target.value;
                ubah(baru);
              }}
            />
            <button
              type="button"
              onClick={() => ubah(nilai.filter((_, j) => j !== i))}
              className="rounded-lg px-2 text-slate-400 hover:text-red-600"
              aria-label="Hapus baris"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => ubah([...nilai, ""])}
        className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
      >
        <Plus className="h-3 w-3" aria-hidden="true" /> Tambah baris
      </button>
    </div>
  );
}

function FormProduk({
  nilai, ubah, etalase, kategori,
}: {
  nilai: typeof PRODUK_KOSONG & { id?: string };
  ubah: (f: (typeof PRODUK_KOSONG & { id?: string })) => void;
  etalase: Etalase[];
  kategori: Kategori[];
}) {
  const set = (bagian: Partial<typeof PRODUK_KOSONG>) => ubah({ ...nilai, ...bagian });
  const kategoriEtalase = kategori.filter((k) => k.etalase_id === nilai.etalase_id);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <span className={label}>Nama produk</span>
        <input
          className={input}
          value={nilai.nama}
          onChange={(e) =>
            set({ nama: e.target.value, slug: nilai.id ? nilai.slug : keSlug(e.target.value) })
          }
        />
      </div>

      <div>
        <span className={label}>Etalase</span>
        <select
          className={input}
          value={nilai.etalase_id}
          onChange={(e) => set({ etalase_id: e.target.value, kategori_id: null })}
        >
          {etalase.map((e) => (
            <option key={e.id} value={e.id}>{e.nama}</option>
          ))}
        </select>
      </div>

      <div>
        <span className={label}>Kategori</span>
        <select
          className={input}
          value={nilai.kategori_id ?? ""}
          onChange={(e) => set({ kategori_id: e.target.value || null })}
        >
          <option value="">— tanpa kategori —</option>
          {kategoriEtalase.map((k) => (
            <option key={k.id} value={k.id}>{k.nama}</option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <span className={label}>Slug (alamat halaman produk)</span>
        <input
          className={input}
          value={nilai.slug}
          onChange={(e) => set({ slug: keSlug(e.target.value) })}
        />
      </div>

      <div className="sm:col-span-2">
        <span className={label}>Subjudul</span>
        <input
          className={input}
          value={nilai.subjudul}
          placeholder="Buket satin 7 tangkai"
          onChange={(e) => set({ subjudul: e.target.value })}
        />
      </div>

      <div className="sm:col-span-2">
        <span className={label}>Deskripsi</span>
        <textarea
          rows={3}
          className={input}
          value={nilai.deskripsi}
          onChange={(e) => set({ deskripsi: e.target.value })}
        />
      </div>

      <div>
        <span className={label}>Harga (Rp)</span>
        <input
          type="number"
          className={input}
          value={nilai.harga}
          onChange={(e) => set({ harga: Number(e.target.value) || 0 })}
        />
      </div>

      <div>
        <span className={label}>Harga coret (kosongkan bila tidak ada)</span>
        <input
          type="number"
          className={input}
          value={nilai.harga_coret ?? ""}
          onChange={(e) => set({ harga_coret: e.target.value ? Number(e.target.value) : null })}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={nilai.harga_mulai}
          onChange={(e) => set({ harga_mulai: e.target.checked })}
        />
        Tampilkan sebagai &ldquo;mulai dari&rdquo;
      </label>

      <div>
        <span className={label}>Satuan</span>
        <input
          className={input}
          value={nilai.satuan}
          placeholder="per jam / per bulan"
          onChange={(e) => set({ satuan: e.target.value })}
        />
      </div>

      <div>
        <span className={label}>Berat kirim (gram)</span>
        <input
          type="number"
          className={input}
          value={nilai.berat_gram ?? ""}
          placeholder="untuk hitung ongkir"
          onChange={(e) => set({ berat_gram: e.target.value ? Number(e.target.value) : null })}
        />
      </div>

      <div>
        <span className={label}>Stok (kosong = dibuat setelah dipesan)</span>
        <input
          type="number"
          className={input}
          value={nilai.stok ?? ""}
          onChange={(e) => set({ stok: e.target.value ? Number(e.target.value) : null })}
        />
      </div>

      <div>
        <span className={label}>Badge</span>
        <input
          className={input}
          value={nilai.badge}
          placeholder="Best Seller"
          onChange={(e) => set({ badge: e.target.value })}
        />
      </div>

      <div>
        <span className={label}>Urutan tampil</span>
        <input
          type="number"
          className={input}
          value={nilai.urutan}
          onChange={(e) => set({ urutan: Number(e.target.value) || 0 })}
        />
      </div>

      <div className="sm:col-span-2">
        <DaftarTeks
          judul="Foto (URL, boleh lebih dari satu)"
          nilai={nilai.gambar}
          ubah={(v) => set({ gambar: v })}
          contoh="/merchandise/buket-satin/1.jpg"
        />
      </div>

      <div className="sm:col-span-2">
        <DaftarTeks
          judul="Fitur / isi paket"
          nilai={nilai.fitur}
          ubah={(v) => set({ fitur: v })}
          contoh="Free QnA 1x60 menit private"
        />
      </div>

      <div className="sm:col-span-2">
        <span className={label}>Spesifikasi</span>
        <div className="space-y-1.5">
          {nilai.spesifikasi.map((s, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                className={`${input} max-w-[12rem]`}
                value={s.label}
                placeholder="Tinggi"
                onChange={(e) => {
                  const baru = [...nilai.spesifikasi];
                  baru[i] = { ...baru[i], label: e.target.value };
                  set({ spesifikasi: baru });
                }}
              />
              <input
                className={input}
                value={s.nilai}
                placeholder="±30 cm"
                onChange={(e) => {
                  const baru = [...nilai.spesifikasi];
                  baru[i] = { ...baru[i], nilai: e.target.value };
                  set({ spesifikasi: baru });
                }}
              />
              <button
                type="button"
                onClick={() => set({ spesifikasi: nilai.spesifikasi.filter((_, j) => j !== i) })}
                className="rounded-lg px-2 text-slate-400 hover:text-red-600"
                aria-label="Hapus spesifikasi"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => set({ spesifikasi: [...nilai.spesifikasi, { label: "", nilai: "" }] })}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
        >
          <Plus className="h-3 w-3" aria-hidden="true" /> Tambah spesifikasi
        </button>
      </div>

      <div className="sm:col-span-2">
        <span className={label}>Catatan (kotak peringatan kecil di halaman produk)</span>
        <input
          className={input}
          value={nilai.catatan}
          onChange={(e) => set({ catatan: e.target.value })}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
        <input
          type="checkbox"
          checked={nilai.is_active}
          onChange={(e) => set({ is_active: e.target.checked })}
        />
        Tampilkan di situs
      </label>
    </div>
  );
}
