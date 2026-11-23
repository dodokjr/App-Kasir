"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import OtpInput from "@/components/OtpInput";
import PasswordInput from "@/components/PasswordInput";

/** Ganti PIN sendiri (Pengaturan). Berlaku untuk semua peran */
export default function PinChangeSection() {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [cur, setCur] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<{ hasPin: boolean }>("/api/auth/pin/change").then((r) => setHasPin(r.hasPin)).catch(() => setHasPin(true)); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(""); setMsg("");
    if (hasPin ? cur.length !== 6 : !cur) return setErr(hasPin ? "Masukkan PIN lama (6 digit)." : "Masukkan password Anda.");
    if (pin.length !== 6) return setErr("PIN baru harus 6 digit angka.");
    if (pin !== confirm) return setErr("Konfirmasi PIN tidak sama.");
    setBusy(true);
    try {
      await api("/api/auth/pin/change", { method: "POST", body: { current: cur, pin, confirm } });
      setMsg("PIN berhasil diganti. Pakai PIN baru saat masuk berikutnya.");
      setHasPin(true); setCur(""); setPin(""); setConfirm("");
    } catch (x) { setErr((x as Error).message); setCur(""); }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="card space-y-4">
      <div>
        <h2 className="font-semibold">Keamanan: PIN</h2>
        <p className="text-sm text-muted">PIN 6 digit dipakai setiap kali masuk, setelah password. Jangan bagikan ke siapa pun. {hasPin === false && "Akun Anda belum punya PIN. Buat sekarang."}</p>
      </div>
      <div className="max-w-sm space-y-4">
        <div>
          <label className="label" htmlFor={hasPin === false ? "pc-pw" : undefined}>{hasPin === false ? "Password Anda" : "PIN lama"}</label>
          {hasPin === false
            ? <PasswordInput id="pc-pw" autoComplete="current-password" value={cur} disabled={busy} onChange={setCur} />
            : <OtpInput label="PIN lama" value={cur} onChange={setCur} mask disabled={busy} />}
        </div>
        <div><label className="label">PIN baru</label><OtpInput label="PIN baru" value={pin} onChange={setPin} mask disabled={busy} /></div>
        <div><label className="label">Ulangi PIN baru</label><OtpInput label="Ulangi PIN baru" value={confirm} onChange={setConfirm} mask disabled={busy} /></div>
      </div>
      {err && <p className="text-sm font-medium text-danger" role="alert">{err}</p>}
      {msg && <p className="text-sm font-medium" role="status">{msg}</p>}
      <button className="btn-primary" disabled={busy || hasPin === null}>{busy ? "Menyimpan…" : hasPin === false ? "Buat PIN" : "Ganti PIN"}</button>
    </form>
  );
}
