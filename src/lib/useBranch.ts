"use client";
import { useEffect, useState } from "react";

// Cabang yang dipilih diingat di browser, jadi cukup memilih sekali
// untuk Dashboard, Kasir, dan Gudang. "" berarti semua cabang.
export function useBranch(initial: string) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("branch");
      if (saved !== null) setValue(saved);
    } catch {}
  }, []);
  const set = (id: string) => {
    setValue(id);
    try { localStorage.setItem("branch", id); } catch {}
  };
  return [value, set] as const;
}
