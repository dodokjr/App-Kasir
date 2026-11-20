import { handle, need, inScope, HttpError } from "@/lib/api";
import type { Role } from "@/lib/auth";
import { all, add, update, uid, now } from "@/lib/sheets";
import { dayKey } from "@/lib/shift";

/**
 * Target penjualan bulanan dan pencapaiannya. Penjualan = total transaksi (termasuk PPN bila aktif),
 * sama dengan angka "Penjualan" di halaman Keuangan.
 * Target bisa per cabang. Target seluruh toko (branchId kosong) bersifat opsional; jika tidak ada,
 * dipakai jumlah target semua cabang.
 */
const READERS: Role[] = ["kepala_toko", "kepala_cabang"];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const num = (v: unknown) => Number(v) || 0;
const MILESTONES = [25, 50, 75, 100];
const TX_MILESTONES = [100, 500, 1000, 5000, 10000, 50000];

const addMonths = (m: string, n: number) => {
  const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
const daysIn = (m: string) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).getUTCDate();

export const GET = handle(async (req) => {
  const s = await need(READERS);
  const q = new URL(req.url).searchParams;
  const today = dayKey(new Date().toISOString());
  const month = q.get("month") || today.slice(0, 7);
  if (!MONTH.test(month)) throw new HttpError(400, "Bulan tidak valid");

  const [branches, txs, targets] = await Promise.all([all("branches"), all("transactions"), all("targets")]);
  const myBranches = branches.filter((b) => b.storeId === s.storeId && (s.role === "kepala_toko" || b.id === s.branchId));
  const ids = new Set(myBranches.map((b) => b.id));
  const mine = txs.filter((t) => inScope(s, t) && ids.has(t.branchId));
  const tgt = targets.filter((t) => t.storeId === s.storeId);

  // Kelompokkan penjualan per bulan, per cabang, dan per hari (WIB) dalam satu putaran
  type Agg = { sales: number; tx: number; days: Map<string, { sales: number; tx: number }> };
  const byMonth = new Map<string, Map<string, Agg>>();
  let allTimeBest = { date: "", sales: 0 };
  const perDayAll = new Map<string, number>();
  for (const t of mine) {
    const d = dayKey(t.createdAt), m = d.slice(0, 7);
    const mm = byMonth.get(m) ?? new Map<string, Agg>(); byMonth.set(m, mm);
    const a = mm.get(t.branchId) ?? { sales: 0, tx: 0, days: new Map() }; mm.set(t.branchId, a);
    a.sales += num(t.total); a.tx += 1;
    const day = a.days.get(d) ?? { sales: 0, tx: 0 }; day.sales += num(t.total); day.tx += 1; a.days.set(d, day);
    perDayAll.set(d, (perDayAll.get(d) ?? 0) + num(t.total));
  }
  for (const [date, sales] of perDayAll) if (sales > allTimeBest.sales) allTimeBest = { date, sales };

  const targetOf = (m: string, branchId: string) => num(tgt.find((t) => t.month === m && t.branchId === branchId)?.amount);
  const storeTargetOf = (m: string) => {
    const own = targetOf(m, ""); // target khusus seluruh toko
    if (s.role === "kepala_cabang") return { amount: targetOf(m, s.branchId), source: "cabang" as const };
    if (own > 0) return { amount: own, source: "toko" as const };
    return { amount: myBranches.reduce((a, b) => a + targetOf(m, b.id), 0), source: "jumlah cabang" as const };
  };

  const isCurrent = today.startsWith(month), isPast = month < today.slice(0, 7);
  const total = daysIn(month);
  const dayOfMonth = isCurrent ? Number(today.slice(8)) : isPast ? total : 0;
  const daysLeft = isCurrent ? total - dayOfMonth + 1 : 0; // termasuk hari ini

  const progress = (sales: number, target: number) => {
    const remaining = Math.max(0, target - sales);
    const projection = isCurrent && dayOfMonth > 0 ? Math.round((sales / dayOfMonth) * total) : sales;
    const pct = target > 0 ? sales / target : null;
    const status = target <= 0 ? "tanpa_target" : sales >= target ? "tercapai" : isPast ? "tidak_tercapai" : projection >= target ? "sesuai_jalur" : "tertinggal";
    return {
      target, sales, pct, remaining, projection, status,
      neededPerDay: isCurrent && target > 0 ? Math.ceil(remaining / Math.max(1, daysLeft)) : 0,
      milestones: pct === null ? [] : MILESTONES.filter((p) => pct * 100 >= p),
    };
  };

  const cur = byMonth.get(month) ?? new Map<string, Agg>();
  const perBranch = myBranches.map((b) => {
    const a = cur.get(b.id);
    let best = { date: "", sales: 0 };
    for (const [date, d] of a?.days ?? []) if (d.sales > best.sales) best = { date, sales: d.sales };
    return { branchId: b.id, name: b.name, street: b.street, tx: a?.tx ?? 0, bestDay: best, ...progress(a?.sales ?? 0, targetOf(month, b.id)) };
  }).sort((x, y) => (y.pct ?? -1) - (x.pct ?? -1) || y.sales - x.sales);

  const salesAll = perBranch.reduce((a, b) => a + b.sales, 0);
  const txAll = perBranch.reduce((a, b) => a + b.tx, 0);
  const st = storeTargetOf(month);
  const store = { ...progress(salesAll, st.amount), tx: txAll, targetSource: st.source };
  // Hari terbaik seluruh toko dalam bulan ini (jumlah semua cabang pada hari yang sama)
  const dayTotals = new Map<string, number>();
  for (const a of cur.values()) for (const [d, v] of a.days) dayTotals.set(d, (dayTotals.get(d) ?? 0) + v.sales);
  let bestDay = { date: "", sales: 0 };
  for (const [date, sales] of dayTotals) if (sales > bestDay.sales) bestDay = { date, sales };

  // Enam bulan terakhir sampai bulan yang dipilih
  const history = Array.from({ length: 6 }, (_, i) => addMonths(month, i - 5)).map((m) => {
    const sales = [...(byMonth.get(m)?.values() ?? [])].reduce((a, x) => a + x.sales, 0);
    const target = storeTargetOf(m).amount;
    return { month: m, sales, target, pct: target > 0 ? sales / target : null };
  });

  // Pencapaian (lencana)
  const badges: { id: string; title: string; detail: string }[] = [];
  const topMs = store.milestones[store.milestones.length - 1];
  if (store.status === "tercapai") badges.push({ id: "target", title: "Target bulan tercapai", detail: `${Math.round((store.pct ?? 0) * 100)}% dari target` });
  else if (topMs) badges.push({ id: "ms", title: `Melewati ${topMs}% target`, detail: `Tinggal ${store.remaining.toLocaleString("id-ID")} lagi untuk mencapai target` });
  if (bestDay.sales > 0) badges.push({ id: "best", title: "Hari terbaik bulan ini", detail: `${bestDay.date}: ${bestDay.sales.toLocaleString("id-ID")}` });
  if (bestDay.sales > 0 && bestDay.date === allTimeBest.date) badges.push({ id: "record", title: "Rekor penjualan harian", detail: "Tertinggi sepanjang waktu di aplikasi" });
  if (myBranches.length > 1 && perBranch[0]?.pct !== null && (perBranch[0]?.sales ?? 0) > 0) badges.push({ id: "leader", title: `Cabang terbaik: ${perBranch[0].name}`, detail: `${Math.round((perBranch[0].pct ?? 0) * 100)}% dari targetnya` });
  const txTotal = mine.length, txMs = [...TX_MILESTONES].reverse().find((n) => txTotal >= n);
  if (txMs) badges.push({ id: "tx", title: `${txMs.toLocaleString("id-ID")} transaksi tercatat`, detail: `Total ${txTotal.toLocaleString("id-ID")} transaksi sejak awal` });
  const streak = history.slice().reverse().findIndex((h) => h.pct === null || h.pct < 1);
  const hit = streak === -1 ? history.length : streak;
  if (hit >= 2) badges.push({ id: "streak", title: `${hit} bulan berturut-turut mencapai target`, detail: "Pertahankan!" });

  return {
    month, today, isCurrent, isPast, daysInMonth: total, dayOfMonth, daysLeft,
    canEdit: s.role === "kepala_toko", store, bestDay, branches: perBranch, history, badges,
    storeTarget: s.role === "kepala_toko" ? targetOf(month, "") : 0,
  };
});

