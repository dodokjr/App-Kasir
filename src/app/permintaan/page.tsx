"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api, tgl } from "@/lib/client";
import { UNITS, fmtQty, parseQty, roundQty, stepOf, unitOf } from "@/lib/business";
import type { Me } from "@/lib/types";

type R = Record<string, string>;
type Req = R & { branchName: string; fromBranchName: string; items: R[]; notes: R[] };

const STATUS: Record<string, { label: string; cls: string }> = {
  diajukan: { label: "Menunggu kepala toko", cls: "bg-sun/30 text-sun-ink dark:text-ink" },
  dikirim: { label: "Dalam pengiriman", cls: "bg-accent/15 text-accent dark:text-link" },
  diterima: { label: "Diterima", cls: "bg-accent text-white" },
  ditolak: { label: "Ditolak", cls: "bg-danger/10 text-danger" },
  dibatalkan: { label: "Dibatalkan", cls: "bg-line text-muted" },
};
const ROLE: Record<string, string> = { kepala_toko: "Kepala toko", kepala_cabang: "Kepala cabang", gudang: "Gudang" };
const qty = (n: string | number, unit: string) => `${fmtQty(Number(n))} ${unitOf(unit).label}`;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const floorStep = (n: number, step: number) => roundQty(Math.floor(n / step + 1e-9) * step);
const Chip = ({ s }: { s: string }) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[s]?.cls ?? ""}`}>{STATUS[s]?.label ?? s}</span>;

/* ---------- Formulir permintaan baru (gudang dan kepala cabang) ---------- */

type Line = { key: number; text: string; unit: string; qty: string };

function NewRequest({ prods, onDone }: { prods: R[]; onDone: () => void }) {
  const [lines, setLines] = useState<Line[]>([{ key: 1, text: "", unit: "pcs", qty: "" }]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const match = (t: string) => prods.find((p) => same(p.name, t));
  const set = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const items = lines.filter((l) => l.text.trim() || l.qty).map((l) => {
        const p = match(l.text);
        return { productId: p?.id, name: l.text.trim(), unit: p ? p.unit || "pcs" : l.unit, qty: parseQty(l.qty) };
      });
      await api("/api/stock-requests", { method: "POST", body: { items, note } });
      setLines([{ key: Date.now(), text: "", unit: "pcs", qty: "" }]); setNote(""); onDone();
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <datalist id="req-products">{prods.map((p) => <option key={p.id} value={p.name}>{p.sku}</option>)}</datalist>
      <ul className="space-y-3">
        {lines.map((l, i) => {
          const p = match(l.text), unit = p ? p.unit || "pcs" : l.unit, dec = stepOf(unit) < 1;
          return (
            <li key={l.key} className="grid gap-3 rounded-xl border border-line bg-surface p-3 sm:grid-cols-[1fr_130px_110px_auto] sm:items-end">
              <div>
                <label className="label" htmlFor={`rn-${l.key}`}>Barang {i + 1}</label>
                <input id={`rn-${l.key}`} list="req-products" className="input" placeholder="Ketik atau pilih nama barang" maxLength={80} value={l.text} onChange={(e) => set(l.key, { text: e.target.value })} />
                {l.text.trim() && !p && <p className="mt-1 text-xs text-muted">Barang baru. Akan dibuat di cabang Anda saat barang diterima.</p>}
              </div>
              <div>
                <label className="label" htmlFor={`rq-${l.key}`}>Jumlah</label>
                <input id={`rq-${l.key}`} inputMode={dec ? "decimal" : "numeric"} className="input font-mono" value={l.qty} onChange={(e) => set(l.key, { qty: dec ? e.target.value.replace(/[^\d.,]/g, "") : e.target.value.replace(/\D/g, "") })} />
              </div>
              <div>
                <label className="label" htmlFor={`ru-${l.key}`}>Satuan</label>
                <select id={`ru-${l.key}`} className="input" disabled={!!p} value={unit} onChange={(e) => set(l.key, { unit: e.target.value, qty: "" })}>{UNITS.map((u) => <option key={u.key} value={u.key}>{u.label}</option>)}</select>
              </div>
              <button type="button" className="btn-ghost" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label={`Hapus barang ${i + 1}`}>Hapus</button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn-ghost" onClick={() => setLines((ls) => [...ls, { key: Date.now(), text: "", unit: "pcs", qty: "" }])}>+ Tambah barang</button>
      <div><label className="label" htmlFor="req-note">Catatan untuk kepala toko (opsional)</label><input id="req-note" className="input" maxLength={300} placeholder="Contoh: untuk stok akhir pekan" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      {err && <p className="text-sm font-medium text-danger" role="alert">{err}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? "Mengirim…" : "Kirim permintaan"}</button>
    </form>
  );
}

/* ---------- Satu permintaan ---------- */

function Step({ on, title, sub }: { on: boolean; title: string; sub?: string }) {
  return <li className={`flex-1 border-t-4 pt-2 ${on ? "border-accent" : "border-line"}`}><div className={`text-sm font-semibold ${on ? "" : "text-muted"}`}>{title}</div>{sub && <div className="text-xs text-muted">{sub}</div>}</li>;
}

function RequestCard({ r, me, prods, branches, reload }: { r: Req; me: Me; prods: R[]; branches: R[]; reload: () => void }) {
  const owner = me.session.role === "kepala_toko";
  const needs = owner ? r.status === "diajukan" : r.status === "dikirim";
  const [open, setOpen] = useState(needs);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  // --- kepala toko: kirim
  const defFrom = (branches.find((b) => b.id !== r.branchId && /pusat/i.test(b.name)) ?? branches.find((b) => b.id !== r.branchId))?.id ?? "";
  const [from, setFrom] = useState(defFrom);
  const [plan, setPlan] = useState<Record<string, { pid: string; sent: string }>>({});
  const [track, setTrack] = useState("");
  const [shipNote, setShipNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [why, setWhy] = useState("");
  useEffect(() => { if (!from && defFrom) setFrom(defFrom); }, [defFrom, from]);
  const source = prods.filter((p) => p.branchId === from);

  // Barang sumber dicocokkan lewat SKU, lalu nama. Jumlah kirim diisi otomatis: sebanyak diminta, atau sebanyak stok yang ada
  useEffect(() => {
    if (!owner || r.status !== "diajukan") return;
    const next: Record<string, { pid: string; sent: string }> = {};
    for (const it of r.items) {
      const m = source.find((p) => it.sku && p.sku && same(p.sku, it.sku)) ?? source.find((p) => same(p.name, it.name));
      const step = stepOf(it.unit || "pcs");
      const sent = m ? Math.min(Number(it.qty), floorStep(Number(m.stock), step)) : 0;
      next[it.id] = { pid: m?.id ?? "", sent: sent > 0 ? fmtQty(sent) : "0" };
    }
    setPlan(next);
  }, [from, r.id, source.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- peminta: terima
  // Kosong = ikut jumlah yang dikirim. Dihitung saat tampil, supaya benar walau status berubah saat kartu sedang terbuka
  const [recv, setRecv] = useState<Record<string, string>>({});
  const recvOf = (i: R) => recv[i.id] ?? fmtQty(Number(i.sentQty || 0));
  const [recvNote, setRecvNote] = useState("");

  async function act(body: object, after?: () => void) {
    setBusy(true); setErr("");
    try { await api("/api/stock-requests", { method: "PATCH", body: { id: r.id, ...body } }); after?.(); reload(); }
    catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }
  const sentTotal = r.items.reduce((a, i) => a + Number(i.sentQty || 0), 0);

  return (
    <li className={`card p-0 ${needs ? "border-accent" : ""}`}>
      <button className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-4 text-left" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="font-mono text-sm font-bold">{r.requestNo}</span>
        <Chip s={r.status} />
        {needs && <span className="text-xs font-semibold text-link">Perlu tindakan Anda</span>}
        <span className="ml-auto text-sm text-muted">{tgl(r.createdAt)}</span>
        <span className="basis-full text-sm text-muted">
          Cabang {r.branchName}, diminta oleh {r.requestedByName}. {r.items.slice(0, 2).map((i) => `${i.name} ${qty(i.qty, i.unit)}`).join(", ")}{r.items.length > 2 ? `, +${r.items.length - 2} lainnya` : ""}
        </span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-line p-4">
          <ol className="flex gap-3" aria-label="Tahapan">
            <Step on title="Diajukan" sub={`${tgl(r.createdAt)}, ${r.requestedByName}`} />
            {r.status === "ditolak" ? <Step on title="Ditolak" sub={`${r.handledByName}: ${r.handledNote}`} />
              : r.status === "dibatalkan" ? <Step on title="Dibatalkan" sub={tgl(r.closedAt)} />
              : <>
                <Step on={!!r.shippedAt} title="Dikirim" sub={r.shippedAt ? `${tgl(r.shippedAt)}, ${r.handledByName}` : "Menunggu"} />
                <Step on={!!r.receivedAt} title="Diterima" sub={r.receivedAt ? `${tgl(r.receivedAt)}, ${r.receivedByName}` : "Menunggu"} />
              </>}
          </ol>
          {r.note && <p className="text-sm"><span className="font-semibold">Catatan peminta:</span> {r.note}</p>}

          {(r.status === "dikirim" || r.status === "diterima") && (
            <div className="rounded-xl bg-accent/10 p-4">
              <div className="text-sm text-muted">Nomor resi / nomor pengiriman</div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xl font-extrabold">{r.trackingNo}</span>
                <button type="button" className="btn-ghost" onClick={async () => { try { await navigator.clipboard.writeText(r.trackingNo); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* browser tidak mengizinkan */ } }}>{copied ? "Tersalin" : "Salin"}</button>
              </div>
              <div className="mt-1 text-sm text-muted">Dikirim dari cabang {r.fromBranchName}{r.handledNote ? `. Catatan: ${r.handledNote}` : ""}</div>
            </div>
          )}

          {/* Tabel barang (selain form kirim, yang punya tabelnya sendiri) */}
          {!(owner && r.status === "diajukan") && !(!owner && r.status === "dikirim") && (
            <div className="overflow-x-auto">
              <table className="w-full"><thead><tr><th className="th">Barang</th><th className="th">Diminta</th><th className="th">Dikirim</th><th className="th">Diterima</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {r.items.map((i) => {
                    const short = r.status !== "diajukan" && r.status !== "ditolak" && r.status !== "dibatalkan" && Number(i.sentQty) < Number(i.qty);
                    return (
                      <tr key={i.id}>
                        <td className="td font-semibold">{i.name}{i.sku && <span className="ml-2 font-mono text-xs font-normal text-muted">{i.sku}</span>}</td>
                        <td className="td">{qty(i.qty, i.unit)}</td>
                        <td className="td">{i.sentQty === "" ? "-" : qty(i.sentQty, i.unit)}{short && <span className="ml-2 text-xs font-semibold text-danger">kurang {fmtQty(Number(i.qty) - Number(i.sentQty))}</span>}</td>
                        <td className="td">{i.receivedQty === "" ? "-" : qty(i.receivedQty, i.unit)}{i.receivedQty !== "" && Number(i.receivedQty) < Number(i.sentQty) && <span className="ml-2 text-xs font-semibold text-danger">selisih {fmtQty(Number(i.sentQty) - Number(i.receivedQty))}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody></table>
            </div>
          )}

          {/* ---- Kepala toko memproses ---- */}
          {owner && r.status === "diajukan" && (
            <div className="space-y-4 rounded-xl border border-line bg-paper p-4">
              <h3 className="font-bold">Proses permintaan</h3>
              <div className="max-w-sm"><label className="label" htmlFor={`from-${r.id}`}>Ambil barang dari cabang</label>
                <select id={`from-${r.id}`} className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
                  <option value="">Pilih cabang asal</option>
                  {branches.filter((b) => b.id !== r.branchId).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select></div>
              <div className="overflow-x-auto">
                <table className="w-full"><thead><tr><th className="th">Diminta</th><th className="th">Barang di cabang asal</th><th className="th">Stok tersedia</th><th className="th">Jumlah kirim</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {r.items.map((i) => {
                      const unit = i.unit || "pcs", pl = plan[i.id] ?? { pid: "", sent: "0" };
                      const sp = source.find((p) => p.id === pl.pid), sent = parseQty(pl.sent || "0"), dec = stepOf(unit) < 1;
                      const over = sp ? sent > Number(sp.stock) + 1e-9 : false;
                      return (
                        <tr key={i.id}>
                          <td className="td"><div className="font-semibold">{i.name}</div><div className="text-sm text-muted">{qty(i.qty, unit)}</div></td>
                          <td className="td"><select aria-label={`Barang sumber untuk ${i.name}`} className="input min-w-[150px]" value={pl.pid} onChange={(e) => setPlan({ ...plan, [i.id]: { ...pl, pid: e.target.value } })}>
                            <option value="">{source.length ? "Pilih barang" : "Cabang asal belum dipilih"}</option>
                            {source.filter((p) => (p.unit || "pcs") === unit).map((p) => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""}</option>)}
                          </select></td>
                          <td className="td font-mono">{sp ? qty(sp.stock, unit) : "-"}</td>
                          <td className="td">
                            <input aria-label={`Jumlah kirim ${i.name}`} inputMode={dec ? "decimal" : "numeric"} className={`input w-24 font-mono ${over ? "border-danger" : ""}`} value={pl.sent}
                              onChange={(e) => setPlan({ ...plan, [i.id]: { ...pl, sent: dec ? e.target.value.replace(/[^\d.,]/g, "") : e.target.value.replace(/\D/g, "") } })} />
                            {over && <div className="text-xs font-semibold text-danger">Melebihi stok</div>}
                            {!over && sent > 0 && sent < Number(i.qty) && <div className="text-xs font-semibold text-muted">Kurang {fmtQty(Number(i.qty) - sent)} dari permintaan</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody></table>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label" htmlFor={`trk-${r.id}`}>Nomor resi / nomor pengiriman</label><input id={`trk-${r.id}`} className="input font-mono" maxLength={40} placeholder="Contoh: JNE1234567890" value={track} onChange={(e) => setTrack(e.target.value)} /></div>
                <div><label className="label" htmlFor={`sn-${r.id}`}>Catatan (opsional)</label><input id={`sn-${r.id}`} className="input" maxLength={300} placeholder="Contoh: sisa dikirim minggu depan" value={shipNote} onChange={(e) => setShipNote(e.target.value)} /></div>
              </div>
              <p className="text-sm text-muted">Stok cabang asal berkurang saat Anda menekan Kirim. Stok cabang peminta bertambah setelah mereka mengonfirmasi penerimaan.</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" disabled={busy || !from} onClick={() => act({ action: "kirim", fromBranchId: from, trackingNo: track, note: shipNote, items: r.items.map((i) => ({ itemId: i.id, fromProductId: plan[i.id]?.pid, sentQty: parseQty(plan[i.id]?.sent || "0") })) })}>{busy ? "Memproses…" : "Kirim barang"}</button>
                <button className="btn-ghost" onClick={() => setRejecting(!rejecting)}>Tolak permintaan</button>
              </div>
              {rejecting && (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[240px] flex-1"><label className="label" htmlFor={`why-${r.id}`}>Alasan penolakan</label><input id={`why-${r.id}`} className="input" maxLength={300} value={why} onChange={(e) => setWhy(e.target.value)} /></div>
                  <button className="btn-ghost border-danger text-danger" disabled={busy} onClick={() => act({ action: "tolak", note: why })}>Konfirmasi tolak</button>
                </div>
              )}
            </div>
          )}

          {/* ---- Peminta mengonfirmasi penerimaan ---- */}
          {!owner && r.status === "dikirim" && (
            <div className="space-y-4 rounded-xl border border-accent bg-accent/5 p-4">
              <h3 className="font-bold">Konfirmasi barang diterima</h3>
              <p className="text-sm text-muted">Hitung barang yang datang. Jika ada yang kurang atau rusak, ubah jumlahnya. Stok cabang bertambah sesuai jumlah yang diterima.</p>
              <div className="overflow-x-auto">
                <table className="w-full"><thead><tr><th className="th">Barang</th><th className="th">Diminta</th><th className="th">Dikirim</th><th className="th">Diterima</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {r.items.map((i) => {
                      const sent = Number(i.sentQty || 0), unit = i.unit || "pcs", dec = stepOf(unit) < 1;
                      if (!(sent > 0)) return <tr key={i.id}><td className="td font-semibold">{i.name}</td><td className="td">{qty(i.qty, unit)}</td><td className="td text-muted" colSpan={2}>Tidak dikirim</td></tr>;
                      const v = parseQty(recvOf(i) || "0");
                      return (
                        <tr key={i.id}>
                          <td className="td font-semibold">{i.name}</td><td className="td">{qty(i.qty, unit)}</td><td className="td">{qty(sent, unit)}{sent < Number(i.qty) && <span className="ml-2 text-xs font-semibold text-muted">kurang {fmtQty(Number(i.qty) - sent)}</span>}</td>
                          <td className="td"><input aria-label={`Jumlah diterima ${i.name}`} inputMode={dec ? "decimal" : "numeric"} className={`input w-24 font-mono ${v > sent + 1e-9 ? "border-danger" : ""}`} value={recvOf(i)}
                            onChange={(e) => setRecv({ ...recv, [i.id]: dec ? e.target.value.replace(/[^\d.,]/g, "") : e.target.value.replace(/\D/g, "") })} />
                            {v > sent + 1e-9 && <div className="text-xs font-semibold text-danger">Melebihi yang dikirim</div>}</td>
                        </tr>
                      );
                    })}
                  </tbody></table>
              </div>
              <div><label className="label" htmlFor={`rn-${r.id}`}>Catatan penerimaan (opsional)</label><input id={`rn-${r.id}`} className="input" maxLength={300} placeholder="Contoh: 1 jeruk rusak" value={recvNote} onChange={(e) => setRecvNote(e.target.value)} /></div>
              <button className="btn-primary" disabled={busy || sentTotal <= 0} onClick={() => act({ action: "terima", note: recvNote, items: r.items.map((i) => ({ itemId: i.id, receivedQty: parseQty(recvOf(i) || "0") })) })}>{busy ? "Memproses…" : "Konfirmasi diterima"}</button>
            </div>
          )}

          {!owner && r.status === "diajukan" && (
            <button className="btn-ghost" disabled={busy} onClick={() => { if (confirm("Batalkan permintaan ini?")) act({ action: "batal" }); }}>Batalkan permintaan</button>
          )}
          {err && <p className="text-sm font-medium text-danger" role="alert">{err}</p>}

          {/* ---- Percakapan ---- */}
          <section aria-label="Catatan dan balasan" className="space-y-3">
            <h3 className="font-bold">Catatan dan balasan</h3>
            {r.notes.length === 0 && <p className="text-sm text-muted">Belum ada catatan. Tulis pesan untuk {owner ? "peminta" : "kepala toko"} bila ada yang perlu ditanyakan.</p>}
            <ul className="space-y-2">
              {r.notes.map((n) => {
                const mine = n.authorId === me.session.uid;
                return (
                  <li key={n.id} className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${mine ? "ml-auto bg-accent/15" : "bg-paper"}`}>
                    <div className="text-xs font-semibold text-muted">{n.authorName}, {ROLE[n.authorRole] ?? n.authorRole}, {tgl(n.createdAt)}</div>
                    <div className="whitespace-pre-wrap break-words">{n.text}</div>
                  </li>
                );
              })}
            </ul>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) act({ action: "catat", text }, () => setText("")); }}>
              <input aria-label="Tulis pesan" className="input flex-1" maxLength={500} placeholder="Tulis pesan atau balasan" value={text} onChange={(e) => setText(e.target.value)} />
              <button className="btn-primary" disabled={busy || !text.trim()}>Kirim</button>
            </form>
          </section>
        </div>
      )}
    </li>
  );
}

