import { SITE } from "@/lib/site";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`group inline-flex items-center gap-2.5 ${className}`}>
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
        <defs><linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="rgb(var(--accent))" /><stop offset="1" stopColor="rgb(var(--accent-2))" /></linearGradient></defs>
        <rect width="32" height="32" rx="9" fill="url(#logo-grad)" />
        <path d="M10 7h12v18l-2-1.5L18 25l-2-1.5L14 25l-2-1.5L10 25z" fill="#fff" />
        <path d="M13 12h6M13 16h6" stroke="rgb(var(--accent-dark))" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className="text-[17px] font-extrabold tracking-tight">{SITE.name}</span>
    </span>
  );
}
