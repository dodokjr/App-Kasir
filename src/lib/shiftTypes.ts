// Tipe yang aman dipakai di browser maupun server
export type ItemAgg = { productId: string; name: string; qty: number; subtotal: number; unit?: string };
export type PayAgg = { key: string; label: string; total: number; count: number };

export type ShiftOut = {
  id: string;
  branchId: string;
  branchName: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt: string;
  status: "open" | "closed";
  openingCash: number;
  totalSales: number;
  txCount: number;
  itemsSold: number;
  expectedCash: number;
  countedCash: number | null;
  difference: number | null;
  note: string;
  items: ItemAgg[];
  /** Penjualan per metode pembayaran. Hanya yang tunai masuk ke kas laci */
  payments: PayAgg[];
  cashSales: number;
};

// Satu baris di halaman Pantau kasir
export type MonitorRow = {
  userId: string; name: string; role: string; branchId: string; branchName: string;
  status: "online" | "offline" | "never"; lastSeen: string; page: string;
  shiftOpen: boolean; shiftSince: string; salesToday: number; txToday: number; lastTx: string;
  /** kasir masih dibuka tetapi tidak terhubung: perlu dicek */
  alert: boolean;
};


// Satu baris di buku saldo. balance = saldo setelah baris ini
export type LedgerEntry = {
  id: string; date: string; kind: "pemasukan" | "pengeluaran" | "pencairan";
  label: string; detail: string; branchName: string; amount: number; balance: number;
};