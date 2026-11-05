export async function api<T = any>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const r = await fetch(url, {
    method: init?.method,
    headers: { "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Permintaan gagal");
  return d as T;
}
export const rp = (n: number | string) => "Rp " + Number(n).toLocaleString("id-ID");
export const tgl = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

// Tanggal (YYYY-MM-DD) menurut WIB, sama dengan cara server mengelompokkan transaksi per hari
export const wibDay = (d: Date = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
export const addDays = (key: string, n: number) => new Date(Date.parse(key + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);