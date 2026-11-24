"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import OtpInput from "@/components/OtpInput";
import { SubmitButton } from "@/components/AuthBits";

// Sama dengan aturan server (lib/authflow.ts weakPin): angka kembar atau berurutan mudah ditebak
const SEQ = ["012345", "123456", "234567", "345678", "456789", "543210", "654321", "765432", "876543", "987654"];
const weak = (p: string) => /^(\d)\1{5}$/.test(p) || SEQ.includes(p);

const Note = ({ tone, children }: { tone: "ok" | "bad" | "warn"; children: React.ReactNode }) => (
  <p
    role="status"
    className={`auth-rise mt-2 flex items-center gap-1.5 text-xs font-medium ${
      tone === "ok" ? "text-emerald-600 dark:text-emerald-400" : tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
    }`}
  >
    <svg className="h-3.5 w-3.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {tone === "ok" ? <path d="M20 6 9 17l-5-5" /> : <><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></>}
    </svg>
    {children}
  </p>
);

/** Wajib dilalui user yang belum punya PIN sebelum mendapat sesi dan dashboard */
export default function PinSetup({ token, onError, onDone }: { token: string; onError: (m: string) => void; onDone: () => void }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || done) return;
    if (pin.length !== 6) return onError("PIN harus 6 digit angka.");
    if (weak(pin)) return onError("PIN terlalu mudah ditebak. Hindari 123456 atau angka berulang.");
    if (pin !== confirm) return onError("Konfirmasi PIN tidak sama.");
    setBusy(true);
    try {
      await api("/api/auth/pin", { method: "POST", body: { token, pin, confirm } });
      setDone(true);
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Gagal menyimpan PIN.");
      setBusy(false);
    }
  }

  const full = pin.length === 6;
  const confirmFull = confirm.length === 6;

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-line bg-paper p-3.5 text-sm text-muted">
        <svg className="mt-0.5 h-5 w-5 flex-none text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        <p>PIN 6 digit dipakai setiap kali masuk, setelah password. Jangan bagikan ke siapa pun.</p>
      </div>

      <div>
        <label className="label">PIN baru</label>
        <OtpInput label="PIN baru" value={pin} onChange={setPin} mask disabled={busy || done} autoFocus />
        {full && weak(pin) && <Note tone="warn">PIN terlalu mudah ditebak. Hindari 123456 atau angka berulang.</Note>}
      </div>

      <div>
        <label className="label">Ulangi PIN</label>
        <OtpInput label="Ulangi PIN" value={confirm} onChange={setConfirm} mask disabled={busy || done} />
        {confirmFull && (pin === confirm ? <Note tone="ok">PIN cocok.</Note> : <Note tone="bad">PIN belum sama.</Note>)}
      </div>

      <SubmitButton busy={busy} done={done} idle="Simpan PIN" working="Menyimpan..." success="PIN tersimpan, membuka dashboard" />
    </form>
  );
}