// Atur target. Kepala toko saja. amount 0 = hapus target. branchId kosong = target seluruh toko.
export const POST = handle(async (req) => {
  const s = await need(["kepala_toko"]);
  const b = await req.json();
  const month = String(b.month ?? "");
  if (!MONTH.test(month)) throw new HttpError(400, "Bulan tidak valid");
  const branches = (await all("branches")).filter((x) => x.storeId === s.storeId);
  const rows = await all("targets", { fresh: true });
  const mine = rows.filter((r) => r.storeId === s.storeId);

  // Salin semua target dari bulan lain yang belum diisi di bulan ini
  if (b.copyFrom !== undefined) {
    const from = String(b.copyFrom);
    if (!MONTH.test(from)) throw new HttpError(400, "Bulan asal tidak valid");
    const src = mine.filter((r) => r.month === from && num(r.amount) > 0);
    if (!src.length) throw new HttpError(400, "Bulan asal belum punya target");
    let n = 0;
    for (const r of src) {
      if (mine.some((x) => x.month === month && x.branchId === r.branchId)) continue;
      await add("targets", { id: uid(), storeId: s.storeId, branchId: r.branchId, month, amount: r.amount, updatedById: s.uid, updatedByName: s.name, updatedAt: now() });
      n++;
    }
    return { ok: true, copied: n };
  }

  const branchId = String(b.branchId ?? "");
  if (branchId && !branches.some((x) => x.id === branchId)) throw new HttpError(400, "Cabang tidak valid");
  const amount = Math.round(Number(b.amount));
  if (!isFinite(amount) || amount < 0) throw new HttpError(400, "Target harus berupa angka 0 atau lebih");
  if (amount > 1e13) throw new HttpError(400, "Target terlalu besar");
  const ex = mine.find((r) => r.month === month && r.branchId === branchId);
  const patch = { amount: String(amount), updatedById: s.uid, updatedByName: s.name, updatedAt: now() };
  if (ex) await update("targets", ex.id, patch);
  else if (amount > 0) await add("targets", { id: uid(), storeId: s.storeId, branchId, month, ...patch });
  return { ok: true };
});