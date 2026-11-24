"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";
import OtpInput from "@/components/OtpInput";
import PinSetup from "@/components/PinSetup";
import { AuthStyles, Toast, Field, SubmitButton, EMAIL_RE, suggestEmail } from "@/components/AuthBits";

const REMEMBER_KEY = "galaxy:email";
type Step = "email" | "password" | "human" | "pin" | "setpin";

const emailError = (v: string) =>
  !v.trim() ? "Email wajib diisi." : !EMAIL_RE.test(v.trim()) ? "Format email belum benar. Contoh: nama@toko.com" : "";

const TITLES: Record<Step, [string, string]> = {
  email: ["Selamat datang kembali", "Masukkan email akun Anda untuk melanjutkan."],
  password: ["Masukkan password", "Masukkan password akun Anda."],
  human: ["Verifikasi keamanan", "Pastikan Anda bukan robot."],
  pin: ["Masukkan PIN", "Masukkan PIN 6 digit Anda."],
  setpin: ["Buat PIN Anda", "Akun ini belum punya PIN. Buat dulu sebelum membuka dashboard."],
};

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function Login() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [human, setHuman] = useState(false);
  const [humanReady, setHumanReady] = useState(false);
  const [remember, setRemember] = useState(true);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [caps, setCaps] = useState(false);
  const [serverErr, setServerErr] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [lockLeft, setLockLeft] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) setEmail(saved);
    } catch {}
  }, []);

  // Hitung mundur saat akun dibekukan
  useEffect(() => {
    if (lockLeft <= 0) return;
    const t = window.setInterval(() => setLockLeft((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(t);
  }, [lockLeft > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Kotak "bukan robot" baru aktif setelah jeda singkat
  useEffect(() => {
    if (step !== "human") return;
    setHumanReady(false);
    const t = window.setTimeout(() => setHumanReady(true), 1700);
    return () => window.clearTimeout(t);
  }, [step]);

  const eErr = touchedEmail ? emailError(email) : "";
  const suggestion = touchedEmail && !eErr ? suggestEmail(email) : "";
  const locked = lockLeft > 0;
  const disabled = busy || done || locked;

  const fail = (e: unknown, fallback: string) => {
    setServerErr(e instanceof Error ? e.message : fallback);
    if (e instanceof ApiError && typeof e.data?.retryAfter === "number") setLockLeft(e.data.retryAfter);
    setShake(true);
    window.setTimeout(() => setShake(false), 480);
  };

  // Token tahap kedaluwarsa: kembali ke awal
  const reset = () => { setStep("email"); setToken(""); setPassword(""); setPin(""); setHuman(false); };

  async function call<T>(url: string, body: unknown, ok: (r: T) => void, fallback: string) {
    if (disabled) return;
    setServerErr("");
    setBusy(true);
    try {
      ok(await api<T>(url, { method: "POST", body }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401 && /berakhir/i.test(e.message)) reset();
      fail(e, fallback);
      setPin("");
    }
    setBusy(false);
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setTouchedEmail(true);
    if (emailError(email)) return fail(new Error(emailError(email)), "");
    call<{ token: string }>("/api/auth/login/email", { email: email.trim() }, (r) => {
      try { if (remember) localStorage.setItem(REMEMBER_KEY, email.trim()); else localStorage.removeItem(REMEMBER_KEY); } catch {}
      setToken(r.token); setStep("password");
    }, "Gagal memeriksa email.");
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return fail(new Error("Password wajib diisi."), "");
    call<{ token: string }>("/api/auth/login/password", { token, password }, (r) => {
      setPassword(""); setToken(r.token); setStep("human");
    }, "Gagal memeriksa password.");
  }

  function submitHuman(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const hp = (e.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
    call<{ token: string; mode: "pin" | "setpin" }>("/api/auth/login/human", { token, checked: human, hp }, (r) => {
      setToken(r.token); setStep(r.mode);
    }, "Verifikasi gagal.");
  }

  function submitPin(code: string) {
    call<{ ok: true }>("/api/auth/login/pin", { token, pin: code }, () => {
      setDone(true);
      router.replace("/dashboard");
    }, "PIN salah.");
  }

  const [title, subtitle] = TITLES[step];

  return (
    <>
      <AuthStyles />
      <Toast title="Login gagal" message={serverErr} onClose={() => setServerErr("")} />

      <AuthShell
        title={title}
        subtitle={subtitle}
        step={{ at: ({ email: 1, password: 2, human: 3, pin: 4, setpin: 4 } as Record<Step, number>)[step], of: 4 }}
        footer={
          <>
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold text-link">Daftarkan toko</Link>
          </>
        }
      >
        {locked && (
          <div role="alert" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
            Terlalu banyak percobaan salah. Coba lagi dalam <b className="tabular-nums">{mmss(lockLeft)}</b>.
          </div>
        )}

        {step === "email" && (
          <form onSubmit={submitEmail} noValidate className={`space-y-1 ${shake ? "auth-shake" : ""}`}>
            <Field
              id="email" label="Email" error={eErr} ok={touchedEmail && !eErr && !!email} delay={0}
              hint={suggestion ? (
                <button type="button" onClick={() => setEmail(suggestion)} className="text-left font-medium text-link underline underline-offset-2">
                  Maksud Anda {suggestion}?
                </button>
              ) : undefined}
            >
              <input
                suppressHydrationWarning
                id="email" name="email" type="email" autoComplete="email" placeholder="nama@toko.com" className="input pr-10"
                value={email} disabled={disabled} aria-invalid={!!eErr} data-ok={touchedEmail && !eErr && !!email}
                onBlur={() => setTouchedEmail(true)}
                onChange={(e) => { setEmail(e.target.value); setServerErr(""); }}
              />
            </Field>
            <div className="auth-rise flex items-center pb-3 pt-1" style={{ animationDelay: "120ms" }}>
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 cursor-pointer rounded accent-[rgb(var(--accent))]" />
                Ingat email saya
              </label>
            </div>
            <SubmitButton busy={busy} done={false} idle="Lanjut" working="Memeriksa..." success="" />
          </form>
        )}

        {step === "password" && (
          <form onSubmit={submitPassword} noValidate className={`space-y-1 ${shake ? "auth-shake" : ""}`}>
            <p className="pb-2 text-sm text-muted">Masuk sebagai <b className="text-current">{email}</b>{" "}
              <button type="button" onClick={reset} className="font-medium text-link underline underline-offset-2">Ganti</button>
            </p>
            <Field id="pw" label="Password" delay={0} hint={caps ? <span className="font-medium text-amber-600 dark:text-amber-400">Caps Lock sedang menyala</span> : undefined}>
              <div className="auth-pw" onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))} onBlur={() => setCaps(false)}>
                <PasswordInput id="pw" autoComplete="current-password" value={password} disabled={disabled} onChange={(v) => { setPassword(v); setServerErr(""); }} />
              </div>
            </Field>
            <p className="pb-3 text-right text-sm"><Link href="/lupa-password" className="font-medium text-link underline underline-offset-2">Lupa password?</Link></p>
            <SubmitButton busy={busy} done={false} idle="Lanjut" working="Memeriksa..." success="" />
          </form>
        )}

        {step === "human" && (
          <form onSubmit={submitHuman} noValidate className={`space-y-4 ${shake ? "auth-shake" : ""}`}>
            {/* Kolom jebakan: manusia tidak melihatnya, bot biasanya mengisinya */}
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
            <label className={`flex items-center gap-3 rounded-xl border p-4 transition ${humanReady ? "cursor-pointer border-current/20" : "cursor-wait border-current/10 opacity-60"}`}>
              <input type="checkbox" checked={human} disabled={!humanReady || disabled} onChange={(e) => setHuman(e.target.checked)} className="h-5 w-5 rounded accent-[rgb(var(--accent))]" />
              <span className="text-sm font-medium">Saya bukan robot</span>
            </label>
            <button type="submit" disabled={!human || disabled} className="btn-primary auth-press w-full disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? "Memeriksa..." : "Masuk"}
            </button>
          </form>
        )}

        {step === "pin" && (
          <div className={`space-y-4 ${shake ? "auth-shake" : ""}`}>
            <OtpInput label="PIN" value={pin} onChange={setPin} onComplete={submitPin} mask autoFocus disabled={disabled} />
            <button type="button" disabled={pin.length !== 6 || disabled} onClick={() => submitPin(pin)} className="btn-primary auth-press w-full disabled:cursor-not-allowed disabled:opacity-60">
              {done ? "Berhasil, membuka dashboard" : busy ? "Memeriksa..." : "Buka dashboard"}
            </button>
          </div>
        )}

        {step === "setpin" && (
          <PinSetup token={token} onError={(m) => fail(new Error(m), "")} onDone={() => router.replace("/dashboard")} />
        )}
      </AuthShell>
    </>
  );
}