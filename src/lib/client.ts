/** Galat dari server (status HTTP) atau jaringan (status 0, network = true) */
export class ApiError extends Error {
  status: number; network: boolean;
  constructor(message: string, status: number, network = false) { super(message); this.status = status; this.network = network; }
}
export const isNetworkError = (e: unknown) => e instanceof ApiError && e.network;

// Kabar koneksi untuk useOnline: navigator.onLine bisa "true" padahal internet mati, jadi permintaan yang gagal ikut dihitung
function netEvent(ok: boolean) { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("kt-net", { detail: ok })); }

export async function api<T = any>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let r: Response;
  try {
    r = await fetch(url, {
      method: init?.method,
      headers: { "Content-Type": "application/json" },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    netEvent(false);
    throw new ApiError("Tidak ada koneksi internet", 0, true);
  }
  netEvent(true);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(d.error || "Permintaan gagal", r.status);
  return d as T;
}
export const rp = (n: number | string) => "Rp " + Number(n).toLocaleString("id-ID");
export const tgl = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

// Tanggal (YYYY-MM-DD) menurut WIB, sama dengan cara server mengelompokkan transaksi per hari
export const wibDay = (d: Date = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
export const addDays = (key: string, n: number) => new Date(Date.parse(key + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);