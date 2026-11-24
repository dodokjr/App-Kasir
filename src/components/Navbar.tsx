"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";

const NAV = [
  ["/#fitur", "Fitur"],
  ["/#cara-mulai", "Cara mulai"],
  ["/docs", "Panduan"],
  ["/kontak", "Kontak"],
] as const;

type Pill = { x: number; y: number; w: number; h: number };

export default function Navbar({ loggedIn, siteName }: { loggedIn: boolean; siteName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [pill, setPill] = useState<Pill | null>(null);
  const [hovering, setHovering] = useState(false);
  const [section, setSection] = useState<string | null>(null);

  const headerRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Halaman aktif: dari path, atau dari bagian yang sedang terlihat di beranda
  const activeIdx = NAV.findIndex(([h]) => {
    if (h.includes("#")) return pathname === "/" && section === h.split("#")[1];
    return pathname === h || pathname.startsWith(h + "/");
  });

  const moveTo = useCallback((i: number) => {
    const el = linkRefs.current[i];
    if (el) setPill({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
  }, []);

  const rest = useCallback(() => {
    setHovering(false);
    if (activeIdx >= 0) moveTo(activeIdx);
    else setPill(null);
  }, [activeIdx, moveTo]);

  // Pil mengikuti halaman / bagian aktif
  useEffect(() => {
    rest();
  }, [rest]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Ukur ulang saat layar berubah
  useEffect(() => {
    window.addEventListener("resize", rest);
    return () => window.removeEventListener("resize", rest);
  }, [rest]);

  // Bagian beranda yang sedang terlihat
  useEffect(() => {
    if (pathname !== "/") { setSection(null); return; }
    const ids = NAV.filter(([h]) => h.includes("#")).map(([h]) => h.split("#")[1]);
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setSection(e.target.id);
          else setSection((cur) => (cur === e.target.id ? null : cur));
        });
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  // Sembunyi saat scroll turun, muncul saat scroll naik, plus garis progres baca
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (barRef.current) barRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
        setScrolled(y > 8);
        if (!open) {
          if (y > last + 4 && y > 120) setHidden(true);
          else if (y < last - 4) setHidden(false);
        }
        last = y;
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  // Menu HP: kunci scroll, Esc, klik di luar
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onResize = () => window.innerWidth >= 768 && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    /* Pembungkus transparan: memberi jarak dari kiri, kanan, dan atas layar.
       Hanya kartu di dalamnya yang bisa diklik. */
    <header
      ref={headerRef}
      className={`pointer-events-none sticky top-0 z-40 px-3 pt-3 transition-transform duration-300 ease-out motion-reduce:transition-none sm:px-4 ${
        hidden && !open ? "-translate-y-[130%]" : "translate-y-0"
      }`}
    >
      {/* Animasi masuk dipasang di kartu, bukan di pembungkus, supaya tidak menimpa gerak sembunyi saat scroll */}
      <div
        className={`nav-in pointer-events-auto relative mx-auto overflow-hidden rounded-2xl border backdrop-blur-xl transition-[max-width,box-shadow,background-color,border-color] duration-300 ease-out motion-reduce:transition-none ${
          scrolled ? "max-w-5xl" : "max-w-6xl"
        } ${
          scrolled || open
            ? "border-line bg-surface/90 shadow-lg shadow-black/5"
            : "border-line/60 bg-surface/70 shadow-sm"
        }`}
      >
        <div
          className={`flex items-center gap-3 px-3 transition-[padding] duration-300 motion-reduce:transition-none sm:px-4 ${
            scrolled ? "py-2" : "py-2.5"
          }`}
        >
          <Link
            href="/"
            aria-label={`${siteName}, ke beranda`}
            className="rounded-lg transition-transform duration-200 active:scale-95"
          >
            <Logo />
          </Link>

          {/* Desktop */}
          <nav
            aria-label="Menu utama"
            className="relative ml-4 hidden text-[15px] font-medium md:flex"
            onMouseLeave={rest}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute left-0 top-0 rounded-full transition-[transform,width,height,opacity,background-color] duration-300 ease-[cubic-bezier(.3,1.2,.5,1)] motion-reduce:transition-none ${
                hovering ? "bg-ink/5 dark:bg-ink/10" : "bg-accent/10"
              }`}
              style={{
                width: pill?.w ?? 0,
                height: pill?.h ?? 0,
                transform: `translate(${pill?.x ?? 0}px, ${pill?.y ?? 0}px)`,
                opacity: pill ? 1 : 0,
              }}
            />
            {NAV.map(([href, t], i) => (
              <Link
                key={href}
                href={href}
                ref={(el) => {
                  linkRefs.current[i] = el;
                }}
                onMouseEnter={() => { setHovering(i !== activeIdx); moveTo(i); }}
                onFocus={() => moveTo(i)}
                onBlur={rest}
                aria-current={i === activeIdx ? "page" : undefined}
                className={`relative rounded-full px-4 py-2 transition-colors duration-200 ${
                  i === activeIdx ? "font-semibold text-accent dark:text-link" : "text-muted hover:text-ink"
                }`}
              >
                {t}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden items-center gap-2 md:flex">
              {loggedIn ? (
                <Link href="/dashboard" className="btn-primary">Masuk ke dashboard</Link>
              ) : (
                <>
                  <Link href="/login" className="btn-ghost">Masuk</Link>
                  <Link href="/register" className="btn-primary">Daftarkan toko</Link>
                </>
              )}
            </div>

            {/* Tombol hamburger */}
            <button
              type="button"
              className="btn-ghost md:hidden"
              aria-label={open ? "Tutup menu" : "Buka menu"}
              aria-expanded={open}
              aria-controls="menu-hp"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="relative block h-5 w-5" aria-hidden="true">
                <span className={`absolute left-0 top-[4px] h-0.5 w-5 rounded bg-current transition-transform duration-300 motion-reduce:transition-none ${open ? "translate-y-[6px] rotate-45" : ""}`} />
                <span className={`absolute left-0 top-[10px] h-0.5 w-5 rounded bg-current transition-[opacity,transform] duration-200 ${open ? "translate-x-2 opacity-0" : "opacity-100"}`} />
                <span className={`absolute left-0 top-[16px] h-0.5 w-5 rounded bg-current transition-transform duration-300 motion-reduce:transition-none ${open ? "-translate-y-[6px] -rotate-45" : ""}`} />
              </span>
              <span className="ml-2">Menu</span>
            </button>
          </div>
        </div>

        {/* Panel menu HP: turun dengan halus di dalam kartu, link muncul bergantian */}
        <div
          id="menu-hp"
          className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none md:hidden ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-4 pb-5 pt-1">
              <ul>
                {NAV.map(([href, t], i) => (
                  <li
                    key={href}
                    className={`transition-[opacity,transform] duration-300 motion-reduce:transition-none ${
                      open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
                    }`}
                    style={{ transitionDelay: open ? `${80 + i * 45}ms` : "0ms" }}
                  >
                    <Link
                      href={href}
                      tabIndex={open ? 0 : -1}
                      onClick={() => setOpen(false)}
                      aria-current={i === activeIdx ? "page" : undefined}
                      className={`group flex items-center justify-between border-b border-line py-4 text-lg font-medium transition-colors ${
                        i === activeIdx ? "text-accent dark:text-link" : "active:text-accent"
                      }`}
                    >
                      {t}
                      <span aria-hidden="true" className="text-muted transition-transform duration-200 group-active:translate-x-1">→</span>
                    </Link>
                  </li>
                ))}
              </ul>

              <div
                className={`mt-5 grid gap-2 transition-[opacity,transform] duration-300 motion-reduce:transition-none ${
                  open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
                }`}
                style={{ transitionDelay: open ? `${80 + NAV.length * 45}ms` : "0ms" }}
              >
                {loggedIn ? (
                  <Link href="/dashboard" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} className="btn-primary btn-lg">Masuk ke dashboard</Link>
                ) : (
                  <>
                    <Link href="/register" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} className="btn-primary btn-lg">Daftarkan toko</Link>
                    <Link href="/login" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} className="btn-ghost btn-lg">Masuk</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Garis progres baca, menempel di dasar kartu */}
        <span
          ref={barRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-accent motion-reduce:hidden"
        />
      </div>
    </header>
  );
}