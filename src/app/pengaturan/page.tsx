"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { useTheme, type Theme } from "@/components/ThemeToggle";
import Receipt, { KitchenTicket } from "@/components/Receipt";
import { Alert, useFeedback } from "@/components/Feedback";
import { DEFAULT_SETTINGS, sampleFor, withTax, type ReceiptSettings } from "@/lib/receiptSettings";
import { BUSINESS_TYPES, DEFAULT_TAX, GROUP_LABEL, PAYMENT_PRESETS, TAX_PRESETS, calcTax, fmtRate, normRate, type BusinessType, type PayGroup, type PayMethod, type TaxConfig } from "@/lib/business";
import { api, rp } from "@/lib/client";
import type { Me } from "@/lib/types";

const THEMES: [Theme, string][] = [["light", "Terang"], ["dark", "Gelap"], ["system", "Ikuti perangkat"]];

function Check({ id, label, v, on, disabled }: { id: string; label: string; v: boolean; on: (b: boolean) => void; disabled: boolean }) {
  return <label htmlFor={id} className="flex items-center gap-2 text-sm"><input id={id} type="checkbox" disabled={disabled} checked={v} onChange={(e) => on(e.target.checked)} />{label}</label>;
}

function BusinessSection({ type, onChange }: { type: BusinessType; onChange: (t: BusinessType) => void }) {
  const { ok, fail, confirm } = useFeedback();
  async function pick(t: BusinessType) {
    if (t === type) return;
    if (!(await confirm({ title: "Ganti jenis usaha?", text: "Tampilan kasir dan struk akan menyesuaikan. Produk dan transaksi lama tidak berubah.", ok: "Ganti jenis usaha" }))) return;
    try { await api("/api/store", { method: "PATCH", body: { businessType: t } }); onChange(t); ok("Jenis usaha diganti"); }
    catch (x) { fail((x as Error).message); }
  }
  return (
    <section className="card space-y-4 p-5 sm:p-6">
      <h2 className="text-lg font-bold">Jenis usaha</h2>
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Jenis usaha">
        {BUSINESS_TYPES.map((b) => (
          <button key={b.key} type="button" role="radio" aria-checked={type === b.key} onClick={() => pick(b.key)}
            className={`rounded-xl border p-4 text-left text-sm transition ${type === b.key ? "border-accent bg-accent/10 ring-1 ring-accent" : "border-line hover:border-accent"}`}>
            <span className="font-semibold">{b.label}</span><span className="mt-0.5 block text-xs text-muted">{b.desc}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function TaxSection({ tax, onSaved }: { tax: TaxConfig; onSaved: (t: TaxConfig) => void }) {
  const { ok } = useFeedback();
  const [enabled, setEnabled] = useState(tax.enabled);
  const [rate, setRate] = useState(fmtRate(tax.rate));
  const [mode, setMode] = useState(tax.mode);
  const [err, setErr] = useState("");
  useEffect(() => { setEnabled(tax.enabled); setRate(fmtRate(tax.rate)); setMode(tax.mode); }, [tax]);

  const r = normRate(rate);
  const demo = calcTax(100000, { enabled: true, rate: isNaN(r) ? 0 : r, mode });

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (isNaN(r)) { setErr("Tarif PPN harus antara 0 dan 100"); return; }
    const t: TaxConfig = { enabled, rate: r, mode };
    try { await api("/api/store", { method: "PATCH", body: { tax: t } }); onSaved(t); ok("Pengaturan PPN tersimpan. Berlaku untuk transaksi berikutnya."); }
    catch (x) { setErr((x as Error).message); }
  }
  return (
    <form onSubmit={save} className="card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-bold">PPN</h2>
        <p className="mt-1 text-sm text-muted">Kepala toko yang menentukan apakah toko memungut PPN, berapa tarifnya, dan cara menghitungnya. Jika dinonaktifkan, kasir dan struk tidak menampilkan PPN. Transaksi lama tidak berubah.</p>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />Aktifkan PPN di kasir dan struk</label>
      <fieldset disabled={!enabled} className="space-y-4 disabled:opacity-50">
        <div className="max-w-[160px]"><label className="label" htmlFor="ppn-rate">Tarif PPN (%)</label>
          <input id="ppn-rate" inputMode="decimal" className="input font-mono" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.,]/g, ""))} />
          <div className="mt-2 flex gap-2">{TAX_PRESETS.map((n) => <button key={n} type="button" className={r === n ? "btn-primary" : "btn-ghost"} onClick={() => setRate(fmtRate(n))}>{n}%</button>)}</div></div>
        <div role="radiogroup" aria-label="Cara menghitung PPN" className="grid gap-3 sm:grid-cols-2">
          {([["exclusive", "Ditambahkan di atas harga", "Harga produk belum termasuk PPN. PPN ditambahkan saat bayar."], ["inclusive", "Sudah termasuk di harga", "Harga produk sudah termasuk PPN. Total tidak berubah, struk menampilkan PPN di dalamnya."]] as const).map(([k, t, d]) => (
            <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)}
              className={`rounded-xl border p-4 text-left text-sm transition ${mode === k ? "border-accent bg-accent/10 ring-1 ring-accent" : "border-line hover:border-accent"}`}>
              <span className="font-semibold">{t}</span><span className="mt-0.5 block text-xs text-muted">{d}</span>
            </button>
          ))}
        </div>
        <p className="rounded-xl bg-paper px-4 py-3 text-sm text-muted">Contoh belanja {rp(100000)}: {mode === "exclusive" ? `PPN ${rp(demo.tax)}, customer bayar ${rp(demo.total)}.` : `customer bayar ${rp(demo.total)}, di dalamnya sudah ada PPN ${rp(demo.tax)}.`}</p>
      </fieldset>
      <p className="text-xs text-muted">Aplikasi ini hanya menghitung. Apakah toko Anda wajib memungut PPN dan berapa tarif yang berlaku, tanyakan ke konsultan pajak atau kantor pajak.</p>
      {err && <Alert tone="error">{err}</Alert>}
      <button className="btn-primary">Simpan pengaturan PPN</button>
    </form>
  );
}

