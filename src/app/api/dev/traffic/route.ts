import { handle, need, HttpError } from "@/lib/api";
import { all, removeByIds } from "@/lib/sheets";
import { flush, pendingCount } from "@/lib/traffic";
import { dayKey } from "@/lib/shift";
import type { TrafficData } from "@/lib/devTypes";

const top = <T extends { views: number }>(a: T[], n: number) => a.sort((x, y) => y.views - x.views).slice(0, n);

// Google Sheets -> dashboard: membaca tab "traffic" dan merangkumnya. ?fresh=1 melewati cache 10 detik
export const GET = handle(async (req) => {
  await need(["developer"]);
  const q = new URL(req.url).searchParams;
  const days = [7, 14, 30].includes(Number(q.get("days"))) ? Number(q.get("days")) : 7;
  const rows = await all("traffic", { fresh: q.get("fresh") === "1" });

  const keys = Array.from({ length: days }, (_, i) => dayKey(new Date(Date.now() - (days - 1 - i) * 864e5).toISOString()));
  const day = new Map(keys.map((k) => [k, { views: 0, v: new Set<string>() }]));
  const uniq = new Set<string>();
  const pages = new Map<string, { views: number; v: Set<string> }>();
  const refs = new Map<string, number>();
  const devices = { desktop: 0, mobile: 0, tablet: 0 };
  let views = 0, lastHitAt = "";

  for (const r of rows) {
    if (r.at > lastHitAt) lastHitAt = r.at;
    const d = day.get(dayKey(r.at));
    if (!d) continue;
    views++; d.views++; d.v.add(r.visitor); uniq.add(r.visitor);
    const p = pages.get(r.path) ?? { views: 0, v: new Set<string>() };
    p.views++; p.v.add(r.visitor); pages.set(r.path, p);
    const ref = r.referrer || "(langsung / dalam situs)";
    refs.set(ref, (refs.get(ref) ?? 0) + 1);
    if (r.device in devices) devices[r.device as keyof typeof devices]++;
  }

  const out: TrafficData = {
    days, views, visitors: uniq.size,
    perDay: keys.map((k) => ({ day: k, views: day.get(k)!.views, visitors: day.get(k)!.v.size })),
    pages: top([...pages].map(([path, p]) => ({ path, views: p.views, visitors: p.v.size })), 10),
    referrers: top([...refs].map(([name, views]) => ({ name, views })), 8),
    devices, pending: pendingCount(), lastHitAt, rowsInSheet: rows.length,
    sheetUrl: process.env.GOOGLE_SHEET_ID ? `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}/edit` : "",
  };
  return out;
});

// Website -> Sheets: kirim kunjungan yang masih di memori sekarang juga, tanpa menunggu jadwal 30 detik
export const POST = handle(async (req) => {
  await need(["developer"]);
  const b = await req.json().catch(() => ({}));
  if (b.action !== "flush") throw new HttpError(400, "Aksi tidak dikenal");
  await flush();
  return { ok: true, pending: pendingCount() };
});

// Bersihkan log lama supaya tab traffic tidak membengkak (membaca tab besar makin lambat dan memakan kuota)
export const DELETE = handle(async (req) => {
  await need(["developer"]);
  const n = Number(new URL(req.url).searchParams.get("olderThanDays"));
  if (!Number.isInteger(n) || n < 7 || n > 3650) throw new HttpError(400, "Batas hari harus antara 7 dan 3650");
  const cutoff = new Date(Date.now() - n * 864e5).toISOString();
  const counts = await removeByIds(["traffic"], (data) => ({ traffic: new Set(data.traffic.filter((r) => r.at && r.at < cutoff).map((r) => r.id)) }));
  return { ok: true, deleted: counts.traffic ?? 0 };
});
