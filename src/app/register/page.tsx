"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/business";

export default function Register() {
  const router = useRouter();
  const [f, setF] = useState({ storeName: "", branchName: "", street: "", name: "", email: "", password: "" });
  const [biz, setBiz] = useState<BusinessType | "">("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!biz) { setErr("Pilih jenis usaha toko Anda"); return; }
    setBusy(true);
    try { await api("/api/auth/register", { method: "POST", body: { ...f, businessType: biz } }); router.replace("/dashboard"); }
    catch (x) { setErr((x as Error).message); setBusy(false); }
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-6">
        <h1 className="text-xl font-semibold">Daftarkan toko baru</h1>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Jenis usaha</legend>
          <div className="grid gap-2" role="radiogroup" aria-label="Jenis usaha">
            {BUSINESS_TYPES.map((b) => (
              <label key={b.key} className={`cursor-pointer rounded-md border p-3 text-sm transition ${biz === b.key ? "border-accent bg-accent/10" : "border-line hover:border-accent"}`}>
                <input type="radio" name="biz" className="sr-only" checked={biz === b.key} onChange={() => setBiz(b.key)} />
                <span className="font-medium">{b.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{b.desc}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium">Data toko</legend>
          <div><label className="label" htmlFor="sn">Nama toko</label><input id="sn" required className="input" value={f.storeName} onChange={set("storeName")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="bn">Nama cabang</label><input id="bn" placeholder="Pusat" className="input" value={f.branchName} onChange={set("branchName")} /></div>
            <div><label className="label" htmlFor="st">Nama jalan</label><input id="st" required className="input" value={f.street} onChange={set("street")} /></div>
          </div>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium">Akun kepala toko</legend>
          <div><label className="label" htmlFor="nm">Nama lengkap</label><input id="nm" required className="input" value={f.name} onChange={set("name")} /></div>
          <div><label className="label" htmlFor="em">Email</label><input id="em" type="email" required className="input" value={f.email} onChange={set("email")} /></div>
          <div><label className="label" htmlFor="pw">Password (min. 6 karakter)</label><input id="pw" type="password" required minLength={6} className="input" value={f.password} onChange={set("password")} /></div>
        </fieldset>
        {err && <p className="text-sm text-danger" role="alert">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Mendaftar…" : "Daftarkan toko"}</button>
        <p className="text-center text-xs text-muted"><Link href="/" className="underline underline-offset-2">Kembali ke beranda</Link></p>
        <p className="text-center text-sm text-muted">Sudah punya akun? <Link href="/login" className="font-medium text-link">Masuk</Link></p>
      </form>
    </div>
  );
}
