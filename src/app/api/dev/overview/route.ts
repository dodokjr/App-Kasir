import { handle, need } from "@/lib/api";
import { all } from "@/lib/sheets";
import { lastSeenMs, pageOf, ONLINE_MS } from "@/lib/presence";
import { devMailReady } from "@/lib/mail";
import { normBusiness } from "@/lib/business";
import type { DevUser, DevStore, Overview } from "@/lib/devTypes";

const DORMANT_DAYS = 30;
const iso = (ms: number) => (ms ? new Date(ms).toISOString() : "");
const ms = (v?: string) => (v ? Date.parse(v) || 0 : 0);

// Hanya developer (admin tidak). Mengembalikan semua pengguna + toko beserta status dan terakhir aktif
export const GET = handle(async () => {
  await need(["developer"]);
  const [users, stores, branches, presence] = await Promise.all([all("users"), all("stores"), all("branches"), all("presence")]);
  const t = Date.now();
  const storeOf = new Map(stores.map((s) => [s.id, s]));
  const branchOf = new Map(branches.map((b) => [b.id, b]));
  const presOf = new Map(presence.map((p) => [p.id, p]));

  const list: DevUser[] = users.map((u) => {
    const p = presOf.get(u.id);
    const seen = lastSeenMs(u.id, p);
    // lastSeen dikosongkan saat logout, jadi "terakhir aktif" juga memakai lastActive (tetap tersimpan) dan login terakhir
    const last = Math.max(seen, ms(p?.lastActive), ms(u.lastLogin));
    const platform = u.role === "developer" || u.role === "admin";
    const loggedIn = !!u.sessionId && (Number(u.sessionExp) || 0) > t;
    const conn: DevUser["conn"] = platform ? (loggedIn ? "session" : "offline") : seen && t - seen <= ONLINE_MS ? "online" : "offline";
    const st = storeOf.get(u.storeId);
    return {
      id: u.id, name: u.name, email: u.email, role: u.role,
      storeId: u.storeId, storeName: st?.name ?? "", branchName: branchOf.get(u.branchId)?.name ?? "",
      active: u.active !== "FALSE", storeActive: !st || st.active !== "FALSE",
      conn, lastActive: iso(last), lastLogin: u.lastLogin || "", createdAt: u.createdAt, page: pageOf(u.id, p),
      // Akun baru yang belum pernah masuk baru dianggap lama tidak aktif setelah melewati batas sejak dibuat
      dormant: t - (last || ms(u.createdAt)) > DORMANT_DAYS * 864e5,
    };
  }).sort((a, b) => (b.lastActive || "").localeCompare(a.lastActive || "") || a.name.localeCompare(b.name));

  const lastByStore = new Map<string, number>();
  for (const u of list) if (u.storeId && u.lastActive) lastByStore.set(u.storeId, Math.max(lastByStore.get(u.storeId) ?? 0, ms(u.lastActive)));

  const storeList: DevStore[] = stores.map((s) => {
    const owner = users.find((u) => u.storeId === s.id && u.role === "kepala_toko");
    return {
      id: s.id, name: s.name, businessType: normBusiness(s.businessType), active: s.active !== "FALSE", createdAt: s.createdAt,
      ownerId: owner?.id ?? "", ownerName: owner?.name ?? "", ownerEmail: owner?.email ?? "",
      branches: branches.filter((b) => b.storeId === s.id).length, users: users.filter((u) => u.storeId === s.id).length,
      lastActive: iso(lastByStore.get(s.id) ?? 0),
    };
  }).sort((a, b) => (b.lastActive || "").localeCompare(a.lastActive || "") || a.name.localeCompare(b.name));

  const out: Overview = {
    now: new Date(t).toISOString(), emailReady: devMailReady(), dormantDays: DORMANT_DAYS,
    summary: {
      users: list.length, active: list.filter((u) => u.active).length, disabled: list.filter((u) => !u.active).length,
      online: list.filter((u) => u.conn === "online").length, dormant: list.filter((u) => u.dormant).length,
      stores: storeList.length, storesActive: storeList.filter((s) => s.active).length,
    },
    users: list, stores: storeList,
  };
  return out;
});
