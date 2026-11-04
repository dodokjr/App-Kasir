"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import BranchSelect from "@/components/BranchSelect";
import { useBranch } from "@/lib/useBranch";
import { api, rp } from "@/lib/client";
import { BUSINESS_TYPES, UNITS, fmtQty, parseQty, stepOf, unitOf } from "@/lib/business";
import type { Me } from "@/lib/types";

type R = Record<string, string>;

function Stock({ me }: { me: Me }) {
  const owner = me.session.role === "kepala_toko";
  const [products, setProducts] = useState<R[]>([]);
  const [branches, setBranches] = useState<R[]>([]);
  const [branch, setBranch] = useBranch(me.session.branchId);
  const branchId = owner && branches.some((b) => b.id === branch) ? branch : me.session.branchId;
  const defUnit = BUSINESS_TYPES.find((b) => b.key === me.store?.businessType)?.defaultUnit ?? "pcs";
  const [f, setF] = useState({ sku: "", name: "", price: "", stock: "", unit: defUnit });
  const [err, setErr] = useState("");
  const dec = stepOf(f.unit) < 1;

  useEffect(() => { if (owner) api<R[]>("/api/branches").then(setBranches).catch((x) => setErr((x as Error).message)); }, [owner]);
  const load = useCallback(async () => {
    try { setProducts(await api<R[]>(`/api/products?branchId=${branchId}`)); }
    catch (x) { setErr((x as Error).message); }
  }, [branchId]);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try { await api("/api/products", { method: "POST", body: { ...f, stock: parseQty(f.stock || "0"), branchId } }); setF({ sku: "", name: "", price: "", stock: "", unit: f.unit }); load(); }
    catch (x) { setErr((x as Error).message); }
  }
  async function patch(id: string, body: object) {
    try { await api("/api/products", { method: "PATCH", body: { id, ...body } }); load(); } catch (x) { setErr((x as Error).message); }
  }

  return (
    <div className="space-y-6">
      {owner && branches.length > 0 && (
        <div className="max-w-sm"><BranchSelect branches={branches} value={branchId} onChange={setBranch} /></div>
      )}
      <form onSubmit={add} className="card grid gap-3 sm:grid-cols-6">
        <div><label className="label">SKU</label><input className="input" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Nama produk</label><input required className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="label">Satuan</label>
          <select className="input" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value, stock: "" })}>{UNITS.map((u) => <option key={u.key} value={u.key}>{u.label}</option>)}</select></div>
        <div><label className="label">{dec ? `Harga per ${unitOf(f.unit).label}` : "Harga"}</label><input required inputMode="numeric" className="input" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/\D/g, "") })} /></div>
        <div><label className="label">Stok awal{dec ? ` (${unitOf(f.unit).label})` : ""}</label><input required inputMode={dec ? "decimal" : "numeric"} className="input" value={f.stock} onChange={(e) => setF({ ...f, stock: dec ? e.target.value.replace(/[^\d.,]/g, "") : e.target.value.replace(/\D/g, "") })} /></div>
        <div className="sm:col-span-6 flex items-center gap-3"><button className="btn-primary">Tambah produk</button>{err && <span className="text-sm text-danger" role="alert">{err}</span>}</div>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="w-full"><thead><tr><th className="th">SKU</th><th className="th">Produk</th><th className="th">Harga</th><th className="th">Stok</th><th className="th">Satuan</th><th className="th"></th></tr></thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="td font-mono text-xs">{p.sku || "-"}</td><td className="td font-medium">{p.name}</td><td className="td">{rp(p.price)}</td>
                <td className={`td font-mono ${Number(p.stock) < 5 ? "text-danger" : ""}`}>{fmtQty(Number(p.stock))}</td><td className="td">{unitOf(p.unit).label}</td>
                <td className="td text-right space-x-2">
                  <button className="btn-ghost" onClick={() => patch(p.id, { stock: Number(p.stock) + 10 })}>+10 stok</button>
                  <button className="btn-ghost" onClick={() => { const v = prompt(`Stok baru untuk ${p.name} (${unitOf(p.unit).label})`, fmtQty(Number(p.stock))); if (v !== null && v !== "") patch(p.id, { stock: parseQty(v) }); }}>Ubah stok</button>
                  <button className="btn-ghost" onClick={() => { const v = prompt(`Harga baru untuk ${p.name}`, p.price); if (v !== null && v !== "") patch(p.id, { price: Number(v) }); }}>Ubah harga</button>
                </td>
              </tr>
            ))}
            {!products.length && <tr><td className="td text-muted" colSpan={6}>Belum ada produk di cabang ini.</td></tr>}
          </tbody></table>
      </div>
    </div>
  );
}

export default function Gudang() { return <Shell>{(me) => <Stock me={me} />}</Shell>; }
