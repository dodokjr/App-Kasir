"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import CitySkyline from "@/components/CitySkyline";

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

/* ---------- Cuaca sesuai lokasi pengguna ----------
   Sumber data: Open-Meteo (gratis, tanpa kunci API). Lokasi hanya diminta lewat izin browser,
   dibulatkan ke 0,1 derajat (sekitar 11 km), tidak disimpan di server, dan hasilnya
   di-cache 15 menit di sessionStorage. Tanpa izin lokasi, langit tetap cerah.
   Chip "Cuaca" di hero juga bisa dipakai untuk mencoba semua jenis cuaca. */
type Kind = "clear" | "cloudy" | "fog" | "drizzle" | "rain" | "storm" | "snow";
type Cond = { kind: Kind; cover: number; intensity: number; wind: number };
type WxStatus = "idle" | "prompt" | "loading" | "ready" | "denied" | "error" | "unsupported";
type WxState = { status: WxStatus; real: Cond | null; temp: number | null; override: Kind | "auto" };

const KINDS: Kind[] = ["clear", "cloudy", "fog", "drizzle", "rain", "storm", "snow"];
const KIND_LABEL: Record<Kind, string> = {
  clear: "Cerah", cloudy: "Berawan", fog: "Berkabut", drizzle: "Gerimis", rain: "Hujan", storm: "Badai petir", snow: "Salju",
};
const PRESETS: Record<Kind, Cond> = {
  clear: { kind: "clear", cover: 0.12, intensity: 0, wind: 0 },
  cloudy: { kind: "cloudy", cover: 0.85, intensity: 0, wind: 0.05 },
  fog: { kind: "fog", cover: 0.6, intensity: 0, wind: 0 },
  drizzle: { kind: "drizzle", cover: 0.8, intensity: 0.4, wind: 0.08 },
  rain: { kind: "rain", cover: 0.95, intensity: 0.8, wind: 0.15 },
  storm: { kind: "storm", cover: 1, intensity: 1, wind: 0.28 },
  snow: { kind: "snow", cover: 0.9, intensity: 0.7, wind: 0.1 },
};

const WX0: WxState = { status: "idle", real: null, temp: null, override: "auto" };
let wx: WxState = WX0;
const wxListeners = new Set<() => void>();
const setWx = (p: Partial<WxState>) => {
  wx = { ...wx, ...p };
  wxListeners.forEach((f) => f());
};
const subscribeWx = (f: () => void) => {
  wxListeners.add(f);
  return () => {
    wxListeners.delete(f);
  };
};
const useWx = () => useSyncExternalStore(subscribeWx, () => wx, () => WX0);
const condOf = (w: WxState): Cond => (w.override !== "auto" ? PRESETS[w.override] : w.real ?? PRESETS.clear);

// Kode cuaca WMO dari Open-Meteo menjadi kondisi yang bisa digambar
function fromCode(code: number, cloud: number, speed: number, dir: number): Cond {
  // Arah angin menunjukkan dari mana angin datang; tetes bergeser ke arah sebaliknya
  const wind = clamp(-Math.sin((dir * Math.PI) / 180) * clamp(speed / 35) * 0.45, -0.45, 0.45);
  const c = clamp(cloud / 100);
  if (code <= 1) return { kind: "clear", cover: Math.min(c, 0.3), intensity: 0, wind };
  if (code <= 3) return { kind: "cloudy", cover: Math.max(c, code === 2 ? 0.5 : 0.85), intensity: 0, wind };
  if (code === 45 || code === 48) return { kind: "fog", cover: 0.6, intensity: 0, wind };
  if (code >= 51 && code <= 57) return { kind: "drizzle", cover: 0.8, intensity: code === 51 ? 0.25 : code === 53 ? 0.4 : 0.55, wind };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return { kind: "rain", cover: 0.95, intensity: code === 61 || code === 80 ? 0.45 : code === 63 || code === 81 ? 0.75 : 1, wind };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return { kind: "snow", cover: 0.9, intensity: code === 71 || code === 85 ? 0.4 : code === 73 ? 0.7 : 1, wind };
  if (code >= 95) return { kind: "storm", cover: 1, intensity: 1, wind: wind * 1.2 };
  return { kind: "cloudy", cover: Math.max(c, 0.6), intensity: 0, wind };
}

let wxCoords: [number, number] | null = null;
let wxStarted = false;
let wxTimer: ReturnType<typeof setInterval> | undefined;
const WX_TTL = 15 * 60 * 1000;

