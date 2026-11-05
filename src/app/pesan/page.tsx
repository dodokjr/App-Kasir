"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api, tgl } from "@/lib/client";
import type { Me } from "@/lib/types";

type M = { id: string; name: string; email: string; subject: string; message: string; createdAt: string; readAt: string; readBy: string };

// Pesan yang diawali ' dilindungi dari formula spreadsheet saat disimpan; tampilkan tanpa tanda itu
const clean = (v: string) => v.replace(/^'(?=[=+\-@])/, "");

function Inbox() {
  const [rows, setRows] = useState<M[]>([]);
  const [unread, setUnread] = useState(0);
  const [only, setOnly] = useState(false);
  const [open, setOpen] = useState("");
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try { const r = await api<{ unread: number; rows: M[] }>("/api/messages"); setRows(r.rows); setUnread(r.unread); setErr(""); }
    catch (x) { setErr((x as Error).message); }
    setReady(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function mark(m: M, read: boolean) {
    try { await api("/api/messages", { method: "PATCH", body: { id: m.id, read } }); await load(); }
    catch (x) { setErr((x as Error).message); }
  }
  function toggle(m: M) {
    const next = open === m.id ? "" : m.id;
    setOpen(next);
    if (next && !m.readAt) mark(m, true);
  }

  const shown = rows.filter((m) => !only || !m.readAt);
  return (
    <div className="space-y-4">
      <section className="card flex flex-wrap items-center gap-3">
        <div className="text-sm"><span className="font-semibold">{rows.length}</span> pesan, <span className="font-semibold">{unread}</span> belum dibaca</div>
        <label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} />Hanya yang belum dibaca</label>
        <button className="btn-ghost" onClick={load}>Muat ulang</button>
      </section>
      {err && <p className="text-sm text-danger" role="alert">{err}</p>}
      {!ready && <p className="text-sm text-muted">Memuat…</p>}
      {ready && !shown.length && !err && <p className="card text-sm text-muted">{only ? "Tidak ada pesan yang belum dibaca." : "Belum ada pesan dari halaman Kontak."}</p>}

      <ul className="space-y-2">
        {shown.map((m) => {
          const isOpen = open === m.id;
          return (
            <li key={m.id} className="card p-0">
              <button className="flex w-full items-start gap-3 p-4 text-left" aria-expanded={isOpen} onClick={() => toggle(m)}>
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${m.readAt ? "bg-transparent" : "bg-accent"}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${m.readAt ? "" : "font-semibold"}`}>{clean(m.subject)}{!m.readAt && <span className="ml-2 text-xs font-medium text-link">Baru</span>}</span>
                  <span className="block truncate text-sm text-muted">{clean(m.name)} · {m.email}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">{tgl(m.createdAt)}</span>
              </button>
              {isOpen && (
                <div className="space-y-3 border-t border-line p-4 text-sm">
                  <p className="whitespace-pre-wrap break-words">{clean(m.message)}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <a className="btn-primary" href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + clean(m.subject))}`}>Balas lewat email</a>
                    <button className="btn-ghost" onClick={() => mark(m, !m.readAt)}>{m.readAt ? "Tandai belum dibaca" : "Tandai sudah dibaca"}</button>
                    {m.readAt && <span className="text-xs text-muted">Dibaca {m.readBy ? `oleh ${m.readBy}, ` : ""}{tgl(m.readAt)}</span>}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Pesan() {
  return <Shell>{(me: Me) => (me.session.role === "developer" || me.session.role === "admin")
    ? <Inbox />
    : <p className="text-sm text-muted">Halaman pesan hanya untuk developer dan admin.</p>}</Shell>;
}