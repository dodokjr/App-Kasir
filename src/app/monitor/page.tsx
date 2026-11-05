"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import BranchSelect from "@/components/BranchSelect";
import { useBranch } from "@/lib/useBranch";
import { api, rp, tgl } from "@/lib/client";
import type { Me } from "@/lib/types";
import type { MonitorRow } from "@/lib/shiftTypes";

type R = Record<string, string>;
type Data = { now: string; online: number; offline: number; open: number; alerts: number; rows: MonitorRow[] };

const ago = (iso: string, now: string) => {
  if (!iso) return "belum pernah";
  const s = Math.max(0, Math.round((Date.parse(now) - Date.parse(iso)) / 1000));
  if (s < 60) return `${s} detik lalu`;
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return tgl(iso);
};

function Badge({ r }: { r: MonitorRow }) {
  // Teks selalu ada, tidak hanya warna, agar jelas bagi semua orang
  if (r.status === "online") return <span className="inline-flex items-center gap-1.5 text-sm font-medium"><span className="h-2.5 w-2.5 rounded-full bg-green-600" aria-hidden />Online</span>;
  return <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${r.alert ? "text-danger" : "text-muted"}`}><span className={`h-2.5 w-2.5 rounded-full ${r.alert ? "bg-danger" : "bg-muted"}`} aria-hidden />Offline</span>;
}

function Monitor({ me }: { me: Me }) {
  const owner = me.session.role === "kepala_toko";
  const [branches, setBranches] = useState<R[]>([]);
  const [branch, setBranch] = useBranch("");
  const active = owner && branches.some((b) => b.id === branch) ? branch : "";
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [at, setAt] = useState("");

  useEffect(() => { if (owner) api<R[]>("/api/branches").then(setBranches).catch(() => {}); }, [owner]);
  const load = useCallback(async () => {
    try { setData(await api<Data>("/api/presence")); setErr(""); setAt(new Date().toISOString()); }
    catch (x) { setErr((x as Error).message); }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 20_000);
    return () => clearInterval(t);
  }, [load]);

  const rows = (data?.rows ?? []).filter((r) => !active || r.branchId === active);
  const groups = [...new Set(rows.map((r) => r.branchName))].map((name) => ({ name, rows: rows.filter((r) => r.branchName === name) }));
  const cnt = (f: (r: MonitorRow) => boolean) => rows.filter(f).length;
  const cards: [string, string, string?][] = [
    ["Kasir online", String(cnt((r) => r.status === "online"))],
    ["Kasir offline", String(cnt((r) => r.status !== "online"))],
    ["Kasir sedang dibuka", String(cnt((r) => r.shiftOpen))],
    ["Perlu dicek", String(cnt((r) => r.alert)), cnt((r) => r.alert) ? "text-danger" : ""],
  ];

  return (
    <div className="space-y-6">
      <section className="card flex flex-wrap items-end gap-4">
        {owner && branches.length > 0 && <div className="min-w-[260px] flex-1"><BranchSelect branches={branches} value={active} onChange={setBranch} allowAll /></div>}
        <p className="text-sm text-muted">
          Online berarti halaman aplikasi terbuka di perangkat kasir dan terhubung internet. Diperbarui otomatis tiap 20 detik{at ? `, terakhir ${tgl(at)}` : ""}.
        </p>
        <button className="btn-ghost" onClick={load}>Muat ulang</button>
      </section>
      {err && <p className="text-sm text-danger" role="alert">{err}</p>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-live="polite">
        {cards.map(([k, v, cls]) => (
          <div key={k} className="card"><div className="text-sm text-muted">{k}</div><div className={`mt-1 font-mono text-2xl font-semibold ${cls ?? ""}`}>{v}</div></div>
        ))}
      </section>

      {!data && !err && <p className="text-sm text-muted">Memuat…</p>}
      {data && !rows.length && <p className="card text-sm text-muted">Belum ada kasir di {active ? "cabang ini" : "toko ini"}. Tambahkan akun kasir dari Dashboard.</p>}

      {groups.map((g) => (
        <section key={g.name} className="card overflow-x-auto p-0">
          <h2 className="p-4 pb-2 font-semibold">{g.name}</h2>
          <table className="w-full">
            <thead><tr><th className="th">Kasir</th><th className="th">Koneksi</th><th className="th">Kasir (shift)</th><th className="th text-right">Penjualan hari ini</th><th className="th">Transaksi terakhir</th></tr></thead>
            <tbody className="divide-y divide-line">
              {g.rows.map((r) => (
                <tr key={r.userId}>
                  <td className="td"><div className="font-medium">{r.name}</div><div className="text-xs text-muted">{r.role === "kasir" ? "Kasir" : "Kepala"}</div></td>
                  <td className="td"><Badge r={r} /><div className="text-xs text-muted">{r.status === "online" ? "sekarang" : `terakhir ${ago(r.lastSeen, data!.now)}`}</div></td>
                  <td className="td">
                    {r.shiftOpen ? <><div>Dibuka</div><div className="text-xs text-muted">sejak {tgl(r.shiftSince)}</div></> : <span className="text-muted">Ditutup</span>}
                    {r.alert && <div className="text-xs font-medium text-danger">Kasir terbuka tetapi offline. Hubungi kasir.</div>}
                  </td>
                  <td className="td text-right font-mono">{rp(r.salesToday)}<div className="text-xs text-muted">{r.txToday} transaksi</div></td>
                  <td className="td text-sm">{r.lastTx ? tgl(r.lastTx) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

export default function Pantau() {
  return <Shell>{(me) => (me.session.role === "kepala_toko" || me.session.role === "kepala_cabang")
    ? <Monitor me={me} />
    : <p className="text-sm text-muted">Halaman pantau kasir hanya untuk kepala toko dan kepala cabang.</p>}</Shell>;
}