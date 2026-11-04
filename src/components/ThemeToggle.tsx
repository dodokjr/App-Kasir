"use client";
import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

function apply(t: Theme) {
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const s = localStorage.getItem("theme") as Theme | null; if (s === "light" || s === "dark" || s === "system") setTheme(s); } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    apply(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => apply("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [theme, ready]);
  const set = useCallback((t: Theme) => {
    setTheme(t);
    try { localStorage.setItem("theme", t); } catch {}
  }, []);
  return { theme, set, ready };
}

const NEXT: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };
const LABEL: Record<Theme, string> = { light: "Terang", dark: "Gelap", system: "Otomatis" };
const ICON: Record<Theme, string> = { light: "☀️", dark: "🌙", system: "🖥️" };

export default function ThemeToggle() {
  const { theme, set, ready } = useTheme();
  return (
    <button type="button" className="btn-ghost" onClick={() => set(NEXT[theme])}
      aria-label={`Tampilan: ${LABEL[theme]}. Klik untuk mengganti`} title="Ganti tampilan (terang / gelap / otomatis)">
      <span aria-hidden>{ready ? ICON[theme] : "🖥️"}</span> <span className="hidden sm:inline">{ready ? LABEL[theme] : "Tampilan"}</span>
    </button>
  );
}
