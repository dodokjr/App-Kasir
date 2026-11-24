import { addMany, type Row } from "./sheets";

/**
 * Website -> Google Sheets. Menulis 1 baris per kunjungan akan menghabiskan kuota tulis Google Sheets (±60/menit),
 * jadi kunjungan ditampung di memori server lalu dikirim sekaligus (1 permintaan) tiap 30 detik atau tiap 25 kunjungan.
 * Konsekuensi: di server tunggal (VPS / next start) tidak ada yang hilang kecuali server mati sebelum kiriman berikutnya;
 * di hosting serverless tampungan bisa hilang saat instance dimatikan.
 */
const FLUSH_MS = 30_000;
const FLUSH_AT = 25;
const MAX_BUF = 500;        // batas tampungan bila Google sedang menolak, supaya memori tidak membengkak
const MAX_PER_MIN = 600;    // batas global kunjungan tercatat per menit (perlindungan bila ada yang membanjiri endpoint)

type State = { buf: Row[]; timer?: ReturnType<typeof setTimeout>; flushing?: Promise<void>; winStart: number; winN: number };
const g = globalThis as unknown as { __traffic?: State };
const S: State = (g.__traffic ??= { buf: [], winStart: 0, winN: 0 });

export const pendingCount = () => S.buf.length;

export function track(hit: Row) {
  const t = Date.now();
  if (t - S.winStart > 60_000) { S.winStart = t; S.winN = 0; }
  if (++S.winN > MAX_PER_MIN) return;
  S.buf.push(hit);
  if (S.buf.length > MAX_BUF) S.buf.splice(0, S.buf.length - MAX_BUF);
  if (S.buf.length >= FLUSH_AT) void flush();
  else if (!S.timer) S.timer = setTimeout(() => void flush(), FLUSH_MS);
}

/** Kirim tampungan ke Google Sheets sekarang. Aman dipanggil bersamaan: yang kedua menunggu yang pertama */
export function flush(): Promise<void> {
  if (S.flushing) return S.flushing;
  if (S.timer) { clearTimeout(S.timer); S.timer = undefined; }
  const batch = S.buf.splice(0);
  if (!batch.length) return Promise.resolve();
  S.flushing = addMany("traffic", batch)
    .catch((e) => {
      console.error("[traffic] gagal menulis ke Sheets, dicoba lagi nanti:", (e as Error).message);
      S.buf.unshift(...batch);
      if (S.buf.length > MAX_BUF) S.buf.splice(0, S.buf.length - MAX_BUF);
      if (!S.timer) S.timer = setTimeout(() => void flush(), FLUSH_MS * 2);
    })
    .finally(() => { S.flushing = undefined; });
  return S.flushing;
}
