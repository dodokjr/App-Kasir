"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client";
import type { Me } from "@/lib/types";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import { useOnline } from "@/lib/useOnline";

const BEAT_MS = 40_000;

export const ROLE_LABEL: Record<string, string> = {
  developer: "Developer", admin: "Admin", kepala_toko: "Kepala toko",
  kepala_cabang: "Kepala cabang", kasir: "Kasir", gudang: "Gudang",
};

// Ikon garis sederhana (24px)
const ICONS: Record<string, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
  kasir: <><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></>,
  gudang: <><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></>,
  keuangan: <><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></>,
  monitor: <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />,
  permintaan: <><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></>,
  pengaturan: <><path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3" /><path d="M14 2v4M8 10v4M16 18v4" /></>,
  pesan: <><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>,
  keluar: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  tutup: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
};
export const Ico = ({ n, size = 20 }: { n: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">{ICONS[n]}</svg>
);

const initial = (name: string) => (name.trim()[0] ?? "?").toUpperCase();
export const Avatar = ({ name, size = 36 }: { name: string; size?: number }) => (
  <span style={{ width: size, height: size }} className="flex flex-none items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent dark:text-link" aria-hidden="true">{initial(name)}</span>
);

export default function Shell({ children }: { children: (me: Me) => ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const online = useOnline();

  useEffect(() => { api<Me>("/api/auth/me").then(setMe).catch(() => router.replace("/login")); }, [router]);

  // Menu geser (HP/tablet) menutup saat pindah halaman atau menekan Escape
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [open]);

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

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status">
        <div className="flex items-center gap-3 text-muted"><span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none" aria-hidden="true" />Memuat…</div>
      </div>
    );
  }

  const role = me.session.role;
  const head = role === "kepala_toko" || role === "kepala_cabang";
  const nav = [
    { href: "/dashboard", t: "Dashboard", i: "dashboard" },
    ...(role === "kasir" || head ? [{ href: "/kasir", t: "Kasir", i: "kasir" }] : []),
    ...(role === "gudang" || head ? [{ href: "/gudang", t: "Gudang", i: "gudang" }, { href: "/permintaan", t: "Permintaan barang", i: "permintaan" }] : []),
    ...(head ? [{ href: "/keuangan", t: "Keuangan", i: "keuangan" }, { href: "/monitor", t: "Pantau kasir", i: "monitor" }] : []),
    ...(role === "developer" || role === "admin" ? [{ href: "/pesan", t: "Pesan", i: "pesan" }] : []),
    ...(role === "kepala_toko" ? [{ href: "/pengaturan", t: "Pengaturan", i: "pengaturan" }] : []),
  ];
  const here = nav.find((n) => path === n.href || path.startsWith(n.href + "/"));
  const logout = async () => { await api("/api/auth/logout", { method: "POST" }).catch(() => {}); router.replace("/login"); };

  const panel = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-5"><Logo /></div>
      <div className="mx-3 rounded-xl bg-paper px-4 py-3">
        <div className="truncate text-sm font-bold">{me.store?.name ?? "Kasir Toko"}</div>
        {me.branch ? <div className="truncate text-xs text-muted">Cabang {me.branch.name}, {me.branch.street}</div> : <div className="text-xs text-muted">{ROLE_LABEL[role]}</div>}
      </div>
      <nav aria-label="Menu aplikasi" className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
        {nav.map((n) => {
          const on = here?.href === n.href;
          return (
            <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition ${on ? "bg-accent text-white" : "text-muted hover:bg-paper hover:text-ink"}`}>
              <Ico n={n.i} />{n.t}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-3 border-t border-line p-3">
        <div className="flex items-center gap-3 px-2">
          <Avatar name={me.session.name} />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{me.session.name}</div><div className="text-xs text-muted">{ROLE_LABEL[role]}</div></div>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button className="btn-ghost justify-start gap-2" onClick={logout}><Ico n="keluar" size={18} />Keluar</button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen xl:pl-64">
      {/* Layar lebar: sidebar tetap */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface xl:block">{panel}</aside>

      {/* HP dan tablet: bilah atas + menu geser */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/90 px-4 py-2.5 backdrop-blur xl:hidden">
        <button className="btn-ghost px-2.5" onClick={() => setOpen(true)} aria-label="Buka menu" aria-expanded={open}><Ico n="menu" /></button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{here?.t ?? "Kasir Toko"}</div>
          <div className="truncate text-xs text-muted">{me.store?.name}{me.branch ? `, ${me.branch.name}` : ""}</div>
        </div>
        <Avatar name={me.session.name} />
      </header>
      {open && (
        <div className="fixed inset-0 z-40 xl:hidden" role="dialog" aria-modal="true" aria-label="Menu aplikasi">
          <button className="absolute inset-0 bg-black/50" aria-label="Tutup menu" onClick={() => setOpen(false)} tabIndex={-1} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-2xl">
            <button className="btn-ghost absolute right-3 top-4 px-2" onClick={() => setOpen(false)} aria-label="Tutup menu"><Ico n="tutup" size={18} /></button>
            {panel}
          </div>
        </div>
      )}

      {!online && (
        <div role="alert" className="sticky top-[57px] z-20 border-b border-danger bg-danger/10 px-4 py-2 text-center text-sm font-semibold text-danger xl:top-0">
          Anda sedang offline. Perubahan tidak tersimpan dan kepala cabang melihat kasir ini sebagai offline sampai koneksi kembali.
        </div>
      )}
      <main className="mx-auto max-w-6xl p-4 sm:p-6 xl:p-8">
        {here && here.href !== "/dashboard" && <h1 className="mb-6 text-3xl font-extrabold tracking-tight">{here.t}</h1>}
        {children(me)}
      </main>
    </div>
  );
}