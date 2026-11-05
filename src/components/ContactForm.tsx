"use client";
import { useState } from "react";
import { api } from "@/lib/client";

// Pilihan topik mengisi subjek otomatis, jadi pengirim tidak perlu memikirkan judul pesan
const TOPICS = ["Kendala di aplikasi", "Pertanyaan sebelum daftar", "Hapus akun atau data", "Lainnya"];
const MAX = 2000;

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
      <div className="rounded-3xl border border-line bg-surface p-8 text-center" role="status">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
        </span>
        <h2 className="mt-5 text-2xl font-bold">Pesan terkirim</h2>
        <p className="mx-auto mt-2 max-w-[36ch] text-base leading-7 text-muted">Kami akan membalas lewat email yang Anda isi. Cek juga folder spam.</p>
        <button className="btn-ghost btn-lg mt-6" onClick={() => setState("idle")}>Kirim pesan lain</button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-5 rounded-3xl border border-line bg-surface p-6 sm:p-8">
      <fieldset>
        <legend className="field-label">Tentang apa pesan Anda?</legend>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button key={t} type="button" aria-pressed={f.subject === t} onClick={() => setF({ ...f, subject: t })}
              className={`rounded-full border px-4 py-2 text-[15px] font-semibold transition ${f.subject === t ? "border-accent bg-accent text-white" : "border-line hover:border-accent"}`}>{t}</button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <div><label className="field-label" htmlFor="c-name">Nama Anda</label><input id="c-name" required maxLength={100} autoComplete="name" className="field" value={f.name} onChange={set("name")} /></div>
        <div><label className="field-label" htmlFor="c-email">Email untuk balasan</label><input id="c-email" type="email" required maxLength={150} autoComplete="email" className="field" value={f.email} onChange={set("email")} /></div>
      </div>
      <div><label className="field-label" htmlFor="c-subject">Judul pesan</label><input id="c-subject" required maxLength={150} className="field" value={f.subject} onChange={set("subject")} /></div>
      <div>
        <label className="field-label" htmlFor="c-msg">Pesan</label>
        <textarea id="c-msg" required rows={6} maxLength={MAX} className="field" aria-describedby="c-count" value={f.message} onChange={set("message")} />
        <p id="c-count" className="mt-1.5 text-right text-sm text-muted">{f.message.length} dari {MAX} huruf</p>
      </div>
      {/* Kolom jebakan untuk bot, disembunyikan dari pengguna */}
      <div className="hidden" aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} /></div>
      {err && <p className="rounded-xl bg-danger/10 px-4 py-3 text-base font-medium text-danger" role="alert">{err}</p>}
      <button className="btn-primary btn-lg w-full sm:w-auto" disabled={state === "busy"}>{state === "busy" ? "Mengirim…" : "Kirim pesan"}</button>
    </form>
  );
}