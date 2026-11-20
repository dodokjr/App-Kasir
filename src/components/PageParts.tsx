"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

const calm = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Judul yang naik dari balik garis saat masuk layar ---------- */
export function RevealTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (calm()) {
      el.dataset.in = "1";
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.dataset.in = "1";
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <h2 ref={ref} className={`rt ${className}`}>
      <span>{children}</span>
    </h2>
  );
}

/* ---------- Bintang berkelip ----------
   Desktop: lebih banyak bintang, kedipan lebih cepat, ditambah bintang jatuh.
   HP: bintang lebih sedikit, kedipan lebih pelan, tanpa bintang jatuh (hemat baterai).
   Animasi berhenti saat keluar dari layar.
   white: paksa bintang putih (dipakai di panel dengan latar langit gelap). */
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type StarCfg = { n: number; speed: number; shoot: boolean };

export function Starfield({ night = 1, white = false }: { night?: number; white?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cfg, setCfg] = useState<StarCfg | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setCfg(mq.matches ? { n: 36, speed: 1.5, shoot: false } : { n: 90, speed: 1, shoot: true });
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => { el.dataset.paused = String(!e.isIntersecting); });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const stars = useMemo(() => {
    if (!cfg) return [];
    const rnd = mulberry32(7);
    return Array.from({ length: cfg.n }, () => {
      const big = rnd() > 0.86;
      return { x: rnd() * 100, y: rnd() * 100, s: big ? 2.6 : 1 + rnd() * 1.3, t: (3 + rnd() * 4) * cfg.speed, d: -rnd() * 8, big };
    });
  }, [cfg]);

  const dot = white ? "bg-white" : "bg-accent/70 dark:bg-white";
  const glowCls = white ? "shadow-[0_0_8px_2px_rgb(255_255_255/0.55)]" : "dark:shadow-[0_0_8px_2px_rgb(255_255_255/0.55)]";
  const tail = white ? "to-white" : "to-accent dark:to-white";

  return (
    <div ref={ref} className="absolute inset-0 transition-opacity duration-[2000ms] [mask-image:linear-gradient(to_bottom,black_55%,transparent)] motion-reduce:transition-none" style={{ opacity: night }} aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={i}
          className={`star absolute rounded-full ${dot} ${s.big ? glowCls : ""}`}
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, ["--t" as string]: `${s.t}s`, animationDelay: `${s.d}s` }}
        />
      ))}
      {cfg?.shoot && (
        <>
          <span className={`shoot absolute left-[12%] top-[8%] h-px w-28 bg-gradient-to-r from-transparent ${tail}`} style={{ ["--t" as string]: "9s", animationDelay: "2s" }} />
          <span className={`shoot absolute left-[48%] top-[4%] h-px w-24 bg-gradient-to-r from-transparent ${tail}`} style={{ ["--t" as string]: "13s", animationDelay: "7s" }} />
        </>
      )}
    </div>
  );
}

/* ---------- Langit mengikuti jam di dunia nyata ----------
   Matahari dan bulan bergerak sesuai jam perangkat (diperbarui tiap 10 detik, bergeser halus).
   Bintang hanya terlihat saat malam, semburat jingga muncul saat subuh dan sore.
   Deretan toko ikut berubah: lampu menyala sore/malam, papan BUKA/TUTUP mengikuti jam.
   Mode pratinjau (chip di hero) dibagi ke semua komponen lewat store kecil di bawah ini,
   jadi hero dan panel struk selalu menampilkan waktu yang sama. */
type Mode = "auto" | "pagi" | "siang" | "sore" | "malam";
const MODES: Mode[] = ["auto", "pagi", "siang", "sore", "malam"];
const FIXED = { pagi: 8, siang: 12.5, sore: 17.3, malam: 22 } as const;
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const phaseName = (h: number) =>
  h >= 4.5 && h < 6 ? "Subuh" : h >= 6 && h < 11 ? "Pagi" : h >= 11 && h < 15 ? "Siang" : h >= 15 && h < 18 ? "Sore" : "Malam";

