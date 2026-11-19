"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Shell from "@/components/Shell";
import ReceiptModal from "@/components/ReceiptModal";
import ShiftReportModal from "@/components/ShiftReportModal";
import BranchSelect from "@/components/BranchSelect";
import { useBranch } from "@/lib/useBranch";
import { api, isNetworkError, rp, tgl, wibDay } from "@/lib/client";
import { useOnline } from "@/lib/useOnline";
import { useQueue } from "@/lib/useQueue";
import ProductThumb from "@/components/ProductThumb";
import { matches } from "@/lib/search";
import {
  buildLocalReceipt, enqueue, getQueue, loadCatalog, loadShift, newClientId, nextOfflineNumbers, pendingQty, removeTx, retryTx,
  saveCatalog, saveShift, subscribeQueue, type QueuedTx,
} from "@/lib/offline";
import {
  CASH_KEY, DEFAULT_TAX, GROUP_LABEL, ORDER_TYPES, calcDiscount, calcTotals, discountLabel, discountUsable, fmtQty, fmtRate, isCash, isFoodDelivery,
  lineTotal, parseQty, roundQty, stepOf, unitOf, validQty,
  type BusinessType, type DiscountPreset, type DiscountType, type PayMethod, type TaxConfig,
} from "@/lib/business";
import type { Me, ReceiptData } from "@/lib/types";
import type { ShiftOut } from "@/lib/shiftTypes";

type P = { id: string; name: string; sku: string; price: string; stock: string; unit: string; imageVer?: string };
type Line = { q: string; note: string };
type R = Record<string, string>;

/* ---------- animasi dan gaya tambahan ---------- */
const CSS = `
@keyframes ks-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.ks-rise{animation:ks-rise .4s cubic-bezier(.2,.7,.2,1) both}
@keyframes ks-pop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.18)}100%{transform:scale(1);opacity:1}}
.ks-pop{animation:ks-pop .28s ease-out both}
@keyframes ks-slide{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}
.ks-slide{animation:ks-slide .28s ease-out both}
@keyframes ks-modal{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
.ks-modal{animation:ks-modal .25s cubic-bezier(.2,.8,.2,1) both}
@keyframes ks-fade{from{opacity:0}to{opacity:1}}
.ks-fade{animation:ks-fade .2s ease-out both}
.ks-tile{transition:transform .15s ease,box-shadow .2s ease,border-color .2s ease}
.ks-tile:not(:disabled):hover{transform:translateY(-3px);box-shadow:0 14px 28px -16px rgb(0 0 0 / .35)}
.ks-tile:not(:disabled):active{transform:scale(.96)}
.ks-press{transition:transform .12s ease,opacity .2s ease}
.ks-press:not(:disabled):active{transform:scale(.95)}
@media (prefers-reduced-motion:reduce){
  .ks-rise,.ks-pop,.ks-slide,.ks-modal,.ks-fade{animation:none!important}
  .ks-tile:not(:disabled):hover{transform:none}
}
`;

/* Angka naik pelan-pelan ke nilai barunya */
function useCountUp(target: number, ms = 800) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      from.current = target;
      setV(target);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const cur = a + (target - a) * (1 - Math.pow(1 - p, 3));
      from.current = cur;
      setV(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/* "(2 jam 5 menit lalu)" yang berjalan sendiri */
function Since({ iso }: { iso: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(id); }, []);
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (Number.isNaN(m)) return null;
  const t = m < 1 ? "baru saja" : m < 60 ? `${m} menit lalu` : `${Math.floor(m / 60)} jam ${m % 60} menit lalu`;
  return <span className="text-muted">({t})</span>;
}

