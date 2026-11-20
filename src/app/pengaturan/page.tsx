"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { ThemePanel } from "@/components/ThemeToggle";
import Receipt, { KitchenTicket } from "@/components/Receipt";
import { DEFAULT_SETTINGS, sampleFor, withTax, type ReceiptSettings } from "@/lib/receiptSettings";
import { BUSINESS_TYPES, DISCOUNT_TYPES, discountLabel, type DiscountPreset, type DiscountType, DEFAULT_TAX, GROUP_LABEL, PAYMENT_PRESETS, TAX_PRESETS, methodAllowed, calcTax, fmtRate, normRate, type BusinessType, type PayGroup, type PayMethod, type TaxConfig } from "@/lib/business";
import { api, rp } from "@/lib/client";
import type { Me } from "@/lib/types";


function Check({ id, label, v, on, disabled }: { id: string; label: string; v: boolean; on: (b: boolean) => void; disabled: boolean }) {
  return <label htmlFor={id} className="flex items-center gap-2 text-sm"><input id={id} type="checkbox" disabled={disabled} checked={v} onChange={(e) => on(e.target.checked)} />{label}</label>;
}

function BusinessSection({ type, onChange }: { type: BusinessType; onChange: (t: BusinessType) => void }) {
  const [err, setErr] = useState("");
  async function pick(t: BusinessType) {
    if (t === type) return;
    if (!confirm("Ganti jenis usaha? Tampilan kasir dan struk akan menyesuaikan. Produk dan transaksi lama tidak berubah.")) return;
    try { await api("/api/store", { method: "PATCH", body: { businessType: t } }); onChange(t); setErr(""); }
    catch (x) { setErr((x as Error).message); }
  }
  return (
    <section className="card space-y-3">
      <h2 className="font-semibold">Jenis usaha</h2>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Jenis usaha">
        {BUSINESS_TYPES.map((b) => (
          <button key={b.key} type="button" role="radio" aria-checked={type === b.key} onClick={() => pick(b.key)}
            className={`rounded-md border p-3 text-left text-sm transition ${type === b.key ? "border-accent bg-accent/10" : "border-line hover:border-accent"}`}>
            <span className="font-medium">{b.label}</span><span className="mt-0.5 block text-xs text-muted">{b.desc}</span>
          </button>
        ))}
      </div>
      {err && <p className="text-sm text-danger" role="alert">{err}</p>}
    </section>
  );
}

