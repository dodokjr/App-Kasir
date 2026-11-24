// Bentuk data dashboard developer, dipakai bersama oleh API (server) dan halaman /developer (browser)
export type DevUser = {
  id: string; name: string; email: string; role: string;
  storeId: string; storeName: string; branchName: string;
  /** Status akun: false = dinonaktifkan developer */
  active: boolean; storeActive: boolean;
  /** online = halaman aplikasi terbuka sekarang; session = punya sesi login (admin/developer tidak mengirim detak); offline */
  conn: "online" | "session" | "offline";
  /** ISO, kosong bila belum pernah. Terbaru dari detak halaman, login terakhir, dan catatan Sheets */
  lastActive: string; lastLogin: string; createdAt: string; page: string;
  /** Tidak aktif lebih dari DORMANT_DAYS hari (atau belum pernah masuk) */
  dormant: boolean;
};
export type DevStore = {
  id: string; name: string; businessType: string; active: boolean; createdAt: string;
  ownerId: string; ownerName: string; ownerEmail: string; branches: number; users: number; lastActive: string;
};
export type Overview = {
  now: string; emailReady: boolean; dormantDays: number;
  summary: { users: number; active: number; disabled: number; online: number; dormant: number; stores: number; storesActive: number };
  users: DevUser[]; stores: DevStore[];
};
export type TrafficData = {
  days: number; views: number; visitors: number;
  perDay: { day: string; views: number; visitors: number }[];
  pages: { path: string; views: number; visitors: number }[];
  referrers: { name: string; views: number }[];
  devices: { desktop: number; mobile: number; tablet: number };
  /** Kunjungan yang masih di memori server dan belum ditulis ke Google Sheets */
  pending: number; lastHitAt: string; rowsInSheet: number; sheetUrl: string;
};
