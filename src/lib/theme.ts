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
export const PALETTE_IDS = PALETTES.map((p) => p.id);

export const THEME_KEY = "theme";
export const PALETTE_KEY = "palette";

export function readTheme(): Theme {
  try {
    const s = localStorage.getItem(THEME_KEY);
    if (s === "light" || s === "dark" || s === "system") return s;
  } catch {}
  return "system";
}

export function readPalette(): Palette {
  try {
    const s = localStorage.getItem(PALETTE_KEY) as Palette | null;
    if (s && PALETTE_IDS.includes(s)) return s;
  } catch {}
  return "daun";
}

export function applyMode(t: Theme) {
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const el = document.documentElement;
  el.classList.toggle("dark", dark);
  el.style.colorScheme = dark ? "dark" : "light";
}

export function applyPalette(p: Palette) {
  document.documentElement.setAttribute("data-palette", p);
}

/** Terapkan pilihan yang tersimpan. Aman dipanggil berulang kali. */
export function applyStored() {
  applyMode(readTheme());
  applyPalette(readPalette());
}

/** Ganti tema dengan lingkaran yang membesar dari tombol (View Transitions), jika browser mendukung. */
export function withTransition(change: () => void, origin?: { x: number; y: number }) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void> };
  };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduce) return change();

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? 0;
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  doc
    .startViewTransition(change)
    .ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(.2,.7,.2,1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
}