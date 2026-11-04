"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client";
import type { Me } from "@/lib/types";
import ThemeToggle from "@/components/ThemeToggle";
import { useOnline } from "@/lib/useOnline";

const BEAT_MS = 40_000;

export const ROLE_LABEL: Record<string, string> = {
  developer: "Developer", admin: "Admin", kepala_toko: "Kepala toko",
  kepala_cabang: "Kepala cabang", kasir: "Kasir", gudang: "Gudang",
};

export default function Shell({ children }: { children: (me: Me) => ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const router = useRouter();
  const path = usePathname();
  const online = useOnline();

  useEffect(() => { api<Me>("/api/auth/me").then(setMe).catch(() => router.replace("/login")); }, [router]);

  // Detak "saya online" untuk pantauan kepala cabang/toko. Berhenti saat tab disembunyikan atau offline
  const uidKey = me?.session.uid;
  const platform = me?.session.role === "developer" || me?.session.role === "admin";
  useEffect(() => {
    if (!uidKey || platform) return;
    const beat = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      api("/api/presence", { method: "POST", body: { page: path } }).catch(() => {});
    };
    beat();
    const t = setInterval(beat, BEAT_MS);
    document.addEventListener("visibilitychange", beat);
    window.addEventListener("online", beat);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", beat); window.removeEventListener("online", beat); };
  }, [uidKey, platform, path]);
  if (!me) return <div className="p-8 text-sm text-muted">Memuat…</div>;

  const role = me.session.role;
  const head = role === "kepala_toko" || role === "kepala_cabang";
  const nav = [
    { href: "/dashboard", t: "Dashboard" },
    ...(role === "kasir" || head ? [{ href: "/kasir", t: "Kasir" }] : []),
    ...(role === "gudang" || head ? [{ href: "/gudang", t: "Gudang" }] : []),
    ...(head ? [{ href: "/keuangan", t: "Keuangan" }, { href: "/monitor", t: "Pantau kasir" }] : []),
    ...(role === "kepala_toko" ? [{ href: "/pengaturan", t: "Pengaturan" }] : []),
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <div className="mr-2">
            <div className="text-sm font-semibold">{me.store?.name ?? "Kasir Toko"}</div>
            {me.branch && <div className="text-xs text-muted">Cabang {me.branch.name}, {me.branch.street}</div>}
          </div>
          <nav className="flex flex-wrap gap-1">
            {nav.map((n) => (
              <Link key={n.href} href={n.href}
                className={`rounded-md px-3 py-1.5 text-sm ${path === n.href ? "bg-accent text-white" : "hover:bg-paper"}`}>{n.t}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <ThemeToggle />
            <span>{me.session.name} <span className="text-muted">({ROLE_LABEL[role]})</span></span>
            <button className="btn-ghost" onClick={async () => { await api("/api/auth/logout", { method: "POST" }); router.replace("/login"); }}>Keluar</button>
          </div>
        </div>
      </header>
      {!online && (
        <div role="alert" className="border-b border-danger bg-danger/10 px-4 py-2 text-center text-sm font-medium text-danger">
          Anda sedang offline. Perubahan tidak tersimpan dan kepala cabang melihat kasir ini sebagai offline sampai koneksi kembali.
        </div>
      )}
      <main className="mx-auto max-w-6xl p-4">{children(me)}</main>
    </div>
  );
}