function PaymentSection({ type }: { type: BusinessType }) {
  const { ok } = useFeedback();
  const [list, setList] = useState<PayMethod[]>([]);
  const [custom, setCustom] = useState({ label: "", group: "lain" as PayGroup });
  const [err, setErr] = useState("");
  const load = () => api<PayMethod[]>("/api/payment-methods?all=1").then(setList).catch((x) => setErr((x as Error).message));
  useEffect(() => { load(); }, []);
  const run = async (fn: () => Promise<unknown>, done?: string) => { setErr(""); try { await fn(); await load(); if (done) ok(done); } catch (x) { setErr((x as Error).message); } };

  const have = new Set(list.map((m) => m.key));
  const suggested = PAYMENT_PRESETS.filter((p) => !have.has(p.key));
  // Yang cocok dengan jenis usaha ditampilkan lebih dulu
  suggested.sort((a, b) => Number(!!b.hint?.includes(type)) - Number(!!a.hint?.includes(type)));

  return (
    <section className="card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-bold">Metode pembayaran</h2>
        <p className="mt-1 text-sm text-muted">Cash dan transfer bank selalu ada. Aktifkan metode lain sesuai kebutuhan toko. Pembayaran non-tunai tidak dihitung sebagai uang di laci saat tutup kasir.</p>
      </div>
      <ul className="divide-y divide-line text-sm">
        {list.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2.5">
            <div className="flex-1"><span className="font-medium">{m.label}</span> <span className="text-xs text-muted">{GROUP_LABEL[m.group]}{m.locked ? " · utama" : ""}</span></div>
            {m.locked ? <span className="text-xs text-muted">Selalu aktif</span> : (
              <button className="btn-ghost" onClick={() => run(() => api("/api/payment-methods", { method: "PATCH", body: { id: m.id, active: !m.active } }), m.active ? `${m.label} dinonaktifkan` : `${m.label} diaktifkan`)}>
                {m.active ? "Nonaktifkan" : "Aktifkan"}
              </button>
            )}
            <span className={`w-14 text-right text-xs font-semibold ${m.active ? "text-accent dark:text-link" : "text-muted"}`}>{m.active ? "Aktif" : "Mati"}</span>
          </li>
        ))}
      </ul>
      {suggested.length > 0 && (
        <div>
          <div className="label">Tambah dari daftar</div>
          <div className="flex flex-wrap gap-2">
            {suggested.map((p) => (
              <button key={p.key} className="btn-ghost" onClick={() => run(() => api("/api/payment-methods", { method: "POST", body: { presetKey: p.key } }), `${p.label} ditambahkan`)}>
                + {p.label}{p.hint?.includes(type) ? " ★" : ""}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">★ cocok untuk jenis usaha Anda.</p>
        </div>
      )}
      <form className="grid gap-3 sm:grid-cols-[1fr_180px_auto]" onSubmit={(e) => { e.preventDefault(); run(async () => { await api("/api/payment-methods", { method: "POST", body: custom }); setCustom({ ...custom, label: "" }); }, "Metode pembayaran ditambahkan"); }}>
        <div><label className="label" htmlFor="pm-l">Metode lain (nama bebas)</label><input id="pm-l" required maxLength={30} className="input" placeholder="Contoh: OVO, Dana, Kasbon" value={custom.label} onChange={(e) => setCustom({ ...custom, label: e.target.value })} /></div>
        <div><label className="label" htmlFor="pm-g">Jenis</label>
          <select id="pm-g" className="input" value={custom.group} onChange={(e) => setCustom({ ...custom, group: e.target.value as PayGroup })}>
            {(["bank", "qris", "online", "kurir", "lain"] as PayGroup[]).map((g) => <option key={g} value={g}>{GROUP_LABEL[g]}</option>)}
          </select></div>
        <div className="flex items-end"><button className="btn-primary w-full">Tambah</button></div>
      </form>
      {err && <Alert tone="error">{err}</Alert>}
    </section>
  );
}

function Settings({ me }: { me: Me }) {
  const { ok } = useFeedback();
  const owner = me.session.role === "kepala_toko";
  const [f, setF] = useState<ReceiptSettings>(DEFAULT_SETTINGS);
  const [biz, setBiz] = useState<BusinessType>(me.store?.businessType ?? "retail");
  const [tax, setTax] = useState<TaxConfig>(DEFAULT_TAX);
  useEffect(() => { api<{ tax: TaxConfig }>("/api/store").then((r) => setTax(r.tax)).catch(() => {}); }, []);
  const [err, setErr] = useState("");
  const { theme, set } = useTheme();
  useEffect(() => { api<ReceiptSettings>("/api/receipt-settings").then(setF).catch((x) => setErr((x as Error).message)); }, []);
  const sample = withTax(sampleFor(biz), tax);
  const up = <K extends keyof ReceiptSettings>(k: K, v: ReceiptSettings[K]) => setF((p) => ({ ...p, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try { await api("/api/receipt-settings", { method: "POST", body: f }); ok("Pengaturan struk tersimpan."); }
    catch (x) { setErr((x as Error).message); }
  }

  return (
    <div className="space-y-6">
      <section className="card space-y-3 p-5 sm:p-6">
        <h2 className="text-lg font-bold">Tampilan</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tema">
          {THEMES.map(([k, l]) => <button key={k} role="radio" aria-checked={theme === k} className={theme === k ? "btn-primary" : "btn-ghost"} onClick={() => set(k)}>{l}</button>)}
        </div>
        <p className="text-sm text-muted">Pilihan tema disimpan di browser ini.</p>
      </section>

      {owner && <BusinessSection type={biz} onChange={setBiz} />}
      {owner && <TaxSection tax={tax} onSaved={setTax} />}
      {owner && <PaymentSection type={biz} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <form onSubmit={save} className="card space-y-4 p-5 sm:p-6">
          <h2 className="text-lg font-bold">Struk</h2>
          {!owner && <Alert tone="info">Hanya kepala toko yang dapat mengubah pengaturan struk. Anda bisa melihat pratinjaunya di samping.</Alert>}
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
          {err && <Alert tone="error">{err}</Alert>}
          {owner && <button className="btn-primary">Simpan pengaturan struk</button>}
        </form>

        <aside className="space-y-3">
          <h2 className="text-lg font-bold">Pratinjau</h2>
          <div className="overflow-x-auto rounded-2xl border border-line p-3"><div className="print-area"><Receipt r={sample} settings={f} /></div></div>
          {biz === "fnb" && (
            <>
              <h3 className="text-sm font-semibold">Struk dapur</h3>
              <div className="overflow-x-auto rounded-2xl border border-line p-3"><div className="print-area"><KitchenTicket r={sample} settings={f} /></div></div>
            </>
          )}
          <button type="button" className="btn-ghost" onClick={() => { document.body.dataset.print = "both"; window.addEventListener("afterprint", () => { delete document.body.dataset.print; }, { once: true }); window.print(); }}>Cetak struk contoh</button>
        </aside>
      </div>
    </div>
  );
}

export default function Pengaturan() { return <Shell>{(me) => <Settings me={me} />}</Shell>; }