let skyMode: Mode = "auto";
const skyListeners = new Set<() => void>();
const setSkyMode = (m: Mode) => {
  skyMode = m;
  skyListeners.forEach((f) => f());
};
const subscribeSky = (f: () => void) => {
  skyListeners.add(f);
  return () => {
    skyListeners.delete(f);
  };
};
const useSkyMode = () => useSyncExternalStore(subscribeSky, () => skyMode, () => "auto" as Mode);

function useSky() {
  const [now, setNow] = useState<Date | null>(null);
  const [armed, setArmed] = useState(false);
  const mode = useSkyMode();

  useEffect(() => {
    setNow(new Date());
    const tick = setInterval(() => setNow(new Date()), 10000);
    const arm = setTimeout(() => setArmed(true), 150);
    return () => { clearInterval(tick); clearTimeout(arm); };
  }, []);

  if (!now) return null;

  const real = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const h = mode === "auto" ? real : FIXED[mode];

  // e: tinggi matahari (-1..1), terbit 06.00 dan terbenam 18.00
  const e = Math.sin((2 * Math.PI * (h - 6)) / 24);
  const day = clamp((e - 0.15) / 0.35);
  const night = clamp((-e - 0.05) / 0.3);
  const dusk = 1 - Math.max(day, night);

  return { now, armed, mode, real, h, day, night, dusk, sunP: (h - 6) / 12, moonP: ((h + 6) % 24) / 12 };
}

/* ---------- Deretan toko di dasar langit ----------
   Jendela dan lampu jalan menyala saat sore dan malam.
   Papan BUKA / TUTUP mengikuti jam (buka 07.00 sampai 21.00). */
