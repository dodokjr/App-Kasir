"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/client";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";
import OtpInput from "@/components/OtpInput";
import PinSetup from "@/components/PinSetup";
import { AuthStyles, Toast, Field, SubmitButton, StrengthMeter, EMAIL_RE, suggestEmail } from "@/components/AuthBits";

const TYPES: { v: string; label: string; hint: string; example: string; icon: ReactNode }[] = [
  {
    v: "retail",
    label: "Retail",
    hint: "Toko, minimarket, butik",
    example: "Toko Maju Jaya",
    icon: (<><path d="M6 7h12l1 13H5L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></>),
  },
  {
    v: "fnb",
    label: "F&B",
    hint: "Kafe, resto, warung",
    example: "Warung Bu Tini",
    icon: (<><path d="M5 8h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V8Z" /><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17" /><path d="M8 3v2M12 3v2" /></>),
  },
];

type Form = { name: string; email: string; password: string; storeName: string; businessType: string };
type Key = "name" | "email" | "password" | "storeName";

const validators: Record<Key, (v: string) => string> = {
  name: (v) => (v.trim() ? "" : "Nama wajib diisi."),
  email: (v) =>
    !v.trim() ? "Email wajib diisi." : !EMAIL_RE.test(v.trim()) ? "Format email belum benar. Contoh: nama@toko.com" : "",
  password: (v) => (!v ? "Password wajib diisi." : v.length < 8 ? "Password minimal 8 karakter." : ""),
  storeName: (v) => (v.trim() ? "" : "Nama toko wajib diisi."),
};
const ORDER: Key[] = ["name", "email", "password", "storeName"];
const IDS: Record<Key, string> = { name: "name", email: "email", password: "pw", storeName: "store" };

const Divider = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-3 pb-1 pt-3 text-sm font-semibold">
    {children}
    <span className="h-px flex-1 bg-current opacity-10" />
  </div>
);

export default function Register() {
  const router = useRouter();

  const [f, setF] = useState<Form>({ name: "", email: "", password: "", storeName: "", businessType: "retail" });
  const [touched, setTouched] = useState<Record<Key, boolean>>({ name: false, email: false, password: false, storeName: false });
  const [serverErr, setServerErr] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState<"form" | "otp" | "setpin">("form");
  const [token, setToken] = useState("");
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setInterval(() => setResendIn((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(t);
  }, [resendIn > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const locked = busy || done;
  const errs = Object.fromEntries(ORDER.map((k) => [k, validators[k](f[k])])) as Record<Key, string>;
  const shown = (k: Key) => (touched[k] ? errs[k] : "");
  const validCount = ORDER.filter((k) => !errs[k]).length;
  const suggestion = touched.email && !errs.email ? suggestEmail(f.email) : "";
  const type = TYPES.find((t) => t.v === f.businessType) ?? TYPES[0];

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setF((c) => ({ ...c, [key]: value }));
    setServerErr("");
  }
  const touch = (k: Key) => setTouched((t) => ({ ...t, [k]: true }));

  function triggerShake() {
    setShake(true);
    window.setTimeout(() => setShake(false), 480);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || done) return;

    setServerErr("");
    setTouched({ name: true, email: true, password: true, storeName: true });

    const firstBad = ORDER.find((k) => errs[k]);
    if (firstBad) {
      triggerShake();
      document.getElementById(IDS[firstBad])?.focus();
      return;
    }

    if (!TYPES.some((t) => t.v === f.businessType)) {
      setServerErr("Silakan pilih jenis usaha yang tersedia.");
      triggerShake();
      return;
    }

    setBusy(true);
    try {
      const r = await api<{ token: string; resendIn: number }>("/api/auth/register", {
        method: "POST",
        body: { ...f, name: f.name.trim(), email: f.email.trim(), storeName: f.storeName.trim() },
      });
      setToken(r.token);
      setResendIn(r.resendIn);
      setCode("");
      setStep("otp");
    } catch (error) {
      setServerErr(error instanceof Error ? error.message : "Registrasi gagal. Silakan coba kembali.");
      if (error instanceof ApiError && typeof error.data?.retryAfter === "number") setResendIn(error.data.retryAfter);
      triggerShake();
    }
    setBusy(false);
  }

  async function verify(c: string) {
    if (verifying || c.length !== 6) return;
    setVerifying(true);
    setServerErr("");
    try {
      const r = await api<{ token: string }>("/api/auth/register/verify", { method: "POST", body: { token, code: c } });
      setToken(r.token);
      setStep("setpin");
    } catch (error) {
      setServerErr(error instanceof Error ? error.message : "Kode salah.");
      triggerShake();
      setCode("");
      if (error instanceof ApiError && error.data?.expired) setResendIn(0);
    }
    setVerifying(false);
  }

  async function resend() {
    if (resendIn > 0) return;
    setServerErr("");
    try {
      const r = await api<{ resendIn: number }>("/api/auth/register/resend", { method: "POST", body: { token } });
      setResendIn(r.resendIn);
      setCode("");
    } catch (error) {
      setServerErr(error instanceof Error ? error.message : "Gagal mengirim ulang kode.");
      if (error instanceof ApiError && typeof error.data?.retryAfter === "number") setResendIn(error.data.retryAfter);
    }
  }

  return (
    <>
      <AuthStyles />
      <Toast title="Registrasi gagal" message={serverErr} onClose={() => setServerErr("")} />

      <AuthShell
        step={{ at: step === "form" ? 1 : step === "otp" ? 2 : 3, of: 3 }}
        title={step === "form" ? "Daftarkan toko Anda" : step === "otp" ? "Cek email Anda" : "Buat PIN Anda"}
        subtitle={
          step === "form" ? "Buat akun kepala toko dan mulai berjualan hari ini."
          : step === "otp" ? `Kami mengirim kode 6 digit ke ${f.email.trim()}. Berlaku 10 menit.`
          : "Langkah terakhir. PIN dipakai setiap kali masuk, setelah password."
        }
        footer={
          <>
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-link">Masuk</Link>
          </>
        }
      >
        {step === "otp" && (
          <div className={`space-y-4 ${shake ? "auth-shake" : ""}`}>
            <OtpInput label="Kode OTP" value={code} onChange={setCode} onComplete={verify} autoFocus disabled={verifying} />
            <button type="button" disabled={code.length !== 6 || verifying} onClick={() => verify(code)} className="btn-primary auth-press w-full disabled:cursor-not-allowed disabled:opacity-60">
              {verifying ? "Memeriksa..." : "Verifikasi"}
            </button>
            <p className="text-center text-sm text-muted">
              Tidak menerima kode?{" "}
              {resendIn > 0 ? <span className="tabular-nums">Kirim ulang dalam {resendIn} detik</span> : (
                <button type="button" onClick={resend} className="font-semibold text-link underline underline-offset-2">Kirim ulang</button>
              )}
            </p>
            <p className="text-center text-sm">
              <button type="button" onClick={() => { setStep("form"); setCode(""); }} className="text-muted underline underline-offset-2">Ubah data pendaftaran</button>
            </p>
          </div>
        )}

        {step === "setpin" && (
          <PinSetup token={token} onError={(m) => { setServerErr(m); triggerShake(); }} onDone={() => router.replace("/dashboard")} />
        )}

        {step === "form" && (
        <form onSubmit={submit} noValidate className={`space-y-1 ${shake ? "auth-shake" : ""}`}>
          {/* Kemajuan pengisian */}
          <div className="auth-rise pb-2" aria-live="polite">
            <div className="flex gap-1.5">
              {ORDER.map((k, i) => (
                <span
                  key={k}
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${errs[k] ? "bg-current opacity-10" : "bg-accent"}`}
                  style={{ transitionDelay: `${i * 40}ms` }}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {validCount === 4 ? "Semua sudah terisi. Tinggal daftar." : `${validCount} dari 4 kolom terisi`}
            </p>
          </div>

          <Divider>Tentang Anda</Divider>

          <Field id="name" label="Nama Anda" error={shown("name")} ok={touched.name && !errs.name} delay={40}>
            <input
              suppressHydrationWarning
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Nama lengkap"
              className="input pr-10"
              value={f.name}
              disabled={locked}
              aria-invalid={!!shown("name")}
              aria-describedby={shown("name") ? "name-err" : undefined}
              data-ok={touched.name && !errs.name}
              onBlur={() => touch("name")}
              onChange={(e) => update("name", e.target.value)}
            />
          </Field>

          <Field
            id="email"
            label="Email"
            error={shown("email")}
            ok={touched.email && !errs.email}
            delay={80}
            hint={
              suggestion ? (
                <button
                  type="button"
                  onClick={() => update("email", suggestion)}
                  className="text-left font-medium text-link underline underline-offset-2"
                >
                  Maksud Anda {suggestion}?
                </button>
              ) : undefined
            }
          >
            <input
              suppressHydrationWarning
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@toko.com"
              className="input pr-10"
              value={f.email}
              disabled={locked}
              aria-invalid={!!shown("email")}
              aria-describedby={shown("email") ? "email-err" : undefined}
              data-ok={touched.email && !errs.email}
              onBlur={() => touch("email")}
              onChange={(e) => update("email", e.target.value)}
            />
          </Field>

          <Field id="pw" label="Password" error={shown("password")} delay={120}>
            <div className="auth-pw" data-invalid={!!shown("password")} onBlur={() => touch("password")}>
              <PasswordInput
                id="pw"
                autoComplete="new-password"
                minLength={8}
                value={f.password}
                disabled={locked}
                onChange={(value) => update("password", value)}
              />
            </div>
            <StrengthMeter password={f.password} />
          </Field>

          <Divider>Tentang toko</Divider>

          {/* Jenis usaha */}
          <fieldset disabled={locked} className="auth-rise pb-3" style={{ animationDelay: "160ms" }}>
            <legend className="label">Jenis usaha</legend>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((t) => {
                const selected = f.businessType === t.v;
                return (
                  <label
                    key={t.v}
                    className={`relative cursor-pointer rounded-xl border p-3 transition-all duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${
                      selected
                        ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10 ring-1 ring-[rgb(var(--accent))]"
                        : "border-current/15 hover:-translate-y-0.5 hover:border-current/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="businessType"
                      value={t.v}
                      checked={selected}
                      onChange={() => update("businessType", t.v)}
                      className="sr-only"
                    />
                    <svg
                      className={`mb-2 h-6 w-6 transition-transform duration-200 ${selected ? "scale-110" : "opacity-60"}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      {t.icon}
                    </svg>
                    <span className="block text-sm font-semibold">{t.label}</span>
                    <span className="block text-xs text-muted">{t.hint}</span>
                    {selected && (
                      <svg className="auth-pop absolute right-2.5 top-2.5 h-4 w-4 text-[rgb(var(--accent))]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <Field id="store" label="Nama toko" error={shown("storeName")} ok={touched.storeName && !errs.storeName} delay={200}>
            <input
              suppressHydrationWarning
              id="store"
              name="storeName"
              type="text"
              autoComplete="organization"
              placeholder={type.example}
              className="input pr-10"
              value={f.storeName}
              disabled={locked}
              aria-invalid={!!shown("storeName")}
              aria-describedby={shown("storeName") ? "store-err" : undefined}
              data-ok={touched.storeName && !errs.storeName}
              onBlur={() => touch("storeName")}
              onChange={(e) => update("storeName", e.target.value)}
            />
          </Field>

          <div className="auth-rise pt-1" style={{ animationDelay: "260ms" }}>
            <SubmitButton
              busy={busy}
              done={done}
              idle="Daftar dan kirim kode OTP"
              working="Mengirim kode..."
              success="Kode terkirim"
            />
          </div>

          <p className="pt-3 text-center text-xs text-muted">
            Dengan mendaftar, Anda menyetujui{" "}
            <Link href="/privasi" className="underline underline-offset-2">Kebijakan Privasi</Link>{" "}
            kami.
          </p>
        </form>
        )}
      </AuthShell>
    </>
  );
}