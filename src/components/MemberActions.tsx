"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import OtpInput from "@/components/OtpInput";

type R = Record<string, string>;

const SEQ = ["012345", "123456", "234567", "345678", "456789", "543210", "654321", "765432", "876543", "987654"];
const weak = (p: string) => /^(\d)\1{5}$/.test(p) || SEQ.includes(p);
function randomPin() {
  for (;;) {
    const a = new Uint32Array(1); crypto.getRandomValues(a);
    const p = String(a[0] % 1_000_000).padStart(6, "0");
    if (!weak(p)) return p;
  }
}

/** Aksi per anggota tim: atur PIN, keluarkan paksa (kick), nonaktifkan/aktifkan, hapus */
export default function MemberActions({ u, onDone, onNote }: { u: R; onDone: () => void; onNote: (m: string) => void }) {
  const [dlg, setDlg] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const off = u.active === "FALSE";

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    if (busy) return;
    setBusy(key);
    try { await fn(); onNote(ok); onDone(); }
    catch (x) { onNote((x as Error).message || "Gagal."); }
    setBusy("");
  }

  const kick = () => {
    if (!confirm(`Keluarkan ${u.name} dari semua perangkat sekarang? Orang ini masih bisa masuk lagi dengan email, password, dan PIN.`)) return;
    run("kick", () => api("/api/users", { method: "PATCH", body: { id: u.id, action: "kick" } }), `${u.name} dikeluarkan dari semua perangkat.`);
  };
  const toggle = () => {
    if (!off && !confirm(`Nonaktifkan ${u.name}? Orang ini langsung keluar dan tidak bisa masuk sampai diaktifkan lagi.`)) return;
    run("active", () => api("/api/users", { method: "PATCH", body: { id: u.id, action: "active", active: off } }), off ? `${u.name} diaktifkan.` : `${u.name} dinonaktifkan.`);
  };
  const del = () => {
    if (!confirm(`Hapus ${u.name} secara permanen? Akun tidak bisa dikembalikan. Riwayat transaksinya tetap ada.`)) return;
    run("del", () => api(`/api/users?id=${encodeURIComponent(u.id)}`, { method: "DELETE" }), `${u.name} dihapus.`);
  };
  async function savePin() {
    if (pin.length !== 6) return setErr("PIN harus 6 digit angka.");
    if (weak(pin)) return setErr("PIN terlalu mudah ditebak. Hindari 123456 atau angka berulang.");
    setErr(""); setBusy("pin");
    try {
      await api("/api/users", { method: "PATCH", body: { id: u.id, action: "setpin", pin } });
      onNote(`PIN ${u.name} disimpan. Sampaikan langsung ke orangnya.`);
      setDlg(false); setPin(""); onDone();
    } catch (x) { setErr((x as Error).message); }
    setBusy("");
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-1.5">
        <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => { setDlg(true); setPin(""); setErr(""); }}>{u.hasPin === "TRUE" ? "Ganti PIN" : "Atur PIN"}</button>
        <button type="button" className="btn-ghost" disabled={!!busy} onClick={kick}>Kick</button>
        <button type="button" className="btn-ghost" disabled={!!busy} onClick={toggle}>{off ? "Aktifkan" : "Nonaktifkan"}</button>
        <button type="button" className="btn-ghost text-danger" disabled={!!busy} onClick={del}>Hapus</button>
      </div>

      {dlg && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={`Atur PIN ${u.name}`} onClick={() => !busy && setDlg(false)}>
          <div className="card w-full max-w-sm space-y-4 p-5 text-left" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-lg font-bold">{u.hasPin === "TRUE" ? "Ganti PIN" : "Atur PIN"} {u.name}</h3>
              <p className="mt-1 text-sm text-muted">PIN 6 digit dipakai {u.name} setiap masuk, setelah password. Sampaikan langsung ke orangnya.</p>
            </div>
            <OtpInput label="PIN anggota" value={pin} onChange={(v) => { setPin(v); setErr(""); }} autoFocus disabled={busy === "pin"} />
            <button type="button" className="text-sm font-semibold text-link underline underline-offset-4" onClick={() => { setPin(randomPin()); setErr(""); }}>Buat PIN acak</button>
            {err && <p className="text-sm font-medium text-danger" role="alert">{err}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" disabled={busy === "pin"} onClick={() => setDlg(false)}>Batal</button>
              <button type="button" className="btn-primary" disabled={busy === "pin" || pin.length !== 6} onClick={savePin}>{busy === "pin" ? "Menyimpan…" : "Simpan PIN"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
