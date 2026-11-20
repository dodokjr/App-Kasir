"use client";

export default function BackToTop() {
  const up = () => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={up}
      className="group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
    >
      Ke atas
      <span
        aria-hidden="true"
        className="grid h-6 w-6 place-items-center rounded-full border border-line transition-[transform,background-color,border-color] duration-200 group-hover:-translate-y-0.5 group-hover:border-accent group-hover:bg-accent group-hover:text-white motion-reduce:transition-none"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </span>
    </button>
  );
}