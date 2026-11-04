"use client";
import { useState } from "react";
import { api } from "@/lib/client";

export default function ContactForm() {
  const empty = { name: "", email: "", subject: "", message: "", website: "" };
  const [f, setF] = useState(empty);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setState("busy"); setErr("");
    try { await api("/api/contact", { method: "POST", body: f }); setF(empty); setState("done"); }
    catch (x) { setErr((x as Error).message); setState("idle"); }
  }

  if (state === "done") {
    return (
      <div className="card" role="status">
        <p className="font-medium">Pesan terkirim.</p>
        <p className="mt-1 text-sm text-muted">Kami akan membalas lewat email yang Anda isi.</p>
        <button className="btn-ghost mt-4" onClick={() => setState("idle")}>Kirim pesan lain</button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="c-name">Nama</label><input id="c-name" required maxLength={100} className="input" value={f.name} onChange={set("name")} /></div>
        <div><label className="label" htmlFor="c-email">Email</label><input id="c-email" type="email" required maxLength={150} className="input" value={f.email} onChange={set("email")} /></div>
      </div>
      <div><label className="label" htmlFor="c-subject">Subjek</label><input id="c-subject" required maxLength={150} className="input" value={f.subject} onChange={set("subject")} /></div>
      <div><label className="label" htmlFor="c-msg">Pesan</label><textarea id="c-msg" required rows={6} maxLength={2000} className="input" value={f.message} onChange={set("message")} /></div>
      {/* Kolom jebakan untuk bot, disembunyikan dari pengguna */}
      <div className="hidden" aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} /></div>
      {err && <p className="text-sm text-danger" role="alert">{err}</p>}
      <button className="btn-primary" disabled={state === "busy"}>{state === "busy" ? "Mengirim…" : "Kirim pesan"}</button>
    </form>
  );
}