function TaxSection({ tax, onSaved }: { tax: TaxConfig; onSaved: (t: TaxConfig) => void }) {
  const [enabled, setEnabled] = useState(tax.enabled);
  const [rate, setRate] = useState(fmtRate(tax.rate));
  const [mode, setMode] = useState(tax.mode);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => { setEnabled(tax.enabled); setRate(fmtRate(tax.rate)); setMode(tax.mode); }, [tax]);

  const r = normRate(rate);
  const demo = calcTax(100000, { enabled: true, rate: isNaN(r) ? 0 : r, mode });

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    if (isNaN(r)) { setErr("Tarif PPN harus antara 0 dan 100"); return; }
    const t: TaxConfig = { enabled, rate: r, mode };
    try { await api("/api/store", { method: "PATCH", body: { tax: t } }); onSaved(t); setMsg("Pengaturan PPN tersimpan. Berlaku untuk transaksi berikutnya."); }
    catch (x) { setErr((x as Error).message); }
  }
  return (
    <form onSubmit={save} className="card space-y-4">
      <div>
        <h2 className="font-semibold">PPN</h2>
        <p className="text-sm text-muted">Kepala toko yang menentukan apakah toko memungut PPN, berapa tarifnya, dan cara menghitungnya. Jika dinonaktifkan, kasir dan struk tidak menampilkan PPN. Transaksi lama tidak berubah.</p>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); setMsg(""); }} />Aktifkan PPN di kasir dan struk</label>
      <fieldset disabled={!enabled} className="space-y-4 disabled:opacity-50">
        <div className="max-w-[160px]"><label className="label" htmlFor="ppn-rate">Tarif PPN (%)</label>
          <input id="ppn-rate" inputMode="decimal" className="input font-mono" value={rate} onChange={(e) => { setRate(e.target.value.replace(/[^\d.,]/g, "")); setMsg(""); }} />
          <div className="mt-2 flex gap-2">{TAX_PRESETS.map((n) => <button key={n} type="button" className={r === n ? "btn-primary" : "btn-ghost"} onClick={() => { setRate(fmtRate(n)); setMsg(""); }}>{n}%</button>)}</div></div>
        <div role="radiogroup" aria-label="Cara menghitung PPN" className="grid gap-2 sm:grid-cols-2">
          {([["exclusive", "Ditambahkan di atas harga", "Harga produk belum termasuk PPN. PPN ditambahkan saat bayar."], ["inclusive", "Sudah termasuk di harga", "Harga produk sudah termasuk PPN. Total tidak berubah, struk menampilkan PPN di dalamnya."]] as const).map(([k, t, d]) => (
            <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => { setMode(k); setMsg(""); }}
              className={`rounded-md border p-3 text-left text-sm transition ${mode === k ? "border-accent bg-accent/10" : "border-line hover:border-accent"}`}>
              <span className="font-medium">{t}</span><span className="mt-0.5 block text-xs text-muted">{d}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">Contoh belanja {rp(100000)}: {mode === "exclusive" ? `PPN ${rp(demo.tax)}, customer bayar ${rp(demo.total)}.` : `customer bayar ${rp(demo.total)}, di dalamnya sudah ada PPN ${rp(demo.tax)}.`}</p>
      </fieldset>
      <p className="text-xs text-muted">Aplikasi ini hanya menghitung. Apakah toko Anda wajib memungut PPN dan berapa tarif yang berlaku, tanyakan ke konsultan pajak atau kantor pajak.</p>
      {err && <p className="text-sm text-danger" role="alert">{err}</p>}
      {msg && <p className="text-sm" role="status">{msg}</p>}
      <button className="btn-primary">Simpan pengaturan PPN</button>
    </form>
  );
}

