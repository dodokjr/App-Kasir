import { SITE } from "@/lib/site";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="rgb(var(--accent))" />
        <path d="M10 7h12v18l-2-1.5L18 25l-2-1.5L14 25l-2-1.5L10 25z" fill="#fff" />
        <path d="M13 12h6M13 16h6" stroke="rgb(var(--accent))" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className="text-[17px] font-extrabold tracking-tight">{SITE.name}</span>
    </span>
  );
}
