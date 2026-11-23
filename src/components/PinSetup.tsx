"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import OtpInput from "@/components/OtpInput";
import { SubmitButton } from "@/components/AuthBits";

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

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted">PIN 6 digit dipakai setiap kali masuk, setelah password. Jangan bagikan ke siapa pun.</p>
      <div>
        <label className="label">PIN baru</label>
        <OtpInput label="PIN baru" value={pin} onChange={setPin} mask disabled={busy || done} autoFocus />
      </div>
      <div>
        <label className="label">Ulangi PIN</label>
        <OtpInput label="Ulangi PIN" value={confirm} onChange={setConfirm} mask disabled={busy || done} />
      </div>
      <SubmitButton busy={busy} done={done} idle="Simpan PIN" working="Menyimpan..." success="PIN tersimpan, membuka dashboard" />
    </form>
  );
}