function ShopScene({ night, dusk, hour, strong = false }: { night: number; dusk: number; hour: number; strong?: boolean }) {
  const lit = clamp(night + dusk * 0.7);
  const open = hour >= 7 && hour < 21;
  const glow = `drop-shadow(0 0 7px rgba(253,224,138,${(lit * 0.9).toFixed(2)}))`;
  const win = { fill: "#fde68a", fillOpacity: 0.18 + lit * 0.82 } as const;

  const stripes = (x0: number, y: number, n: number, a: string, b: string) =>
    Array.from({ length: n }, (_, i) => (
      <path
        key={`${x0}-${i}`}
        d={`M${x0 + i * 30} ${y}h30v20a15 15 0 0 1-30 0z`}
        className={i % 2 ? b : a}
      />
    ));

  const lamp = (x: number) => (
    <g key={x}>
      <rect x={x - 2} y={110} width={4} height={90} className="fill-slate-400 dark:fill-slate-600" />
      <circle cx={x} cy={108} r={6} fill="#fde68a" fillOpacity={0.25 + lit * 0.75} style={{ filter: glow }} />
    </g>
  );

  const sign = (x: number, y: number, w: number, text: string) => (
    <g>
      <rect x={x} y={y} width={w} height={26} rx={5} className="fill-accent" />
      <text x={x + w / 2} y={y + 18} textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff" letterSpacing="1.5">{text}</text>
    </g>
  );

  const buka = (x: number, y: number) => (
    <g>
      <rect x={x} y={y} width={44} height={16} rx={3} fill={open ? "#16a34a" : "#dc2626"} />
      <text x={x + 22} y={y + 12} textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">{open ? "BUKA" : "TUTUP"}</text>
    </g>
  );

  return (
    <svg
      viewBox="0 0 1200 220"
      preserveAspectRatio="xMidYMax slice"
      className={`absolute inset-x-0 bottom-0 h-32 w-full sm:h-44 [mask-image:linear-gradient(to_top,black_75%,transparent)] ${
        strong ? "opacity-100" : "opacity-70 sm:opacity-90"
      }`}
      aria-hidden="true"
    >
      {/* Tanah */}
      <rect x="0" y="200" width="1200" height="20" className="fill-slate-300 dark:fill-slate-800" />

      {/* Warung makan */}
      <g>
        <rect x="60" y="90" width="240" height="110" className="fill-slate-200 dark:fill-slate-700" />
        <rect x="50" y="78" width="260" height="16" className="fill-slate-400 dark:fill-slate-600" />
        {stripes(60, 94, 8, "fill-rose-500", "fill-white dark:fill-slate-300")}
        <g style={{ filter: glow }}><rect x="90" y="140" width="85" height="50" rx="3" style={win} /></g>
        <rect x="205" y="145" width="50" height="55" className="fill-slate-500 dark:fill-slate-900" />
        {sign(120, 50, 120, "WARUNG")}
        {buka(208, 128)}
      </g>

      {lamp(320)}

      {/* Toko barang */}
      <g>
        <rect x="340" y="62" width="300" height="138" className="fill-slate-200 dark:fill-slate-700" />
        <rect x="334" y="54" width="312" height="12" className="fill-slate-400 dark:fill-slate-600" />
        {stripes(340, 66, 10, "fill-sky-500", "fill-white dark:fill-slate-300")}
        <g style={{ filter: glow }}>
          <rect x="362" y="118" width="95" height="66" rx="3" style={win} />
          <rect x="523" y="118" width="95" height="66" rx="3" style={win} />
        </g>
        <rect x="470" y="135" width="46" height="65" className="fill-slate-500 dark:fill-slate-900" />
        {sign(440, 22, 100, "TOKO")}
        {buka(471, 118)}
      </g>

      {/* Kios kecil */}
      <g>
        <rect x="700" y="120" width="140" height="80" className="fill-slate-200 dark:fill-slate-700" />
        <path d="M688 122 L770 88 L852 122Z" className="fill-violet-500" />
        <g style={{ filter: glow }}><rect x="720" y="138" width="100" height="36" rx="3" style={win} /></g>
        <rect x="714" y="174" width="112" height="8" className="fill-slate-400 dark:fill-slate-600" />
      </g>

      {lamp(868)}

      {/* Toko sembako */}
      <g>
        <rect x="900" y="100" width="240" height="100" className="fill-slate-200 dark:fill-slate-700" />
        <rect x="892" y="90" width="256" height="14" className="fill-slate-400 dark:fill-slate-600" />
        {stripes(900, 104, 8, "fill-amber-500", "fill-white dark:fill-slate-300")}
        <g style={{ filter: glow }}><rect x="925" y="148" width="85" height="42" rx="3" style={win} /></g>
        <rect x="1045" y="150" width="50" height="50" className="fill-slate-500 dark:fill-slate-900" />
        {sign(950, 62, 140, "SEMBAKO")}
      </g>
    </svg>
  );
}

/* ---------- Lapisan langit + matahari + bulan + toko ----------
   Dipakai oleh HeroSky (latar transparan mengikuti tema halaman)
   dan oleh panel struk di HeroDemo (solid: punya warna langit sendiri). */
