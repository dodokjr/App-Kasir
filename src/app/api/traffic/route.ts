import { handle } from "@/lib/api";
import { uid, now } from "@/lib/sheets";
import { track } from "@/lib/traffic";

// Endpoint publik (tanpa login) untuk mencatat kunjungan halaman. Tidak menyimpan IP.
// Semua isi divalidasi ketat karena langsung ditulis ke spreadsheet.
const BOT = /bot|crawl|spider|slurp|preview|monitor|uptime|lighthouse|headless|curl|wget|python|axios|node-fetch|facebookexternalhit/i;
const PATH_RE = /^\/[A-Za-z0-9\-._~/]{0,119}$/;
const VID_RE = /^[A-Za-z0-9-]{8,40}$/;
const HOST_RE = /^[a-z0-9.-]{1,80}$/i;
const SKIP = ["/api", "/developer"];

const hits = new Map<string, number[]>();
const limited = (ip: string) => {
  const t = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((x) => t - x < 60_000)) hits.delete(k);
  const recent = (hits.get(ip) ?? []).filter((x) => t - x < 60_000);
  recent.push(t); hits.set(ip, recent);
  return recent.length > 60;
};

export const POST = handle(async (req) => {
  const ua = req.headers.get("user-agent") || "";
  if (!ua || BOT.test(ua)) return { ok: true };
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (limited(ip)) return { ok: true };

  const b = await req.json().catch(() => ({}));
  let path = String(b.path ?? "");
  if (path.length > 1) path = path.replace(/\/+$/, "");
  const vid = String(b.vid ?? "");
  if (!PATH_RE.test(path) || !VID_RE.test(vid) || SKIP.some((p) => path === p || path.startsWith(p + "/"))) return { ok: true };

  // Hanya nama domain asal. Perpindahan di dalam situs sendiri dianggap tanpa perujuk
  let referrer = "";
  try {
    const h = new URL(String(b.ref ?? "")).hostname.toLowerCase();
    if (HOST_RE.test(h) && h !== (req.headers.get("host") || "").split(":")[0].toLowerCase()) referrer = h;
  } catch {}

  const device = /ipad|tablet/i.test(ua) ? "tablet" : /mobi|android|iphone/i.test(ua) ? "mobile" : "desktop";
  track({ id: uid(), at: now(), path, visitor: vid, referrer, device });
  return { ok: true };
});
