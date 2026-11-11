"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Shell from "@/components/Shell";
import BranchSelect from "@/components/BranchSelect";
import ProductThumb from "@/components/ProductThumb";
import { useBranch } from "@/lib/useBranch";
import { api, rp } from "@/lib/client";
import { compressImage } from "@/lib/image";
import { matches } from "@/lib/search";
import { BUSINESS_TYPES, UNITS, fmtQty, parseQty, stepOf, unitOf } from "@/lib/business";
import type { Me } from "@/lib/types";

type R = Record<string, string>;
type Filter = "all" | "low" | "nophoto";
const LOW = 5;

function Stock({ me }: { me: Me }) {
  const owner = me.session.role === "kepala_toko";
  const [products, setProducts] = useState<R[]>([]);
  const [branches, setBranches] = useState<R[]>([]);
  const [branch, setBranch] = useBranch(me.session.branchId);
  const branchId = owner && branches.some((b) => b.id === branch) ? branch : me.session.branchId;
  const defUnit = BUSINESS_TYPES.find((b) => b.key === me.store?.businessType)?.defaultUnit ?? "pcs";
  const [f, setF] = useState({ sku: "", name: "", price: "", stock: "", unit: defUnit });
  const [photo, setPhoto] = useState<string | null>(null); // foto untuk produk baru (sudah dikecilkan)
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const dec = stepOf(f.unit) < 1;
  const newRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLInputElement>(null);
  const rowTarget = useRef("");

  useEffect(() => { if (owner) api<R[]>("/api/branches").then(setBranches).catch((x) => setErr((x as Error).message)); }, [owner]);
  const load = useCallback(async () => {
    try { setProducts(await api<R[]>(`/api/products?branchId=${branchId}`)); }
    catch (x) { setErr((x as Error).message); }
  }, [branchId]);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => products.filter((p) =>
    matches(q, p.name, p.sku) &&
    (filter === "all" || (filter === "low" ? Number(p.stock) < LOW : !p.imageVer))), [products, q, filter]);
  const lowN = products.filter((p) => Number(p.stock) < LOW).length;
  const noPhotoN = products.filter((p) => !p.imageVer).length;

  async function pickNew(file?: File) {
    if (!file) return;
    setErr("");
    try { setPhoto(await compressImage(file)); } catch (x) { setErr((x as Error).message); }
  }
  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setNote(""); setBusy(true);
    try {
      const r = await api<{ id: string }>("/api/products", { method: "POST", body: { ...f, stock: parseQty(f.stock || "0"), branchId } });
      if (photo) {
        try { await api("/api/product-images", { method: "POST", body: { productId: r.id, dataUrl: photo } }); }
        catch (x) { setNote(`Produk tersimpan, tetapi foto gagal diunggah: ${(x as Error).message}. Coba unggah lagi dari daftar.`); }
      }
      setF({ sku: "", name: "", price: "", stock: "", unit: f.unit }); setPhoto(null); load();
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }
  async function patch(id: string, body: object) {
    try { await api("/api/products", { method: "PATCH", body: { id, ...body } }); load(); } catch (x) { setErr((x as Error).message); }
  }
  async function pickRow(file?: File) {
    const id = rowTarget.current;
    if (!file || !id) return;
    setErr(""); setRowBusy(id);
    try {
      const dataUrl = await compressImage(file);
      await api("/api/product-images", { method: "POST", body: { productId: id, dataUrl } });
      await load();
    } catch (x) { setErr((x as Error).message); }
    setRowBusy("");
  }
  async function removePhoto(p: R) {
    if (!confirm(`Hapus foto "${p.name}"?`)) return;
    setRowBusy(p.id);
    try { await api("/api/product-images", { method: "DELETE", body: { productId: p.id } }); await load(); } catch (x) { setErr((x as Error).message); }
    setRowBusy("");
  }

  return (
    <div className="space-y-6">
      {owner && branches.length > 0 && (
        <div className="max-w-sm"><BranchSelect branches={branches} value={branchId} onChange={setBranch} /></div>
      )}

      <form onSubmit={add} className="card grid gap-4 sm:grid-cols-6">
        <div className="sm:col-span-6"><h2 className="text-lg font-bold">Tambah produk</h2></div>

        <div className="flex items-center gap-4 sm:col-span-6">
          <div className="flex h-24 w-24 flex-none items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-paper text-center text-xs text-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photo ? <img src={photo} alt="Pratinjau foto produk" className="h-full w-full object-cover" /> : <span className="px-2">Belum ada foto</span>}
          </div>
          <div className="space-y-2">
            <input ref={newRef} type="file" accept="image/*" className="sr-only" aria-label="Pilih foto produk" onChange={(e) => { pickNew(e.target.files?.[0]); e.target.value = ""; }} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-ghost" onClick={() => newRef.current?.click()}>{photo ? "Ganti foto" : "Pilih atau ambil foto"}</button>
              {photo && <button type="button" className="btn-ghost" onClick={() => setPhoto(null)}>Hapus foto</button>}
            </div>
            <p className="text-xs text-muted">Opsional. Foto otomatis dikecilkan menjadi persegi kecil supaya cepat dimuat.</p>
          </div>
        </div>

        <div><label className="label" htmlFor="g-sku">SKU / kode</label><input id="g-sku" className="input" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="g-name">Nama produk</label><input id="g-name" required className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="label" htmlFor="g-unit">Satuan</label>
          <select id="g-unit" className="input" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value, stock: "" })}>{UNITS.map((u) => <option key={u.key} value={u.key}>{u.label}</option>)}</select></div>
        <div><label className="label" htmlFor="g-price">{dec ? `Harga per ${unitOf(f.unit).label}` : "Harga"}</label><input id="g-price" required inputMode="numeric" className="input" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/\D/g, "") })} /></div>
        <div><label className="label" htmlFor="g-stock">Stok awal{dec ? ` (${unitOf(f.unit).label})` : ""}</label><input id="g-stock" required inputMode={dec ? "decimal" : "numeric"} className="input" value={f.stock} onChange={(e) => setF({ ...f, stock: dec ? e.target.value.replace(/[^\d.,]/g, "") : e.target.value.replace(/\D/g, "") })} /></div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
          <button className="btn-primary" disabled={busy}>{busy ? "Menyimpan…" : "Tambah produk"}</button>
          {err && <span className="text-sm font-medium text-danger" role="alert">{err}</span>}
          {note && <span className="text-sm font-medium" role="status">{note}</span>}
        </div>
      </form>

      <section className="card overflow-hidden p-0">
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <input type="text" className="input pr-10" placeholder="Cari nama produk atau SKU" aria-label="Cari produk" value={q} onChange={(e) => setQ(e.target.value)} />
              {q && <button type="button" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-lg leading-none text-muted hover:text-ink" aria-label="Hapus pencarian" onClick={() => setQ("")}>×</button>}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Saring produk">
              {([["all", `Semua (${products.length})`], ["low", `Stok menipis (${lowN})`], ["nophoto", `Tanpa foto (${noPhotoN})`]] as [Filter, string][]).map(([k, t]) => (
                <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${filter === k ? "border-accent bg-accent text-white" : "border-line hover:border-accent"}`}>{t}</button>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted" aria-live="polite">Menampilkan {shown.length} dari {products.length} produk.</p>
        </div>

        <input ref={rowRef} type="file" accept="image/*" className="sr-only" aria-label="Pilih foto untuk produk" onChange={(e) => { pickRow(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="th pl-4">Foto</th><th className="th">Produk</th><th className="th">Harga</th><th className="th">Stok</th><th className="th">Satuan</th><th className="th pr-4"></th></tr></thead>
            <tbody className="divide-y divide-line">
              {shown.map((p) => (
                <tr key={p.id}>
                  <td className="td pl-4"><ProductThumb id={p.id} ver={p.imageVer} name={p.name} size={48} /></td>
                  <td className="td"><div className="font-semibold">{p.name}</div><div className="font-mono text-xs text-muted">{p.sku || "tanpa SKU"}</div></td>
                  <td className="td">{rp(p.price)}</td>
                  <td className={`td font-mono ${Number(p.stock) < LOW ? "font-bold text-danger" : ""}`}>{fmtQty(Number(p.stock))}{Number(p.stock) < LOW && <span className="ml-1.5 font-sans text-xs font-semibold">menipis</span>}</td>
                  <td className="td">{unitOf(p.unit).label}</td>
                  <td className="td pr-4 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button className="btn-ghost" disabled={rowBusy === p.id} onClick={() => { rowTarget.current = p.id; rowRef.current?.click(); }}>{rowBusy === p.id ? "Mengunggah…" : p.imageVer ? "Ganti foto" : "Tambah foto"}</button>
                      {p.imageVer && <button className="btn-ghost" disabled={rowBusy === p.id} onClick={() => removePhoto(p)}>Hapus foto</button>}
                      <button className="btn-ghost" onClick={() => patch(p.id, { stock: Number(p.stock) + 10 })}>+10 stok</button>
                      <button className="btn-ghost" onClick={() => { const v = prompt(`Stok baru untuk ${p.name} (${unitOf(p.unit).label})`, fmtQty(Number(p.stock))); if (v !== null && v !== "") patch(p.id, { stock: parseQty(v) }); }}>Ubah stok</button>
                      <button className="btn-ghost" onClick={() => { const v = prompt(`Harga baru untuk ${p.name}`, p.price); if (v !== null && v !== "") patch(p.id, { price: Number(v) }); }}>Ubah harga</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!products.length && <tr><td className="td text-muted" colSpan={6}>Belum ada produk di cabang ini. Tambahkan produk pertama lewat formulir di atas.</td></tr>}
              {!!products.length && !shown.length && <tr><td className="td text-muted" colSpan={6}>Tidak ada produk yang cocok{q ? ` dengan “${q}”` : ""}. <button className="font-semibold text-link underline underline-offset-4" onClick={() => { setQ(""); setFilter("all"); }}>Tampilkan semua</button></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function Gudang() { return <Shell>{(me) => <Stock me={me} />}</Shell>; }