"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import PasswordInput from "@/components/PasswordInput";
import { StrengthMeter } from "@/components/AuthBits";
import { SITE } from "@/lib/site";

/** Pengaturan akun: nomor telepon, ganti password, dan jalan pintas ke Panduan, Keamanan, serta Kontak */
export function PhoneSection() {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ phone: string; email: string }>("/api/auth/profile").then((r) => { setPhone(r.phone); setEmail(r.email); }).catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(""); setMsg(""); setBusy(true);
    try {
      const r = await api<{ phone: string }>("/api/auth/profile", { method: "PATCH", body: { phone } });
      setPhone(r.phone);
      setMsg(r.phone ? "Nomor telepon tersimpan." : "Nomor telepon dihapus.");
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="card space-y-4">
      <div>
        <h2 className="font-semibold">Akun saya</h2>
        <p className="text-sm text-muted">Nomor telepon bersifat opsional dan hanya dilihat oleh pengelola layanan.</p>
      </div>
      <div className="max-w-sm space-y-4">
        <div><label className="label" htmlFor="ac-email">Email</label><input id="ac-email" className="input" value={email} readOnly disabled /></div>
        <div>
          <label className="label" htmlFor="ac-phone">Nomor telepon / WhatsApp</label>
          <input id="ac-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="+6281234567890" className="input"
            value={phone} disabled={busy} onChange={(e) => { setPhone(e.target.value); setMsg(""); setErr(""); }} />
        </div>
      </div>
      {err && <p className="text-sm font-medium text-danger" role="alert">{err}</p>}
      {msg && <p className="text-sm font-medium" role="status">{msg}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? "Menyimpan…" : "Simpan nomor"}</button>
    </form>
  );
}

export function PasswordChangeSection() {
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(""); setMsg("");
    if (!cur) return setErr("Masukkan password Anda saat ini.");
    if (pw.length < 8) return setErr("Password baru minimal 8 karakter.");
    if (pw !== pw2) return setErr("Konfirmasi password tidak sama.");
    setBusy(true);
    try {
      await api("/api/auth/password/change", { method: "POST", body: { current: cur, password: pw, confirm: pw2 } });
      setMsg("Password berhasil diganti. Pakai password baru saat masuk berikutnya.");
      setCur(""); setPw(""); setPw2("");
    } catch (x) { setErr((x as Error).message); setCur(""); }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="card space-y-4">
      <div>
        <h2 className="font-semibold">Keamanan: password</h2>
        <p className="text-sm text-muted">Lupa password saat ini? Keluar dulu, lalu pilih &quot;Lupa password?&quot; di halaman masuk.</p>
      </div>
      <div className="max-w-sm space-y-4">
        <div><label className="label" htmlFor="pwc-cur">Password saat ini</label><PasswordInput id="pwc-cur" autoComplete="current-password" value={cur} disabled={busy} onChange={setCur} /></div>
        <div><label className="label" htmlFor="pwc-new">Password baru</label><PasswordInput id="pwc-new" autoComplete="new-password" minLength={8} value={pw} disabled={busy} onChange={setPw} /><StrengthMeter password={pw} /></div>
        <div><label className="label" htmlFor="pwc-new2">Ulangi password baru</label><PasswordInput id="pwc-new2" autoComplete="new-password" minLength={8} value={pw2} disabled={busy} onChange={setPw2} /></div>
      </div>
      {err && <p className="text-sm font-medium text-danger" role="alert">{err}</p>}
      {msg && <p className="text-sm font-medium" role="status">{msg}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? "Menyimpan…" : "Ganti password"}</button>
    </form>
  );
}

export function HelpSection() {
  const tel = SITE.phone.replace(/[^\d+]/g, "");
  return (
    <section className="card space-y-3">
      <h2 className="font-semibold">Bantuan dan keamanan</h2>
      <ul className="space-y-2 text-sm">
        <li><Link className="font-medium text-link underline underline-offset-2" href="/docs">Panduan (docs)</Link><span className="text-muted"> — cara memakai semua fitur</span></li>
        <li><Link className="font-medium text-link underline underline-offset-2" href="/docs/keamanan">Keamanan akun</Link><span className="text-muted"> — password, PIN, dan aturan satu akun satu perangkat</span></li>
        <li><Link className="font-medium text-link underline underline-offset-2" href="/kontak">Hubungi kami</Link><span className="text-muted"> — kirim pesan ke pengelola</span></li>
        <li>
          Email <a className="font-medium text-link underline underline-offset-2" href={`mailto:${SITE.email}`}>{SITE.email}</a>
          {SITE.phone && <> · Telepon / WhatsApp <a className="font-medium text-link underline underline-offset-2" href={`tel:${tel}`}>{SITE.phone}</a></>}
        </li>
      </ul>
    </section>
  );
}