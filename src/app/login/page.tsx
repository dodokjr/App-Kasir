
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";

export default function Login() {
  const router = useRouter();

  const [f, setF] = useState({
    email: "",
    password: "",
  });

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Alert otomatis menghilang setelah 3,5 detik
  useEffect(() => {
    if (!err) return;

    const timer = window.setTimeout(() => {
      setErr("");
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [err]);

  // Menampilkan pesan error
  function showError(message: string) {
    setErr(message);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (busy) return;

    setErr("");

    // Validasi email dan password kosong
    if (!f.email.trim() && !f.password) {
      showError("Email dan password wajib diisi.");
      return;
    }

    if (!f.email.trim()) {
      showError("Email wajib diisi.");
      return;
    }

    if (!f.password) {
      showError("Password wajib diisi.");
      return;
    }

    // Validasi format email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(f.email.trim())) {
      showError("Format email tidak valid. Periksa kembali email Anda.");
      return;
    }

    setBusy(true);

    try {
      await api("/api/auth/login", {
        method: "POST",
        body: {
          email: f.email.trim(),
          password: f.password,
        },
      });

      router.replace("/dashboard");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Login gagal. Silakan coba kembali.";

      showError(message);
      setBusy(false);
    }
  }

  return (
    <>
      {/* Floating Toast Alert */}
      {err && (
        <div
          key={err}
          role="alert"
          aria-live="assertive"
          className="fixed left-1/2 top-5 z-[9999] flex w-[calc(100%-32px)] max-w-md -translate-x-1/2 items-start gap-3 rounded-xl border border-red-500/20 bg-white p-4 text-sm text-red-600 shadow-2xl shadow-black/10 dark:bg-[#1c1c25] dark:text-red-400 animate-[galaxy-toast-in_300ms_ease-out]"
        >
          {/* Error Icon */}
          <svg
            className="mt-0.5 h-5 w-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>

          {/* Error Message */}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Login gagal</p>
            <p className="mt-0.5 break-words">{err}</p>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => setErr("")}
            aria-label="Tutup notifikasi"
            className="shrink-0 rounded-md p-1 opacity-60 transition hover:bg-red-500/10 hover:opacity-100"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <AuthShell
        title="Selamat datang kembali"
        subtitle="Masuk untuk membuka kasir dan laporan toko Anda."
        footer={
          <>
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold text-link">
              Daftarkan toko
            </Link>
          </>
        }
      >
        <form onSubmit={submit} noValidate className="space-y-5">
          {/* Email */}
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@toko.com"
              className="input"
              value={f.email}
              disabled={busy}
              onChange={(e) => {
                setF((current) => ({
                  ...current,
                  email: e.target.value,
                }));

                setErr("");
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label className="label" htmlFor="pw">
              Password
            </label>

            <PasswordInput
              id="pw"
              autoComplete="current-password"
              value={f.password}
              onChange={(value) => {
                setF((current) => ({
                  ...current,
                  password: value,
                }));

                setErr("");
              }}
              disabled={busy}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={busy}
            className="btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                Memproses...
              </>
            ) : (
              "Masuk ke Galaxy Kasir"
            )}
          </button>
        </form>
      </AuthShell>
    </>
  );
}
