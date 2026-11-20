"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type Theme = "light" | "dark" | "system";
export type Palette = "daun" | "laut" | "senja" | "anggur" | "mawar" | "grafit";

/** Swatch memakai warna tetap supaya pratinjaunya sama di mode terang maupun gelap. */
export const PALETTES: { id: Palette; name: string; a: string; b: string }[] = [
  { id: "daun", name: "Daun", a: "#0b6e4f", b: "#14b8a6" },
  { id: "laut", name: "Laut", a: "#1d4ed8", b: "#0e7490" },
  { id: "senja", name: "Senja", a: "#c2410c", b: "#be123c" },
  { id: "anggur", name: "Anggur", a: "#6d28d9", b: "#a21caf" },
  { id: "mawar", name: "Mawar", a: "#be123c", b: "#9d174d" },
  { id: "grafit", name: "Grafit", a: "#334155", b: "#475569" },
];
const PALETTE_IDS = PALETTES.map((p) => p.id);

const MODES: [Theme, string, string][] = [["light", "Terang", "☀️"], ["dark", "Gelap", "🌙"], ["system", "Otomatis", "🖥️"]];

function applyMode(t: Theme) {
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}
function applyPalette(p: Palette) {
  document.documentElement.setAttribute("data-palette", p);
}

/** Ganti tema dengan lingkaran yang membesar dari tombol (View Transitions), jika browser mendukung. */
function withTransition(change: () => void, origin?: { x: number; y: number }) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduce) return change();
  const x = origin?.x ?? window.innerWidth / 2, y = origin?.y ?? 0;
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  doc.startViewTransition(change).ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 650, easing: "cubic-bezier(.2,.7,.2,1)", pseudoElement: "::view-transition-new(root)" },
    );
  }).catch(() => {});
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const s = localStorage.getItem("theme") as Theme | null; if (s === "light" || s === "dark" || s === "system") setTheme(s); } catch {}
    setReady(true);
    const sync = (e: Event) => setTheme((e as CustomEvent<Theme>).detail);
    window.addEventListener("theme-change", sync);
    return () => window.removeEventListener("theme-change", sync);
  }, []);
  useEffect(() => {
    if (!ready) return;
    applyMode(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => applyMode("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [theme, ready]);
  const set = useCallback((t: Theme, origin?: { x: number; y: number }) => {
    try { localStorage.setItem("theme", t); } catch {}
    withTransition(() => { applyMode(t); setTheme(t); window.dispatchEvent(new CustomEvent("theme-change", { detail: t })); }, origin);
  }, []);
  return { theme, set, ready };
}

export function usePalette() {
  const [palette, setPalette] = useState<Palette>("daun");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const s = localStorage.getItem("palette") as Palette | null; if (s && PALETTE_IDS.includes(s)) setPalette(s); } catch {}
    setReady(true);
    const sync = (e: Event) => setPalette((e as CustomEvent<Palette>).detail);
    window.addEventListener("palette-change", sync);
    return () => window.removeEventListener("palette-change", sync);
  }, []);
  const set = useCallback((p: Palette, origin?: { x: number; y: number }) => {
    try { localStorage.setItem("palette", p); } catch {}
    withTransition(() => { applyPalette(p); setPalette(p); window.dispatchEvent(new CustomEvent("palette-change", { detail: p })); }, origin);
  }, []);
  return { palette, set, ready };
}

const center = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

/** Panel pilihan tampilan + warna. Dipakai di header dan di halaman Pengaturan. */
export function ThemePanel() {
  const { theme, set: setMode } = useTheme();
  const { palette, set: setPalette } = usePalette();
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Tampilan</p>
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-paper p-1" role="radiogroup" aria-label="Mode tampilan">
          {MODES.map(([k, l, i]) => (
            <button key={k} type="button" role="radio" aria-checked={theme === k}
              onClick={(e) => setMode(k, center(e.currentTarget))}
              className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${theme === k ? "bg-accent text-white shadow" : "hover:bg-surface"}`}>
              <span aria-hidden>{i}</span> {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Warna</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Pilihan warna">
          {PALETTES.map((p, i) => {
            const on = palette === p.id;
            return (
              <button key={p.id} type="button" role="radio" aria-checked={on} onClick={(e) => setPalette(p.id, center(e.currentTarget))}
                style={{ animationDelay: `${i * 40}ms` }}
                className={`swatch-in group flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-md ${on ? "border-accent bg-accent/10" : "border-line bg-surface"}`}>
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full shadow-inner transition-transform group-hover:rotate-12 group-hover:scale-110"
                  style={{ background: `linear-gradient(135deg, ${p.a} 50%, ${p.b} 50%)` }}>
                  {on && <svg className="anim-pop h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>}
                </span>
                {p.name}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs leading-5 text-muted">Pilihan disimpan di browser ini.</p>
    </div>
  );
}

export default function ThemeToggle() {
  const { palette, ready } = usePalette();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
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
    const top = below >= h + 16 ? r.bottom + 8 : Math.max(8, r.top - h - 8);
    setPos({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !pop.current?.contains(t)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open]);

  const cur = PALETTES.find((p) => p.id === palette) ?? PALETTES[0];
  return (
    <>
      <button ref={btn} type="button" className="btn-ghost gap-2" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        aria-label="Atur tampilan dan warna" title="Atur tampilan dan warna">
        <span aria-hidden className="h-4 w-4 rounded-full ring-2 ring-surface transition-transform hover:rotate-90"
          style={{ background: ready ? `linear-gradient(135deg, ${cur.a} 50%, ${cur.b} 50%)` : "rgb(var(--accent))" }} />
        <span className="hidden sm:inline">Tema</span>
      </button>
      {open && createPortal(
        <div ref={pop} role="dialog" aria-label="Pengaturan tema"
          style={{ position: "fixed", left: pos?.left ?? 0, top: pos?.top ?? 0, width: Math.min(304, window.innerWidth - 16), visibility: pos ? "visible" : "hidden" }}
          className="theme-pop z-[80] rounded-2xl border border-line bg-surface p-4 shadow-2xl">
          <ThemePanel />
        </div>,
        document.body,
      )}
    </>
  );
}