"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Shell, { Avatar, ROLE_LABEL } from "@/components/Shell";
import { api, tgl } from "@/lib/client";
import type { Me } from "@/lib/types";
import type { DevUser, DevStore, Overview, TrafficData } from "@/lib/devTypes";

const MAX_TO = 20;
const nf = (n: number) => n.toLocaleString("id-ID");
const BIZ: Record<string, string> = { fnb: "F&B", retail: "Retail", sembako: "Sembako", lainnya: "Lainnya" };

const ago = (iso: string, now: string) => {
  if (!iso) return "belum pernah";
  const s = Math.max(0, Math.round((Date.parse(now) - Date.parse(iso)) / 1000));
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
};
const shortDay = (k: string) => `${k.slice(8, 10)}/${k.slice(5, 7)}`;

/* ---------- Bagian kecil ---------- */

const TONE = { ok: "bg-accent/10 text-accent dark:text-link", off: "bg-line text-muted", bad: "bg-danger/10 text-danger" };
function Badge({ tone, dot, children }: { tone: keyof typeof TONE; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[tone]}`}>
      {dot && <span className="h-2 w-2 rounded-full bg-green-600" aria-hidden />}{children}
    </span>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm font-semibold transition active:scale-95 ${active ? "border-accent bg-accent text-white" : "border-line hover:border-accent"}`}>
      {children}
    </button>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "warn" }) {
  return (
    <div className="card p-4">
      <div className="text-sm font-medium text-muted">{label}</div>
      <div className={`mt-1 truncate text-3xl font-extrabold tracking-tight ${tone === "warn" ? "text-danger" : ""}`} title={value}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => close.current(), 4500);
    return () => window.clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  return (
    <div role="status" className="fixed inset-x-4 bottom-5 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-paper shadow-2xl">
      <span className="min-w-0 flex-1">{msg}</span>
      <button type="button" onClick={onClose} aria-label="Tutup" className="opacity-70 transition hover:opacity-100">✕</button>
    </div>
  );
}

/* ---------- Dialog hapus (wajib mengetik ulang email / nama toko) ---------- */

