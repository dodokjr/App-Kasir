import type { Config } from "tailwindcss";

// Warna memakai CSS variable (lihat globals.css) agar bisa berganti terang/gelap
const c = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: c("ink"), paper: c("paper"), surface: c("surface"), line: c("line"), muted: c("muted"), danger: c("danger"),
        link: c("link"), sun: c("sun"), "sun-ink": c("sun-ink"),
        accent: { DEFAULT: c("accent"), dark: c("accent-dark") },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"], mono: ["var(--font-mono)", "monospace"] },
    },
  },
  plugins: [],
};
export default config;