/* ---------- Halaman ---------- */

type Filter = "semua" | "tindakan" | "selesai";

function Requests({ me }: { me: Me }) {
  const owner = me.session.role === "kepala_toko";
  const [reqs, setReqs] = useState<Req[]>([]);
  const [prods, setProds] = useState<R[]>([]);
  const [branches, setBranches] = useState<R[]>([]);
  const [filter, setFilter] = useState<Filter>("semua");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const [a, b, c] = await Promise.allSettled([api<Req[]>("/api/stock-requests"), api<R[]>("/api/products"), owner ? api<R[]>("/api/branches") : Promise.resolve([] as R[])]);
    if (a.status === "fulfilled") setReqs(a.value);
    if (b.status === "fulfilled") setProds(b.value);
    if (c.status === "fulfilled") setBranches(c.value);
    const bad = [a, b, c].find((x) => x.status === "rejected") as PromiseRejectedResult | undefined;
    setErr(bad ? String(bad.reason?.message ?? bad.reason) : "");
    setReady(true);
  }, [owner]);
  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const needs = (r: Req) => (owner ? r.status === "diajukan" : r.status === "dikirim");
  const done = (r: Req) => ["diterima", "ditolak", "dibatalkan"].includes(r.status);
  const shown = reqs.filter((r) => filter === "semua" || (filter === "tindakan" ? needs(r) : done(r)));
  const nNeed = reqs.filter(needs).length;

  return (
    <div className="space-y-6">
      <p className="max-w-[70ch] text-muted">
        {owner ? "Permintaan barang dari cabang. Pilih cabang asal, kirim sesuai stok yang ada (boleh kurang dari permintaan), lalu isi nomor resi."
          : "Minta barang ke kepala toko. Setelah barang dikirim dan Anda konfirmasi, stok cabang bertambah otomatis."}
      </p>

      {!owner && (
        <section className="card space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Buat permintaan barang</h2>
            <button className="btn-ghost" aria-expanded={creating} onClick={() => setCreating(!creating)}>{creating ? "Tutup formulir" : "+ Permintaan baru"}</button>
          </div>
          {creating && <NewRequest prods={prods} onDone={() => { setCreating(false); load(); }} />}
        </section>
      )}

      {err && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">{err}</p>}

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Saring permintaan">
        {([["semua", `Semua (${reqs.length})`], ["tindakan", `Perlu tindakan (${nNeed})`], ["selesai", `Selesai (${reqs.filter(done).length})`]] as [Filter, string][]).map(([k, t]) => (
          <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${filter === k ? "border-accent bg-accent text-white" : "border-line bg-surface hover:border-accent"}`}>{t}</button>
        ))}
        <button className="btn-ghost ml-auto" onClick={load}>Muat ulang</button>
      </div>

      {!ready && <p className="text-sm text-muted">Memuat…</p>}
      {ready && !shown.length && (
        <div className="card p-6 text-center">
          <p className="font-semibold">{filter === "semua" ? "Belum ada permintaan barang" : "Tidak ada permintaan pada saringan ini"}</p>
          {filter === "semua" && !owner && <p className="mt-1 text-sm text-muted">Tekan “Permintaan baru” di atas untuk meminta barang ke kepala toko.</p>}
        </div>
      )}
      <ul className="space-y-3">
        {shown.map((r) => <RequestCard key={r.id} r={r} me={me} prods={prods} branches={branches} reload={load} />)}
      </ul>
    </div>
  );
}

export default function Permintaan() {
  return <Shell>{(me) => ["kepala_toko", "kepala_cabang", "gudang"].includes(me.session.role)
    ? <Requests me={me} />
    : <p className="text-sm text-muted">Halaman permintaan barang hanya untuk kepala toko, kepala cabang, dan gudang.</p>}</Shell>;
}