function DiscountSection() {
  const [list, setList] = useState<DiscountPreset[]>([]);
  const [cap, setCap] = useState("");
  const [f, setF] = useState({ name: "", type: "percent" as DiscountType, value: "", minSubtotal: "", validFrom: "", validTo: "" });
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const load = () => Promise.all([api<DiscountPreset[]>("/api/discounts?all=1"), api<{ discountManualMax: number }>("/api/store")])
    .then(([d, st]) => { setList(d); setCap(String(st.discountManualMax ?? 0)); }).catch((x) => setErr((x as Error).message));
  useEffect(() => { load(); }, []);
  const run = async (fn: () => Promise<unknown>, ok = "") => { setErr(""); setMsg(""); try { await fn(); setMsg(ok); await load(); } catch (x) { setErr((x as Error).message); } };
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const state = (d: DiscountPreset) => (!d.active ? "Mati" : d.validTo && d.validTo < today ? "Kedaluwarsa" : d.validFrom && d.validFrom > today ? "Belum mulai" : "Aktif");

  return (
    <section className="card space-y-5">
      <div>
        <h2 className="font-semibold">Diskon</h2>
        <p className="text-sm text-muted">Buat diskon siap pakai yang tinggal dipilih kasir, dan atur seberapa jauh kasir boleh memberi diskon manual. Diskon dihitung dari subtotal, sebelum PPN. Diskon tidak dihapus, hanya dinonaktifkan, agar transaksi lama tetap terbaca.</p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-line p-4" onSubmit={(e) => { e.preventDefault(); run(() => api("/api/store", { method: "PATCH", body: { discountManualMax: Number(cap.replace(",", ".") || 0) } }), "Batas diskon manual tersimpan."); }}>
        <div className="w-44"><label className="label" htmlFor="d-cap">Batas diskon manual kasir (%)</label><input id="d-cap" inputMode="decimal" className="input font-mono" value={cap} onChange={(e) => setCap(e.target.value.replace(/[^\d.,]/g, ""))} /></div>
        <button className="btn-ghost">Simpan batas</button>
        <p className="basis-full text-xs text-muted">0 berarti kasir tidak boleh memberi diskon manual (hanya memilih diskon siap pakai). Kepala toko dan kepala cabang tidak dibatasi. Diskon manual selalu wajib disertai alasan.</p>
      </form>

      <ul className="divide-y divide-line text-sm">
        {list.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{d.name} <span className="font-normal text-muted">({discountLabel(d)})</span></div>
              <div className="text-xs text-muted">
                {d.minSubtotal > 0 ? `Minimal belanja ${rp(d.minSubtotal)}. ` : "Tanpa minimal belanja. "}
                {d.validFrom || d.validTo ? `Berlaku ${d.validFrom || "sejak awal"} sampai ${d.validTo || "tanpa batas"}.` : "Tanpa batas tanggal."}
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${state(d) === "Aktif" ? "bg-accent/10 text-accent dark:text-link" : "bg-line text-muted"}`}>{state(d)}</span>
            <button className="btn-ghost" onClick={() => run(() => api("/api/discounts", { method: "PATCH", body: { id: d.id, active: !d.active } }))}>{d.active ? "Nonaktifkan" : "Aktifkan"}</button>
          </li>
        ))}
        {!list.length && <li className="py-3 text-muted">Belum ada diskon siap pakai.</li>}
      </ul>

      <form className="grid gap-3 sm:grid-cols-6" onSubmit={(e) => { e.preventDefault(); run(async () => { await api("/api/discounts", { method: "POST", body: { ...f, value: Number(f.value.replace(",", ".")), minSubtotal: Number(f.minSubtotal || 0) } }); setF({ ...f, name: "", value: "", minSubtotal: "" }); }, "Diskon ditambahkan."); }}>
        <div className="sm:col-span-2"><label className="label" htmlFor="d-name">Nama diskon</label><input id="d-name" required maxLength={40} className="input" placeholder="Contoh: Member 10%" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="label" htmlFor="d-type">Jenis</label><select id="d-type" className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as DiscountType, value: "" })}>{DISCOUNT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></div>
        <div><label className="label" htmlFor="d-val">Nilai</label><input id="d-val" required inputMode="decimal" className="input font-mono" value={f.value} onChange={(e) => setF({ ...f, value: f.type === "percent" ? e.target.value.replace(/[^\d.,]/g, "") : e.target.value.replace(/\D/g, "") })} /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="d-min">Minimal belanja (opsional)</label><input id="d-min" inputMode="numeric" className="input font-mono" value={f.minSubtotal} onChange={(e) => setF({ ...f, minSubtotal: e.target.value.replace(/\D/g, "") })} /></div>
        <div className="sm:col-span-3"><label className="label" htmlFor="d-from">Berlaku mulai (opsional)</label><input id="d-from" type="date" className="input" value={f.validFrom} onChange={(e) => setF({ ...f, validFrom: e.target.value })} /></div>
        <div className="sm:col-span-3"><label className="label" htmlFor="d-to">Berlaku sampai (opsional)</label><input id="d-to" type="date" className="input" value={f.validTo} onChange={(e) => setF({ ...f, validTo: e.target.value })} /></div>
        <div className="sm:col-span-6"><button className="btn-primary">Tambah diskon</button></div>
      </form>
      {err && <p className="text-sm font-medium text-danger" role="alert">{err}</p>}
      {msg && <p className="text-sm font-medium" role="status">{msg}</p>}
    </section>
  );
}

function PaymentSection({ type }: { type: BusinessType }) {
  const [list, setList] = useState<PayMethod[]>([]);
  const [custom, setCustom] = useState({ label: "", group: "lain" as PayGroup });
  const [err, setErr] = useState("");
  const load = () => api<PayMethod[]>("/api/payment-methods?all=1").then(setList).catch((x) => setErr((x as Error).message));
  useEffect(() => { load(); }, []);
  const run = async (fn: () => Promise<unknown>) => { setErr(""); try { await fn(); await load(); } catch (x) { setErr((x as Error).message); } };

  const have = new Set(list.map((m) => m.key));
  // ShopeeFood, GoFood, dan GrabFood hanya ditawarkan untuk toko F&B
  const suggested = PAYMENT_PRESETS.filter((p) => !have.has(p.key) && methodAllowed(type, p.key));
  // Yang cocok dengan jenis usaha ditampilkan lebih dulu
  suggested.sort((a, b) => Number(!!b.hint?.includes(type)) - Number(!!a.hint?.includes(type)));

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="font-semibold">Metode pembayaran</h2>
        <p className="text-sm text-muted">Cash dan transfer bank selalu ada. Aktifkan metode lain sesuai kebutuhan toko. {type === "fnb" ? "Pesanan ShopeeFood, GoFood, dan GrabFood otomatis dibungkus." : "ShopeeFood, GoFood, dan GrabFood hanya tersedia untuk toko makanan dan minuman."} Pembayaran non-tunai tidak dihitung sebagai uang di laci saat tutup kasir.</p>
      </div>
      <ul className="divide-y divide-line text-sm">
        {list.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2">
            <div className="flex-1"><span className="font-medium">{m.label}</span> <span className="text-xs text-muted">{GROUP_LABEL[m.group]}{m.locked ? " · utama" : ""}</span></div>
            {m.locked ? <span className="text-xs text-muted">Selalu aktif</span> : (
              <button className="btn-ghost" onClick={() => run(() => api("/api/payment-methods", { method: "PATCH", body: { id: m.id, active: !m.active } }))}>
                {m.active ? "Nonaktifkan" : "Aktifkan"}
              </button>
            )}
            <span className={`w-14 text-right text-xs ${m.active ? "" : "text-muted"}`}>{m.active ? "Aktif" : "Mati"}</span>
          </li>
        ))}
      </ul>
      {suggested.length > 0 && (
        <div>
          <div className="label">Tambah dari daftar</div>
          <div className="flex flex-wrap gap-2">
            {suggested.map((p) => (
              <button key={p.key} className="btn-ghost" onClick={() => run(() => api("/api/payment-methods", { method: "POST", body: { presetKey: p.key } }))}>
                + {p.label}{p.hint?.includes(type) ? " ★" : ""}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">★ cocok untuk jenis usaha Anda.</p>
        </div>
      )}
      <form className="grid gap-3 sm:grid-cols-[1fr_180px_auto]" onSubmit={(e) => { e.preventDefault(); run(async () => { await api("/api/payment-methods", { method: "POST", body: custom }); setCustom({ ...custom, label: "" }); }); }}>
        <div><label className="label" htmlFor="pm-l">Metode lain (nama bebas)</label><input id="pm-l" required maxLength={30} className="input" placeholder="Contoh: OVO, Dana, Kasbon" value={custom.label} onChange={(e) => setCustom({ ...custom, label: e.target.value })} /></div>
        <div><label className="label" htmlFor="pm-g">Jenis</label>
          <select id="pm-g" className="input" value={custom.group} onChange={(e) => setCustom({ ...custom, group: e.target.value as PayGroup })}>
            {(["bank", "qris", "online", "kurir", "lain"] as PayGroup[]).filter((g) => g !== "online" || type === "fnb").map((g) => <option key={g} value={g}>{GROUP_LABEL[g]}</option>)}
          </select></div>
        <div className="flex items-end"><button className="btn-primary w-full">Tambah</button></div>
      </form>
      {err && <p className="text-sm text-danger" role="alert">{err}</p>}
    </section>
  );
}

function Settings({ me }: { me: Me }) {
  const owner = me.session.role === "kepala_toko";
  const [f, setF] = useState<ReceiptSettings>(DEFAULT_SETTINGS);
  const [biz, setBiz] = useState<BusinessType>(me.store?.businessType ?? "retail");
  const [tax, setTax] = useState<TaxConfig>(DEFAULT_TAX);
  useEffect(() => { api<{ tax: TaxConfig }>("/api/store").then((r) => setTax(r.tax)).catch(() => {}); }, []);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => { api<ReceiptSettings>("/api/receipt-settings").then(setF).catch((x) => setErr((x as Error).message)); }, []);
  const sample = withTax(sampleFor(biz), tax);
  const up = <K extends keyof ReceiptSettings>(k: K, v: ReceiptSettings[K]) => { setF((p) => ({ ...p, [k]: v })); setMsg(""); };

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    try { await api("/api/receipt-settings", { method: "POST", body: f }); setMsg("Pengaturan struk tersimpan."); }
    catch (x) { setErr((x as Error).message); }
  }

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <h2 className="font-semibold">Tampilan</h2>
        <div className="max-w-sm"><ThemePanel /></div>
      </section>

      {owner && <BusinessSection type={biz} onChange={setBiz} />}
      {owner && <TaxSection tax={tax} onSaved={setTax} />}
      {owner && <DiscountSection />}
      {owner && <PaymentSection type={biz} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-semibold">Struk</h2>
          {!owner && <p className="text-sm text-muted">Hanya kepala toko yang dapat mengubah pengaturan struk. Anda bisa melihat pratinjaunya di samping.</p>}
          <fieldset disabled={!owner} className="space-y-4">
            <div><label className="label" htmlFor="sn">Nama toko di struk</label><input id="sn" required maxLength={60} className="input" value={f.storeName} onChange={(e) => up("storeName", e.target.value)} /></div>
            <div><label className="label" htmlFor="ad">Alamat</label><textarea id="ad" rows={2} maxLength={160} className="input" value={f.address} onChange={(e) => up("address", e.target.value)} /></div>
            <div><label className="label" htmlFor="ph">Telepon / WhatsApp</label><input id="ph" maxLength={30} className="input" value={f.phone} onChange={(e) => up("phone", e.target.value)} /></div>
            <div><label className="label" htmlFor="hd">Teks di atas (opsional)</label><input id="hd" maxLength={160} className="input" placeholder="Contoh: Buka setiap hari 08.00–21.00" value={f.header} onChange={(e) => up("header", e.target.value)} /></div>
            <div><label className="label" htmlFor="ft">Teks penutup</label><textarea id="ft" rows={2} maxLength={160} className="input" placeholder="Contoh: Barang yang sudah dibeli tidak dapat ditukar" value={f.footer} onChange={(e) => up("footer", e.target.value)} /></div>
            <div><label className="label" htmlFor="pp">Lebar kertas</label>
              <select id="pp" className="input" value={f.paper} onChange={(e) => up("paper", e.target.value as "58" | "80")}><option value="58">58 mm</option><option value="80">80 mm</option></select></div>
            <div className="space-y-2">
              <Check id="c1" label="Tampilkan nomor invoice" v={f.showInvoice} on={(b) => up("showInvoice", b)} disabled={!owner} />
              <Check id="c2" label="Tampilkan nama kasir" v={f.showCashier} on={(b) => up("showCashier", b)} disabled={!owner} />
              <Check id="c3" label="Tampilkan uang diterima dan kembalian" v={f.showPayment} on={(b) => up("showPayment", b)} disabled={!owner} />
              <Check id="c4" label="Buka dialog cetak otomatis setelah pembayaran" v={f.autoPrint} on={(b) => up("autoPrint", b)} disabled={!owner} />
            </div>
          </fieldset>
          {err && <p className="text-sm text-danger" role="alert">{err}</p>}
          {msg && <p className="text-sm" role="status">{msg}</p>}
          {owner && <button className="btn-primary">Simpan pengaturan struk</button>}
        </form>

        <aside className="space-y-3">
          <h2 className="font-semibold">Pratinjau</h2>
          <div className="overflow-x-auto rounded-lg border border-line p-3"><div className="print-area"><Receipt r={sample} settings={f} /></div></div>
          {biz === "fnb" && (
            <>
              <h3 className="text-sm font-medium">Struk dapur</h3>
              <div className="overflow-x-auto rounded-lg border border-line p-3"><div className="print-area"><KitchenTicket r={sample} settings={f} /></div></div>
            </>
          )}
          <button type="button" className="btn-ghost" onClick={() => { document.body.dataset.print = "both"; window.addEventListener("afterprint", () => { delete document.body.dataset.print; }, { once: true }); window.print(); }}>Cetak struk contoh</button>
        </aside>
      </div>
    </div>
  );
}

export default function Pengaturan() { return <Shell>{(me) => <Settings me={me} />}</Shell>; }