function DeleteDialog({ user, store, onClose, onDone }: {
  user?: DevUser; store?: { id: string; name: string }; onClose: () => void; onDone: (msg: string) => void;
}) {
  const [scope, setScope] = useState<"user" | "store">(user ? "user" : "store");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const expect = scope === "user" ? user!.email : store!.name;
  const ok = scope === "user" ? text.trim().toLowerCase() === expect.toLowerCase() : text.trim() === expect.trim();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function go() {
    setBusy(true); setErr("");
    try {
      if (scope === "user") {
        await api(`/api/dev/users?id=${encodeURIComponent(user!.id)}&confirm=${encodeURIComponent(text)}`, { method: "DELETE" });
        onDone(`Akun ${user!.email} dihapus.`);
      } else {
        const r = await api<{ total: number }>(`/api/dev/stores?id=${encodeURIComponent(store!.id)}&confirm=${encodeURIComponent(text)}`, { method: "DELETE" });
        onDone(`Toko "${store!.name}" dihapus beserta ${nf(r.total)} baris data.`);
      }
    } catch (x) { setErr((x as Error).message); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="del-title" className="card w-full max-w-lg space-y-4 p-5">
        <h2 id="del-title" className="text-lg font-bold text-danger">{scope === "user" ? "Hapus akun" : "Hapus toko dan semua datanya"}</h2>

        {user && store && (
          <fieldset className="space-y-2 text-sm">
            <legend className="sr-only">Yang dihapus</legend>
            <label className="flex items-start gap-2"><input type="radio" className="mt-1" checked={scope === "user"} onChange={() => { setScope("user"); setText(""); }} />
              <span><b>Akun ini saja</b> ({user.name}). Toko dan akun lain tetap ada.</span></label>
            <label className="flex items-start gap-2"><input type="radio" className="mt-1" checked={scope === "store"} onChange={() => { setScope("store"); setText(""); }} />
              <span><b>Akun + toko &ldquo;{store.name}&rdquo;</b> beserta semua cabang, akun, produk, transaksi, keuangan, dan booking.</span></label>
          </fieldset>
        )}

        <p className="text-sm">
          {scope === "user"
            ? <>Akun <b>{user!.email}</b> dihapus permanen dan langsung keluar dari semua perangkat. Riwayat transaksinya tetap ada.{user!.role === "kepala_toko" && !store && " Ia kepala toko; tokonya akan tanpa pemilik."}</>
            : <>Toko <b>{store!.name}</b> dan <b>semua datanya</b> dihapus permanen dari Google Sheets. Semua akun di toko ini ikut terhapus.</>}
          {" "}<b className="text-danger">Tidak bisa dibatalkan.</b>
        </p>

        <div>
          <label className="label" htmlFor="del-confirm">Ketik <span className="font-mono text-ink">{expect}</span> untuk melanjutkan</label>
          <input id="del-confirm" className="input" autoFocus autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        {err && <p className="text-sm font-medium text-danger" role="alert">{err}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button className="btn-ghost" onClick={onClose} disabled={busy}>Batal</button>
          <button className="btn bg-danger text-white hover:opacity-90 disabled:opacity-40" disabled={!ok || busy} onClick={go}>{busy ? "Menghapus…" : "Hapus permanen"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Tab Pengguna ---------- */

type Filter = "" | "online" | "aktif" | "nonaktif" | "lama";

function UsersTab({ me, ov, sel, setSel, busyId, onAct, onDelete, onEmail, onNote }: {
  me: Me; ov: Overview; sel: Set<string>; setSel: (s: Set<string>) => void; busyId: string;
  onAct: (u: DevUser, body: Record<string, unknown>, msg: string) => void;
  onDelete: (u: DevUser) => void; onEmail: (ids: string[]) => void; onNote: (m: string) => void;
}) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [f, setF] = useState<Filter>("");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ov.users.filter((u) => {
      if (role && u.role !== role) return false;
      if (f === "online" && u.conn === "offline") return false;
      if (f === "aktif" && !u.active) return false;
      if (f === "nonaktif" && u.active) return false;
      if (f === "lama" && !u.dormant) return false;
      return !needle || [u.name, u.email, u.storeName].some((x) => x.toLowerCase().includes(needle));
    });
  }, [ov.users, q, role, f]);

  function toggle(id: string) {
    const n = new Set(sel);
    if (n.has(id)) n.delete(id);
    else if (n.size >= MAX_TO) return onNote(`Maksimal ${MAX_TO} penerima sekali kirim.`);
    else n.add(id);
    setSel(n);
  }
  const allOn = shown.length > 0 && shown.slice(0, MAX_TO).every((u) => sel.has(u.id));
  function toggleAll() {
    if (allOn) { const n = new Set(sel); shown.forEach((u) => n.delete(u.id)); return setSel(n); }
    const n = new Set(sel);
    for (const u of shown) { if (n.size >= MAX_TO) { onNote(`Hanya ${MAX_TO} penerima pertama yang dipilih.`); break; } n.add(u.id); }
    setSel(n);
  }

  return (
    <section className="card space-y-4 p-5" aria-label="Daftar pengguna">
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" aria-label="Cari pengguna" placeholder="Cari nama, email, atau toko" className="input max-w-xs flex-1" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter peran" className="input w-auto" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Semua peran</option>
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Chip active={f === ""} onClick={() => setF("")}>Semua</Chip>
        <Chip active={f === "online"} onClick={() => setF(f === "online" ? "" : "online")}>Online</Chip>
        <Chip active={f === "aktif"} onClick={() => setF(f === "aktif" ? "" : "aktif")}>Aktif</Chip>
        <Chip active={f === "nonaktif"} onClick={() => setF(f === "nonaktif" ? "" : "nonaktif")}>Nonaktif</Chip>
        <Chip active={f === "lama"} onClick={() => setF(f === "lama" ? "" : "lama")}>Lama tidak aktif ({ov.dormantDays}+ hari)</Chip>
      </div>

      {sel.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper px-4 py-2 text-sm">
          <span><b>{sel.size}</b> pengguna dipilih</span>
          <button className="btn-primary" onClick={() => onEmail([...sel])}>Kirim email ke yang dipilih</button>
          <button className="btn-ghost" onClick={() => setSel(new Set())}>Batalkan pilihan</button>
        </div>
      )}

      <div className="-mx-5 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th pl-5"><input type="checkbox" aria-label="Pilih semua yang tampil" checked={allOn} onChange={toggleAll} /></th>
              <th className="th">Pengguna</th><th className="th">Peran</th><th className="th">Toko / cabang</th>
              <th className="th">Akun</th><th className="th">Koneksi</th><th className="th">Terakhir aktif</th><th className="th pr-5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((u) => {
              const self = u.id === me.session.uid;
              const locked = self || u.role === "developer";
              const busy = busyId === u.id;
              return (
                <tr key={u.id} className={u.active ? "" : "opacity-70"}>
                  <td className="td pl-5"><input type="checkbox" aria-label={`Pilih ${u.name}`} checked={sel.has(u.id)} onChange={() => toggle(u.id)} /></td>
                  <td className="td"><div className="flex items-center gap-2.5"><Avatar name={u.name} size={32} />
                    <div className="min-w-0"><div className="font-semibold">{u.name}{self && <span className="ml-1.5 text-xs font-medium text-muted">(Anda)</span>}</div><div className="truncate text-xs text-muted">{u.email}</div></div></div></td>
                  <td className="td">{ROLE_LABEL[u.role] ?? u.role}</td>
                  <td className="td">{u.storeName ? <><div>{u.storeName}</div><div className="text-xs text-muted">{u.branchName || "-"}</div></> : <span className="text-muted">-</span>}</td>
                  <td className="td"><div className="flex flex-col items-start gap-1">
                    <Badge tone={u.active ? "ok" : "bad"}>{u.active ? "Aktif" : "Nonaktif"}</Badge>
                    {!u.storeActive && <Badge tone="bad">Toko nonaktif</Badge>}</div></td>
                  <td className="td">{u.conn === "online" ? <Badge tone="ok" dot>Online</Badge> : u.conn === "session" ? <Badge tone="ok" dot>Sesi login</Badge> : <Badge tone="off">Offline</Badge>}</td>
                  <td className="td"><div>{ago(u.lastActive, ov.now)}</div>
                    <div className="text-xs text-muted">{u.lastActive ? tgl(u.lastActive) : "Belum pernah masuk"}</div>
                    {u.dormant && u.active && <div className="text-xs font-medium text-danger">Lama tidak aktif</div>}</td>
                  <td className="td pr-5"><div className="flex flex-wrap justify-end gap-1.5">
                    <button className="btn-ghost" onClick={() => onEmail([u.id])}>Email</button>
                    {!locked && (u.active
                      ? <button className="btn-ghost" disabled={busy} onClick={() => confirm(`Nonaktifkan ${u.name}? Ia langsung keluar dari semua perangkat dan tidak bisa masuk sampai diaktifkan lagi.`) && onAct(u, { action: "active", active: false }, `${u.name} dinonaktifkan.`)}>Nonaktifkan</button>
                      : <button className="btn-ghost" disabled={busy} onClick={() => onAct(u, { action: "active", active: true }, `${u.name} diaktifkan.`)}>Aktifkan</button>)}
                    {!locked && u.conn !== "offline" && <button className="btn-ghost" disabled={busy} onClick={() => confirm(`Keluarkan ${u.name} dari semua perangkat?`) && onAct(u, { action: "kick" }, `${u.name} dikeluarkan dari semua perangkat.`)}>Keluarkan</button>}
                    {!locked && <button className="btn-ghost text-danger" disabled={busy} onClick={() => onDelete(u)}>Hapus</button>}
                  </div></td>
                </tr>
              );
            })}
            {!shown.length && <tr><td className="td pl-5 text-muted" colSpan={8}>Tidak ada pengguna yang cocok.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- Tab Toko ---------- */

function StoresTab({ ov, onToggle, onDelete, onEmail }: {
  ov: Overview; onToggle: (s: DevStore) => void; onDelete: (s: DevStore) => void; onEmail: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const shown = ov.stores.filter((s) => !q.trim() || [s.name, s.ownerEmail, s.ownerName].some((x) => x.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <section className="card space-y-4 p-5" aria-label="Daftar toko">
      <input type="search" aria-label="Cari toko" placeholder="Cari nama toko atau pemilik" className="input max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="th pl-5">Toko</th><th className="th">Pemilik</th><th className="th">Cabang</th><th className="th">Akun</th><th className="th">Status</th><th className="th">Terakhir aktif</th><th className="th pr-5 text-right">Aksi</th></tr></thead>
          <tbody className="divide-y divide-line">
            {shown.map((s) => (
              <tr key={s.id}>
                <td className="td pl-5"><div className="font-semibold">{s.name}</div><div className="text-xs text-muted">{BIZ[s.businessType] ?? "Retail"}</div></td>
                <td className="td">{s.ownerEmail ? <><div>{s.ownerName}</div><div className="text-xs text-muted">{s.ownerEmail}</div></> : <span className="text-muted">Tanpa pemilik</span>}</td>
                <td className="td">{s.branches}</td><td className="td">{s.users}</td>
                <td className="td"><Badge tone={s.active ? "ok" : "bad"}>{s.active ? "Aktif" : "Nonaktif"}</Badge></td>
                <td className="td"><div>{ago(s.lastActive, ov.now)}</div>{s.lastActive && <div className="text-xs text-muted">{tgl(s.lastActive)}</div>}</td>
                <td className="td pr-5"><div className="flex flex-wrap justify-end gap-1.5">
                  {s.ownerId && <button className="btn-ghost" onClick={() => onEmail([s.ownerId])}>Email pemilik</button>}
                  <button className="btn-ghost" onClick={() => onToggle(s)}>{s.active ? "Nonaktifkan" : "Aktifkan"}</button>
                  <button className="btn-ghost text-danger" onClick={() => onDelete(s)}>Hapus toko</button>
                </div></td>
              </tr>
            ))}
            {!shown.length && <tr><td className="td pl-5 text-muted" colSpan={7}>Belum ada toko yang cocok.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- Tab Email ---------- */

type SendResult = { sent: number; failed: number; results: { id: string; email: string; ok: boolean; error?: string }[] };

function EmailTab({ ov, sel, setSel, onNote }: { ov: Overview; sel: Set<string>; setSel: (s: Set<string>) => void; onNote: (m: string) => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<SendResult | null>(null);
  const recips = ov.users.filter((u) => sel.has(u.id));
  const addable = ov.users.filter((u) => !sel.has(u.id));
  const owners = ov.users.filter((u) => u.role === "kepala_toko");

  function add(ids: string[]) {
    const n = new Set(sel);
    for (const id of ids) { if (n.size >= MAX_TO) { onNote(`Maksimal ${MAX_TO} penerima sekali kirim.`); break; } n.add(id); }
    setSel(n);
  }
  function drop(id: string) { const n = new Set(sel); n.delete(id); setSel(n); }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (recips.length > 1 && !confirm(`Kirim email ini ke ${recips.length} penerima?`)) return;
    setBusy(true); setErr(""); setRes(null);
    try {
      const r = await api<SendResult>("/api/dev/email", { method: "POST", body: { ids: recips.map((u) => u.id), subject, message } });
      setRes(r);
      onNote(r.failed ? `Terkirim ${r.sent}, gagal ${r.failed}.` : `Email terkirim ke ${r.sent} penerima.`);
      if (!r.failed) { setSubject(""); setMessage(""); }
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }

  return (
    <section className="card space-y-4 p-5" aria-label="Kirim email">
      {!ov.emailReady && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm" role="alert">
          EmailJS khusus developer belum dikonfigurasi. Isi <code>EMAILJS_DEV_TEMPLATE</code> (dan, bila memakai akun EmailJS terpisah, <code>EMAILJS_DEV_SERVICE_ID</code>, <code>EMAILJS_DEV_PUBLIC_KEY</code>, <code>EMAILJS_DEV_PRIVATE_KEY</code>) di <code>.env.local</code>, lalu mulai ulang server.
        </p>
      )}
      <form onSubmit={send} className="space-y-4">
        <div>
          <div className="label">Penerima ({recips.length}/{MAX_TO})</div>
          <ul className="flex flex-wrap gap-2">
            {recips.map((u) => (
              <li key={u.id} className="flex items-center gap-1.5 rounded-full border border-line bg-paper py-1 pl-3 pr-1.5 text-sm">
                <span>{u.name} <span className="text-muted">&lt;{u.email}&gt;</span></span>
                <button type="button" aria-label={`Hapus ${u.name} dari penerima`} className="rounded-full px-1.5 text-muted hover:text-danger" onClick={() => drop(u.id)}>✕</button>
              </li>
            ))}
            {!recips.length && <li className="text-sm text-muted">Belum ada penerima. Tambahkan di bawah, atau centang pengguna di tab Pengguna.</li>}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select aria-label="Tambah penerima" className="input max-w-xs" value="" onChange={(e) => e.target.value && add([e.target.value])}>
              <option value="">+ Tambah penerima…</option>
              {addable.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
            <button type="button" className="btn-ghost" onClick={() => add(owners.map((u) => u.id))} disabled={!owners.length}>Tambah semua kepala toko ({owners.length})</button>
            {recips.length > 0 && <button type="button" className="btn-ghost" onClick={() => setSel(new Set())}>Kosongkan</button>}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="em-sub">Subjek</label>
          <input id="em-sub" className="input" maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="em-msg">Isi pesan (teks biasa)</label>
          <textarea id="em-msg" className="input min-h-[10rem]" maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} required />
          <div className="mt-1 text-right text-xs text-muted">{message.length}/5000</div>
        </div>
        {err && <p className="text-sm font-medium text-danger" role="alert">{err}</p>}
        <button className="btn-primary" disabled={busy || !ov.emailReady || !recips.length || !subject.trim() || !message.trim()}>{busy ? "Mengirim…" : `Kirim ke ${recips.length || ""} penerima`}</button>
      </form>

      {res && (
        <div className="space-y-1 border-t border-line pt-4 text-sm" aria-live="polite">
          <div className="font-semibold">Hasil: {res.sent} terkirim, {res.failed} gagal</div>
          <ul className="space-y-0.5">
            {res.results.map((r) => <li key={r.id} className={r.ok ? "text-muted" : "text-danger"}>{r.ok ? "✓" : "✕"} {r.email || r.id}{r.error ? `: ${r.error}` : ""}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ---------- Tab Trafik ---------- */

function TrafficTab({ onNote }: { onNote: (m: string) => void }) {
  const [days, setDays] = useState(7);
  const [keep, setKeep] = useState(90);
  const [d, setD] = useState<TrafficData | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async (fresh = false) => {
    setBusy("load");
    try { setD(await api<TrafficData>(`/api/dev/traffic?days=${days}${fresh ? "&fresh=1" : ""}`)); setErr(""); }
    catch (x) { setErr((x as Error).message); }
    setBusy("");
  }, [days]);
  useEffect(() => { load(); }, [load]);

  async function flush() {
    setBusy("flush");
    try { await api("/api/dev/traffic", { method: "POST", body: { action: "flush" } }); onNote("Kunjungan dikirim ke Google Sheets."); await load(true); }
    catch (x) { setErr((x as Error).message); setBusy(""); }
  }
  async function purge() {
    if (!confirm(`Hapus log kunjungan yang lebih lama dari ${keep} hari dari Google Sheets? Tidak bisa dibatalkan.`)) return;
    setBusy("purge");
    try { const r = await api<{ deleted: number }>(`/api/dev/traffic?olderThanDays=${keep}`, { method: "DELETE" }); onNote(`${nf(r.deleted)} baris log lama dihapus.`); await load(true); }
    catch (x) { setErr((x as Error).message); setBusy(""); }
  }

  const max = Math.max(1, ...(d?.perDay.map((x) => x.views) ?? [1]));
  const devTotal = d ? d.devices.desktop + d.devices.mobile + d.devices.tablet : 0;

  return (
    <div className="space-y-4">
      <section className="card flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm font-medium">Rentang:</span>
        {[7, 14, 30].map((n) => <Chip key={n} active={days === n} onClick={() => setDays(n)}>{n} hari</Chip>)}
        <button className="btn-ghost ml-auto" disabled={busy !== ""} onClick={() => load(true)}>{busy === "load" ? "Memuat…" : "Muat ulang dari Sheets"}</button>
      </section>
      {err && <p className="text-sm font-medium text-danger" role="alert">{err}</p>}
      {!d && !err && <p className="text-sm text-muted">Memuat…</p>}

      {d && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Kunjungan halaman" value={nf(d.views)} sub={`${d.days} hari terakhir`} />
            <Kpi label="Pengunjung unik" value={nf(d.visitors)} sub="per perangkat/browser" />
            <Kpi label="Halaman terpopuler" value={d.pages[0]?.path ?? "-"} sub={d.pages[0] ? `${nf(d.pages[0].views)} kunjungan` : "Belum ada data"} />
            <Kpi label="Menunggu dikirim ke Sheets" value={nf(d.pending)} sub="masih di memori server" tone={d.pending > 100 ? "warn" : undefined} />
          </div>

          <section className="card space-y-3 p-5">
            <h2 className="text-lg font-bold">Kunjungan per hari</h2>
            <div className="flex h-40 items-end gap-1" role="img" aria-label={`Grafik kunjungan per hari selama ${d.days} hari terakhir, total ${d.views} kunjungan`}>
              {d.perDay.map((x) => (
                <div key={x.day} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${shortDay(x.day)}: ${x.views} kunjungan, ${x.visitors} pengunjung`}>
                  <div className="w-full rounded-t bg-accent/80" style={{ height: `${(x.views / max) * 100}%`, minHeight: x.views ? 2 : 0 }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted"><span>{shortDay(d.perDay[0].day)}</span><span>{shortDay(d.perDay[d.perDay.length - 1].day)}</span></div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card space-y-2 p-5">
              <h2 className="text-lg font-bold">Halaman terpopuler</h2>
              <table className="w-full"><thead><tr><th className="th pl-0">Halaman</th><th className="th text-right">Kunjungan</th><th className="th pr-0 text-right">Unik</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {d.pages.map((p) => <tr key={p.path}><td className="td pl-0 font-mono text-xs">{p.path}</td><td className="td text-right">{nf(p.views)}</td><td className="td pr-0 text-right">{nf(p.visitors)}</td></tr>)}
                  {!d.pages.length && <tr><td className="td pl-0 text-muted" colSpan={3}>Belum ada kunjungan tercatat pada rentang ini.</td></tr>}
                </tbody></table>
            </section>
            <div className="space-y-4">
              <section className="card space-y-2 p-5">
                <h2 className="text-lg font-bold">Asal pengunjung</h2>
                <ul className="divide-y divide-line text-sm">
                  {d.referrers.map((r) => <li key={r.name} className="flex justify-between gap-3 py-1.5"><span className="truncate">{r.name}</span><span className="font-semibold">{nf(r.views)}</span></li>)}
                  {!d.referrers.length && <li className="py-1.5 text-muted">Belum ada data.</li>}
                </ul>
              </section>
              <section className="card space-y-2 p-5">
                <h2 className="text-lg font-bold">Perangkat</h2>
                {(["desktop", "mobile", "tablet"] as const).map((k) => (
                  <div key={k} className="text-sm">
                    <div className="flex justify-between"><span className="capitalize">{k}</span><span>{nf(d.devices[k])} ({devTotal ? Math.round((d.devices[k] / devTotal) * 100) : 0}%)</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-line"><div className="h-full bg-accent" style={{ width: `${devTotal ? (d.devices[k] / devTotal) * 100 : 0}%` }} /></div>
                  </div>
                ))}
              </section>
            </div>
          </div>

          <section className="card space-y-3 p-5">
            <h2 className="text-lg font-bold">Sinkronisasi dengan Google Sheets</h2>
            <ul className="space-y-1 text-sm text-muted">
              <li><b className="text-ink">Website → Sheets:</b> tiap kunjungan ditampung lalu ditulis ke tab <code>traffic</code> tiap 30 detik (atau tiap 25 kunjungan). Saat ini menunggu: <b className="text-ink">{nf(d.pending)}</b>.</li>
              <li><b className="text-ink">Sheets → dashboard:</b> grafik di atas dibaca dari tab <code>traffic</code> ({nf(d.rowsInSheet)} baris{d.lastHitAt ? `, kunjungan terakhir ${tgl(d.lastHitAt)}` : ""}). Baris yang ditambah atau diubah langsung di Sheets ikut tampil setelah Muat ulang.</li>
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn-primary" disabled={busy !== "" || d.pending === 0} onClick={flush}>{busy === "flush" ? "Mengirim…" : "Kirim ke Sheets sekarang"}</button>
              {d.sheetUrl && <a className="btn-ghost" href={d.sheetUrl} target="_blank" rel="noopener noreferrer">Buka Google Sheets ↗</a>}
              <span className="ml-auto flex items-center gap-2">
                <label htmlFor="keep" className="text-sm text-muted">Hapus log lebih lama dari</label>
                <select id="keep" className="input w-auto" value={keep} onChange={(e) => setKeep(Number(e.target.value))}>
                  {[30, 90, 180, 365].map((n) => <option key={n} value={n}>{n} hari</option>)}
                </select>
                <button className="btn-ghost text-danger" disabled={busy !== ""} onClick={purge}>{busy === "purge" ? "Menghapus…" : "Bersihkan"}</button>
              </span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/* ---------- Halaman ---------- */

type Tab = "pengguna" | "toko" | "email" | "trafik";
const TABS: [Tab, string][] = [["pengguna", "Pengguna"], ["toko", "Toko"], ["email", "Email"], ["trafik", "Trafik"]];

function DevPanel({ me }: { me: Me }) {
  const [tab, setTab] = useState<Tab>("pengguna");
  const [ov, setOv] = useState<Overview | null>(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState("");
  const [del, setDel] = useState<{ user?: DevUser; store?: { id: string; name: string } } | null>(null);

  const load = useCallback(async () => {
    try { setOv(await api<Overview>("/api/dev/overview")); setErr(""); }
    catch (x) { setErr((x as Error).message); }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 30_000);
    return () => clearInterval(t);
  }, [load]);

  async function act(u: DevUser, body: Record<string, unknown>, msg: string) {
    setBusyId(u.id);
    try { await api("/api/dev/users", { method: "PATCH", body: { id: u.id, ...body } }); setNote(msg); await load(); }
    catch (x) { setErr((x as Error).message); }
    setBusyId("");
  }
  async function toggleStore(s: DevStore) {
    if (s.active && !confirm(`Nonaktifkan toko "${s.name}"? Semua akun di toko ini tidak bisa masuk sampai diaktifkan lagi.`)) return;
    try { await api("/api/stores", { method: "PATCH", body: { id: s.id, active: !s.active } }); setNote(`Toko "${s.name}" ${s.active ? "dinonaktifkan" : "diaktifkan"}.`); await load(); }
    catch (x) { setErr((x as Error).message); }
  }
  const emailTo = (ids: string[]) => { setSel(new Set(ids.slice(0, MAX_TO))); setTab("email"); };

  const s = ov?.summary;
  return (
    <div className="space-y-6">
      <Toast msg={note} onClose={() => setNote("")} />
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Panel developer</h1>
        <p className="mt-1 text-muted">Pantau pengguna dan toko, kirim email, kelola akun, dan lihat trafik website. Hanya akun developer yang bisa membuka halaman ini.</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5" aria-live="polite">
        <Kpi label="Pengguna" value={s ? nf(s.users) : "…"} sub={s ? `${nf(s.active)} aktif` : undefined} />
        <Kpi label="Online sekarang" value={s ? nf(s.online) : "…"} />
        <Kpi label="Akun nonaktif" value={s ? nf(s.disabled) : "…"} tone={s && s.disabled ? "warn" : undefined} />
        <Kpi label={`Tidak aktif ${ov?.dormantDays ?? 30}+ hari`} value={s ? nf(s.dormant) : "…"} />
        <Kpi label="Toko aktif" value={s ? nf(s.storesActive) : "…"} sub={s ? `dari ${nf(s.stores)} toko` : undefined} />
      </div>
      {err && <p className="text-sm font-medium text-danger" role="alert">{err}</p>}

      <div role="tablist" aria-label="Bagian panel developer" className="flex flex-wrap gap-2 border-b border-line pb-3">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls="dev-panel" onClick={() => setTab(k)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === k ? "bg-accent text-white" : "hover:bg-paper"}`}>
            {label}{k === "email" && sel.size > 0 ? ` (${sel.size})` : ""}
          </button>
        ))}
        <button className="btn-ghost ml-auto" onClick={load}>Muat ulang</button>
      </div>

      <div id="dev-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {!ov && !err && tab !== "trafik" && <p className="text-sm text-muted">Memuat…</p>}
        {ov && tab === "pengguna" && <UsersTab me={me} ov={ov} sel={sel} setSel={setSel} busyId={busyId} onAct={act} onEmail={emailTo} onNote={setNote}
          onDelete={(u) => setDel({ user: u, store: u.role === "kepala_toko" && u.storeId && u.storeName ? { id: u.storeId, name: u.storeName } : undefined })} />}
        {ov && tab === "toko" && <StoresTab ov={ov} onToggle={toggleStore} onEmail={emailTo} onDelete={(st) => setDel({ store: { id: st.id, name: st.name } })} />}
        {ov && tab === "email" && <EmailTab ov={ov} sel={sel} setSel={setSel} onNote={setNote} />}
        {tab === "trafik" && <TrafficTab onNote={setNote} />}
      </div>

      {del && <DeleteDialog user={del.user} store={del.store} onClose={() => setDel(null)}
        onDone={(m) => { setDel(null); setNote(m); setSel(new Set()); load(); }} />}
    </div>
  );
}

export default function Developer() {
  return <Shell>{(me: Me) => me.session.role === "developer"
    ? <DevPanel me={me} />
    : <p className="text-sm text-muted">Halaman ini hanya untuk developer.</p>}</Shell>;
}