async function wxLoad(lat: number, lon: number) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("weather");
  const c = (await r.json()).current;
  const cond = fromCode(c.weather_code, c.cloud_cover, c.wind_speed_10m, c.wind_direction_10m);
  const temp = Math.round(c.temperature_2m);
  try {
    sessionStorage.setItem("wx:v1", JSON.stringify({ t: Date.now(), c: [lat, lon], cond, temp }));
  } catch {}
  setWx({ status: "ready", real: cond, temp });
}

function wxRefresh() {
  clearInterval(wxTimer);
  wxTimer = setInterval(() => {
    if (wxCoords) wxLoad(wxCoords[0], wxCoords[1]).catch(() => {});
  }, WX_TTL);
}

function wxLocate() {
  if (typeof navigator === "undefined" || !navigator.geolocation) { setWx({ status: "unsupported" }); return; }
  setWx({ status: "loading" });
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = Math.round(pos.coords.latitude * 10) / 10;
      const lon = Math.round(pos.coords.longitude * 10) / 10;
      wxCoords = [lat, lon];
      try {
        await wxLoad(lat, lon);
        wxRefresh();
      } catch {
        setWx({ status: "error" });
      }
    },
    (err) => setWx({ status: err.code === 1 ? "denied" : "error" }),
    { timeout: 10000, maximumAge: 10 * 60 * 1000 },
  );
}

// Dipanggil sekali dari HeroSky: pakai cache, atau langsung cari lokasi bila izin sudah diberikan
function initWeather() {
  if (wxStarted || typeof window === "undefined") return;
  wxStarted = true;
  if (!("geolocation" in navigator)) { setWx({ status: "unsupported" }); return; }
  try {
    const o = JSON.parse(sessionStorage.getItem("wx:v1") || "null");
    if (o && Date.now() - o.t < WX_TTL) {
      wxCoords = o.c;
      setWx({ status: "ready", real: o.cond, temp: o.temp });
      wxRefresh();
      return;
    }
  } catch {}
  const q = navigator.permissions?.query({ name: "geolocation" as PermissionName });
  if (!q) { setWx({ status: "prompt" }); return; }
  q.then((s) => {
    if (s.state === "granted") wxLocate();
    else if (s.state === "denied") setWx({ status: "denied" });
    else setWx({ status: "prompt" });
  }).catch(() => setWx({ status: "prompt" }));
}

/* Warna awan dan kabut mengikuti langit (terang siang, jingga sore, gelap malam), makin kelabu saat hujan */
function skyTone(day: number, dusk: number, night: number, gray: number) {
  const s = day + dusk + night || 1;
  const mix = (a: number[], b: number[], c: number[]) => [0, 1, 2].map((i) => (day * a[i] + dusk * b[i] + night * c[i]) / s);
  const [r, g, b] = mix([255, 255, 255], [250, 205, 185], [78, 88, 125]);
  return [lerp(r, 88, gray), lerp(g, 96, gray), lerp(b, 110, gray)];
}

const WX_CSS = `
@keyframes wxdrift{from{transform:translateX(-35vw)}to{transform:translateX(105vw)}}
@keyframes wxfog{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){.wx-anim{animation:none!important;transform:translateX(var(--sx,0))!important}}
`;

const CLOUDS = (() => {
  const r = mulberry32(21);
  return Array.from({ length: 9 }, () => ({
    top: 3 + r() * 38, w: 170 + r() * 230, dur: 70 + r() * 80, delay: -r() * 150, o: 0.55 + r() * 0.35, sx: r() * 80,
  }));
})();

