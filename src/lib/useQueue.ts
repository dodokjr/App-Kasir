"use client";
import { useEffect, useState } from "react";
import { queueCounts, subscribeQueue } from "./offline";

// Jumlah transaksi offline yang menunggu dikirim atau gagal. Ikut berubah bila tab lain mengubah antrean
export function useQueue(uid?: string) {
  const [c, setC] = useState(() => ({ pending: 0, failed: 0, total: 0, pendingSales: 0, otherAccounts: 0 }));
  useEffect(() => {
    const upd = () => setC(queueCounts(uid));
    upd();
    const off = subscribeQueue(upd);
    const st = (e: StorageEvent) => { if (e.key === null || e.key.startsWith("kt.queue")) upd(); };
    window.addEventListener("storage", st);
    return () => { off(); window.removeEventListener("storage", st); };
  }, [uid]);
  return c;
}