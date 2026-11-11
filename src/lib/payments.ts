import { all, add, uid, now } from "./sheets";
import { PAYMENT_PRESETS, DEFAULT_ACTIVE, LOCKED_KEYS, isFoodDelivery, type PayMethod, type PayGroup } from "./business";

const toMethod = (r: Record<string, string>): PayMethod => ({
  id: r.id, key: r.key, label: r.label, group: (r.group as PayGroup) || "lain",
  active: r.active !== "FALSE", locked: LOCKED_KEYS.includes(r.key),
});

export async function seedMethods(storeId: string) {
  const rows = PAYMENT_PRESETS.filter((p) => DEFAULT_ACTIVE.includes(p.key)).map((p) => ({
    id: uid(), storeId, key: p.key, label: p.label, group: p.group, active: "TRUE", createdAt: now(),
  }));
  for (const r of rows) await add("payment_methods", r);
}

/**
 * Metode pembayaran toko. Toko lama tanpa data otomatis mendapat Cash, Transfer bank, dan QRIS.
 * Jika `biz` diberikan dan bukan "fnb", metode ShopeeFood/GoFood/GrabFood disembunyikan.
 */
export async function methodsOf(storeId: string, includeInactive = false, biz?: string): Promise<PayMethod[]> {
  let rows = (await all("payment_methods")).filter((r) => r.storeId === storeId);
  if (!rows.length) { await seedMethods(storeId); rows = (await all("payment_methods")).filter((r) => r.storeId === storeId); }
  const seen = new Set<string>();
  let list = rows.filter((r) => (seen.has(r.key) ? false : (seen.add(r.key), true))).map(toMethod);
  // Metode food delivery hanya relevan untuk toko F&B
  if (biz && biz !== "fnb") list = list.filter((m) => !isFoodDelivery(m.key));
  // Cash dan transfer bank tidak boleh mati
  for (const m of list) if (m.locked) m.active = true;
  const order = (m: PayMethod) => { const i = PAYMENT_PRESETS.findIndex((p) => p.key === m.key); return i < 0 ? 999 : i; };
  list.sort((a, b) => order(a) - order(b) || a.label.localeCompare(b.label));
  return includeInactive ? list : list.filter((m) => m.active);
}