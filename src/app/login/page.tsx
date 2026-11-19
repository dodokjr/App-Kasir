"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";
import { AuthStyles, Toast, Field, SubmitButton, EMAIL_RE, suggestEmail } from "@/components/AuthBits";

const REMEMBER_KEY = "galaxy:email";

const emailError = (v: string) =>
  !v.trim() ? "Email wajib diisi." : !EMAIL_RE.test(v.trim()) ? "Format email belum benar. Contoh: nama@toko.com" : "";
const passwordError = (v: string) => (v ? "" : "Password wajib diisi.");

export default function Login() {
  const router = useRouter();

  const [f, setF] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [remember, setRemember] = useState(true);
  const [caps, setCaps] = useState(false);
  const [serverErr, setServerErr] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Isi email dari login sebelumnya
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) setF((c) => ({ ...c, email: saved }));
    } catch {}
  }, []);

  const eErr = touched.email ? emailError(f.email) : "";
  const pErr = touched.password ? passwordError(f.password) : "";
  const suggestion = touched.email && !eErr ? suggestEmail(f.email) : "";

  function triggerShake() {
    setShake(true);
    window.setTimeout(() => setShake(false), 480);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || done) return;

    setServerErr("");
    setTouched({ email: true, password: true });

    const ee = emailError(f.email);
    const pe = passwordError(f.password);
    if (ee || pe) {
      triggerShake();
      document.getElementById(ee ? "email" : "pw")?.focus();
      return;
    }

    setBusy(true);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: { email: f.email.trim(), password: f.password },
      });

      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, f.email.trim());
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {}

      setBusy(false);
      setDone(true);
      router.replace("/dashboard");
    } catch (error) {
      setServerErr(error instanceof Error ? error.message : "Login gagal. Silakan coba kembali.");
      triggerShake();
      setBusy(false);
    }
  }

  return (
    <>
      <AuthStyles />
      <Toast title="Login gagal" message={serverErr} onClose={() => setServerErr("")} />

      <AuthShell
        title="Selamat datang kembali"
        subtitle="Masuk untuk membuka kasir dan laporan toko Anda."
        footer={
          <>
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold text-link">Daftarkan toko</Link>
          </>
        }
      >
        <form onSubmit={submit} noValidate className={`space-y-1 ${shake ? "auth-shake" : ""}`}>
          <Field
            id="email"
            label="Email"
            error={eErr}
            ok={touched.email && !eErr && !!f.email}
            delay={0}
            hint={
              suggestion ? (
                <button
                  type="button"
                  onClick={() => setF((c) => ({ ...c, email: suggestion }))}
                  className="text-left font-medium text-link underline underline-offset-2"
                >
                  Maksud Anda {suggestion}?
                </button>
              ) : undefined
            }
          >
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@toko.com"
              className="input pr-10"
              value={f.email}
              disabled={busy || done}
              aria-invalid={!!eErr}
              aria-describedby={eErr ? "email-err" : undefined}
              data-ok={touched.email && !eErr && !!f.email}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              onChange={(e) => {
                setF((c) => ({ ...c, email: e.target.value }));
                setServerErr("");
              }}
            />
          </Field>

          <Field
            id="pw"
            label="Password"
            error={pErr}
            delay={80}
            hint={caps ? <span className="font-medium text-amber-600 dark:text-amber-400">Caps Lock sedang menyala</span> : undefined}
          >
            <div
              className="auth-pw"
              data-invalid={!!pErr}
              onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
              onBlur={() => {
                setCaps(false);
                setTouched((t) => ({ ...t, password: true }));
              }}
            >
              <PasswordInput
                id="pw"
                autoComplete="current-password"
                value={f.password}
                disabled={busy || done}
                onChange={(value) => {
                  setF((c) => ({ ...c, password: value }));
                  setServerErr("");
                }}
              />
            </div>
          </Field>

          <div className="auth-rise flex items-center justify-between pb-3 pt-1" style={{ animationDelay: "160ms" }}>
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded accent-[rgb(var(--accent))]"
              />
              Ingat email saya
            </label>
          </div>

          <div className="auth-rise" style={{ animationDelay: "240ms" }}>
            <SubmitButton
              busy={busy}
              done={done}
              idle="Masuk ke Galaxy Kasir"
              working="Memeriksa..."
              success="Berhasil, membuka dashboard"
            />
          </div>
        </form>
      </AuthShell>
    </>
  );
}