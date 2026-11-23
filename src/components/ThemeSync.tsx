"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { applyMode, applyStored, readTheme } from "@/lib/theme";

export default function ThemeSync() {
  const pathname = usePathname();

  useEffect(() => {
    applyStored();
  }, [pathname]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "theme" || e.key === "palette" || e.key === null) applyStored();
    };
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => {
      if (readTheme() === "system") applyMode("system");
    };
    window.addEventListener("storage", onStorage);
    mq.addEventListener("change", onSystem);
    return () => {
      window.removeEventListener("storage", onStorage);
      mq.removeEventListener("change", onSystem);
    };
  }, []);

  return null;
}