/* ---------- Buka kasir ---------- */
function OpenShift({ me, onOpened }: { me: Me; onOpened: (s: ShiftOut) => void }) {
  const owner = me.session.role === "kepala_toko";
  const [branches, setBranches] = useState<R[]>([]);
  const [branch, setBranch] = useBranch(me.session.branchId);
  const branchId = owner && branches.some((b) => b.id === branch) ? branch : owner ? branches[0]?.id ?? "" : me.session.branchId;
  const [cash, setCash] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const online = useOnline();
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
    <form onSubmit={open} className="card ks-rise mx-auto max-w-md space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-accent/10 text-accent dark:text-link" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></svg>
        </span>
        <div>
          <h2 className="text-lg font-semibold">Buka kasir</h2>
          <p className="text-sm text-muted">Hitung uang tunai di laci, lalu isi sebagai modal awal. Semua penjualan sampai kasir ditutup akan dijumlahkan otomatis.</p>
        </div>
      </div>
      {owner && branches.length > 0 && <BranchSelect branches={branches} value={branchId} onChange={setBranch} />}
      <div>
        <label className="label" htmlFor="opening">Modal awal (uang di laci)</label>
        <input id="opening" inputMode="numeric" className="input font-mono text-lg" placeholder="0" value={cash} onChange={(e) => setCash(e.target.value.replace(/\D/g, ""))} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {[100000, 200000, 500000].map((n) => (
            <button key={n} type="button" className="btn-ghost ks-press px-3 py-1 text-sm" onClick={() => setCash(String(n))}>{rp(n)}</button>
          ))}
          <span key={cash} className="ks-pop ml-auto font-mono text-sm text-muted">{cash ? rp(Number(cash)) : ""}</span>
        </div>
      </div>
      {!online && <p className="text-sm font-medium text-danger" role="alert">Buka kasir butuh internet. Sambungkan internet lalu coba lagi.</p>}
      {err && <p className="text-sm text-danger" role="alert">{err}</p>}
      <button className="btn-primary btn-lg ks-press w-full" disabled={busy || !online || (owner && !branchId)}>{busy ? "Membuka…" : "Buka kasir"}</button>
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

  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onCancel(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [busy, onCancel]);

  async function close() {
    setBusy(true); setErr("");
    try {
      const r = await api<{ shift: ShiftOut }>("/api/shifts", { method: "POST", body: { action: "close", countedCash: Number(counted), note } });
      onDone(r.shift);
    } catch (x) { setErr((x as Error).message); setBusy(false); }
  }

  return (
    <div className="ks-fade fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Tutup kasir">
      <div className="card ks-modal max-h-full w-full max-w-lg space-y-4 overflow-y-auto">
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
          <div className="flex gap-2">
            <input id="counted" autoFocus inputMode="numeric" className="input flex-1 font-mono" value={counted} onChange={(e) => setCounted(e.target.value.replace(/\D/g, ""))} />
            <button type="button" className="btn-ghost ks-press" onClick={() => setCounted(String(shift.expectedCash))}>Pas</button>
          </div>
          <p key={diff === null ? "x" : diff === 0 ? "pas" : diff > 0 ? "lebih" : "kurang"} className={`ks-pop mt-2 rounded-lg px-3 py-2 text-sm font-medium ${diff === null ? "text-muted" : diff === 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : diff > 0 ? "bg-sun/25" : "bg-danger/10 text-danger"}`} aria-live="polite">
            {diff === null ? "Isi jumlah uang untuk melihat selisih."
              : diff === 0 ? "✓ Kas pas."
              : diff > 0 ? `Lebih ${rp(diff)}`
              : `Kurang ${rp(-diff)}`}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="note">Catatan (opsional)</label>
          <input id="note" className="input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {err && <p className="text-sm text-danger" role="alert">{err}</p>}
        <div className="flex gap-2">
          <button className="btn-primary ks-press flex-1" disabled={busy || counted === ""} onClick={close}>{busy ? "Menutup…" : "Tutup kasir dan cetak laporan"}</button>
          <button className="btn-ghost ks-press" onClick={onCancel} disabled={busy}>Batal</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Antrean transaksi offline ---------- */
function QueuePanel({ uid }: { uid: string }) {
  const [items, setItems] = useState<QueuedTx[]>([]);
  useEffect(() => { const f = () => setItems(getQueue().filter((x) => x.cashierId === uid)); f(); return subscribeQueue(f); }, [uid]);
  if (!items.length) return null;
  const pending = items.filter((x) => x.state === "pending"), failed = items.filter((x) => x.state === "failed");
  return (
    <section className="card ks-rise space-y-3 border-sun p-4" aria-label="Transaksi offline">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold">
          {pending.length > 0 && <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-70 motion-reduce:animate-none" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" /></span>}
          Transaksi offline
        </h2>
        <span className="text-sm text-muted">{pending.length} menunggu, {failed.length} gagal, total {rp(items.reduce((a, x) => a + x.total, 0))}</span>
      </div>
      {pending.length > 0 && <p className="text-sm text-muted">Dikirim otomatis saat internet kembali. Jangan hapus data browser sebelum semuanya terkirim.</p>}
      {failed.map((t) => (
        <div key={t.clientId} className="space-y-2 rounded-xl border border-danger/40 bg-danger/5 p-3 text-sm">
          <div className="font-semibold">{t.receipt.invoice} ({rp(t.total)}, {tgl(t.createdAt)})</div>
          <div className="text-danger">{t.error}</div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost ks-press" onClick={() => { retryTx(t.clientId); window.dispatchEvent(new Event("kt-sync")); }}>Coba kirim lagi</button>
            <button className="btn-ghost ks-press" onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify({ struk: t.receipt, permintaan: t.body }, null, 2)); alert("Data transaksi disalin."); } catch { alert("Tidak bisa menyalin. Foto struknya sebagai cadangan."); } }}>Salin data</button>
            <button className="btn-ghost ks-press text-danger" onClick={() => { if (confirm("Buang transaksi ini dari perangkat? Penjualannya TIDAK akan tercatat di laporan.")) removeTx(t.clientId); }}>Buang</button>
          </div>
        </div>
      ))}
    </section>
  );
}

