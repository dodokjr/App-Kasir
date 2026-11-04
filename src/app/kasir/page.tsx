"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import ReceiptModal from "@/components/ReceiptModal";
import ShiftReportModal from "@/components/ShiftReportModal";
import BranchSelect from "@/components/BranchSelect";
import { useBranch } from "@/lib/useBranch";
import { api, rp, tgl } from "@/lib/client";
import { useOnline } from "@/lib/useOnline";
import {
  CASH_KEY, GROUP_LABEL, ORDER_TYPES, fmtQty, isCash, lineTotal, parseQty, roundQty, stepOf, unitOf, validQty,
  type BusinessType, type PayMethod,
} from "@/lib/business";
import type { Me, ReceiptData } from "@/lib/types";
import type { ShiftOut } from "@/lib/shiftTypes";

type P = { id: string; name: string; sku: string; price: string; stock: string; unit: string };
type Line = { q: string; note: string };
type R = Record<string, string>;

/* ---------- Buka kasir ---------- */
function OpenShift({ me, onOpened }: { me: Me; onOpened: (s: ShiftOut) => void }) {
  const owner = me.session.role === "kepala_toko";
  const [branches, setBranches] = useState<R[]>([]);
  const [branch, setBranch] = useBranch(me.session.branchId);
  const branchId = owner && branches.some((b) => b.id === branch) ? branch : owner ? branches[0]?.id ?? "" : me.session.branchId;
  const [cash, setCash] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (owner) api<R[]>("/api/branches").then(setBranches).catch(() => {}); }, [owner]);

  async function open(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await api<{ shift: ShiftOut }>("/api/shifts", { method: "POST", body: { action: "open", openingCash: Number(cash || 0), branchId } });
      onOpened(r.shift);
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }

  return (
    <form onSubmit={open} className="card mx-auto max-w-md space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Buka kasir</h2>
        <p className="text-sm text-muted">Hitung uang tunai di laci, lalu isi sebagai modal awal. Semua penjualan sampai kasir ditutup akan dijumlahkan otomatis.</p>
      </div>
      {owner && branches.length > 0 && <BranchSelect branches={branches} value={branchId} onChange={setBranch} />}
      <div>
        <label className="label" htmlFor="opening">Modal awal (uang di laci)</label>
        <input id="opening" inputMode="numeric" className="input font-mono" placeholder="0" value={cash} onChange={(e) => setCash(e.target.value.replace(/\D/g, ""))} />
      </div>
      {err && <p className="text-sm text-danger" role="alert">{err}</p>}
      <button className="btn-primary w-full" disabled={busy || (owner && !branchId)}>{busy ? "Membuka…" : "Buka kasir"}</button>
    </form>
  );
}

