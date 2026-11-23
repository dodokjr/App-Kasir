"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Shell from "@/components/Shell";
import BranchSelect from "@/components/BranchSelect";
import { useBranch } from "@/lib/useBranch";
import { api, rp, wibDay } from "@/lib/client";
import {
  KINDS, PAY_LABEL, STATUSES, UNIT_TYPES, calcProfit, calcRental, fmtRate, fmtDate, fmtRange, kindLabel, occupies, overlaps, payState, stateLabel, statusLabel, unitState, unitTypeLabel,
  type Booking, type BookingStatus, type RentalItem, type RentalKind, type UnitType,
} from "@/lib/rental";
import type { Me } from "@/lib/types";

type R = Record<string, string>;
type Tab = "jadwal" | "daftar" | "unit";
type View = "kalender" | "unit";

// Warna per jenis. Jenis juga selalu ditulis sebagai teks, jadi tidak bergantung pada warna saja
const KIND_CLS: Record<RentalKind, string> = {
  booking: "bg-sun/80 text-sun-ink",
  sewa: "bg-accent text-white",
  rental: "bg-ink text-paper",
};
const STATUS_CLS: Record<BookingStatus, string> = {
  booked: "bg-sun/40 text-sun-ink dark:text-ink",
  active: "bg-accent/15 text-accent dark:text-link",
  returned: "bg-line text-muted",
  cancelled: "bg-danger/10 text-danger",
};
const DAYNAMES = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const monthLabel = (m: string) => new Date(m + "-01T00:00:00Z").toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const addMonths = (m: string, n: number) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + n, 1)).toISOString().slice(0, 7);
const daysIn = (m: string) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).getUTCDate();
// 0 = Senin ... 6 = Minggu
const firstDow = (m: string) => (new Date(m + "-01T00:00:00Z").getUTCDay() + 6) % 7;
const digits = (s: string) => s.replace(/\D/g, "");
const num = (s: string) => Number(digits(s) || 0);

/* ---------- Kartu satu booking, dengan aksi ---------- */
function BookingCard({ b, today, canAct, onDone, onError }: { b: Booking; today: string; canAct: boolean; onDone: () => void; onError: (m: string) => void }) {
  const [mode, setMode] = useState<null | "pay" | "extend">(null);
  const [amount, setAmount] = useState("");
  const [end, setEnd] = useState(b.endDate);
  const [busy, setBusy] = useState(false);
  const left = b.total - b.paid;
  const ps = payState(b.paid, b.total);
  const late = b.status === "active" && b.endDate < today;
  const startDue = b.status === "booked" && b.startDate <= today;

  async function run(body: Record<string, unknown>, ask?: string) {
    if (ask && !confirm(ask)) return;
    setBusy(true); onError("");
    try { await api("/api/bookings", { method: "PATCH", body: { id: b.id, ...body } }); setMode(null); setAmount(""); onDone(); }
    catch (x) { onError((x as Error).message); }
    finally { setBusy(false); }
  }
  const preview = calcRental(b.startDate, end, b.pricePerDay);

  return (
    <li className="card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${KIND_CLS[b.kind]}`}>{kindLabel(b.kind)}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_CLS[b.status]}`}>{statusLabel(b.status)}</span>
            {late && <span className="rounded-full bg-danger px-2.5 py-0.5 text-xs font-bold text-white">Terlambat {Math.round((Date.parse(today) - Date.parse(b.endDate)) / 864e5)} hari</span>}
            {startDue && <span className="rounded-full border border-accent px-2.5 py-0.5 text-xs font-bold text-accent dark:text-link">Waktunya mulai</span>}
          </div>
          <p className="mt-1.5 font-semibold leading-tight">{b.itemName}</p>
          <p className="text-sm text-muted">{b.customerName}{b.phone ? ` · ${b.phone}` : ""}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg font-bold">{rp(b.total)}</p>
          <p className="text-xs text-muted">{b.days} hari × {rp(b.pricePerDay)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>{fmtRange(b.startDate, b.endDate)}</span>
        <span className={ps === "lunas" ? "font-semibold text-accent dark:text-link" : "font-semibold"}>
          {PAY_LABEL[ps]}{ps !== "lunas" && <> · sisa {rp(left)}</>}{ps === "dp" && <span className="font-normal text-muted"> (dibayar {rp(b.paid)})</span>}
        </span>
      </div>
      <p className="text-sm text-muted">Keuntungan {fmtRate(b.profitRate)}%: <strong className="text-ink">{rp(calcProfit(b.total, b.profitRate).profit)}</strong> · modal/biaya {rp(calcProfit(b.total, b.profitRate).cost)}</p>
      {b.note && <p className="rounded-lg bg-paper px-3 py-2 text-sm text-muted">{b.note}</p>}

      {canAct && (occupies(b.status) || (b.status === "returned" && left > 0)) ? (
        <div className="flex flex-wrap gap-2">
          {b.status === "booked" && <button className="btn-primary" disabled={busy} onClick={() => run({ action: "start" })}>Mulai (diambil)</button>}
          {b.status === "active" && <button className="btn-primary" disabled={busy} onClick={() => run({ action: "finish" }, left > 0 ? `Masih ada sisa tagihan ${rp(left)}. Tetap selesaikan?` : undefined)}>Selesai (dikembalikan)</button>}
          {left > 0 && <button className="btn-ghost" disabled={busy} onClick={() => { setMode(mode === "pay" ? null : "pay"); setAmount(String(left)); }}>Catat pembayaran</button>}
          {occupies(b.status) && <button className="btn-ghost" disabled={busy} onClick={() => setMode(mode === "extend" ? null : "extend")}>Ubah tanggal selesai</button>}
          {occupies(b.status) && <button className="btn-ghost text-danger" disabled={busy} onClick={() => run({ action: "cancel" }, `Batalkan ${kindLabel(b.kind).toLowerCase()} ${b.itemName} untuk ${b.customerName}?`)}>Batalkan</button>}
        </div>
      ) : null}

      {mode === "pay" && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-line p-3">
          <div className="min-w-[160px] flex-1">
            <label className="label" htmlFor={`pay-${b.id}`}>Jumlah dibayar (maks. {rp(left)})</label>
            <input id={`pay-${b.id}`} className="input" inputMode="numeric" value={amount ? Number(amount).toLocaleString("id-ID") : ""} onChange={(e) => setAmount(digits(e.target.value))} />
          </div>
          <button className="btn-primary" disabled={busy || !num(amount)} onClick={() => run({ action: "pay", amount: num(amount) })}>Simpan</button>
          <button className="btn-ghost" onClick={() => setMode(null)}>Tutup</button>
        </div>
      )}
      {mode === "extend" && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-line p-3">
          <div className="min-w-[160px] flex-1">
            <label className="label" htmlFor={`ext-${b.id}`}>Tanggal selesai baru</label>
            <input id={`ext-${b.id}`} type="date" className="input" min={b.startDate} value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <p className="pb-2 text-sm text-muted">{preview.days ? <>{preview.days} hari = <strong className="text-ink">{rp(preview.total)}</strong></> : "Tanggal tidak valid"}</p>
          <button className="btn-primary" disabled={busy || !preview.days || end === b.endDate} onClick={() => run({ action: "extend", endDate: end })}>Simpan</button>
          <button className="btn-ghost" onClick={() => setMode(null)}>Tutup</button>
        </div>
      )}
    </li>
  );
}