/* Lapisan belakang: awan yang melintas dan kabut tipis di langit, di belakang gedung dan toko */
function WeatherBack({ cond, day, dusk, night }: { cond: Cond; day: number; dusk: number; night: number }) {
  const gray = { clear: 0, cloudy: 0.12, fog: 0.1, drizzle: 0.3, rain: 0.4, storm: 0.6, snow: 0.1 }[cond.kind];
  const [r, g, b] = skyTone(day, dusk, night, gray);
  const col = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  const puff = "absolute rounded-full transition-colors duration-[2000ms] motion-reduce:transition-none";
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <style>{WX_CSS}</style>
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="wx-anim absolute left-0 transition-opacity duration-[2000ms] motion-reduce:transition-none"
          style={{
            top: `${c.top}%`, width: c.w, height: c.w * 0.4, filter: "blur(9px)",
            opacity: clamp(cond.cover * CLOUDS.length - i) * c.o,
            animation: `wxdrift ${c.dur}s linear ${c.delay}s infinite`,
            ["--sx" as string]: `${c.sx}vw`,
          }}
        >
          <span className={puff} style={{ left: 0, bottom: 0, width: "55%", height: "70%", background: col }} />
          <span className={puff} style={{ left: "22%", top: 0, width: "50%", height: "100%", background: col }} />
          <span className={puff} style={{ left: "50%", bottom: 0, width: "50%", height: "75%", background: col }} />
          <span className={puff} style={{ left: "8%", right: "8%", bottom: 0, height: "45%", background: col }} />
        </div>
      ))}
      {/* Kabut: selubung tipis di seluruh langit */}
      <div className="absolute inset-0 transition-[opacity,background-color] duration-[2000ms] motion-reduce:transition-none" style={{ opacity: cond.kind === "fog" ? 0.35 : 0, background: col }} />
    </div>
  );
}

/* Hujan, gerimis, badai (dengan petir), dan salju, digambar di canvas.
   Jenis, deras, dan arah angin mengikuti cond; perubahan dilunakkan supaya tidak patah.
   Petir paling cepat setiap 3,5 detik dan hanya berkedip dua kali singkat.
   Berhenti saat di luar layar, dan tidak dijalankan bila pengguna memilih mengurangi gerak. */
