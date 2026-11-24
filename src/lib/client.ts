import { clearMe } from "./offline";
import { LOGIN_PATH, isProtectedPage } from "./authRoutes";

/** Galat dari server (status HTTP) atau jaringan (status 0, network = true) */
export class ApiError extends Error {
  status: number; network: boolean; data: Record<string, any>;
  constructor(message: string, status: number, network = false, data: Record<string, any> = {}) { super(message); this.status = status; this.network = network; this.data = data; }
}
export const isNetworkError = (e: unknown) => e instanceof ApiError && e.network;

// Kabar koneksi untuk useOnline: navigator.onLine bisa "true" padahal internet mati, jadi permintaan yang gagal ikut dihitung
function netEvent(ok: boolean) { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("kt-net", { detail: ok })); }

// Sesi habis di tengah pemakaian: bersihkan data tersimpan lalu kembali ke /login (sekali saja).
// Pakai pindah halaman penuh (bukan router) supaya cache navigasi Next tidak mengembalikan halaman lama.
let leaving = false;
function sessionExpired() {
  if (typeof window === "undefined" || leaving || !isProtectedPage(window.location.pathname)) return;
  leaving = true;
  clearMe();
  window.location.replace(LOGIN_PATH);
}

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
  if (r.status === 401 && d.sessionExpired) sessionExpired();
  if (!r.ok) throw new ApiError(d.error || "Permintaan gagal", r.status, false, d);
  return d as T;
}
export const rp = (n: number | string) => "Rp " + Number(n).toLocaleString("id-ID");
export const tgl = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

// Tanggal (YYYY-MM-DD) menurut WIB, sama dengan cara server mengelompokkan transaksi per hari
export const wibDay = (d: Date = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
export const addDays = (key: string, n: number) => new Date(Date.parse(key + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);