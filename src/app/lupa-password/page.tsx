"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";
import OtpInput from "@/components/OtpInput";
import { AuthStyles, Toast, Field, SubmitButton, StrengthMeter, EMAIL_RE, suggestEmail } from "@/components/AuthBits";

type Step = "email" | "otp" | "newpw" | "done";

const TITLES: Record<Step, [string, string]> = {
  email: ["Lupa password", "Masukkan email akun Anda. Kami kirim kode 6 digit untuk membuat password baru."],
  otp: ["Cek email Anda", "Masukkan kode 6 digit yang kami kirim. Berlaku 10 menit."],
  newpw: ["Buat password baru", "Minimal 8 karakter. Jangan sama dengan password lama."],
  done: ["Password sudah diganti", "Silakan masuk dengan password baru Anda."],
};

export default function LupaPassword() {
  const [step, setStep] = useState<Step>("email");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setInterval(() => setResendIn((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(t);
  }, [resendIn > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const emailErr = !email.trim() ? "Email wajib diisi." : !EMAIL_RE.test(email.trim()) ? "Format email belum benar. Contoh: nama@toko.com" : "";
  const suggestion = touched && !emailErr ? suggestEmail(email) : "";

  const fail = (e: unknown, fallback: string) => {
    setErr(e instanceof Error ? e.message : fallback);
    if (e instanceof ApiError && typeof e.data?.retryAfter === "number") setResendIn(e.data.retryAfter);
    setShake(true);
    window.setTimeout(() => setShake(false), 480);
  };

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setTouched(true); setErr("");
    if (emailErr) return fail(new Error(emailErr), "");
    setBusy(true);
    try {
      const r = await api<{ token: string; resendIn: number }>("/api/auth/forgot", { method: "POST", body: { email: email.trim() } });
      setToken(r.token); setResendIn(r.resendIn); setCode(""); setStep("otp");
    } catch (x) { fail(x, "Gagal mengirim kode."); }
    setBusy(false);
  }

  async function verify(c: string) {
    if (busy || c.length !== 6) return;
    setBusy(true); setErr("");
    try {
      const r = await api<{ token: string }>("/api/auth/forgot/verify", { method: "POST", body: { token, code: c } });
      setToken(r.token); setStep("newpw");
    } catch (x) {
      fail(x, "Kode salah.");
      setCode("");
      if (x instanceof ApiError && x.status === 401 && /berakhir/i.test(x.message)) setStep("email");
    }
    setBusy(false);
  }

  async function resend() {
    if (resendIn > 0) return;
    setErr("");
    try {
      const r = await api<{ resendIn: number }>("/api/auth/forgot/resend", { method: "POST", body: { token } });
      setResendIn(r.resendIn); setCode("");
    } catch (x) { fail(x, "Gagal mengirim ulang kode."); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr("");
    if (pw.length < 8) return fail(new Error("Password minimal 8 karakter."), "");
    if (pw !== pw2) return fail(new Error("Konfirmasi password tidak sama."), "");
    setBusy(true);
    try {
      await api("/api/auth/forgot/reset", { method: "POST", body: { token, password: pw, confirm: pw2 } });
      setPw(""); setPw2(""); setStep("done");
    } catch (x) {
      fail(x, "Gagal menyimpan password.");
      if (x instanceof ApiError && x.status === 401) setStep("email");
    }
    setBusy(false);
  }

  const [title, subtitle] = TITLES[step];

  return (
    <>
      <AuthStyles />
      <Toast title="Gagal" message={err} onClose={() => setErr("")} />
      <AuthShell
        step={{ at: ({ email: 1, otp: 2, newpw: 3, done: 4 } as Record<Step, number>)[step], of: 4 }}
        title={title}
        subtitle={step === "otp" ? `Kode dikirim ke ${email.trim()} bila email itu terdaftar. Berlaku 10 menit.` : subtitle}
        footer={<>Ingat password Anda? <Link href="/login" className="font-semibold text-link">Masuk</Link></>}
      >
        {step === "email" && (
          <form onSubmit={sendEmail} noValidate className={`space-y-1 ${shake ? "auth-shake" : ""}`}>
            <Field id="email" label="Email" error={touched ? emailErr : ""} ok={touched && !emailErr} delay={0}
              hint={suggestion ? (
                <button type="button" onClick={() => setEmail(suggestion)} className="text-left font-medium text-link underline underline-offset-2">Maksud Anda {suggestion}?</button>
              ) : undefined}>
              <input suppressHydrationWarning id="email" name="email" type="email" autoComplete="email" placeholder="nama@toko.com" className="input pr-10" autoFocus
                value={email} disabled={busy} aria-invalid={touched && !!emailErr}
                onBlur={() => setTouched(true)} onChange={(e) => { setEmail(e.target.value); setErr(""); }} />
            </Field>
            <SubmitButton busy={busy} done={false} idle="Kirim kode" working="Mengirim..." success="" />
          </form>
        )}

        {step === "otp" && (
          <div className={`space-y-4 ${shake ? "auth-shake" : ""}`}>
            <OtpInput label="Kode OTP" value={code} onChange={setCode} onComplete={verify} autoFocus disabled={busy} />
            <button type="button" disabled={code.length !== 6 || busy} onClick={() => verify(code)} className="btn-primary auth-press w-full disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? "Memeriksa..." : "Verifikasi"}
            </button>
            <p className="text-center text-sm text-muted">
              Tidak menerima kode?{" "}
              {resendIn > 0 ? <span className="tabular-nums">Kirim ulang dalam {resendIn} detik</span> : (
                <button type="button" onClick={resend} className="font-semibold text-link underline underline-offset-2">Kirim ulang</button>
              )}
            </p>
            <p className="text-center text-sm">
              <button type="button" onClick={() => { setStep("email"); setCode(""); setErr(""); }} className="text-muted underline underline-offset-2">Ganti email</button>
            </p>
          </div>
        )}

        {step === "newpw" && (
          <form onSubmit={save} noValidate className={`space-y-1 ${shake ? "auth-shake" : ""}`}>
            <Field id="np" label="Password baru" delay={0}>
              <div className="auth-pw"><PasswordInput id="np" autoComplete="new-password" minLength={8} value={pw} disabled={busy} onChange={(v) => { setPw(v); setErr(""); }} /></div>
              <StrengthMeter password={pw} />
            </Field>
            <Field id="np2" label="Ulangi password baru" delay={40}>
              <div className="auth-pw"><PasswordInput id="np2" autoComplete="new-password" minLength={8} value={pw2} disabled={busy} onChange={(v) => { setPw2(v); setErr(""); }} /></div>
            </Field>
            <SubmitButton busy={busy} done={false} idle="Simpan password" working="Menyimpan..." success="" />
          </form>
        )}

        {step === "done" && (
          <div className="space-y-4">
            <p className="rounded-xl border border-current/10 p-3 text-sm">Demi keamanan, semua perangkat yang sedang masuk di akun ini sudah dikeluarkan. Saat masuk nanti Anda tetap memakai PIN 6 digit.</p>
            <Link href="/login" className="btn-primary auth-press block w-full text-center">Ke halaman masuk</Link>
          </div>
        )}
      </AuthShell>
    </>
  );
}