function Precip({ cond }: { cond: Cond }) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const cur = useRef(cond);
  cur.current = cond;

  useEffect(() => {
    const el = box.current, c = cv.current, vl = veil.current, fl = flash.current;
    if (!el || !c || !vl || !fl || calm()) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const small = window.matchMedia("(max-width: 767px)").matches;
    const maxRate = small ? 240 : 520; // partikel per detik pada intensitas penuh
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    let w = 0, h = 0;
    const resize = () => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);

    type P = { x: number; y: number; len: number; v: number; snow: boolean; r: number; ph: number; amp: number };
    let ps: P[] = [];
    let env = 0, vv = 0, carry = 0, cleared = true, raf = 0;
    let last = performance.now();
    let nextBolt = last + rand(3000, 7000);
    let bolt: { t0: number; pts: [number, number][] } | null = null;
    const VEIL: Record<Kind, number> = { clear: 0, cloudy: 0.12, fog: 0.06, drizzle: 0.18, rain: 0.3, storm: 0.42, snow: 0.1 };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;

      const cw = cur.current;
      const k = cw.kind;
      const snowy = k === "snow";
      const rainy = k === "drizzle" || k === "rain" || k === "storm";
      env += ((snowy || rainy ? cw.intensity : 0) - env) * Math.min(1, dt * 1.2);
      vv += (VEIL[k] - vv) * Math.min(1, dt * 1.5);
      vl.style.opacity = vv.toFixed(3);

      const wind = cw.wind * (k === "storm" ? 1.3 : 1);
      if (env > 0.01) {
        carry += env * maxRate * (snowy ? 0.55 : k === "storm" ? 1.25 : 1) * clamp(w / 1000, 0.5, 1.4) * dt;
        while (carry >= 1) {
          carry -= 1;
          if (snowy) {
            ps.push({ x: rand(0, w), y: -4, len: 0, v: rand(35, 110), snow: true, r: rand(1, 3.2), ph: rand(0, 6.28), amp: rand(8, 26) });
          } else {
            const len = k === "drizzle" ? rand(6, 12) : rand(10, 24);
            const v = k === "drizzle" ? rand(400, 650) : rand(650, 1050) * (0.6 + len / 40);
            ps.push({ x: rand(Math.min(0, -h * wind), w + Math.max(0, -h * wind)), y: -len, len, v, snow: false, r: 0, ph: 0, amp: 0 });
          }
        }
      }

      // Petir: kilatan putih singkat dan sambaran bergerigi, hanya saat badai
      if (k === "storm" && now >= nextBolt) {
        const pts: [number, number][] = [[rand(0.15, 0.85) * w, 0]];
        const stop = h * rand(0.45, 0.65);
        let [px, py] = pts[0];
        while (py < stop) { px += rand(-28, 28); py += rand(18, 44); pts.push([px, py]); }
        bolt = { t0: now, pts };
        nextBolt = now + rand(3500, 11000);
      }
      let lum = 0;
      if (bolt) {
        const t = now - bolt.t0;
        if (t > 450) bolt = null;
        else lum = t < 60 ? 0.7 : t < 110 ? 0.12 : t < 200 ? 0.9 : 0.9 * (1 - (t - 200) / 250);
      }
      fl.style.opacity = (lum * 0.5).toFixed(3);

      if (!ps.length && !bolt) {
        if (!cleared) { ctx.clearRect(0, 0, w, h); cleared = true; }
        return;
      }

      const next: P[] = [];
      for (const p of ps) {
        p.y += p.v * dt;
        if (p.snow) {
          p.ph += dt * 1.3;
          p.x += (Math.sin(p.ph) * p.amp + wind * 90) * dt;
          if (p.y > h + 5) continue;
        } else {
          p.x += p.v * wind * dt;
          if (p.y - p.len > h) continue;
        }
        next.push(p);
      }
      ps = next;

      ctx.clearRect(0, 0, w, h);
      cleared = false;

      if (bolt && lum > 0.1) {
        ctx.strokeStyle = `rgba(235,240,255,${Math.min(1, lum)})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(180,200,255,.9)";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        bolt.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.strokeStyle = k === "storm" ? "rgba(200,220,255,.6)" : "rgba(200,220,255,.5)";
      ctx.lineWidth = k === "drizzle" ? 0.8 : 1.1;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (const p of ps) {
        if (p.snow) continue;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - wind * p.len, p.y - p.len);
      }
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,.88)";
      ctx.beginPath();
      for (const p of ps) {
        if (!p.snow) continue;
        ctx.moveTo(p.x + p.r, p.y);
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      }
      ctx.fill();
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div ref={box} className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div ref={veil} className="absolute inset-0 bg-slate-800" style={{ opacity: 0 }} />
      <canvas ref={cv} className="absolute inset-0 h-full w-full" />
      <div ref={flash} className="absolute inset-0 bg-white" style={{ opacity: 0 }} />
    </div>
  );
}

/* Lapisan depan: kabut tebal yang bergeser di atas toko, lalu hujan, salju, dan petir */
function WeatherFront({ cond, day, dusk, night }: { cond: Cond; day: number; dusk: number; night: number }) {
  const [r, g, b] = skyTone(day, dusk, night, 0.05);
  const fog = `${Math.round(r)},${Math.round(g)},${Math.round(b)}`;
  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[75%] overflow-hidden transition-opacity duration-[2000ms] motion-reduce:transition-none"
        style={{ opacity: cond.kind === "fog" ? 1 : 0 }}
        aria-hidden="true"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="wx-anim absolute left-0 h-[34%] w-[200%]"
            style={{
              bottom: `${i * 22}%`,
              background: `linear-gradient(to right, transparent, rgba(${fog},.6) 25%, transparent 50%, rgba(${fog},.6) 75%, transparent)`,
              filter: "blur(14px)",
              maskImage: "linear-gradient(to bottom,transparent,black 40%,black 60%,transparent)",
              animation: `wxfog ${60 + i * 25}s linear ${-i * 17}s infinite`,
            }}
          />
        ))}
      </div>
      <Precip cond={cond} />
    </>
  );
}

/* ---------- Pesawat dan kendaraan ----------
   Pesawat melintas di langit (di depan matahari, di belakang awan dan gedung), mobil, van, dan motor
   ojek lewat di jalan depan toko. Munculnya diacak: jenis, warna, ukuran, arah, jalur, dan kecepatan.
   Malam hari: lampu sorot kendaraan menyala (juga saat hujan atau berkabut), lampu kedip pesawat
   menyala, dan mobil lebih jarang lewat. Pesawat tidak terbang saat hujan, badai, kabut, atau salju.
   Berhenti membuat kendaraan baru saat di luar layar, dan tidak ditampilkan bila pengguna
   memilih mengurangi gerak. */
type VehKind = "plane" | "sedan" | "van" | "moto";
type Veh = { id: number; kind: VehKind; dir: 1 | -1; dur: number; delay: number; w: number; y: number; lane: 0 | 1; color: string; dy: number };
let vehId = 0;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const isSmall = () => typeof window !== "undefined" && window.innerWidth < 768;

const TRF_CSS = `
@keyframes trfx{from{transform:translate(var(--x0),0)}to{transform:translate(var(--x1),var(--dy,0px))}}
@keyframes trfspin{to{transform:rotate(360deg)}}
@keyframes trfblink{0%,86%,100%{opacity:0}90%,96%{opacity:1}}
.trf-wheel{transform-box:fill-box;transform-origin:center;animation:trfspin .45s linear infinite}
.trf-blink{animation:trfblink 1.6s linear infinite}
.trf-blink2{animation:trfblink 1.6s linear .5s infinite}
`;

const CAR_COLORS = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#a855f7", "#e2e8f0", "#475569", "#f97316"];

function makePlane(first: boolean): Omit<Veh, "id"> {
  const s = isSmall();
  const dur = (s ? 16 : 20) + Math.random() * 22;
  return { kind: "plane", dir: Math.random() < 0.5 ? 1 : -1, dur, delay: first ? -rnd(0, dur * 0.7) : 0, w: (s ? 60 : 90) + Math.random() * (s ? 40 : 60), y: rnd(6, 34), lane: 0, color: "", dy: -rnd(0, 40) };
}

function makeCar(first: boolean, kind: Kind): Omit<Veh, "id"> {
  const s = isSmall();
  const t = Math.random();
  const k: VehKind = t < 0.5 ? "sedan" : t < 0.75 ? "van" : "moto";
  const base = k === "moto" ? rnd(8, 12) : k === "van" ? rnd(12, 20) : rnd(10, 18);
  const dur = base * (kind === "rain" || kind === "storm" || kind === "snow" ? 1.3 : 1);
  const w = (k === "moto" ? rnd(34, 42) : k === "van" ? rnd(64, 80) : rnd(56, 74)) * (s ? 0.8 : 1);
  return { kind: k, dir: Math.random() < 0.5 ? 1 : -1, dur, delay: first ? -rnd(0, dur * 0.8) : 0, w, y: 0, lane: Math.random() < 0.5 ? 0 : 1, color: k === "moto" ? "#16a34a" : CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], dy: 0 };
}

function useTraffic(make: (first: boolean) => Omit<Veh, "id">, ok: () => boolean, gap: [number, number], max: number, first: number) {
  const [list, setList] = useState<Veh[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const okRef = useRef(ok);
  okRef.current = ok;

  useEffect(() => {
    if (calm()) return;
    let visible = true;
    const el = box.current;
    const io = el && typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; }) : null;
    if (el) io?.observe(el);
    const add = (f: boolean) => setList((l) => (l.length >= max ? l : [...l, { ...make(f), id: ++vehId }]));
    for (let i = 0; i < first; i++) if (okRef.current()) add(true);
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        if (visible && okRef.current()) add(false);
        loop();
      }, rnd(gap[0], gap[1]));
    };
    loop();
    return () => { clearTimeout(t); io?.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = (id: number) => setList((l) => l.filter((v) => v.id !== id));
  return { list, remove, box };
}

function PlaneSvg({ w, body, wing, lit }: { w: number; body: string; wing: string; lit: boolean }) {
  return (
    <svg viewBox="0 0 120 44" width={w} height={(w * 44) / 120} style={{ overflow: "visible" }}>
      <path d="M62 18 L54 8 L64 8 L80 18Z" fill={wing} />
      <path d="M10 17 L4 3 L18 3 L28 16Z" fill={body} />
      <path d="M6 22 Q6 15 20 15 L94 15 Q114 16 118 22 Q114 28 94 29 L20 29 Q6 29 6 22Z" fill={body} />
      <path d="M100 18 Q110 18 114 21.5 L100 21.5Z" fill="#7dd3fc" opacity=".9" />
      {Array.from({ length: 10 }, (_, i) => (
        <circle key={i} cx={28 + i * 6.2} cy={21} r={1.2} fill={lit ? "#fde68a" : "#64748b"} opacity={0.85} />
      ))}
      <path d="M54 24 L38 40 L54 40 L80 25Z" fill={wing} />
      <ellipse cx="62" cy="33" rx="6" ry="3" fill={wing} />
      {lit && (
        <>
          <circle className="trf-blink" cx="38" cy="40" r="2.2" fill="#ef4444" style={{ filter: "drop-shadow(0 0 4px #ef4444)" }} />
          <circle className="trf-blink2" cx="6" cy="4" r="2" fill="#fff" style={{ filter: "drop-shadow(0 0 4px #fff)" }} />
        </>
      )}
    </svg>
  );
}

function Wheel({ cx, cy = 27, r = 6.5 }: { cx: number; cy?: number; r?: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="#111827" />
      <g className="trf-wheel">
        <circle cx={cx} cy={cy} r={r * 0.45} fill="#9ca3af" />
        <path d={`M${cx} ${cy - r * 0.4}v${r * 0.8}M${cx - r * 0.4} ${cy}h${r * 0.8}`} stroke="#374151" strokeWidth="1" />
      </g>
    </>
  );
}

function VehicleSvg({ v, lamps, dim }: { v: Veh; lamps: boolean; dim: number }) {
  const gid = `trfbeam${v.id}`;
  const beam = (
    <>
      <defs>
        <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fef9c3" stopOpacity=".6" />
          <stop offset="1" stopColor="#fef9c3" stopOpacity="0" />
        </linearGradient>
      </defs>
      {lamps && <polygon points={v.kind === "moto" ? "38,13 120,6 120,34 38,15" : "77,20 150,10 150,34 77,24"} fill={`url(#${gid})`} />}
    </>
  );
  const shade = { filter: `brightness(${1 - dim * 0.4})` };

  if (v.kind === "moto") {
    return (
      <svg viewBox="0 0 50 34" width={v.w} height={(v.w * 34) / 50} style={{ overflow: "visible" }}>
        {beam}
        <g style={shade}>
          <path d="M10 27 L20 17 H32 L40 27 M40 27 L36 13" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M16 17 Q22 12 31 14 L35 17Z" fill={v.color} />
          <path d="M20 15 L24 5 Q27 3 30 6 L29 15Z" fill="#166534" />
          <circle cx="27" cy="3.4" r="3.2" fill="#16a34a" />
        </g>
        <circle cx="37" cy="13" r="2.2" fill={lamps ? "#fef08a" : "#fde68a"} />
        <Wheel cx={10} r={6} />
        <Wheel cx={40} r={6} />
      </svg>
    );
  }

  const van = v.kind === "van";
  return (
    <svg viewBox="0 0 80 34" width={v.w} height={(v.w * 34) / 80} style={{ overflow: "visible" }}>
      {beam}
      <g style={shade}>
        {van ? (
          <>
            <path d="M3 27 V12 Q3 8 7 8 H52 L62 17 H73 Q77 18 77 22 V27Z" fill={v.color} />
            <path d="M52 11 L59 17 H52Z" fill={lamps ? "#1e293b" : "#cfeafc"} />
            <rect x="10" y="12" width="30" height="7" rx="1.5" fill="#fff" opacity=".35" />
          </>
        ) : (
          <>
            <path d="M3 25 Q3 19 9 18 L19 17 L26 9 Q28 7 31 7 L51 7 Q54 7 56 9 L63 17 L71 18 Q77 19 77 25 L77 27 H3Z" fill={v.color} />
            <path d="M28 17 L33 10 H41 V17Z M44 10 H52 L58 17 H44Z" fill={lamps ? "#1e293b" : "#cfeafc"} />
          </>
        )}
      </g>
      <rect x="73" y="20" width="5" height="3.5" rx="1.5" fill={lamps ? "#fef08a" : "#fde68a"} />
      <rect x="2" y="20" width="3.5" height="3.5" rx="1" fill="#dc2626" />
      <Wheel cx={van ? 18 : 20} />
      <Wheel cx={61} />
    </svg>
  );
}

const trfStyle = (v: Veh) => ({
  animation: `trfx ${v.dur}s linear ${v.delay}s forwards`,
  ["--x0" as string]: v.dir > 0 ? "-260px" : "calc(100vw + 260px)",
  ["--x1" as string]: v.dir > 0 ? "calc(100vw + 260px)" : "-260px",
  ["--dy" as string]: `${v.dy}px`,
});

/* Pesawat di langit */
function Planes({ kind, day, dusk, night }: { kind: Kind; day: number; dusk: number; night: number }) {
  const ctx = useRef({ kind });
  ctx.current = { kind };
  const { list, remove, box } = useTraffic(() => makePlane(false), () => kind_ok(ctx.current.kind), [8000, 18000], 2, 1);
  const [r, g, b] = skyTone(day, dusk, night, 0);
  const body = `rgb(${Math.round(r * 0.97)},${Math.round(g * 0.97)},${Math.round(b * 0.97)})`;
  const wing = `rgb(${Math.round(r * 0.8)},${Math.round(g * 0.8)},${Math.round(b * 0.8)})`;
  const lit = night + dusk * 0.6 > 0.35;
  const trail = clamp(day * 0.8 + dusk * 0.4) * (kind === "clear" || kind === "cloudy" ? 1 : 0);

  return (
    <div ref={box} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <style>{TRF_CSS}</style>
      {list.map((p) => (
        <div
          key={p.id}
          className="absolute left-0"
          style={{ top: `${p.y}%`, ...trfStyle(p) }}
          onAnimationEnd={(e) => { if (e.target === e.currentTarget) remove(p.id); }}
        >
          <div className="relative" style={{ transform: p.dir < 0 ? "scaleX(-1)" : undefined }}>
            <span
              className="absolute"
              style={{ right: "92%", top: "47%", height: 2, width: p.w * 2.4, opacity: trail, background: "linear-gradient(to left, rgba(255,255,255,.75), transparent)", transition: "opacity 2s" }}
            />
            <PlaneSvg w={p.w} body={body} wing={wing} lit={lit} />
          </div>
        </div>
      ))}
    </div>
  );
}
const kind_ok = (k: Kind) => k === "clear" || k === "cloudy";

/* Kendaraan di jalan depan toko */
function Cars({ kind, night, dusk }: { kind: Kind; night: number; dusk: number }) {
  const ctx = useRef({ kind, night });
  ctx.current = { kind, night };
  const { list, remove, box } = useTraffic(
    () => makeCar(false, ctx.current.kind),
    () => !(ctx.current.night > 0.8 && Math.random() < 0.6), // lewat tengah malam, jalanan lebih sepi
    [2200, 5200], 7, 3,
  );
  const lamps = night + dusk * 0.6 > 0.35 || kind === "fog" || kind === "rain" || kind === "storm" || kind === "drizzle";

  return (
    <div ref={box} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <style>{TRF_CSS}</style>
      {list.map((v) => (
        <div
          key={v.id}
          className={`absolute left-0 ${v.lane ? "bottom-[9px] sm:bottom-[13px]" : "bottom-[2px]"}`}
          style={{ zIndex: v.lane ? 0 : 1, ...trfStyle(v) }}
          onAnimationEnd={(e) => { if (e.target === e.currentTarget) remove(v.id); }}
        >
          <div style={{ transform: `scale(${v.dir * (v.lane ? 0.85 : 1)}, ${v.lane ? 0.85 : 1})`, transformOrigin: "50% 100%" }}>
            <VehicleSvg v={v} lamps={lamps} dim={night} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Lapisan langit + matahari + bulan + gedung kota + toko ----------
   solid: langit punya warna sendiri (siang, sore, malam) alih-alih mengikuti tema halaman.
   bodies: gambar matahari dan bulan. Bawaannya hanya bila langit tidak solid;
           hero menyalakannya sendiri supaya di layar hanya ada satu matahari dan satu bulan.
   weather: cuaca sesuai lokasi pengguna (awan, kabut, hujan, salju, petir).
   traffic: pesawat di langit dan kendaraan di jalan depan toko. */
export function SkyLayers({ solid = false, bodies = !solid, weather = false, traffic = false }: { solid?: boolean; bodies?: boolean; weather?: boolean; traffic?: boolean }) {
  const sky = useSky();
  const wxs = useWx();
  const cond = condOf(wxs);

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

      {bodies && (
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

      {/* Pesawat: di depan matahari dan bulan, di belakang awan */}
      {traffic && <Planes kind={cond.kind} day={day} dusk={dusk} night={night} />}

      {/* Awan dan kabut tipis, di belakang gedung */}
      {weather && <WeatherBack cond={cond} day={day} dusk={dusk} night={night} />}

      {/* Gedung kota di belakang deretan toko */}
      <CitySkyline day={day} dusk={dusk} night={night} strong={solid} />

      {/* Deretan toko */}
      <ShopScene night={night} dusk={dusk} hour={h} strong={solid} />

      {/* Mobil, van, dan motor di jalan depan toko */}
      {traffic && <Cars kind={cond.kind} night={night} dusk={dusk} />}

      {/* Kabut tebal, hujan, salju, dan petir paling depan */}
      {weather && <WeatherFront cond={cond} day={day} dusk={dusk} night={night} />}
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

/* ---------- Latar hero: langit penuh + cuaca di lokasi pengguna ----------
   Tanpa useSky siap (render server), tampil langit siang supaya tidak berkedip.
   Dua chip di dasar hero: jam langit, dan cuaca. Chip cuaca meminta izin lokasi
   (bila belum diberikan), lalu tiap ketukan berikutnya mencoba jenis cuaca lain. */
const WX_ORDER: (Kind | "auto")[] = ["auto", ...KINDS];

export function HeroSky() {
  const sky = useSky();
  const w = useWx();

  useEffect(() => { initWeather(); }, []);

  const bg = (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <SkyLayers solid bodies weather traffic />
    </div>
  );
  if (!sky) return bg;

  const { now, mode, real } = sky;
  const time = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(now);
  const next = () => setSkyMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
  const label = mode === "auto" ? `${time} · ${phaseName(real)}` : `Pratinjau · ${mode[0].toUpperCase()}${mode.slice(1)}`;

  const asking = w.override === "auto" && w.status === "prompt";
  const wxLabel =
    w.override !== "auto" ? `Pratinjau · ${KIND_LABEL[w.override]}`
    : w.status === "ready" && w.real ? `${KIND_LABEL[w.real.kind]}${w.temp != null ? ` · ${w.temp}°C` : ""}`
    : w.status === "prompt" ? "Pakai cuaca lokasi saya"
    : w.status === "loading" ? "Memuat cuaca…"
    : w.status === "denied" ? "Lokasi tidak aktif"
    : w.status === "idle" ? "Cuaca" : "Cuaca tidak tersedia";
  const nextWx = () => {
    if (asking) { wxLocate(); return; }
    setWx({ override: WX_ORDER[(WX_ORDER.indexOf(w.override) + 1) % WX_ORDER.length] });
  };

  const chip =
    "pointer-events-auto inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-[transform,border-color] duration-150 hover:border-accent active:scale-95";

  return (
    <>
      {bg}

      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-2 px-4">
          <button
            type="button"
            onClick={next}
            aria-label={`Waktu langit: ${label}. Ketuk untuk mencoba waktu lain.`}
            className={chip}
          >
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
            <span className="tabular-nums">{label}</span>
            <span className="hidden text-muted sm:inline">· ketuk untuk coba</span>
          </button>
          <button
            type="button"
            onClick={nextWx}
            aria-label={asking ? "Pakai cuaca di lokasi Anda. Browser akan meminta izin lokasi." : `Cuaca: ${wxLabel}. Ketuk untuk mencoba cuaca lain.`}
            className={chip}
          >
            <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
            <span className="tabular-nums">{wxLabel}</span>
            {!asking && <span className="hidden text-muted sm:inline">· ketuk untuk coba</span>}
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------- Warna teks hero mengikuti langit ----------
   Langit hero sekarang punya warna sendiri, bukan warna tema, jadi teks di atasnya
   ikut berganti: gelap saat siang dan sore, terang saat malam. */
export function HeroTone({ children, className = "" }: { children: ReactNode; className?: string }) {
  const sky = useSky();
  const dark = !!sky && sky.night > 0.4;
  return (
    <div
      className={`relative transition-colors duration-[2000ms] motion-reduce:transition-none ${
        dark ? "text-white [&_.text-muted]:text-white/75" : "text-slate-900 [&_.text-muted]:text-slate-700"
      } [&_.tick]:!text-current ${className}`}
    >
      {children}
    </div>
  );
}

/* ---------- Tombol sekunder di hero ----------
   btn-ghost memakai warna tema (terang/gelap), sedangkan langit hero memakai warna jam.
   Kalau tidak cocok (tema gelap di siang hari, atau tema terang di malam hari), tombolnya hilang.
   Jadi warna teks, garis, dan latar tombol mengikuti langit, dengan !important untuk menimpa btn-ghost. */
export function HeroGhostLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  const sky = useSky();
  const dark = !!sky && sky.night > 0.4;
  return (
    <Link
      href={href}
      className={`btn-ghost backdrop-blur-sm transition-colors duration-500 ${
        dark
          ? "!border-white/60 !bg-white/10 !text-white hover:!bg-white/20"
          : "!border-slate-900/40 !bg-white/50 !text-slate-900 hover:!bg-white/80"
      } ${className}`}
    >
      {children}
    </Link>
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
        {loggedIn ? "Masuk ke dashboard" : "Daftarkan toko"}
      </Link>
    </div>
  );
}