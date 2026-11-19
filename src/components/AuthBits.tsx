"use client";

import { useEffect, useRef, type ReactNode } from "react";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Salah ketik domain yang paling sering terjadi */
const TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com",
};

export function suggestEmail(email: string) {
  const [user, domain] = email.trim().split("@");
  if (!user || !domain) return "";
  const fix = TYPOS[domain.toLowerCase()];
  return fix ? `${user}@${fix}` : "";
}

/* ---------- CSS bersama ---------- */
const CSS = `
@keyframes auth-shake{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(2px)}30%,50%,70%{transform:translateX(-4px)}40%,60%{transform:translateX(4px)}}
.auth-shake{animation:auth-shake .45s cubic-bezier(.36,.07,.19,.97)}
@keyframes auth-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.auth-rise{animation:auth-rise .5s cubic-bezier(.2,.7,.2,1) both}
@keyframes auth-toast{from{opacity:0;transform:translateY(-12px) scale(.97)}to{opacity:1;transform:none}}
.auth-toast{animation:auth-toast .28s ease-out both}
@keyframes auth-drain{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@keyframes auth-pop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
.auth-pop{animation:auth-pop .3s ease-out both}
.input{transition:border-color .2s ease,box-shadow .2s ease}
.input[aria-invalid="true"],.auth-pw[data-invalid="true"] input{border-color:#ef4444;box-shadow:0 0 0 3px rgb(239 68 68 / .15)}
.input[data-ok="true"]{border-color:#10b981}
.auth-press{transition:transform .15s ease,box-shadow .2s ease,opacity .2s ease}
.auth-press:not(:disabled):hover{transform:translateY(-1px)}
.auth-press:not(:disabled):active{transform:translateY(1px) scale(.99)}
@media (prefers-reduced-motion:reduce){
  .auth-shake,.auth-rise,.auth-toast,.auth-pop{animation:none!important}
  .auth-press{transition:none}
}
`;

export function AuthStyles() {
  return <style>{CSS}</style>;
}

/* ---------- Toast untuk galat dari server ---------- */
export function Toast({ title, message, onClose }: { title: string; message: string; onClose: () => void }) {
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => close.current(), 5000);
    return () => window.clearTimeout(t);
  }, [message]);

  if (!message) return null;
  return (
    <div
      key={message}
      role="alert"
      aria-live="assertive"
      className="auth-toast fixed inset-x-4 top-5 z-[9999] mx-auto max-w-md overflow-hidden rounded-xl border border-red-500/20 bg-white text-sm text-red-600 shadow-2xl shadow-black/10 dark:bg-[#1c1c25] dark:text-red-400"
    >
      <div className="flex items-start gap-3 p-4">
        <svg className="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 break-words">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup notifikasi"
          className="shrink-0 rounded-md p-1 opacity-60 transition hover:bg-red-500/10 hover:opacity-100"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m18 6-12 12M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="h-0.5 origin-left bg-red-500/60" style={{ animation: "auth-drain 5s linear forwards" }} />
    </div>
  );
}

/* ---------- Kolom isian dengan pesan di bawahnya ---------- */
export function Field({
  id, label, error, hint, ok, delay = 0, children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  ok?: boolean;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <div className="auth-rise" style={{ animationDelay: `${delay}ms` }}>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        {children}
        {ok && !error && (
          <svg className="auth-pop pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </div>
      <div className="min-h-[1.5rem]" aria-live="polite">
        {error ? (
          <p id={`${id}-err`} className="auth-rise mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
            {error}
          </p>
        ) : hint ? (
          <div className="mt-1.5 text-xs text-muted">{hint}</div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- Kekuatan password ---------- */
export function passwordScore(pw: string) {
  if (!pw) return 0;
  if (pw.length < 8) return 1;
  let s = 1;
  if (pw.length >= 12) s++;
  if ((/[a-z]/.test(pw) && /[A-Z]/.test(pw)) || (/[A-Za-z]/.test(pw) && /\d/.test(pw))) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

export function StrengthMeter({ password }: { password: string }) {
  const score = passwordScore(password);
  const short = password.length > 0 && password.length < 8;
  const labels = ["", "Belum 8 karakter", "Cukup", "Bagus", "Kuat"];
  const colors = ["", "bg-red-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"];
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${score >= n && password ? colors[short ? 1 : score] : "bg-current opacity-10"}`}
            style={score >= n && password ? { opacity: 1 } : undefined}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {password ? labels[score] : "Minimal 8 karakter. Campur huruf dan angka agar lebih kuat."}
      </p>
    </div>
  );
}

/* ---------- Tombol kirim ---------- */
export function SubmitButton({
  busy, done, idle, working, success,
}: { busy: boolean; done: boolean; idle: string; working: string; success: string }) {
  return (
    <button
      type="submit"
      disabled={busy || done}
      className="btn-primary auth-press flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {done ? (
        <>
          <svg className="auth-pop h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
          {success}
        </>
      ) : busy ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          {working}
        </>
      ) : (
        idle
      )}
    </button>
  );
}