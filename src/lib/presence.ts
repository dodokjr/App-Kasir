import { all, add, update, now } from "./sheets";
import type { Session } from "./auth";

// Detak (heartbeat) dikirim browser tiap 40 detik. Dianggap online bila detak terakhir < 2 menit lalu.
export const BEAT_MS = 40_000;
export const ONLINE_MS = 120_000;
// Ke Google Sheets hanya ditulis tiap 4 menit per orang agar kuota API tidak habis.
// Selain itu detak disimpan di memori server, jadi paling akurat di server tunggal (VPS / next start).
const PERSIST_MS = 240_000;

type Beat = { at: number; persisted: number; page: string };
const g = globalThis as unknown as { __presence?: Map<string, Beat> };
const mem = () => (g.__presence ??= new Map());

export async function beat(s: Session, page: string) {
  const t = Date.now();
  const prev = mem().get(s.uid);
  const entry: Beat = { at: t, persisted: prev?.persisted ?? 0, page: page.slice(0, 40) };
  mem().set(s.uid, entry);
  if (t - entry.persisted < PERSIST_MS) return;
  entry.persisted = t;
  const row = { id: s.uid, storeId: s.storeId, branchId: s.branchId, name: s.name, role: s.role, lastSeen: new Date(t).toISOString(), page: entry.page };
  const cur = (await all("presence")).find((r) => r.id === s.uid);
  if (cur) await update("presence", s.uid, row); else await add("presence", row);
}

// Saat keluar (logout) langsung dianggap offline, termasuk catatan di Sheets
export async function leave(uid: string) {
  mem().delete(uid);
  const cur = (await all("presence")).find((r) => r.id === uid);
  if (cur && cur.lastSeen) await update("presence", uid, { lastSeen: "" });
}

/** Waktu terakhir terlihat (ms) dari memori atau Sheets, mana yang lebih baru */
export function lastSeenMs(uid: string, sheetRow?: Record<string, string>) {
  const m = mem().get(uid)?.at ?? 0;
  const sh = sheetRow?.lastSeen ? Date.parse(sheetRow.lastSeen) || 0 : 0;
  return Math.max(m, sh);
}
export const pageOf = (uid: string, sheetRow?: Record<string, string>) => mem().get(uid)?.page || sheetRow?.page || "";
export { now };