/* ---------- Kasir (POS) ---------- */
function Pos({ me, shift, reload, onClose }: { me: Me; shift: ShiftOut; reload: () => void; onClose: () => void }) {
  const biz: BusinessType = me.store?.businessType ?? "retail";
  const fnb = biz === "fnb";
  const online = useOnline();
  const uid = me.session.uid;
  const queue = useQueue(uid);
  const branchId = shift.branchId;
  const [products, setProducts] = useState<P[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [methods, setMethods] = useState<PayMethod[]>([]);
  const [taxCfg, setTaxCfg] = useState<TaxConfig>(DEFAULT_TAX);
  const [discounts, setDiscounts] = useState<DiscountPreset[]>([]);
  const [manualMax, setManualMax] = useState(0);
  const [cachedAt, setCachedAt] = useState("");
  const [discSel, setDiscSel] = useState("");
  const [manual, setManual] = useState<{ type: DiscountType; value: string; note: string }>({ type: "percent", value: "", note: "" });
  const [q, setQ] = useState("");
  const [view, setView] = useState<"all" | "cart" | "low">("all");
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
  const [flash, setFlash] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const payRef = useRef<() => void>(() => {});
  const salesShown = useCountUp(shift.totalSales);

  // Muat data kasir. Saat internet mati, pakai data yang tersimpan di perangkat (harga dan stok terakhir saat online)
  const load = useCallback(async () => {
    const adopt = (list: P[], pm: PayMethod[], tax: TaxConfig, ds: DiscountPreset[], mm: number) => {
      // Stok yang tampil = stok server dikurangi penjualan offline yang belum terkirim
      const pend = pendingQty(branchId, uid);
      setProducts(list.map((p) => (pend.has(p.id) ? { ...p, stock: String(roundQty(Number(p.stock) - pend.get(p.id)!)) } : p)));
      setTaxCfg(tax); setMethods(pm); setDiscounts(ds); setManualMax(mm);
      setMethod((m) => (pm.some((x) => x.key === m) ? m : CASH_KEY));
      setCart((c) => Object.fromEntries(Object.entries(c).filter(([id]) => list.some((p) => p.id === id))));
      setLoaded(true);
    };
    try {
      const [list, pm, st, ds] = await Promise.all([
        api<P[]>(`/api/products?branchId=${branchId}`),
        api<PayMethod[]>("/api/payment-methods"),
        api<{ tax: TaxConfig; discountManualMax: number }>("/api/store"),
        api<DiscountPreset[]>("/api/discounts"),
      ]);
      saveCatalog({ branchId, products: list as unknown as Record<string, string>[], methods: pm, tax: st.tax, discounts: ds, manualMax: st.discountManualMax ?? 0, savedAt: new Date().toISOString() });
      setCachedAt(""); adopt(list, pm, st.tax, ds, st.discountManualMax ?? 0);
    } catch (x) {
      if (!isNetworkError(x)) throw x;
      const c = loadCatalog(branchId);
      if (!c) throw new Error("Belum ada data kasir tersimpan untuk mode offline. Buka halaman Kasir saat online setidaknya sekali.");
      setCachedAt(c.savedAt); adopt(c.products as unknown as P[], c.methods, c.tax, c.discounts, c.manualMax);
    }
  }, [branchId, uid]);
  useEffect(() => { load().catch((x) => { setErr((x as Error).message); setLoaded(true); }); }, [load]);
  // Segarkan saat internet kembali dan setelah antrean terkirim
  useEffect(() => { if (online) load().catch(() => {}); }, [online]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const f = () => load().catch(() => {}); window.addEventListener("kt-synced", f); return () => window.removeEventListener("kt-synced", f); }, [load]);

  // Pintasan keyboard: "/" untuk mencari, Ctrl+Enter untuk membayar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (e.key === "/" && !typing) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); payRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const lowN = products.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 5).length;
  const shown = useMemo(
    () =>
      products.filter((p) => {
        if (!matches(q, p.name, p.sku)) return false;
        if (view === "cart") return !!cart[p.id];
        if (view === "low") return Number(p.stock) > 0 && Number(p.stock) <= 5;
        return true;
      }),
    [products, q, view, cart],
  );
  const lines = products.filter((p) => cart[p.id]).map((p) => {
    const step = stepOf(p.unit), qty = parseQty(cart[p.id].q);
    const stock = Number(p.stock);
    const bad = !validQty(qty, step) ? (step < 1 ? "Kelipatan 0,1 (min. 0,1)" : "Jumlah tidak valid") : qty > stock + 1e-9 ? `Stok hanya ${fmtQty(stock)}` : "";
    return { p, qty: bad ? 0 : qty, text: cart[p.id].q, note: cart[p.id].note, step, bad, sub: bad ? 0 : lineTotal(Number(p.price), qty) };
  });
  const subtotal = lines.reduce((a, l) => a + l.sub, 0);

  // ---- Diskon: diskon siap pakai (dibuat kepala toko) atau manual (dengan batas dan alasan wajib)
  const today = wibDay();
  const eligible = discounts.filter((d) => discountUsable(d, subtotal, today));
  const waiting = discounts.filter((d) => d.active && subtotal > 0 && !discountUsable(d, subtotal, today) && subtotal < d.minSubtotal && (!d.validTo || d.validTo >= today) && (!d.validFrom || d.validFrom <= today));
  const preset = discSel && discSel !== "manual" ? eligible.find((d) => d.id === discSel) : undefined;
  const canManual = me.session.role !== "kasir" || manualMax > 0;
  const mv = parseQty(manual.value);
  const manualAmount = discSel === "manual" && mv > 0 ? calcDiscount(subtotal, { type: manual.type, value: mv }) : 0;
  const capAmount = me.session.role === "kasir" ? Math.round((subtotal * manualMax) / 100) : subtotal;
  const manualShape = mv > 0 && (manual.type === "percent" ? mv <= 100 : Number.isInteger(mv));
  const manualOver = discSel === "manual" && manualAmount > capAmount;
  const manualOk = discSel === "manual" && manualShape && manual.note.trim().length >= 3 && !manualOver;
  const discInput = preset
    ? { type: preset.type, value: preset.value, name: preset.name, presetId: preset.id as string | undefined, note: "" }
    : manualOk ? { type: manual.type, value: mv, name: "Manual", presetId: undefined, note: manual.note.trim() } : null;
  const discountBlocked = discSel === "manual" && !manualOk;
  // Server menghitung ulang dengan rumus yang sama; ini hanya tampilan
  const { discount, tax, total } = calcTotals(subtotal, discInput, taxCfg);
  const cash = isCash(method);
  const change = Number(paid || 0) - total;
  const hasBad = lines.some((l) => l.bad);
  const cur = methods.find((m) => m.key === method);
  // Pesanan dari ShopeeFood/GoFood/GrabFood otomatis dibungkus dan tidak memakai nomor meja
  const food = fnb && isFoodDelivery(method);
  const effType = food ? "take_away" : orderType;

  const setQty = (p: P, qty: number) => {
    const n = Math.max(0, Math.min(roundQty(qty), Number(p.stock)));
    setCart((c) => { const x = { ...c }; if (n > 0) x[p.id] = { q: fmtQty(n), note: c[p.id]?.note ?? "" }; else delete x[p.id]; return x; });
  };
  const add = (p: P, by = stepOf(p.unit)) => setQty(p, (cart[p.id] ? parseQty(cart[p.id].q) || 0 : 0) + by);
  const typeQty = (p: P, text: string) => setCart((c) => ({ ...c, [p.id]: { q: text.replace(/[^\d.,]/g, ""), note: c[p.id]?.note ?? "" } }));
  const setNote = (p: P, note: string) => setCart((c) => ({ ...c, [p.id]: { q: c[p.id]?.q ?? "", note } }));

  async function checkout() {
    setBusy(true); setErr("");
    const clientId = newClientId(); // sama untuk percobaan online maupun antrean offline, jadi tidak pernah tercatat dua kali
    const discBody = discInput ? (discInput.presetId ? { presetId: discInput.presetId } : { manual: true, type: discInput.type, value: discInput.value, note: discInput.note }) : undefined;
    const orderPart = fnb ? { orderType: effType, tableNo: effType === "dine_in" ? tableNo : "", customerName: customer } : {};
    const common = { paymentKey: method, paid: cash ? Number(paid) : total, paymentRef: ref, discount: discBody, ...orderPart };
    const finish = (r: ReceiptData) => {
      setReceipt(r); setCart({}); setPaid(""); setRef(""); setTableNo(""); setCustomer(""); setDiscSel(""); setManual({ type: "percent", value: "", note: "" }); setView("all");
    };

    // Simpan di perangkat, cetak struk dengan nomor OFF-..., kirim otomatis saat internet kembali
    const saveOffline = () => {
      const at = new Date(), nums = nextOfflineNumbers(branchId, wibDay(at)), createdAt = at.toISOString();
      const rc = buildLocalReceipt({
        invoice: nums.invoice, orderNo: fnb ? nums.orderNo : "", createdAt, storeName: me.store?.name ?? "", branchName: shift.branchName,
        street: me.branch && shift.branchId === me.session.branchId ? me.branch.street : "", cashierName: me.session.name, biz,
        lines: lines.map((l) => ({ name: l.p.name, price: Number(l.p.price), qty: l.qty, unit: l.p.unit || "pcs", note: fnb ? l.note : "" })),
        discount: discInput ? { type: discInput.type, value: discInput.value, name: discInput.name } : null, taxCfg,
        method: { key: method, label: cur?.label ?? method }, paymentRef: ref, paid: cash ? Number(paid) : total,
        orderType: fnb ? effType : "", tableNo: fnb && effType === "dine_in" ? tableNo : "", customerName: fnb ? customer : "",
      });
      const body = {
        ...common, clientId, offline: true, offlineAt: createdAt, offlineNo: nums.invoice, orderNo: fnb ? nums.orderNo : undefined,
        items: lines.map((l) => ({ productId: l.p.id, qty: l.qty, note: l.note, price: Number(l.p.price) })),
        tax: taxCfg, clientTotal: rc.total, paymentLabel: cur?.label,
        discount: discInput ? { ...(discBody as object), name: discInput.name, type: discInput.type, value: discInput.value } : undefined,
      };
      if (!enqueue({ clientId, cashierId: uid, branchId, createdAt, total: rc.total, body, receipt: rc, state: "pending", tries: 0 })) {
        setErr("Penyimpanan perangkat penuh atau diblokir. Transaksi TIDAK tersimpan. Catat manual, lalu kosongkan ruang browser atau sambungkan internet.");
        return;
      }
      setProducts((ps) => ps.map((p) => { const l = lines.find((x) => x.p.id === p.id); return l ? { ...p, stock: String(roundQty(Number(p.stock) - l.qty)) } : p; }));
      finish(rc);
    };

    if (!online) { saveOffline(); setBusy(false); return; }
    try {
      const r = await api<ReceiptData>("/api/transactions", { method: "POST", body: { ...common, clientId, items: lines.map((l) => ({ productId: l.p.id, qty: l.qty, note: l.note })) } });
      finish(r); load().catch(() => {}); reload();
    } catch (x) {
      if (isNetworkError(x)) saveOffline(); // internet putus tepat saat membayar
      else { setErr((x as Error).message); load().catch(() => {}); }
    }
    setBusy(false);
  }

  const refLabel = cur?.group === "online" || cur?.group === "kurir" ? "No. pesanan / resi (opsional)" : "No. referensi (opsional)";
  const canPay = !busy && lines.length > 0 && !hasBad && !discountBlocked && (!cash || Number(paid) >= total);
  const mustSync = !online || queue.total > 0;
  payRef.current = () => { if (canPay) checkout(); };

  const why = busy ? "" : !lines.length ? "Pilih produk untuk memulai."
    : hasBad ? "Periksa jumlah barang yang berwarna merah."
    : discountBlocked ? "Lengkapi diskon manual atau pilih Tanpa diskon."
    : cash && Number(paid) < total ? "Uang diterima masih kurang."
    : "";
  // Saran nominal uang diterima: dibulatkan ke atas ke pecahan yang lazim
  const cashSuggest = total > 0 ? Array.from(new Set([5000, 10000, 20000, 50000, 100000].map((n) => Math.ceil(total / n) * n))).filter((n) => n > total).slice(0, 4) : [];
  const totalQty = lines.reduce((a, l) => a + l.qty, 0);

  return (
    <div className="space-y-4">
      {(!online || cachedAt) && (
        <div className="ks-rise flex items-start gap-3 rounded-xl bg-sun/25 px-4 py-3 text-sm font-medium" role="status">
          <svg className="mt-0.5 h-5 w-5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18" /></svg>
          <span>Mode offline. Harga dan stok memakai data tersimpan{cachedAt ? ` (${tgl(cachedAt)})` : ""}. Transaksi disimpan di perangkat ini, struknya tetap bisa dicetak, dan dikirim otomatis saat internet kembali.</span>
        </div>
      )}

      <div className="card ks-rise flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <div><span className="text-muted">Cabang</span><div className="font-medium">{shift.branchName}</div></div>
        <div><span className="text-muted">Dibuka</span><div>{tgl(shift.openedAt)} <Since iso={shift.openedAt} /></div></div>
        <div>
          <span className="text-muted">Penjualan shift ini</span>
          <div className="font-mono">{rp(Math.round(salesShown))} <span className="text-muted">({shift.txCount} transaksi)</span>{queue.pendingSales > 0 && <span className="text-muted"> + {rp(queue.pendingSales)} belum terkirim</span>}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${online ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-danger/10 text-danger"}`}>
            <span className="relative flex h-2 w-2">
              {online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" />}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-danger"}`} />
            </span>
            {online ? "Online" : "Offline"}
          </span>
          {queue.total > 0 && <span key={queue.total} className="ks-pop rounded-full bg-sun/30 px-3 py-1 text-xs font-semibold">{queue.total} menunggu dikirim</span>}
        </div>
        <div className="ml-auto text-right">
          <button className="btn-ghost ks-press" onClick={onClose} disabled={mustSync}>Tutup kasir</button>
          {mustSync && <p className="mt-1 max-w-[220px] text-xs text-muted">Tutup kasir butuh internet dan semua transaksi offline sudah terkirim.</p>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        {receipt && <ReceiptModal receipt={receipt} fresh onClose={() => setReceipt(null)} />}
        <section className="space-y-3">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input ref={searchRef} type="text" className="input py-3 pl-11 pr-10 text-base" placeholder="Cari produk, atau scan barcode" aria-label="Cari produk" value={q}
              onChange={(e) => { setQ(e.target.value); setFlash(""); }}
              onKeyDown={(e) => {
                // Pemindai barcode mengetik kode SKU lalu menekan Enter: tambahkan langsung ke keranjang
                if (e.key !== "Enter" || !q.trim()) return;
                if (e.ctrlKey || e.metaKey) return;
                e.preventDefault();
                const hit = products.find((p) => p.sku && p.sku.toLowerCase() === q.trim().toLowerCase()) ?? (shown.length === 1 ? shown[0] : undefined);
                if (!hit) { setFlash("Produk tidak ditemukan"); return; }
                if (Number(hit.stock) < stepOf(hit.unit) - 1e-9) { setFlash(`${hit.name}: stok habis`); return; }
                add(hit); setQ(""); setFlash(`Ditambahkan: ${hit.name}`); setTimeout(() => setFlash(""), 2500);
              }} />
            {q && <button type="button" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xl leading-none text-muted hover:text-ink" aria-label="Hapus pencarian" onClick={() => setQ("")}>×</button>}
          </div>

          {products.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter produk">
              {([["all", `Semua (${products.length})`], ["cart", `Di keranjang (${lines.length})`], ["low", `Stok menipis (${lowN})`]] as const).map(([k, label]) => (
                <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}
                  className={`ks-press rounded-full border px-3 py-1 text-sm font-semibold transition ${view === k ? "border-accent bg-accent text-white" : "border-line hover:border-accent"}`}>{label}</button>
              ))}
              <span className="ml-auto hidden text-xs text-muted lg:inline">Tekan <kbd className="rounded border border-line px-1.5 py-0.5 font-mono">/</kbd> untuk mencari</span>
            </div>
          )}
          <p className="min-h-[1.25rem] text-sm text-muted" aria-live="polite">{flash || (q ? `${shown.length} produk cocok dengan “${q}”` : view === "all" ? `${products.length} produk` : `${shown.length} produk`)}</p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {!loaded && Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card animate-pulse space-y-2 p-2.5 motion-reduce:animate-none" aria-hidden="true">
                <div className="aspect-square rounded-lg bg-line" /><div className="h-3 w-3/4 rounded bg-line" /><div className="h-3 w-1/2 rounded bg-line" />
              </div>
            ))}
            {loaded && shown.map((p, i) => {
              const out = Number(p.stock) < stepOf(p.unit) - 1e-9;
              const low = !out && Number(p.stock) <= 5;
              const u = unitOf(p.unit).label;
              const inCart = cart[p.id];
              return (
                <button key={p.id} disabled={out} onClick={() => add(p)} style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                  className={`ks-tile ks-rise card relative flex flex-col gap-2 p-2.5 text-left hover:border-accent disabled:opacity-50 ${inCart ? "border-accent ring-1 ring-accent" : ""}`}>
                  <div className="relative">
                    <ProductThumb id={p.id} ver={p.imageVer} name={p.name} square />
                    {inCart && <span key={inCart.q} className="ks-pop absolute right-1.5 top-1.5 min-w-[1.75rem] rounded-full bg-accent px-2 py-0.5 text-center text-xs font-bold text-white shadow-lg">{inCart.q || "…"}</span>}
                    {out && <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/45 text-sm font-bold text-white">Habis</span>}
                  </div>
                  <div className="px-0.5">
                    <div className="text-sm font-semibold leading-snug">{p.name}</div>
                    <div className="mt-1 font-mono text-sm text-link">{rp(p.price)}<span className="text-xs text-muted"> / {u}</span></div>
                    <div className={`mt-0.5 text-xs ${low ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted"}`}>{out ? "Stok habis" : low ? `Sisa ${fmtQty(Number(p.stock))} ${u}` : `Stok ${fmtQty(Number(p.stock))} ${u}`}</div>
                  </div>
                </button>
              );
            })}
            {loaded && !products.length && <p className="col-span-full text-sm text-muted">Belum ada produk. Minta bagian gudang menambahkan produk.</p>}
            {loaded && !!products.length && !shown.length && (
              <p className="col-span-full text-sm text-muted">
                {q ? `Tidak ada produk yang cocok dengan “${q}”.` : view === "cart" ? "Keranjang masih kosong." : "Tidak ada produk dengan stok menipis."}{" "}
                {(q || view !== "all") && <button type="button" className="font-semibold text-link underline underline-offset-4" onClick={() => { setQ(""); setView("all"); }}>Tampilkan semua</button>}
              </p>
            )}
          </div>
        </section>

        <aside id="keranjang" className="card h-fit scroll-mt-4 space-y-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Keranjang</h2>
            {lines.length > 0 && <span key={lines.length} className="ks-pop rounded-full bg-accent/10 px-2.5 py-0.5 text-sm font-semibold text-accent dark:text-link">{lines.length} jenis, {fmtQty(roundQty(totalQty))} item</span>}
            {lines.length > 0 && <button type="button" className="ml-auto text-sm font-semibold text-muted underline underline-offset-4 transition hover:text-danger" onClick={() => { if (confirm("Kosongkan keranjang?")) setCart({}); }}>Kosongkan</button>}
          </div>

          {fnb && (
            <div className="space-y-3 rounded-xl border border-line p-3">
              <div className="flex gap-2" role="radiogroup" aria-label="Jenis pesanan">
                {ORDER_TYPES.map((o) => (
                  <button key={o.key} type="button" role="radio" aria-checked={effType === o.key} disabled={food} onClick={() => setOrderType(o.key)}
                    className={`ks-press flex-1 ${effType === o.key ? "btn-primary" : "btn-ghost"}`}>{o.label}</button>
                ))}
              </div>
              {food && <p className="rounded-lg bg-sun/20 px-3 py-2 text-sm font-medium" role="status">Pesanan {cur?.label} otomatis dibungkus, jadi tidak perlu nomor meja.</p>}
              <div className="grid grid-cols-2 gap-3">
                {effType === "dine_in" && (
                  <div><label className="label" htmlFor="tbl">Nomor meja</label><input id="tbl" maxLength={10} className="input" value={tableNo} onChange={(e) => setTableNo(e.target.value)} /></div>
                )}
                <div className={effType === "dine_in" ? "" : "col-span-2"}><label className="label" htmlFor="cust">{food ? "Nama pemesan (sesuai aplikasi)" : "Nama customer"}</label><input id="cust" maxLength={40} className="input" placeholder="Kosong = Customer #nomor" value={customer} onChange={(e) => setCustomer(e.target.value)} /></div>
              </div>
              <p className="text-xs text-muted">Nomor pesanan (#01, #02, …) dibuat otomatis per cabang dan mulai dari #01 lagi setiap hari.{!online && " Saat offline nomornya berformat huruf, misalnya A01."}</p>
            </div>
          )}

          {!lines.length && (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-paper px-4 py-8 text-center">
              <svg className="h-10 w-10 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 7h12l1 13H5L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
              <p className="text-sm font-medium">Keranjang masih kosong</p>
              <p className="text-sm text-muted">Pilih produk atau scan barcode untuk menambahkannya.</p>
            </div>
          )}
          <ul className="divide-y divide-line">
            {lines.map(({ p, text, note, step, bad, sub }) => {
              const dec = step < 1, u = unitOf(p.unit).label;
              return (
                <li key={p.id} className="ks-slide space-y-1.5 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="font-mono text-xs text-muted">{rp(p.price)} / {u} · <span key={sub} className="ks-pop inline-block font-semibold text-ink">{rp(sub)}</span></div>
                    </div>
                    <button className="btn-ghost ks-press px-2.5 py-1" aria-label={`Kurangi ${p.name}`} onClick={() => setQty(p, (parseQty(text) || 0) - step)}>−</button>
                    <input aria-label={`Jumlah ${p.name} (${u})`} inputMode={dec ? "decimal" : "numeric"} value={text}
                      onChange={(e) => typeQty(p, dec ? e.target.value : e.target.value.replace(/\D/g, ""))}
                      className={`input w-16 px-1 py-1 text-center font-mono ${bad ? "border-danger" : ""}`} />
                    <button className="btn-ghost ks-press px-2.5 py-1" aria-label={`Tambah ${p.name}`} onClick={() => add(p)}>+</button>
                    <button type="button" className="rounded-md p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger" aria-label={`Hapus ${p.name} dari keranjang`} onClick={() => setQty(p, 0)}>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12" /></svg>
                    </button>
                  </div>
                  {dec && (
                    <div className="flex flex-wrap items-center gap-1 text-xs">
                      <span className="text-muted">{u}:</span>
                      {[0.5, 1, 5].map((n) => <button key={n} className="btn-ghost ks-press px-2 py-0.5 text-xs" onClick={() => add(p, n)}>+{fmtQty(n)}</button>)}
                    </div>
                  )}
                  {fnb && <input aria-label={`Catatan untuk ${p.name}`} maxLength={80} className="input py-1 text-xs" placeholder="Catatan dapur (mis. tanpa gula)" value={note} onChange={(e) => setNote(p, e.target.value)} />}
                  {bad && <p className="text-xs text-danger" role="alert">{bad}</p>}
                </li>
              );
            })}
          </ul>

          {lines.length > 0 && (eligible.length > 0 || canManual || waiting.length > 0) && (
            <div className="ks-rise space-y-2 rounded-xl border border-line p-3">
              <label className="label" htmlFor="disc">Diskon</label>
              <select id="disc" className="input" value={preset || discSel === "manual" ? discSel : ""} onChange={(e) => setDiscSel(e.target.value)}>
                <option value="">Tanpa diskon</option>
                {eligible.map((d) => <option key={d.id} value={d.id}>{d.name} ({discountLabel(d)})</option>)}
                {canManual && <option value="manual">Diskon manual</option>}
              </select>
              {discSel && discSel !== "manual" && !preset && <p className="text-xs font-medium text-danger" role="alert">Diskon ini tidak berlaku untuk belanja sekarang, jadi tidak dipakai.</p>}
              {waiting.slice(0, 2).map((d) => <p key={d.id} className="text-xs text-muted">{d.name} berlaku untuk belanja minimal {rp(d.minSubtotal)}. <span className="font-semibold text-link">Kurang {rp(d.minSubtotal - subtotal)} lagi.</span></p>)}
              {discSel === "manual" && (
                <div className="ks-rise space-y-2">
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <select aria-label="Jenis diskon manual" className="input" value={manual.type} onChange={(e) => setManual({ ...manual, type: e.target.value as DiscountType, value: "" })}>
                      <option value="percent">Persen (%)</option><option value="nominal">Rupiah (Rp)</option>
                    </select>
                    <input aria-label="Nilai diskon manual" inputMode="decimal" className="input font-mono" placeholder={manual.type === "percent" ? "Contoh: 5" : "Contoh: 5000"} value={manual.value}
                      onChange={(e) => setManual({ ...manual, value: manual.type === "percent" ? e.target.value.replace(/[^\d.,]/g, "") : e.target.value.replace(/\D/g, "") })} />
                  </div>
                  <input aria-label="Alasan diskon" maxLength={60} className="input" placeholder="Alasan (wajib), contoh: pelanggan lama" value={manual.note} onChange={(e) => setManual({ ...manual, note: e.target.value })} />
                  {me.session.role === "kasir" && <p className="text-xs text-muted">Batas diskon manual untuk kasir: {fmtRate(manualMax)}% dari subtotal.</p>}
                  {manualOver && <p className="text-xs font-medium text-danger" role="alert">Melebihi batas. Maksimal {rp(capAmount)} untuk belanja ini.</p>}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1 text-sm">
            {(discount > 0 || (tax > 0 && taxCfg.mode === "exclusive")) && <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="font-mono">{rp(subtotal)}</span></div>}
            {discount > 0 && <div className="ks-pop flex justify-between text-emerald-700 dark:text-emerald-300"><span>Diskon{discInput ? ` (${discInput.name})` : ""}</span><span className="font-mono">-{rp(discount)}</span></div>}
            {tax > 0 && taxCfg.mode === "exclusive" && <div className="flex justify-between"><span className="text-muted">PPN {fmtRate(taxCfg.rate)}%</span><span className="font-mono">{rp(tax)}</span></div>}
          </div>
          <div className="flex items-baseline justify-between rounded-xl bg-paper px-4 py-3">
            <span className="text-lg font-semibold">Total</span>
            <span key={total} className="ks-pop font-mono text-2xl font-extrabold">{rp(total)}</span>
          </div>
          {tax > 0 && taxCfg.mode === "inclusive" && <div className="flex justify-between text-xs text-muted"><span>Sudah termasuk PPN {fmtRate(taxCfg.rate)}%</span><span className="font-mono">{rp(tax)}</span></div>}

          <div>
            <span className="label">Metode pembayaran</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Metode pembayaran">
              {methods.map((m) => (
                <button key={m.key} type="button" role="radio" aria-checked={method === m.key} title={GROUP_LABEL[m.group]}
                  className={`ks-press ${method === m.key ? "btn-primary" : "btn-ghost"}`} onClick={() => setMethod(m.key)}>{m.label}</button>
              ))}
            </div>
          </div>

          {cash ? (
            <div>
              <label className="label" htmlFor="paid">Uang diterima</label>
              <input id="paid" inputMode="numeric" className="input font-mono text-lg" value={paid} onChange={(e) => setPaid(e.target.value.replace(/\D/g, ""))} />
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="btn-ghost ks-press" onClick={() => setPaid(String(total))} disabled={total <= 0}>Uang pas</button>
                {cashSuggest.map((n) => <button key={n} className="btn-ghost ks-press" onClick={() => setPaid(String(n))}>{rp(n)}</button>)}
              </div>
              <div className={`mt-3 flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors ${!paid ? "bg-paper" : change >= 0 ? "bg-emerald-500/10" : "bg-danger/10"}`} aria-live="polite">
                <span className="text-sm text-muted">{paid && change < 0 ? "Kurang" : "Kembalian"}</span>
                <span key={paid ? change : "x"} className={`ks-pop font-mono text-lg font-bold ${paid && change < 0 ? "text-danger" : ""}`}>{!paid ? "-" : change >= 0 ? rp(change) : rp(-change)}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted">Dibayar pas {rp(total)} lewat {cur?.label}. Pastikan pembayaran sudah masuk sebelum menekan tombol di bawah.</p>
              <div><label className="label" htmlFor="ref">{refLabel}</label><input id="ref" maxLength={40} className="input" value={ref} onChange={(e) => setRef(e.target.value)} /></div>
            </div>
          )}

          {!online && !cash && <p className="text-xs text-muted">Offline: pastikan uang sudah benar-benar masuk (cek HP atau mesin EDC), karena tidak bisa diperiksa dari sini.</p>}
          {err && <p className="text-sm text-danger" role="alert">{err}</p>}
          <button className="btn-primary btn-lg ks-press w-full" disabled={!canPay} onClick={checkout}>
            {busy ? "Memproses…" : online ? `Bayar ${rp(total)} dan cetak struk` : `Bayar ${rp(total)} (simpan offline) dan cetak struk`}
          </button>
          {why ? <p className="text-center text-xs text-muted" aria-live="polite">{why}</p> : canPay ? <p className="hidden text-center text-xs text-muted lg:block">Atau tekan <kbd className="rounded border border-line px-1.5 py-0.5 font-mono">Ctrl</kbd> + <kbd className="rounded border border-line px-1.5 py-0.5 font-mono">Enter</kbd></p> : null}
        </aside>
      </div>

      {/* HP: bilah ringkas yang mengantar ke keranjang */}
      {lines.length > 0 && (
        <button
          type="button"
          onClick={() => document.getElementById("keranjang")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="ks-rise ks-press sticky bottom-3 z-30 flex w-full items-center justify-between rounded-2xl bg-accent px-5 py-3.5 text-white shadow-2xl lg:hidden"
        >
          <span className="flex items-center gap-2 font-semibold">
            <span key={lines.length} className="ks-pop rounded-full bg-white/20 px-2.5 py-0.5 text-sm font-bold">{lines.length}</span>
            Lihat keranjang
          </span>
          <span key={total} className="ks-pop font-mono font-bold">{rp(total)}</span>
        </button>
      )}
    </div>
  );
}

function Cashier({ me }: { me: Me }) {
  const uid = me.session.uid;
  const online = useOnline();
  const [shift, setShift] = useState<ShiftOut | null | undefined>(undefined);
  const [closing, setClosing] = useState(false);
  const [report, setReport] = useState<ShiftOut | null>(null);
  const [fatal, setFatal] = useState("");

  // Status kasir disimpan di perangkat, supaya halaman Kasir tetap terbuka saat internet mati
  const reload = useCallback(async () => {
    try {
      const s = (await api<{ shift: ShiftOut | null }>("/api/shifts?current=1")).shift;
      saveShift(uid, s); setShift(s); setFatal("");
    } catch (x) {
      if (isNetworkError(x)) {
        const c = loadShift<ShiftOut>(uid);
        if (c) { setShift(c.shift); setFatal(""); return; }
        setFatal("Tidak ada koneksi internet dan kasir belum pernah dibuka di perangkat ini. Sambungkan internet lalu coba lagi.");
      } else setFatal((x as Error).message);
    }
  }, [uid]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { if (online) reload(); }, [online]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.addEventListener("kt-synced", reload); return () => window.removeEventListener("kt-synced", reload); }, [reload]);

  if (fatal) return <p className="text-sm text-danger" role="alert">{fatal}</p>;
  if (shift === undefined) return <div className="mx-auto h-48 max-w-md animate-pulse rounded-2xl bg-line motion-reduce:animate-none" aria-label="Memuat" />;

  return (
    <div className="space-y-4">
      <style>{CSS}</style>
      {report && <ShiftReportModal shift={report} onClose={() => setReport(null)} />}
      {closing && shift && (
        <CloseModal shift={shift} onCancel={() => setClosing(false)}
          onDone={(s) => { setClosing(false); setShift(null); saveShift(uid, null); setReport(s); }} />
      )}
      {shift ? <Pos me={me} shift={shift} reload={reload} onClose={() => setClosing(true)} /> : <OpenShift me={me} onOpened={(s) => { saveShift(uid, s); setShift(s); }} />}
      <QueuePanel uid={uid} />
    </div>
  );
}

export default function Kasir() { return <Shell>{(me) => <Cashier me={me} />}</Shell>; }