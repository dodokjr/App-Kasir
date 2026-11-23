"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PALETTES,
  applyMode,
  applyPalette,
  readPalette,
  readTheme,
  withTransition,
  type Palette,
  type Theme,
} from "@/lib/theme";

// Dipertahankan supaya impor lama dari file ini tetap jalan.
export { PALETTES };
export type { Palette, Theme };

const MODES: [Theme, string, string][] = [
  ["light", "Terang", "☀️"],
  ["dark", "Gelap", "🌙"],
  ["system", "Otomatis", "🖥️"],
];

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTheme(readTheme());
    setReady(true);
    const sync = (e: Event) => setTheme((e as CustomEvent<Theme>).detail);
    window.addEventListener("theme-change", sync);
    return () => window.removeEventListener("theme-change", sync);
  }, []);

  const set = useCallback((t: Theme, origin?: { x: number; y: number }) => {
    try { localStorage.setItem("theme", t); } catch {}
    withTransition(() => {
      applyMode(t);
      setTheme(t);
      window.dispatchEvent(new CustomEvent("theme-change", { detail: t }));
    }, origin);
  }, []);

  return { theme, set, ready };
}

export function usePalette() {
  const [palette, setPalette] = useState<Palette>("daun");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = readPalette();
    setPalette(p);
    applyPalette(p); // sebelumnya tidak diterapkan saat halaman dimuat, inilah penyebab warna kembali ke bawaan
    setReady(true);
    const sync = (e: Event) => setPalette((e as CustomEvent<Palette>).detail);
    window.addEventListener("palette-change", sync);
    return () => window.removeEventListener("palette-change", sync);
  }, []);

  const set = useCallback((p: Palette, origin?: { x: number; y: number }) => {
    try { localStorage.setItem("palette", p); } catch {}
    withTransition(() => {
      applyPalette(p);
      setPalette(p);
      window.dispatchEvent(new CustomEvent("palette-change", { detail: p }));
    }, origin);
  }, []);

  return { palette, set, ready };
}

const center = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/** Panel pilihan tampilan + warna. Dipakai di header dan di halaman Pengaturan. */
export function ThemePanel() {
  const { theme, set: setMode } = useTheme();
  const { palette, set: setPalette } = usePalette();
  const modeIdx = Math.max(0, MODES.findIndex(([k]) => k === theme));

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-muted">Tampilan</p>
        <div className="relative grid grid-cols-3 rounded-xl bg-paper p-1" role="radiogroup" aria-label="Mode tampilan">
          <span
            aria-hidden="true"
            className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-lg bg-accent shadow-md shadow-accent/30 transition-transform duration-300 ease-[cubic-bezier(.3,1.3,.5,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(${modeIdx * 100}%)` }}
          />
          {MODES.map(([k, l, i]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={theme === k}
              onClick={(e) => setMode(k, center(e.currentTarget))}
              className={`relative z-10 rounded-lg px-2 py-2 text-sm font-semibold transition-colors duration-200 ${
                theme === k ? "text-white" : "text-muted hover:text-ink"
              }`}
            >
              <span aria-hidden>{i}</span> {l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-muted">Warna</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Pilihan warna">
          {PALETTES.map((p, i) => {
            const on = palette === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={(e) => setPalette(p.id, center(e.currentTarget))}
                style={{ animationDelay: `${i * 40}ms` }}
                className={`swatch-in group flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${
                  on ? "border-accent bg-accent/10" : "border-line bg-surface"
                }`}
              >
                <span
                  className="relative flex h-9 w-9 items-center justify-center rounded-full shadow-inner transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
                  style={{ background: `linear-gradient(135deg, ${p.a} 50%, ${p.b} 50%)` }}
                >
                  {on && (
                    <svg className="anim-pop h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </span>
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs leading-5 text-muted">Pilihan disimpan di browser ini dan dipakai di semua halaman.</p>
    </div>
  );
}

export default function ThemeToggle() {
  const { palette, ready } = usePalette();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);

  // Panel dipasang di <body> dengan posisi tetap, supaya tidak terpotong sidebar atau menu geser.
  // Ia membuka ke atas bila ruang di bawah tombol tidak cukup, dan selalu tetap di dalam layar.
  const place = useCallback(() => {
    const b = btn.current;
    if (!b) return;
    const r = b.getBoundingClientRect();
    const w = Math.min(304, window.innerWidth - 16);
    const h = pop.current?.offsetHeight ?? 380;
    const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
    const below = window.innerHeight - r.bottom;
    const up = below < h + 16;
    const top = up ? Math.max(8, r.top - h - 8) : r.bottom + 8;
    setPos({ left, top, up });
  }, []);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !pop.current?.contains(t)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); btn.current?.focus(); }
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const cur = PALETTES.find((p) => p.id === palette) ?? PALETTES[0];

  return (
    <>
      <button
        ref={btn}
        type="button"
        className="btn-ghost group gap-2"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        aria-label="Atur tampilan dan warna"
        title="Atur tampilan dan warna"
      >
        <span
          aria-hidden
          className="h-4 w-4 rounded-full ring-2 ring-surface transition-transform duration-500 group-hover:rotate-180"
          style={{ background: ready ? `linear-gradient(135deg, ${cur.a} 50%, ${cur.b} 50%)` : "rgb(var(--accent))" }}
        />
        <span className="hidden sm:inline">Tema</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={pop}
            role="dialog"
            aria-label="Pengaturan tema"
            data-up={pos?.up ? "true" : undefined}
            style={{
              position: "fixed",
              left: pos?.left ?? 0,
              top: pos?.top ?? 0,
              width: Math.min(304, window.innerWidth - 16),
              visibility: pos ? "visible" : "hidden",
            }}
            className="theme-pop z-[80] rounded-2xl border border-line bg-surface p-4 shadow-2xl"
          >
            <ThemePanel />
          </div>,
          document.body,
        )}
    </>
  );
}