export function SkyLayers({ solid = false }: { solid?: boolean }) {
  const sky = useSky();

  if (!sky) {
    return solid ? <div className="absolute inset-0 bg-sky-200" aria-hidden="true" /> : null;
  }

  const { armed, mode, h, day, night, dusk, sunP, moonP } = sky;

  const spot = (p: number) => ({
    left: `${8 + clamp(p) * 84}%`,
    top: `${72 - 56 * Math.sin(Math.PI * clamp(p))}%`,
    opacity: p >= 0 && p <= 1 ? clamp(Math.sin(Math.PI * p) * 5) : 0,
  });
  const lift = Math.sin(Math.PI * clamp(sunP));
  const sunRgb = `${255},${Math.round(lerp(150, 225, lift))},${Math.round(lerp(50, 90, lift))}`;

  const ms = !armed ? 0 : mode === "auto" ? 10000 : 1400;
  const move = { transitionProperty: "left,top,opacity", transitionDuration: `${ms}ms`, transitionTimingFunction: "linear" } as const;
  const fade = "absolute inset-0 transition-opacity duration-[2000ms] motion-reduce:transition-none";

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {solid && (
        <>
          {/* Warna dasar langit: siang selalu ada, sore dan malam menimpa */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,#7dd3fc,#e0f2fe)" }} />
          <div className={fade} style={{ opacity: dusk, background: "linear-gradient(to bottom,#818cf8,#fdba74)" }} />
          <div className={fade} style={{ opacity: night, background: "linear-gradient(to bottom,#0b1026,#1e1b4b)" }} />
        </>
      )}

      <div className={fade} style={{ opacity: day, background: "radial-gradient(ellipse at 50% 0%, rgba(56,189,248,.18), transparent 60%)" }} />
      <div className={fade} style={{ opacity: dusk, background: "radial-gradient(ellipse at 50% 100%, rgba(251,146,60,.35), transparent 65%)" }} />
      <div className={fade} style={{ opacity: night, background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,.25), transparent 60%)" }} />

      <Starfield night={night} white={solid} />

      {/* Matahari dan bulan hanya digambar di hero. Panel (solid) tidak menggambar sendiri,
          supaya di layar hanya ada satu matahari dan satu bulan. */}
      {!solid && (
        <>
          {/* Matahari */}
          <div
            className="absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ ...spot(sunP), ...move, background: `rgb(${sunRgb})`, boxShadow: `0 0 70px 24px rgba(${sunRgb},.45)` }}
          />
          {/* Bulan */}
          <div
            className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-100 ring-1 ring-slate-300/70"
            style={{
              ...spot(moonP),
              ...move,
              backgroundImage:
                "radial-gradient(circle at 30% 35%, rgba(148,163,184,.55) 0 5px, transparent 6px), radial-gradient(circle at 62% 62%, rgba(148,163,184,.45) 0 7px, transparent 8px), radial-gradient(circle at 70% 28%, rgba(148,163,184,.4) 0 3px, transparent 4px)",
              boxShadow: "0 0 36px 8px rgba(203,213,225,.35)",
            }}
          />

        </>
      )}

      {/* Deretan toko */}
      <ShopScene night={night} dusk={dusk} hour={h} strong={solid} />
    </div>
  );
}

/* ---------- Jam saat ini (untuk panel HeroDemo) ----------
   Menampilkan jam perangkat, fase hari, dan status toko.
   Saat chip di hero dipakai untuk pratinjau, jam ikut berubah. */