/* ---------- Tutup kasir ---------- */
function CloseModal({ shift, onCancel, onDone }: { shift: ShiftOut; onCancel: () => void; onDone: (s: ShiftOut) => void }) {
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const diff = counted === "" ? null : Number(counted) - shift.expectedCash;

  async function close() {
    setBusy(true); setErr("");
    try {
      const r = await api<{ shift: ShiftOut }>("/api/shifts", { method: "POST", body: { action: "close", countedCash: Number(counted), note } });
      onDone(r.shift);
    } catch (x) { setErr((x as Error).message); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Tutup kasir">
      <div className="card max-h-full w-full max-w-lg space-y-4 overflow-y-auto">
        <div><h2 className="text-lg font-semibold">Tutup kasir</h2><p className="text-sm text-muted">Dibuka {tgl(shift.openedAt)}</p></div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="card"><dt className="text-muted">Transaksi</dt><dd className="font-mono text-lg">{shift.txCount}</dd></div>
          <div className="card"><dt className="text-muted">Item terjual</dt><dd className="font-mono text-lg">{shift.itemsSold}</dd></div>
          <div className="card"><dt className="text-muted">Total penjualan</dt><dd className="font-mono text-lg">{rp(shift.totalSales)}</dd></div>
          <div className="card"><dt className="text-muted">Modal awal</dt><dd className="font-mono text-lg">{rp(shift.openingCash)}</dd></div>
        </dl>

        {shift.payments.length > 0 && (
          <div className="card space-y-1 text-sm">
            <div className="font-medium">Per metode pembayaran</div>
            {shift.payments.map((p) => (
              <div key={p.key} className="flex justify-between"><span>{p.label} <span className="text-muted">({p.count})</span></span><span className="font-mono">{rp(p.total)}</span></div>
            ))}
            <p className="pt-1 text-xs text-muted">Hanya penjualan tunai yang dihitung sebagai uang di laci. Pembayaran lain masuk lewat rekening atau platform.</p>
          </div>
        )}

        {shift.items.length > 0 && (
          <div className="max-h-40 overflow-y-auto">
            <table className="w-full"><thead><tr><th className="th">Barang</th><th className="th">Qty</th><th className="th text-right">Subtotal</th></tr></thead>
              <tbody className="divide-y divide-line">{shift.items.map((i) => (
                <tr key={i.productId || i.name}><td className="td">{i.name}</td><td className="td font-mono">{fmtQty(i.qty)} {i.unit || "pcs"}</td><td className="td text-right font-mono">{rp(i.subtotal)}</td></tr>
              ))}</tbody></table>
          </div>
        )}

        <div className="flex justify-between text-sm text-muted"><span>Modal awal + penjualan tunai ({rp(shift.cashSales)})</span></div>
        <div className="flex justify-between text-lg font-semibold"><span>Kas seharusnya</span><span className="font-mono">{rp(shift.expectedCash)}</span></div>
        <div>
          <label className="label" htmlFor="counted">Uang tunai yang dihitung di laci</label>
          <input id="counted" autoFocus inputMode="numeric" className="input font-mono" value={counted} onChange={(e) => setCounted(e.target.value.replace(/\D/g, ""))} />
          <p className="mt-1 text-sm" aria-live="polite">
            {diff === null ? <span className="text-muted">Isi jumlah uang untuk melihat selisih.</span>
              : diff === 0 ? <span>Kas pas.</span>
              : diff > 0 ? <span>Lebih {rp(diff)}</span>
              : <span className="text-danger">Kurang {rp(-diff)}</span>}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="note">Catatan (opsional)</label>
          <input id="note" className="input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {err && <p className="text-sm text-danger" role="alert">{err}</p>}
        <div className="flex gap-2">
          <button className="btn-primary flex-1" disabled={busy || counted === ""} onClick={close}>{busy ? "Menutup…" : "Tutup kasir dan cetak laporan"}</button>
          <button className="btn-ghost" onClick={onCancel} disabled={busy}>Batal</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Kasir (POS) ---------- */
function Pos({ me, shift, reload, onClose }: { me: Me; shift: ShiftOut; reload: () => void; onClose: () => void }) {
  const biz: BusinessType = me.store?.businessType ?? "retail";
  const fnb = biz === "fnb";
  const online = useOnline();
  const branchId = shift.branchId;
  const [products, setProducts] = useState<P[]>([]);
  const [methods, setMethods] = useState<PayMethod[]>([]);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, Line>>({});
  const [method, setMethod] = useState(CASH_KEY);
  const [paid, setPaid] = useState("");
  const [ref, setRef] = useState("");
  const [orderType, setOrderType] = useState<string>("dine_in");
  const [tableNo, setTableNo] = useState("");
  const [customer, setCustomer] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const load = useCallback(async () => {
    const [list, pm] = await Promise.all([
      api<P[]>(`/api/products?branchId=${branchId}`),
      api<PayMethod[]>("/api/payment-methods"),
    ]);
    setProducts(list);
    setMethods(pm);
    setMethod((m) => (pm.some((x) => x.key === m) ? m : CASH_KEY));
    setCart((c) => Object.fromEntries(Object.entries(c).filter(([id]) => list.some((p) => p.id === id))));
  }, [branchId]);
  useEffect(() => { load().catch((x) => setErr((x as Error).message)); }, [load]);

  const shown = useMemo(() => products.filter((p) => (p.name + p.sku).toLowerCase().includes(q.toLowerCase())), [products, q]);
  const lines = products.filter((p) => cart[p.id]).map((p) => {
    const step = stepOf(p.unit), qty = parseQty(cart[p.id].q);
    const stock = Number(p.stock);
    const bad = !validQty(qty, step) ? (step < 1 ? "Kelipatan 0,1 (min. 0,1)" : "Jumlah tidak valid") : qty > stock + 1e-9 ? `Stok hanya ${fmtQty(stock)}` : "";
    return { p, qty: bad ? 0 : qty, text: cart[p.id].q, note: cart[p.id].note, step, bad, sub: bad ? 0 : lineTotal(Number(p.price), qty) };
  });
  const total = lines.reduce((a, l) => a + l.sub, 0);
  const cash = isCash(method);
  const change = Number(paid || 0) - total;
  const hasBad = lines.some((l) => l.bad);
  const cur = methods.find((m) => m.key === method);

  const setQty = (p: P, qty: number) => {
    const n = Math.max(0, Math.min(roundQty(qty), Number(p.stock)));
    setCart((c) => { const x = { ...c }; if (n > 0) x[p.id] = { q: fmtQty(n), note: c[p.id]?.note ?? "" }; else delete x[p.id]; return x; });
  };
  const add = (p: P, by = stepOf(p.unit)) => setQty(p, (cart[p.id] ? parseQty(cart[p.id].q) || 0 : 0) + by);
  const typeQty = (p: P, text: string) => setCart((c) => ({ ...c, [p.id]: { q: text.replace(/[^\d.,]/g, ""), note: c[p.id]?.note ?? "" } }));
  const setNote = (p: P, note: string) => setCart((c) => ({ ...c, [p.id]: { q: c[p.id]?.q ?? "", note } }));

  async function checkout() {
    setBusy(true); setErr("");
    try {
      const r = await api<ReceiptData>("/api/transactions", {
        method: "POST",
        body: {
          items: lines.map((l) => ({ productId: l.p.id, qty: l.qty, note: l.note })),
          paymentKey: method, paid: cash ? Number(paid) : total, paymentRef: ref,
          ...(fnb ? { orderType, tableNo, customerName: customer } : {}),
        },
      });
      setReceipt(r); setCart({}); setPaid(""); setRef(""); setTableNo(""); setCustomer(""); load(); reload();
    } catch (x) { setErr((x as Error).message); load().catch(() => {}); }
    setBusy(false);
  }

  const refLabel = cur?.group === "online" || cur?.group === "kurir" ? "No. pesanan / resi (opsional)" : "No. referensi (opsional)";
  const canPay = online && !busy && lines.length > 0 && !hasBad && (!cash || Number(paid) >= total);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div><span className="text-muted">Cabang</span><div className="font-medium">{shift.branchName}</div></div>
        <div><span className="text-muted">Dibuka</span><div>{tgl(shift.openedAt)}</div></div>
        <div><span className="text-muted">Penjualan shift ini</span><div className="font-mono">{rp(shift.totalSales)} <span className="text-muted">({shift.txCount} transaksi)</span></div></div>
        <div className="ml-auto"><button className="btn-ghost" onClick={onClose}>Tutup kasir</button></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        {receipt && <ReceiptModal receipt={receipt} fresh onClose={() => setReceipt(null)} />}
        <section className="space-y-3">
          <input className="input" placeholder="Cari nama atau SKU produk" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari produk" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shown.map((p) => {
              const out = Number(p.stock) < stepOf(p.unit) - 1e-9;
              const u = unitOf(p.unit).label;
              return (
                <button key={p.id} disabled={out} onClick={() => add(p)}
                  className="card text-left transition hover:border-accent disabled:opacity-50">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="mt-1 font-mono text-sm text-link">{rp(p.price)}<span className="text-xs text-muted"> / {u}</span></div>
                  <div className="mt-1 text-xs text-muted">{out ? "Stok habis" : `Stok ${fmtQty(Number(p.stock))} ${u}`}</div>
                </button>
              );
            })}
            {!shown.length && <p className="col-span-full text-sm text-muted">Belum ada produk. Minta bagian gudang menambahkan produk.</p>}
          </div>
        </section>

        <aside className="card h-fit space-y-3">
          <h2 className="font-semibold">Keranjang</h2>

          {fnb && (
            <div className="space-y-3 rounded-md border border-line p-3">
              <div className="flex gap-2" role="radiogroup" aria-label="Jenis pesanan">
                {ORDER_TYPES.map((o) => (
                  <button key={o.key} type="button" role="radio" aria-checked={orderType === o.key} onClick={() => setOrderType(o.key)}
                    className={`flex-1 ${orderType === o.key ? "btn-primary" : "btn-ghost"}`}>{o.label}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {orderType === "dine_in" && (
                  <div><label className="label" htmlFor="tbl">Nomor meja</label><input id="tbl" maxLength={10} className="input" value={tableNo} onChange={(e) => setTableNo(e.target.value)} /></div>
                )}
                <div className={orderType === "dine_in" ? "" : "col-span-2"}><label className="label" htmlFor="cust">Nama customer</label><input id="cust" maxLength={40} className="input" placeholder="Kosong = Customer #nomor" value={customer} onChange={(e) => setCustomer(e.target.value)} /></div>
              </div>
              <p className="text-xs text-muted">Nomor pesanan (#01, #02, …) dibuat otomatis per cabang dan mulai dari #01 lagi setiap hari.</p>
            </div>
          )}

          {!lines.length && <p className="text-sm text-muted">Pilih produk untuk menambahkannya.</p>}
          <ul className="divide-y divide-line">
            {lines.map(({ p, text, note, step, bad, sub }) => {
              const dec = step < 1, u = unitOf(p.unit).label;
              return (
                <li key={p.id} className="space-y-1 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex-1"><div>{p.name}</div><div className="font-mono text-xs text-muted">{rp(p.price)} / {u} · {rp(sub)}</div></div>
                    <button className="btn-ghost px-2 py-1" aria-label={`Kurangi ${p.name}`} onClick={() => setQty(p, (parseQty(text) || 0) - step)}>−</button>
                    <input aria-label={`Jumlah ${p.name} (${u})`} inputMode={dec ? "decimal" : "numeric"} value={text}
                      onChange={(e) => typeQty(p, dec ? e.target.value : e.target.value.replace(/\D/g, ""))}
                      className={`input w-16 px-1 py-1 text-center font-mono ${bad ? "border-danger" : ""}`} />
                    <button className="btn-ghost px-2 py-1" aria-label={`Tambah ${p.name}`} onClick={() => add(p)}>+</button>
                  </div>
                  {dec && (
                    <div className="flex flex-wrap items-center gap-1 text-xs">
                      <span className="text-muted">{u}:</span>
                      {[0.5, 1, 5].map((n) => <button key={n} className="btn-ghost px-2 py-0.5 text-xs" onClick={() => add(p, n)}>+{fmtQty(n)}</button>)}
                    </div>
                  )}
                  {fnb && <input aria-label={`Catatan untuk ${p.name}`} maxLength={80} className="input py-1 text-xs" placeholder="Catatan dapur (mis. tanpa gula)" value={note} onChange={(e) => setNote(p, e.target.value)} />}
                  {bad && <p className="text-xs text-danger" role="alert">{bad}</p>}
                </li>
              );
            })}
          </ul>
          <div className="flex justify-between text-lg font-semibold"><span>Total</span><span className="font-mono">{rp(total)}</span></div>

          <div>
            <span className="label">Metode pembayaran</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Metode pembayaran">
              {methods.map((m) => (
                <button key={m.key} type="button" role="radio" aria-checked={method === m.key} title={GROUP_LABEL[m.group]}
                  className={method === m.key ? "btn-primary" : "btn-ghost"} onClick={() => setMethod(m.key)}>{m.label}</button>
              ))}
            </div>
          </div>

          {cash ? (
            <div>
              <label className="label" htmlFor="paid">Uang diterima</label>
              <input id="paid" inputMode="numeric" className="input font-mono" value={paid} onChange={(e) => setPaid(e.target.value.replace(/\D/g, ""))} />
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="btn-ghost" onClick={() => setPaid(String(total))}>Uang pas</button>
                {[50000, 100000].map((n) => <button key={n} className="btn-ghost" onClick={() => setPaid(String(n))}>{rp(n)}</button>)}
              </div>
              <div className="mt-2 flex justify-between text-sm"><span className="text-muted">Kembalian</span><span className="font-mono">{paid && change >= 0 ? rp(change) : "-"}</span></div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted">Dibayar pas {rp(total)} lewat {cur?.label}. Pastikan pembayaran sudah masuk sebelum menekan tombol di bawah.</p>
              <div><label className="label" htmlFor="ref">{refLabel}</label><input id="ref" maxLength={40} className="input" value={ref} onChange={(e) => setRef(e.target.value)} /></div>
            </div>
          )}

          {!online && <p className="text-sm text-danger" role="alert">Anda sedang offline. Pembayaran dinonaktifkan sampai koneksi kembali.</p>}
          {err && <p className="text-sm text-danger" role="alert">{err}</p>}
          <button className="btn-primary w-full" disabled={!canPay} onClick={checkout}>
            {busy ? "Memproses…" : "Bayar dan cetak struk"}
          </button>
        </aside>
      </div>
    </div>
  );
}

function Cashier({ me }: { me: Me }) {
  const [shift, setShift] = useState<ShiftOut | null | undefined>(undefined);
  const [closing, setClosing] = useState(false);
  const [report, setReport] = useState<ShiftOut | null>(null);
  const [fatal, setFatal] = useState("");

  const reload = useCallback(async () => {
    try { setShift((await api<{ shift: ShiftOut | null }>("/api/shifts?current=1")).shift); }
    catch (x) { setFatal((x as Error).message); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  if (fatal) return <p className="text-sm text-danger" role="alert">{fatal}</p>;
  if (shift === undefined) return <p className="text-sm text-muted">Memuat…</p>;

  return (
    <>
      {report && <ShiftReportModal shift={report} onClose={() => setReport(null)} />}
      {closing && shift && (
        <CloseModal shift={shift} onCancel={() => setClosing(false)}
          onDone={(s) => { setClosing(false); setShift(null); setReport(s); }} />
      )}
      {shift ? <Pos me={me} shift={shift} reload={reload} onClose={() => setClosing(true)} /> : <OpenShift me={me} onOpened={setShift} />}
    </>
  );
}

export default function Kasir() { return <Shell>{(me) => <Cashier me={me} />}</Shell>; }
