"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";

const NAV = [
  ["/#fitur", "Fitur"],
  ["/#cara-mulai", "Cara mulai"],
  ["/docs", "Panduan"],
  ["/kontak", "Kontak"],
] as const;

export default function Navbar({ loggedIn, siteName }: { loggedIn: boolean; siteName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const activeIdx = NAV.findIndex(
    ([h]) => !h.includes("#") && (pathname === h || pathname.startsWith(h + "/"))
  );

  const moveTo = (i: number) => {
    const el = linkRefs.current[i];
    if (el) setInd({ x: el.offsetLeft + 12, w: el.offsetWidth - 24 });
  };
  const rest = () => (activeIdx >= 0 ? moveTo(activeIdx) : setInd(null));

  // Garis penanda mengikuti halaman aktif
  useEffect(() => {
    rest();
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Sembunyi saat scroll turun, muncul lagi saat scroll naik
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
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
    <header
      ref={headerRef}
      className={[
        "sticky top-0 z-40 bg-surface transition-[transform,box-shadow,border-color] duration-300 ease-out motion-reduce:transition-none",
        "border-b",
        scrolled || open ? "border-line shadow-sm" : "border-transparent",
        hidden && !open ? "-translate-y-full" : "translate-y-0",
      ].join(" ")}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center gap-3 px-4 transition-[padding] duration-300 motion-reduce:transition-none ${
          scrolled ? "py-2" : "py-3.5"
        }`}
      >
        <Link
          href="/"
          aria-label={`${siteName}, ke beranda`}
          className="transition-transform duration-200 active:scale-95"
        >
          <Logo />
        </Link>

        {/* Desktop */}
        <nav
          aria-label="Menu utama"
          className="relative ml-6 hidden text-[15px] font-medium md:flex"
          onMouseLeave={rest}
        >
          {NAV.map(([href, t], i) => (
            <Link
              key={href}
              href={href}
              ref={(el) => {
                linkRefs.current[i] = el;
              }}
              onMouseEnter={() => moveTo(i)}
              onFocus={() => moveTo(i)}
              onBlur={rest}
              aria-current={i === activeIdx ? "page" : undefined}
              className={`px-3 py-2 transition-colors duration-200 ${
                i === activeIdx ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {t}
            </Link>
          ))}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-0.5 left-0 h-0.5 rounded-full bg-accent transition-[transform,width,opacity] duration-300 ease-out motion-reduce:transition-none"
            style={{
              width: ind?.w ?? 0,
              transform: `translateX(${ind?.x ?? 0}px)`,
              opacity: ind ? 1 : 0,
            }}
          />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden items-center gap-2 md:flex">
            {loggedIn ? (
              <Link href="/dashboard" className="btn-primary">Buka dashboard</Link>
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
              <span className={`absolute left-0 top-[10px] h-0.5 w-5 rounded bg-current transition-opacity duration-200 ${open ? "opacity-0" : "opacity-100"}`} />
              <span className={`absolute left-0 top-[16px] h-0.5 w-5 rounded bg-current transition-transform duration-300 motion-reduce:transition-none ${open ? "-translate-y-[6px] -rotate-45" : ""}`} />
            </span>
            <span className="ml-2">Menu</span>
          </button>
        </div>
      </div>

      {/* Panel menu HP: turun dengan halus, link muncul bergantian */}
      <div
        id="menu-hp"
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none md:hidden ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 pb-5 pt-1">
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
                    className={`flex items-center justify-between border-b border-line py-4 text-lg font-medium ${
                      i === activeIdx ? "text-accent dark:text-link" : ""
                    }`}
                  >
                    {t}
                    <span aria-hidden="true" className="text-muted">→</span>
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
                <Link href="/dashboard" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} className="btn-primary btn-lg">Buka dashboard</Link>
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
    </header>
  );
}