/* ---------- Papan status unit: kamar, mobil, motor, barang ---------- */
const STATE_CLS = {
  free: "border-line",
  used: "border-accent bg-accent/5",
  booked: "border-sun bg-sun/10",
} as const;
const STATE_CHIP = {
  free: "bg-line text-muted",
  used: "bg-accent text-white",
  booked: "bg-sun text-sun-ink",
} as const;

function UnitBoard({ items, bookings, today, onPick }: { items: RentalItem[]; bookings: Booking[]; today: string; onPick: (d: string) => void }) {
  const [type, setType] = useState<"all" | UnitType>("all");
  const rows = useMemo(
    () => items.filter((i) => type === "all" || i.category === type).map((i) => ({ i, st: unitState(i.id, bookings, today) })),
    [items, bookings, today, type],
  );
  const used = rows.filter((r) => r.st.state === "used").length, booked = rows.filter((r) => r.st.state === "booked").length;
  const types = UNIT_TYPES.filter((u) => items.some((i) => i.category === u.key));
  if (!items.length) return null;
  return (
    <section className="space-y-3" aria-label="Status unit hari ini">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Status unit hari ini</h2>
        <p className="text-sm text-muted">{used} dipakai · {booked} dibooking · {rows.length - used - booked} kosong</p>
      </div>
      {types.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Saring tipe unit">
          {([["all", "Semua"], ...types.map((u) => [u.key, u.label])] as [string, string][]).map(([k, t]) => (
            <button key={k} aria-pressed={type === k} onClick={() => setType(k as typeof type)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${type === k ? "border-accent bg-accent text-white" : "border-line hover:border-accent"}`}>{t}</button>
          ))}
        </div>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ i, st }) => (
          <li key={i.id} className={`card space-y-2 border-2 ${STATE_CLS[st.state]}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold leading-tight">{i.name}</p>
                <p className="text-xs text-muted">{unitTypeLabel(i.category)} · {rp(i.pricePerDay)}/hari</p>
              </div>
              <span className={`flex-none rounded-full px-2.5 py-0.5 text-xs font-bold ${STATE_CHIP[st.state]}`}>{stateLabel(st)}</span>
            </div>
            {st.current ? (
              <p className="text-sm">
                <strong>{st.current.customerName}</strong>{st.current.phone ? ` · ${st.current.phone}` : ""}<br />
                <span className="text-muted">{fmtRange(st.current.startDate, st.current.endDate)}</span>
                {st.late && <span className="ml-1.5 font-bold text-danger">Terlambat dikembalikan</span>}
              </p>
            ) : <p className="text-sm text-muted">Tidak ada yang memakai hari ini.</p>}
            {st.next && <p className="rounded-lg bg-paper px-2.5 py-1.5 text-xs text-muted">Berikutnya ({kindLabel(st.next.kind)}): <strong className="text-ink">{st.next.customerName}</strong>, {fmtRange(st.next.startDate, st.next.endDate)}</p>}
            {st.current && <button type="button" className="text-xs font-semibold text-link underline underline-offset-4" onClick={() => onPick(st.current!.startDate <= today ? today : st.current!.startDate)}>Lihat di jadwal</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Formulir booking baru ---------- */
function NewBooking({ items, bookings, branchId, defaultStart, canManage, onGoUnits, onSaved, onCancel }: {
  items: RentalItem[]; bookings: Booking[]; branchId: string; defaultStart: string; canManage: boolean; onGoUnits: () => void; onSaved: () => void; onCancel: () => void;
}) {
  const usable = items.filter((i) => i.active);
  const [f, setF] = useState({ itemId: usable[0]?.id ?? "", kind: (usable[0]?.kind ?? "sewa") as RentalKind, customerName: "", phone: "", startDate: defaultStart, endDate: defaultStart, price: String(usable[0]?.pricePerDay ?? ""), paid: "", note: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const item = usable.find((i) => i.id === f.itemId);
  const { days, total } = calcRental(f.startDate, f.endDate, num(f.price));
  const clash = useMemo(
    () => (days ? bookings.find((b) => b.itemId === f.itemId && occupies(b.status) && overlaps(f.startDate, f.endDate, b.startDate, b.endDate)) : undefined),
    [bookings, f.itemId, f.startDate, f.endDate, days],
  );
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  function pickItem(id: string) {
    const it = usable.find((i) => i.id === id);
    set({ itemId: id, kind: it?.kind ?? f.kind, price: String(it?.pricePerDay ?? "") });
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      await api("/api/bookings", { method: "POST", body: { branchId, itemId: f.itemId, kind: f.kind, customerName: f.customerName, phone: f.phone, startDate: f.startDate, endDate: f.endDate, pricePerDay: num(f.price), paid: num(f.paid), note: f.note } });
      onSaved();
    } catch (x) { setErr((x as Error).message); }
    finally { setBusy(false); }
  }

  if (!usable.length) return (
    <div className="card space-y-3" role="status">
      <h2 className="text-lg font-bold">Belum ada unit untuk dibooking</h2>
      <p className="text-sm text-muted">{canManage ? "Tambahkan dulu unit (mobil, kamar, tenda, dan sebagainya) beserta harga per harinya. Setelah itu booking bisa dibuat." : "Unit dan harga per hari diisi oleh kepala toko atau kepala cabang. Minta mereka menambahkan unit di tab Unit & harga, lalu booking bisa dibuat di sini."}</p>
      <div className="flex flex-wrap gap-2">
        {canManage && <button type="button" className="btn-primary" onClick={onGoUnits}>Tambah unit sekarang</button>}
        <button type="button" className="btn-ghost" onClick={onCancel}>Tutup</button>
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} className="card grid gap-3 sm:grid-cols-6" aria-label="Booking, sewa, atau rental baru">
      <h2 className="text-lg font-bold sm:col-span-6">Booking / sewa / rental baru</h2>

      <div className="sm:col-span-3">
        <label className="label" htmlFor="b-item">Unit</label>
        <select id="b-item" className="input" value={f.itemId} onChange={(e) => pickItem(e.target.value)}>
          {usable.map((i) => <option key={i.id} value={i.id}>{unitTypeLabel(i.category)}: {i.name} — {rp(i.pricePerDay)}/hari</option>)}
        </select>
      </div>
      <div className="sm:col-span-3">
        <label className="label" htmlFor="b-kind">Jenis</label>
        <select id="b-kind" className="input" value={f.kind} onChange={(e) => set({ kind: e.target.value as RentalKind })}>
          {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
        </select>
        <p className="mt-1 text-xs text-muted">{KINDS.find((k) => k.key === f.kind)?.desc}</p>
      </div>

      <div className="sm:col-span-3"><label className="label" htmlFor="b-name">Nama penyewa</label><input id="b-name" required maxLength={60} className="input" value={f.customerName} onChange={(e) => set({ customerName: e.target.value })} /></div>
      <div className="sm:col-span-3"><label className="label" htmlFor="b-phone">No. telepon (opsional)</label><input id="b-phone" inputMode="tel" maxLength={20} className="input" value={f.phone} onChange={(e) => set({ phone: e.target.value.replace(/[^0-9+\-\s()]/g, "") })} /></div>

      <div className="sm:col-span-2"><label className="label" htmlFor="b-start">Tanggal mulai</label>
        <input id="b-start" type="date" required className="input" value={f.startDate} onChange={(e) => set({ startDate: e.target.value, endDate: e.target.value > f.endDate ? e.target.value : f.endDate })} /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="b-end">Tanggal selesai (termasuk)</label>
        <input id="b-end" type="date" required min={f.startDate} className="input" value={f.endDate} onChange={(e) => set({ endDate: e.target.value })} /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="b-price">Harga per hari</label>
        <input id="b-price" required inputMode="numeric" className="input" value={f.price ? Number(f.price).toLocaleString("id-ID") : ""} onChange={(e) => set({ price: digits(e.target.value) })} />
        {item && num(f.price) !== item.pricePerDay && <p className="mt-1 text-xs text-muted">Harga standar unit {rp(item.pricePerDay)}</p>}</div>

      <div className="sm:col-span-2"><label className="label" htmlFor="b-paid">Uang muka / dibayar sekarang</label>
        <input id="b-paid" inputMode="numeric" placeholder="0" className="input" value={f.paid ? Number(f.paid).toLocaleString("id-ID") : ""} onChange={(e) => set({ paid: digits(e.target.value) })} /></div>
      <div className="sm:col-span-4"><label className="label" htmlFor="b-note">Catatan (opsional)</label><input id="b-note" maxLength={200} className="input" value={f.note} onChange={(e) => set({ note: e.target.value })} placeholder="Jaminan KTP, jam ambil, kebutuhan khusus…" /></div>

      <div className="rounded-xl bg-paper p-3 sm:col-span-6" aria-live="polite">
        {days ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-muted">{fmtRange(f.startDate, f.endDate)} · <strong className="text-ink">{days} hari</strong> × {rp(num(f.price))}</p>
            <p className="font-mono text-xl font-extrabold">{rp(total)}</p>
          </div>
        ) : <p className="text-sm text-danger">Tanggal selesai tidak boleh sebelum tanggal mulai.</p>}
        {days > 0 && item && <p className="mt-1 text-sm text-muted">Keuntungan {fmtRate(item.profitRate)}%: <strong className="text-ink">{rp(calcProfit(total, item.profitRate).profit)}</strong> · modal/biaya {rp(calcProfit(total, item.profitRate).cost)}</p>}
        {days > 0 && <p className="mt-1 text-sm text-muted">Sisa tagihan setelah uang muka: <strong className="text-ink">{rp(Math.max(0, total - num(f.paid)))}</strong></p>}
        {clash && <p className="mt-2 text-sm font-semibold text-danger" role="alert">Jadwal bentrok: {item?.name} sudah dipakai {clash.customerName} ({fmtRange(clash.startDate, clash.endDate)}).</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
        <button className="btn-primary" disabled={busy || !days || !!clash || num(f.paid) > total}>{busy ? "Menyimpan…" : "Simpan"}</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Batal</button>
        {num(f.paid) > total && days > 0 && <span className="text-sm font-medium text-danger">Uang muka melebihi total.</span>}
        {err && <span className="text-sm font-medium text-danger" role="alert">{err}</span>}
      </div>
    </form>
  );
}

/* ---------- Jadwal: kalender bulanan dan per unit ---------- */
function Jadwal({ items, bookings, today, selected, setSelected, canAct, onDone, onError, onNew }: {
  items: RentalItem[]; bookings: Booking[]; today: string; selected: string; setSelected: (d: string) => void;
  canAct: boolean; onDone: () => void; onError: (m: string) => void; onNew: (d: string) => void;
}) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [view, setView] = useState<View>("kalender");
  const n = daysIn(month), lead = firstDow(month);
  const dateOf = (d: number) => `${month}-${String(d).padStart(2, "0")}`;
  const live = useMemo(() => bookings.filter((b) => b.status !== "cancelled"), [bookings]);
  const on = (date: string) => live.filter((b) => b.startDate <= date && b.endDate >= date);
  const dayList = bookings.filter((b) => b.status !== "cancelled" && b.startDate <= selected && b.endDate >= selected);

  const go = (m: string) => { setMonth(m); };
  return (
    <div className="space-y-6">
      <UnitBoard items={items} bookings={bookings} today={today} onPick={(d) => { setSelected(d); setMonth(d.slice(0, 7)); }} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-ghost" aria-label="Bulan sebelumnya" onClick={() => go(addMonths(month, -1))}>‹</button>
          <h2 className="min-w-[10rem] text-center text-lg font-bold capitalize" aria-live="polite">{monthLabel(month)}</h2>
          <button className="btn-ghost" aria-label="Bulan berikutnya" onClick={() => go(addMonths(month, 1))}>›</button>
          <button className="btn-ghost" onClick={() => { go(today.slice(0, 7)); setSelected(today); }}>Hari ini</button>
        </div>
        <div className="flex gap-2" role="group" aria-label="Tampilan jadwal">
          {([["kalender", "Kalender"], ["unit", "Per unit"]] as [View, string][]).map(([k, t]) => (
            <button key={k} aria-pressed={view === k} onClick={() => setView(k)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${view === k ? "border-accent bg-accent text-white" : "border-line hover:border-accent"}`}>{t}</button>
          ))}
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Keterangan warna">
        {KINDS.map((k) => <li key={k.key} className="flex items-center gap-1.5"><span className={`inline-block h-3 w-3 rounded-sm ${KIND_CLS[k.key]}`} aria-hidden="true" />{k.label}</li>)}
        <li className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-accent/40 opacity-50" aria-hidden="true" />Selesai (pudar)</li>
      </ul>

      {view === "kalender" ? (
        <div className="card overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-line bg-paper text-center text-xs font-semibold text-muted">
            {DAYNAMES.map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: lead }).map((_, i) => <div key={`e${i}`} className="min-h-[4.5rem] border-b border-r border-line bg-paper/50 sm:min-h-[6.5rem]" />)}
            {Array.from({ length: n }).map((_, i) => {
              const date = dateOf(i + 1), list = on(date), isSel = date === selected, isToday = date === today;
              return (
                <button key={date} type="button" onClick={() => setSelected(date)} aria-pressed={isSel} aria-label={`${fmtDate(date)}, ${list.length} jadwal`}
                  className={`min-h-[4.5rem] border-b border-r border-line p-1 text-left align-top transition hover:bg-accent/5 sm:min-h-[6.5rem] sm:p-1.5 ${isSel ? "bg-accent/10 ring-2 ring-inset ring-accent" : ""}`}>
                  <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold ${isToday ? "bg-accent text-white" : ""}`}>{i + 1}</span>
                  {/* HP: hanya titik penanda. Layar lebar: nama unit */}
                  <span className="mt-1 flex flex-wrap gap-0.5 sm:hidden" aria-hidden="true">
                    {list.slice(0, 4).map((b) => <span key={b.id} className={`h-2 w-2 rounded-full ${KIND_CLS[b.kind]} ${b.status === "returned" ? "opacity-50" : ""}`} />)}
                  </span>
                  <span className="mt-1 hidden space-y-0.5 sm:block">
                    {list.slice(0, 3).map((b) => (
                      <span key={b.id} className={`block truncate rounded px-1 py-0.5 text-[11px] font-semibold leading-tight ${KIND_CLS[b.kind]} ${b.status === "returned" ? "opacity-50" : ""}`}>{b.itemName} · {b.customerName}</span>
                    ))}
                    {list.length > 3 && <span className="block px-1 text-[11px] font-semibold text-muted">+{list.length - 3} lagi</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          {!items.length ? <p className="p-4 text-sm text-muted">Belum ada unit.</p> : (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 min-w-[8rem] border-b border-r border-line bg-surface px-3 py-2 text-left font-semibold text-muted">Unit</th>
                  {Array.from({ length: n }).map((_, i) => {
                    const date = dateOf(i + 1);
                    return <th key={date} className={`min-w-[1.75rem] border-b border-line px-0 py-2 text-center font-semibold ${date === today ? "bg-accent text-white" : date === selected ? "bg-accent/15" : "text-muted"}`}><button type="button" className="w-full" onClick={() => setSelected(date)} aria-label={fmtDate(date)}>{i + 1}</button></th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const mine = live.filter((b) => b.itemId === it.id);
                  return (
                    <tr key={it.id}>
                      <th scope="row" className="sticky left-0 z-10 border-b border-r border-line bg-surface px-3 py-1.5 text-left font-semibold"><span className="block max-w-[10rem] truncate">{it.name}</span><span className="block font-normal text-muted">{rp(it.pricePerDay)}/hari</span></th>
                      {Array.from({ length: n }).map((_, i) => {
                        const date = dateOf(i + 1), b = mine.find((x) => x.startDate <= date && x.endDate >= date);
                        return (
                          <td key={date} className={`border-b border-line p-0 ${date === selected ? "bg-accent/10" : ""}`}>
                            <button type="button" onClick={() => setSelected(date)} title={b ? `${b.customerName} · ${kindLabel(b.kind)} · ${fmtRange(b.startDate, b.endDate)}` : `${it.name} kosong ${fmtDate(date)}`}
                              aria-label={b ? `${it.name} dipakai ${b.customerName}, ${fmtDate(date)}` : `${it.name} kosong, ${fmtDate(date)}`}
                              className={`block h-8 w-full ${b ? `${KIND_CLS[b.kind]} ${b.status === "returned" ? "opacity-50" : ""} ${b.startDate === date ? "rounded-l-md" : ""} ${b.endDate === date ? "rounded-r-md" : ""}` : "hover:bg-accent/10"}`}>
                              {b && b.startDate === date ? <span className="px-1 text-[10px] font-bold">{b.customerName.slice(0, 1).toUpperCase()}</span> : null}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <section aria-label="Jadwal tanggal terpilih" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold">{fmtDate(selected)}{selected === today ? " (hari ini)" : ""} · {dayList.length} jadwal</h3>
          {canAct && <button className="btn-primary" onClick={() => onNew(selected)}>Booking di tanggal ini</button>}
        </div>
        {dayList.length ? (
          <ul className="grid gap-3 lg:grid-cols-2">{dayList.map((b) => <BookingCard key={b.id} b={b} today={today} canAct={canAct} onDone={onDone} onError={onError} />)}</ul>
        ) : <p className="card text-sm text-muted">Tidak ada jadwal di tanggal ini. Semua unit kosong.</p>}
      </section>
    </div>
  );
}

/* ---------- Unit dan harga per hari ---------- */
function Units({ items, bookings, today, branchId, canManage, onDone, onError }: { items: RentalItem[]; bookings: Booking[]; today: string; branchId: string; canManage: boolean; onDone: () => void; onError: (m: string) => void }) {
  const [f, setF] = useState({ name: "", kind: "sewa" as RentalKind, category: "mobil" as UnitType, price: "", profit: "15", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      await api("/api/rental-items", { method: "POST", body: { branchId, name: f.name, kind: f.kind, pricePerDay: num(f.price), profitRate: f.profit, category: f.category, note: f.note } });
      setF({ name: "", kind: f.kind, category: f.category, price: "", profit: f.profit, note: "" }); onDone();
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  }
  async function patch(id: string, body: Record<string, unknown>) {
    onError("");
    try { await api("/api/rental-items", { method: "PATCH", body: { id, ...body } }); onDone(); } catch (x) { onError((x as Error).message); }
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <form onSubmit={add} className="card grid gap-3 sm:grid-cols-6" aria-label="Tambah unit">
          <h2 className="text-lg font-bold sm:col-span-6">Tambah unit yang bisa disewakan</h2>
          <div><label className="label" htmlFor="u-cat">Tipe unit</label><select id="u-cat" className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as UnitType })}>{UNIT_TYPES.map((u) => <option key={u.key} value={u.key}>{u.label}</option>)}</select></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="u-name">Nama unit</label><input id="u-name" required maxLength={50} className="input" placeholder="Avanza B 1234 XY, Kamar 3, Tenda 4x6…" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><label className="label" htmlFor="u-kind">Jenis</label><select id="u-kind" className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as RentalKind })}>{KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select></div>
          <div><label className="label" htmlFor="u-price">Harga per hari</label><input id="u-price" required inputMode="numeric" className="input" value={f.price ? Number(f.price).toLocaleString("id-ID") : ""} onChange={(e) => setF({ ...f, price: digits(e.target.value) })} /></div>
          <div><label className="label" htmlFor="u-profit">Keuntungan (%)</label><input id="u-profit" required inputMode="decimal" className="input" value={f.profit} onChange={(e) => setF({ ...f, profit: e.target.value.replace(/[^\d.,]/g, "") })} /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="u-note">Keterangan (opsional)</label><input id="u-note" maxLength={120} className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
            <button className="btn-primary" disabled={busy}>{busy ? "Menyimpan…" : "Tambah unit"}</button>
            {err && <span className="text-sm font-medium text-danger" role="alert">{err}</span>}
          </div>
        </form>
      ) : <p className="card text-sm text-muted">Hanya kepala toko dan kepala cabang yang bisa menambah unit atau mengubah harga.</p>}

      <section className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="th pl-4">Unit</th><th className="th">Tipe</th><th className="th">Jenis</th><th className="th">Status hari ini</th><th className="th">Harga per hari</th><th className="th">Keuntungan</th><th className="th">Status</th>{canManage && <th className="th pr-4"></th>}</tr></thead>
            <tbody className="divide-y divide-line">
              {items.map((i) => (
                <tr key={i.id} className={i.active ? "" : "opacity-60"}>
                  <td className="td pl-4"><div className="font-semibold">{i.name}</div>{i.note && <div className="text-xs text-muted">{i.note}</div>}</td>
                  <td className="td">{unitTypeLabel(i.category)}</td>
                  <td className="td">{kindLabel(i.kind)}</td>
                  <td className="td">{i.active ? (() => { const st = unitState(i.id, bookings, today); return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATE_CHIP[st.state]}`}>{stateLabel(st)}{st.current ? `: ${st.current.customerName}` : ""}</span>; })() : <span className="text-muted">-</span>}</td>
                  <td className="td font-mono font-semibold">{rp(i.pricePerDay)}</td>
                  <td className="td">{fmtRate(i.profitRate)}% <span className="text-xs text-muted">({rp(calcProfit(i.pricePerDay, i.profitRate).profit)}/hari)</span></td>
                  <td className="td">{i.active ? "Aktif" : "Nonaktif"}</td>
                  {canManage && (
                    <td className="td pr-4 text-right"><div className="flex flex-wrap justify-end gap-2">
                      <button className="btn-ghost" onClick={() => { const v = prompt(`Harga per hari baru untuk ${i.name}. Booking yang sudah ada tidak berubah.`, String(i.pricePerDay)); if (v !== null && v !== "") patch(i.id, { pricePerDay: Number(digits(v)) }); }}>Ubah harga</button>
                      <button className="btn-ghost" onClick={() => { const v = prompt(`Persen keuntungan baru untuk ${i.name} (0-100). Booking yang sudah ada tidak berubah.`, String(i.profitRate)); if (v !== null && v !== "") patch(i.id, { profitRate: v }); }}>Ubah untung</button>
                      <button className="btn-ghost" onClick={() => { const v = prompt("Tipe unit baru: kamar, mobil, motor, barang, atau lainnya", i.category); if (v !== null && v.trim()) patch(i.id, { category: v.trim().toLowerCase() }); }}>Ubah tipe</button>
                      <button className="btn-ghost" onClick={() => { const v = prompt("Nama unit baru", i.name); if (v !== null && v.trim()) patch(i.id, { name: v }); }}>Ubah nama</button>
                      <button className="btn-ghost" onClick={() => patch(i.id, { active: !i.active })}>{i.active ? "Nonaktifkan" : "Aktifkan"}</button>
                    </div></td>
                  )}
                </tr>
              ))}
              {!items.length && <tr><td className="td text-muted" colSpan={8}>Belum ada unit di cabang ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ---------- Halaman ---------- */
function Sewa({ me }: { me: Me }) {
  const owner = me.session.role === "kepala_toko";
  const canManage = owner || me.session.role === "kepala_cabang";
  const today = wibDay();
  const [branches, setBranches] = useState<R[]>([]);
  const [branch, setBranch] = useBranch(me.session.branchId);
  const branchId = owner && branches.some((b) => b.id === branch) ? branch : me.session.branchId;
  const [items, setItems] = useState<RentalItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<Tab>("jadwal");
  const [selected, setSelected] = useState(today);
  const [form, setForm] = useState<string | null>(null); // tanggal mulai bawaan, null = formulir tertutup
  const [fStatus, setFStatus] = useState<"all" | BookingStatus>("all");
  const [fKind, setFKind] = useState<"all" | RentalKind>("all");
  const [q, setQ] = useState("");
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (form !== null) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [form]);

  useEffect(() => { if (owner) api<R[]>("/api/branches").then(setBranches).catch((x) => setErr((x as Error).message)); }, [owner]);
  const load = useCallback(async () => {
    try {
      const [it, bk] = await Promise.all([
        api<RentalItem[]>(`/api/rental-items?all=1&branchId=${branchId}`),
        api<Booking[]>(`/api/bookings?branchId=${branchId}`),
      ]);
      setItems(it); setBookings(bk); setLoaded(true);
    } catch (x) { setErr((x as Error).message); }
  }, [branchId]);
  useEffect(() => { load(); }, [load]);

  const activeItems = items.filter((i) => i.active);
  const stats = useMemo(() => {
    const running = bookings.filter((b) => b.status === "active");
    return {
      running: running.length,
      booked: bookings.filter((b) => b.status === "booked").length,
      late: running.filter((b) => b.endDate < today).length,
      profit: bookings.filter((b) => b.status !== "cancelled").reduce((a, b) => a + calcProfit(b.total, b.profitRate).profit, 0),
      profitDone: bookings.filter((b) => b.status === "returned").reduce((a, b) => a + calcProfit(b.total, b.profitRate).profit, 0),
      unpaid: bookings.filter((b) => b.status !== "cancelled").reduce((a, b) => a + Math.max(0, b.total - b.paid), 0),
      freeToday: activeItems.filter((i) => !bookings.some((b) => b.itemId === i.id && occupies(b.status) && b.startDate <= today && b.endDate >= today)).length,
    };
  }, [bookings, activeItems, today]);

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return bookings
      .filter((b) => (fStatus === "all" || b.status === fStatus) && (fKind === "all" || b.kind === fKind) && (!k || `${b.customerName} ${b.itemName} ${b.phone}`.toLowerCase().includes(k)))
      .sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt));
  }, [bookings, fStatus, fKind, q]);

  const done = () => { setErr(""); load(); };
  const openForm = (d: string) => { setForm(d); setTab("jadwal"); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Booking, sewa, dan rental</h1>
          <p className="text-sm text-muted">Jadwal unit, harga per hari, dan status pembayaran.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {owner && branches.length > 0 && <BranchSelect branches={branches} value={branchId} onChange={setBranch} />}
          <button className="btn-primary btn-lg" onClick={() => openForm(selected < today ? today : selected)}>+ Booking baru</button>
        </div>
      </div>

      {err && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-medium text-danger" role="alert">{err}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {([
          ["Sedang berjalan", stats.running, ""], ["Dipesan", stats.booked, ""],
          ["Terlambat", stats.late, stats.late ? "text-danger" : ""], ["Unit kosong hari ini", `${stats.freeToday}/${activeItems.length}`, ""],
          ["Belum dibayar", rp(stats.unpaid), ""], ["Perkiraan keuntungan", rp(stats.profit), "text-accent dark:text-link"],
        ] as [string, string | number, string][]).map(([t, v, c]) => (
          <div key={t} className="card"><p className="text-xs font-medium text-muted">{t}</p><p className={`mt-1 font-mono text-xl font-extrabold ${c}`}>{loaded ? v : "…"}</p>{t === "Perkiraan keuntungan" && loaded && <p className="text-xs text-muted">{rp(stats.profitDone)} dari yang sudah selesai</p>}</div>
        ))}
      </div>

      {form !== null && <div ref={formRef} className="scroll-mt-24"><NewBooking key={`${branchId}-${activeItems.length}`} items={items} bookings={bookings} branchId={branchId} defaultStart={form} canManage={canManage} onGoUnits={() => { setForm(null); setTab("unit"); }} onCancel={() => setForm(null)} onSaved={() => { setForm(null); done(); }} /></div>}

      <div className="flex flex-wrap gap-2 border-b border-line pb-3" role="tablist" aria-label="Bagian halaman">
        {([["jadwal", "Jadwal"], ["daftar", `Daftar (${bookings.length})`], ["unit", "Unit & harga"]] as [Tab, string][]).map(([k, t]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${tab === k ? "border-accent bg-accent text-white" : "border-line hover:border-accent"}`}>{t}</button>
        ))}
      </div>

      {tab === "jadwal" && <Jadwal items={activeItems} bookings={bookings} today={today} selected={selected} setSelected={setSelected} canAct onDone={done} onError={setErr} onNew={openForm} />}

      {tab === "daftar" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input type="text" className="input min-w-[220px] flex-1" placeholder="Cari nama penyewa, unit, atau telepon" aria-label="Cari booking" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="input w-auto" aria-label="Saring jenis" value={fKind} onChange={(e) => setFKind(e.target.value as typeof fKind)}>
              <option value="all">Semua jenis</option>{KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Saring status">
            {([["all", "Semua"], ...STATUSES.map((s) => [s.key, s.label])] as [string, string][]).map(([k, t]) => (
              <button key={k} aria-pressed={fStatus === k} onClick={() => setFStatus(k as typeof fStatus)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${fStatus === k ? "border-accent bg-accent text-white" : "border-line hover:border-accent"}`}>
                {t}{k !== "all" && ` (${bookings.filter((b) => b.status === k).length})`}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted" aria-live="polite">Menampilkan {Math.min(list.length, 200)} dari {list.length} data.</p>
          {list.length ? <ul className="grid gap-3 lg:grid-cols-2">{list.slice(0, 200).map((b) => <BookingCard key={b.id} b={b} today={today} canAct onDone={done} onError={setErr} />)}</ul>
            : <p className="card text-sm text-muted">{bookings.length ? "Tidak ada data yang cocok dengan saringan." : "Belum ada booking, sewa, atau rental di cabang ini."}</p>}
        </div>
      )}

      {tab === "unit" && <Units items={items} bookings={bookings} today={today} branchId={branchId} canManage={canManage} onDone={done} onError={setErr} />}
    </div>
  );
}

export default function SewaPage() { return <Shell>{(me) => <Sewa me={me} />}</Shell>; }