export function SkyClock({ className = "" }: { className?: string }) {
  const sky = useSky();
  // Jam sendiri berdetak tiap detik; langit tetap diperbarui tiap 10 detik
  const [tick, setTick] = useState<Date | null>(null);

  useEffect(() => {
    setTick(new Date());
    const id = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!sky || !tick) return null;

  const { mode, h } = sky;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  const text =
    mode === "auto"
      ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZoneName: "short" }).format(tick)
      : `${String(hh).padStart(2, "0")}.${String(mm).padStart(2, "0")}.00`;
  const open = h >= 7 && h < 21;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur ${className}`}
      role="timer"
      aria-label={`Jam sekarang ${text}, ${phaseName(h)}, toko ${open ? "buka" : "tutup"}`}
    >
      <span className={`h-2 w-2 rounded-full ${open ? "bg-green-400" : "bg-red-400"}`} aria-hidden="true" />
      <span className="tabular-nums">{text}</span>
      <span className="text-white/70">· {phaseName(h)}</span>
      <span className="hidden text-white/70 sm:inline">· {open ? "Buka" : "Tutup"}</span>
    </div>
  );
}

export function HeroSky() {
  const sky = useSky();
  if (!sky) return null;

  const { now, mode, real } = sky;
  const time = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(now);
  const next = () => setSkyMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
  const label = mode === "auto" ? `${time} · ${phaseName(real)}` : `Pratinjau · ${mode[0].toUpperCase()}${mode.slice(1)}`;

  return (
    <>
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <SkyLayers />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10">
        <div className="mx-auto max-w-6xl px-4">
          <button
            type="button"
            onClick={next}
            aria-label={`Waktu langit: ${label}. Ketuk untuk mencoba waktu lain.`}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold transition-[transform,border-color] duration-150 hover:border-accent active:scale-95"
          >
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
            <span className="tabular-nums">{label}</span>
            <span className="hidden text-muted sm:inline">· ketuk untuk coba</span>
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------- Pita teks yang bergeser mengikuti scroll ---------- */
export function ScrollTicker({ items }: { items: readonly string[] }) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || calm()) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const half = el.scrollWidth / 2;
      el.style.transform = `translate3d(${-((window.scrollY * 0.45) % half)}px,0,0)`;
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const set = [...items, ...items, ...items];
  const half = (
    <>
      {set.map((t, i) => (
        <span key={i} className="mr-10 flex flex-none items-center gap-10 whitespace-nowrap text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t}
          <span className="h-2 w-2 rounded-full bg-accent" />
        </span>
      ))}
    </>
  );

  return (
    <div className="overflow-hidden border-y border-line bg-surface py-5" aria-hidden="true">
      <div ref={track} className="flex w-max will-change-transform">
        <div className="flex">{half}</div>
        <div className="flex">{half}</div>
      </div>
    </div>
  );
}

/* ---------- FAQ: buka-tutup halus, satu jawaban terbuka sekali waktu ---------- */
export function Faq({ items }: { items: readonly (readonly [string, string])[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const uid = useId();

  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map(([q, a], i) => {
        const on = open === i;
        return (
          <div key={q}>
            <h3>
              <button
                type="button"
                id={`${uid}-b${i}`}
                aria-expanded={on}
                aria-controls={`${uid}-p${i}`}
                onClick={() => setOpen(on ? null : i)}
                className={`flex w-full items-center justify-between gap-4 py-5 text-left text-lg font-semibold transition-colors duration-200 hover:text-accent dark:hover:text-link ${
                  on ? "text-accent dark:text-link" : ""
                }`}
              >
                {q}
                <span
                  aria-hidden="true"
                  className={`relative h-5 w-5 flex-none transition-transform duration-300 motion-reduce:transition-none ${
                    on ? "rotate-45" : ""
                  }`}
                >
                  <span className="absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 rounded bg-current" />
                  <span className="absolute left-1/2 top-0 h-5 w-0.5 -translate-x-1/2 rounded bg-current" />
                </span>
              </button>
            </h3>
            <div
              id={`${uid}-p${i}`}
              role="region"
              aria-labelledby={`${uid}-b${i}`}
              className={`grid transition-[grid-template-rows,visibility] duration-300 ease-out motion-reduce:transition-none ${
                on ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <p className="max-w-[62ch] pb-5 pr-9 text-base leading-8 text-muted">{a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Tombol daftar yang menempel di bawah layar HP ---------- */
export function MobileCta({ loggedIn }: { loggedIn: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let ticking = false;
    const check = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const nearEnd = y + window.innerHeight > document.documentElement.scrollHeight - 500;
        setShow(y > 640 && !nearEnd);
        ticking = false;
      });
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pt-3 transition-transform duration-300 ease-out motion-reduce:transition-none md:hidden ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
    >
      <Link
        href={loggedIn ? "/dashboard" : "/register"}
        tabIndex={show ? 0 : -1}
        className="btn-primary btn-lg w-full justify-center"
      >
        {loggedIn ? "Buka dashboard" : "Daftarkan toko"}
      </Link>
    </div>
  );
}