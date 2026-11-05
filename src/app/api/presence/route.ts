import { handle, need } from "@/lib/api";
import { all } from "@/lib/sheets";
import { beat, lastSeenMs, pageOf, ONLINE_MS } from "@/lib/presence";
import { dayKey, branchNames } from "@/lib/shift";
import type { MonitorRow } from "@/lib/shiftTypes";

const num = (v: unknown) => Number(v) || 0;

// Browser mengirim detak tiap ±40 detik selama halaman terbuka
export const POST = handle(async (req) => {
  const s = await need();
  if (s.role === "developer" || s.role === "admin") return { ok: true };
  const b = await req.json().catch(() => ({}));
  await beat(s, String(b.page ?? ""));
  return { ok: true };
});

// Pantauan kasir: kepala toko (semua cabang) dan kepala cabang (cabangnya saja)
export const GET = handle(async () => {
  const s = await need(["kepala_toko", "kepala_cabang"]);
  const inScope = (r: Record<string, string>) => r.storeId === s.storeId && (s.role === "kepala_toko" || r.branchId === s.branchId);
  const [users, presence, shifts, txs, names] = await Promise.all([
    all("users"), all("presence"), all("shifts"), all("transactions"), branchNames(),
  ]);
  const today = dayKey(new Date().toISOString());
  const open = shifts.filter((x) => x.status === "open" && inScope(x));
  const todayTx = txs.filter((t) => inScope(t) && dayKey(t.createdAt) === today);
  const nowMs = Date.now();

  // Kasir aktif, ditambah kepala yang sedang membuka kasir
  const staff = users.filter((u) => inScope(u) && u.active !== "FALSE" && (u.role === "kasir" || open.some((x) => x.cashierId === u.id)));

  const rows: MonitorRow[] = staff.map((u) => {
    const seen = lastSeenMs(u.id, presence.find((p) => p.id === u.id));
    const status: MonitorRow["status"] = seen === 0 ? "never" : nowMs - seen <= ONLINE_MS ? "online" : "offline";
    const sh = open.find((x) => x.cashierId === u.id);
    const mine = todayTx.filter((t) => t.cashierId === u.id);
    const last = mine.reduce((a, t) => (t.createdAt > a ? t.createdAt : a), "");
    return {
      userId: u.id, name: u.name, role: u.role, branchId: u.branchId, branchName: names[u.branchId] ?? "-",
      status, lastSeen: seen ? new Date(seen).toISOString() : "", page: pageOf(u.id, presence.find((p) => p.id === u.id)),
      shiftOpen: !!sh, shiftSince: sh?.openedAt ?? "",
      salesToday: mine.reduce((a, t) => a + num(t.total), 0), txToday: mine.length, lastTx: last,
      alert: !!sh && status !== "online",
    };
  }).sort((a, b) => a.branchName.localeCompare(b.branchName) || a.name.localeCompare(b.name));

  return {
    now: new Date(nowMs).toISOString(),
    online: rows.filter((r) => r.status === "online").length,
    offline: rows.filter((r) => r.status !== "online").length,
    open: rows.filter((r) => r.shiftOpen).length,
    alerts: rows.filter((r) => r.alert).length,
    rows,
  };
});