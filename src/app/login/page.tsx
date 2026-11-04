"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export default function Login() {
  const router = useRouter();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try { await api("/api/auth/login", { method: "POST", body: f }); router.replace("/dashboard"); }
    catch (x) { setErr((x as Error).message); setBusy(false); }
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-xl font-semibold">Masuk ke Kasir Toko</h1>
        <div><label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className="label" htmlFor="pw">Password</label>
          <input id="pw" type="password" required className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        {err && <p className="text-sm text-danger" role="alert">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Masuk…" : "Masuk"}</button>
        <p className="text-center text-xs text-muted"><Link href="/" className="underline underline-offset-2">Kembali ke beranda</Link></p>
        <p className="text-center text-sm text-muted">Punya toko baru? <Link href="/register" className="font-medium text-link">Daftarkan toko</Link></p>
      </form>
    </div>
  );
}
