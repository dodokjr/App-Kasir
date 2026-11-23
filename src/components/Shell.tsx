"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { api, isNetworkError } from "@/lib/client";
import { clearMe, loadMe, saveMe, syncQueue } from "@/lib/offline";
import { useQueue } from "@/lib/useQueue";
import type { Me } from "@/lib/types";

import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import { useOnline } from "@/lib/useOnline";

const BEAT_MS = 40_000;
const KEY_SIDE = "kt-sidebar-side";
const KEY_OPEN = "kt-sidebar-open";

export const ROLE_LABEL: Record<string, string> = {
  developer: "Developer",
  admin: "Admin",
  kepala_toko: "Kepala toko",
  kepala_cabang: "Kepala cabang",
  kasir: "Kasir",
  gudang: "Gudang",
};

// ======================================================
// ICONS
// ======================================================

const ICONS: Record<string, ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  kasir: (
    <>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </>
  ),
  gudang: (
    <>
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </>
  ),
  keuangan: (
    <>
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </>
  ),
  monitor: <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />,
  permintaan: (
    <>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </>
  ),
  sewa: (
    <>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </>
  ),
  peta: (
    <>
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  pengaturan: (
    <>
      <path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3" />
      <path d="M14 2v4M8 10v4M16 18v4" />
    </>
  ),
  pesan: (
    <>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  keluar: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  tutup: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  kiri: (
    <>
      <path d="m15 18-6-6 6-6" />
      <path d="M20 12H9" />
    </>
  ),
  kanan: (
    <>
      <path d="m9 18 6-6-6-6" />
      <path d="M4 12h11" />
    </>
  ),
};

export const Ico = ({ n, size = 20 }: { n: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="flex-none"
  >
    {ICONS[n]}
  </svg>
);

// ======================================================
// AVATAR
// ======================================================

const initial = (name: string) => (name.trim()[0] ?? "?").toUpperCase();

export const Avatar = ({ name, size = 36 }: { name: string; size?: number }) => (
  <span
    style={{ width: size, height: size }}
    className="flex flex-none items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent ring-2 ring-accent/20 dark:text-link"
    aria-hidden="true"
  >
    {initial(name)}
  </span>
);

// ======================================================
// SHELL
// ======================================================

export default function Shell({ children }: { children: (me: Me) => ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);

  // Drawer HP
  const [open, setOpen] = useState(false);

  // Sidebar desktop. Disimpan di browser supaya tidak kembali ke bawaan saat pindah halaman.
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [side, setSide] = useState<"left" | "right">("left");

  const router = useRouter();
  const path = usePathname();
  const [pinHint, setPinHint] = useState(true); // true dulu agar tidak berkedip; diatur dari sessionStorage di bawah
  useEffect(() => { try { setPinHint(sessionStorage.getItem("kt:pin-hint") === "1"); } catch { setPinHint(false); } }, []);
  const online = useOnline();

  const [loadErr, setLoadErr] = useState("");
  const [fromCache, setFromCache] = useState(false);

  // Pulihkan pilihan sidebar
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY_SIDE) === "right") setSide("right");
      if (localStorage.getItem(KEY_OPEN) === "0") setDesktopOpen(false);
    } catch {}
  }, []);

  const saveOpen = (v: boolean) => {
    setDesktopOpen(v);
    try { localStorage.setItem(KEY_OPEN, v ? "1" : "0"); } catch {}
  };
  const toggleSide = () => {
    setSide((cur) => {
      const next = cur === "left" ? "right" : "left";
      try { localStorage.setItem(KEY_SIDE, next); } catch {}
      return next;
    });
  };

  // ====================================================
  // AUTHENTICATION
  // ====================================================

  const loadMe_ = useCallback(() => {
    setLoadErr("");

    // Tampilkan data tersimpan lebih dulu supaya pindah halaman tidak memunculkan layar "Memuat…"
    const cached = loadMe<Me>();
    if (cached) setMe((cur) => cur ?? cached);

    api<Me>("/api/auth/me")
      .then((m) => {
        saveMe(m);
        setFromCache(false);
        setMe(m);
      })
      .catch((e) => {
        if (isNetworkError(e)) {
          const c = loadMe<Me>();
          if (c) {
            setFromCache(true);
            setMe(c);
            return;
          }
          setLoadErr("Tidak ada koneksi internet dan belum ada data tersimpan di perangkat ini. Sambungkan internet lalu coba lagi.");
        } else if ((e as { status?: number }).status === 401) {
          clearMe();
          setMe(null);
          router.replace("/login");
        } else {
          setLoadErr((e as Error).message || "Gagal memuat. Coba lagi.");
        }
      });
  }, [router]);

  useEffect(() => {
    loadMe_();
  }, [loadMe_]);

  // ====================================================
  // OFFLINE QUEUE
  // ====================================================

  const uid = me?.session.uid;
  const queue = useQueue(uid);

  useEffect(() => {
    if (!uid) return;

    const post = (body: Record<string, unknown>) => api("/api/transactions", { method: "POST", body });

    const run = async () => {
      if (!navigator.onLine) return;
      const r = await syncQueue(post, uid);
      if (r.sent > 0) window.dispatchEvent(new Event("kt-synced"));
    };

    run();
    const t = setInterval(run, 20_000);
    window.addEventListener("online", run);
    window.addEventListener("kt-sync", run);

    return () => {
      clearInterval(t);
      window.removeEventListener("online", run);
      window.removeEventListener("kt-sync", run);
    };
  }, [uid]);

  // ====================================================
  // DRAWER EVENTS
  // ====================================================

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  // ====================================================
  // PRESENCE
  // ====================================================

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

    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", beat);
      window.removeEventListener("online", beat);
    };
  }, [uidKey, platform, path]);

  // ====================================================
  // LOADING STATE
  // ====================================================

  if (!me && loadErr) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card anim-pop max-w-md space-y-4 p-6 text-center" role="alert">
          <p className="font-semibold">{loadErr}</p>
          <button className="btn-primary" onClick={loadMe_}>
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status">
        <div className="flex items-center gap-3 text-muted">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none"
            aria-hidden="true"
          />
          Memuat…
        </div>
      </div>
    );
  }

  // ====================================================
  // NAVIGATION
  // ====================================================

  const role = me.session.role;
  const head = role === "kepala_toko" || role === "kepala_cabang";

  const nav = [
    { href: "/dashboard", t: "Dashboard", i: "dashboard" },
    ...(role === "kasir" || head
      ? [
          { href: "/kasir", t: "Kasir", i: "kasir" },
          { href: "/sewa", t: "Booking & sewa", i: "sewa" },
        ]
      : []),
    ...(role === "gudang" || head
      ? [
          { href: "/gudang", t: "Gudang", i: "gudang" },
          { href: "/permintaan", t: "Permintaan barang", i: "permintaan" },
        ]
      : []),
    ...(head
      ? [
          { href: "/keuangan", t: "Keuangan", i: "keuangan" },
          { href: "/target", t: "Target", i: "target" },
          { href: "/peta", t: "Peta toko", i: "peta" },
          { href: "/monitor", t: "Pantau kasir", i: "monitor" },
        ]
      : []),
    ...(role === "developer" || role === "admin" ? [{ href: "/pesan", t: "Pesan", i: "pesan" }] : []),
    ...(role === "kepala_toko" ? [{ href: "/pengaturan", t: "Pengaturan", i: "pengaturan" }] : []),
  ];

  const here = nav.find((n) => path === n.href || path.startsWith(n.href + "/"));

  // ====================================================
  // LOGOUT
  // ====================================================

  const logout = async () => {
    if (
      queue.total > 0 &&
      !confirm(
        `Ada ${queue.total} transaksi offline yang belum terkirim. Jika keluar sekarang, transaksi itu baru dikirim setelah Anda masuk lagi dengan akun ini. Tetap keluar?`
      )
    ) {
      return;
    }
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    clearMe();
    router.replace("/login");
  };

  // ====================================================
  // SIDEBAR PANEL
  // ====================================================

  const panel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-4 pt-5">
        <Logo />
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn-ghost px-2"
            onClick={toggleSide}
            aria-label={`Pindahkan sidebar ke ${side === "left" ? "kanan" : "kiri"}`}
            title={`Pindahkan ke ${side === "left" ? "kanan" : "kiri"}`}
          >
            <Ico n={side === "left" ? "kanan" : "kiri"} size={19} />
          </button>
          <button
            type="button"
            className="btn-ghost px-2"
            onClick={() => {
              setOpen(false);
              saveOpen(false);
            }}
            aria-label="Tutup sidebar"
            title="Tutup sidebar"
          >
            <Ico n="tutup" size={18} />
          </button>
        </div>
      </div>

      <div className="mx-3 rounded-xl bg-paper px-4 py-3">
        <div className="truncate text-sm font-bold">{me.store?.name ?? "Kasir Toko"}</div>
        {me.branch ? (
          <div className="truncate text-xs text-muted">
            Cabang {me.branch.name}, {me.branch.street}
          </div>
        ) : (
          <div className="text-xs text-muted">{ROLE_LABEL[role]}</div>
        )}
      </div>

      <nav aria-label="Menu aplikasi" className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
        {nav.map((n, i) => {
          const on = here?.href === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={on ? "page" : undefined}
              style={{ animationDelay: `${i * 35}ms` }}
              className={`nav-item-in group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition duration-200 active:scale-[.98] ${
                on
                  ? "bg-accent text-white shadow-md shadow-accent/25"
                  : "text-muted hover:translate-x-0.5 hover:bg-paper hover:text-ink"
              }`}
            >
              <span className="transition-transform duration-200 group-hover:scale-110">
                <Ico n={n.i} />
              </span>
              {n.t}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-line p-3">
        <div className="flex items-center gap-3 px-2">
          <Avatar name={me.session.name} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{me.session.name}</div>
            <div className="text-xs text-muted">{ROLE_LABEL[role]}</div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button className="btn-ghost justify-start gap-2" onClick={logout}>
            <Ico n="keluar" size={18} />
            Keluar
          </button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );

  // ====================================================
  // LAYOUT
  // ====================================================

  const edge = side === "left" ? "left-0 border-r" : "right-0 border-l";
  const hideX = side === "left" ? "xl:-translate-x-full" : "xl:translate-x-full";
  const contentOffset = desktopOpen ? (side === "left" ? "xl:pl-64" : "xl:pr-64") : "";
  const drawerEdge = side === "left" ? "left-0" : "right-0";
  const drawerHide = side === "left" ? "-translate-x-full" : "translate-x-full";

  return (
    <div className={`min-h-screen transition-[padding] duration-300 ease-out motion-reduce:transition-none ${contentOffset}`}>
      {/* Sidebar desktop: meluncur masuk/keluar */}
      <aside
        aria-hidden={!desktopOpen}
        className={`fixed inset-y-0 z-30 hidden w-64 border-line bg-surface transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none xl:block ${edge} ${
          desktopOpen ? "xl:visible xl:translate-x-0" : `xl:invisible ${hideX}`
        }`}
      >
        {panel}
      </aside>

      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/80 px-4 py-2.5 backdrop-blur-xl">
        <button
          type="button"
          className="btn-ghost hidden px-2.5 xl:inline-flex"
          onClick={() => saveOpen(!desktopOpen)}
          aria-label={desktopOpen ? "Tutup sidebar" : "Buka sidebar"}
          aria-expanded={desktopOpen}
          title={desktopOpen ? "Tutup sidebar" : "Buka sidebar"}
        >
          <Ico n="menu" />
        </button>

        <button
          type="button"
          className="btn-ghost px-2.5 xl:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Buka menu"
          aria-expanded={open}
        >
          <Ico n="menu" />
        </button>

        <div className="min-w-0 flex-1">
          <div key={path} className="title-in truncate text-sm font-bold">
            {here?.t ?? "Kasir Toko"}
          </div>
          <div className="truncate text-xs text-muted">
            {me.store?.name}
            {me.branch ? `, ${me.branch.name}` : ""}
          </div>
        </div>

        <Avatar name={me.session.name} />
      </header>

      {/* Drawer HP / tablet: selalu ada di DOM supaya bisa dianimasikan */}
      <div
        className={`fixed inset-0 z-40 xl:hidden ${open ? "visible" : "pointer-events-none invisible delay-300"} transition-[visibility]`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu aplikasi"
        aria-hidden={!open}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
          aria-label="Tutup menu"
          onClick={() => setOpen(false)}
          tabIndex={-1}
        />
        <div
          className={`absolute inset-y-0 w-72 max-w-[85vw] bg-surface shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${drawerEdge} ${
            open ? "translate-x-0" : drawerHide
          }`}
        >
          {panel}
        </div>
      </div>

      {/* Status offline */}
      {(!online || queue.total > 0 || queue.otherAccounts > 0 || fromCache) && (
        <div
          role="status"
          className={`banner-in sticky top-[57px] z-20 border-b px-4 py-2 text-center text-sm font-semibold xl:top-0 ${
            !online || queue.failed > 0 ? "border-danger bg-danger/10 text-danger" : "border-sun bg-sun/25"
          }`}
        >
          {!online && (
            <>
              Anda sedang offline. Halaman Kasir tetap bisa dipakai: transaksi disimpan di perangkat ini dan dikirim otomatis saat internet kembali. Halaman lain butuh internet.{" "}
            </>
          )}
          {queue.pending > 0 && (
            <>
              {queue.pending} transaksi {online ? "sedang dikirim" : "menunggu dikirim"}.{" "}
            </>
          )}
          {queue.failed > 0 && (
            <>
              {queue.failed} transaksi gagal dikirim.{" "}
              <Link href="/kasir" className="underline">
                Periksa di halaman Kasir
              </Link>
              .{" "}
            </>
          )}
          {queue.otherAccounts > 0 && <>Ada {queue.otherAccounts} transaksi offline milik akun lain di perangkat ini. </>}
          {online && fromCache && queue.total === 0 && <>Menampilkan data tersimpan.</>}
        </div>
      )}

      {/* Akun lama yang belum punya PIN: sarankan membuat sekarang */}
      {me.hasPin === false && !pinHint && path !== "/pengaturan" && (
        <div role="status" className="mx-auto mt-4 flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200 sm:mx-6 xl:mx-8">
          <span className="flex-1"><b>Akun Anda belum punya PIN.</b> Buat PIN 6 digit sekarang agar akun lebih aman. PIN akan diminta setiap kali masuk.</span>
          <Link href="/pengaturan" className="btn-primary">Buat PIN</Link>
          <button type="button" className="btn-ghost" onClick={() => { try { sessionStorage.setItem("kt:pin-hint", "1"); } catch {} setPinHint(true); }}>Nanti</button>
        </div>
      )}

      {/* Isi halaman: animasi ulang tiap pindah halaman */}
      <main key={path} className="page-in mx-auto max-w-6xl p-4 sm:p-6 xl:p-8">
        {here && here.href !== "/dashboard" && (
          <h1 className="mb-6 text-3xl font-extrabold tracking-tight">{here.t}</h1>
        )}
        {children(me)}
      </main>
    </div>
  );
}