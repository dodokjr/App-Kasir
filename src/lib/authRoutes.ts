/**
 * Daftar rute untuk alur autentikasi. Dipakai bersama oleh proxy.ts (server) dan client.ts (browser),
 * jadi file ini hanya berisi konstanta murni (tanpa import Node/React).
 */

/** Cookie sesi (JWT) yang dibuat createSession() di lib/auth.ts */
export const SESSION_COOKIE = "sid";

/** Halaman tamu: tidak perlu dilihat lagi bila perangkat sudah punya sesi sah */
export const GUEST_PAGES = ["/login", "/register", "/lupa-password"];

/** Halaman yang wajib login */
export const PROTECTED_PREFIXES = [
  "/dashboard", "/kasir", "/gudang", "/keuangan", "/pengaturan", "/monitor",
  "/pesan", "/permintaan", "/target", "/peta", "/sewa", "/developer",
];

export const LOGIN_PATH = "/login";
export const HOME_AFTER_LOGIN = "/dashboard";

const hit = (path: string, base: string) => path === base || path.startsWith(base + "/");
export const isGuestPage = (path: string) => GUEST_PAGES.some((p) => hit(path, p));
export const isProtectedPage = (path: string) => PROTECTED_PREFIXES.some((p) => hit(path, p));