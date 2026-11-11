
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";

const TYPES = [
  {
    v: "retail",
    label: "Retail",
    hint: "Toko, minimarket, butik",
  },
  {
    v: "fnb",
    label: "F&B",
    hint: "Kafe, resto, warung",
  },
];

export default function Register() {
  const router = useRouter();

  const [f, setF] = useState({
    name: "",
    email: "",
    password: "",
    storeName: "",
    businessType: "retail",
  });

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Alert otomatis hilang setelah 3,5 detik
  useEffect(() => {
    if (!err) return;

    const timer = window.setTimeout(() => {
      setErr("");
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [err]);

  // Update input
  function update<K extends keyof typeof f>(
    key: K,
    value: (typeof f)[K]
  ) {
    setF((current) => ({
      ...current,
      [key]: value,
    }));

    setErr("");
  }

  // Validasi dan proses registrasi
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (busy) return;

    setErr("");

    const name = f.name.trim();
    const email = f.email.trim();
    const storeName = f.storeName.trim();

    // Validasi input kosong
    if (!name || !email || !f.password || !storeName) {
      setErr("Semua kolom wajib diisi. Periksa kembali formulir Anda.");
      return;
    }

    // Validasi email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setErr("Format email tidak valid. Masukkan email yang benar.");
      return;
    }

    // Validasi password
    if (f.password.length < 8) {
      setErr("Password minimal harus terdiri dari 8 karakter.");
      return;
    }

    // Validasi jenis usaha
    if (!TYPES.some((type) => type.v === f.businessType)) {
      setErr("Silakan pilih jenis usaha yang tersedia.");
      return;
    }

    setBusy(true);

    try {
      await api("/api/auth/register", {
        method: "POST",
        body: {
          ...f,
          name,
          email,
          storeName,
        },
      });

      router.replace("/dashboard");
    } catch (error) {
      setErr(
        error instanceof Error
          ? error.message
          : "Registrasi gagal. Silakan coba kembali."
      );

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
            <p className="font-semibold">Registrasi gagal</p>
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
        title="Daftarkan toko Anda"
        subtitle="Buat akun kepala toko dan mulai berjualan hari ini."
        footer={
          <>
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-link">
              Masuk
            </Link>
          </>
        }
      >
        <form
          onSubmit={submit}
          noValidate
          className="space-y-4"
        >
          {/* Nama pemilik */}
          <div>
            <label className="label" htmlFor="name">
              Nama Anda
            </label>

            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Nama lengkap"
              className="input"
              value={f.name}
              disabled={busy}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>

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
              onChange={(e) => update("email", e.target.value)}
            />
          </div>

          {/* Password */}
          <div>
            <label className="label" htmlFor="pw">
              Password
            </label>

            <PasswordInput
              id="pw"
              autoComplete="new-password"
              minLength={8}
              value={f.password}
              disabled={busy}
              onChange={(value) => update("password", value)}
            />

            <p className="mt-1 text-xs text-muted">
              Minimal 8 karakter.
            </p>
          </div>

          <hr className="border-current opacity-10" />

          {/* Nama toko */}
          <div>
            <label className="label" htmlFor="store">
              Nama toko
            </label>

            <input
              id="store"
              name="storeName"
              type="text"
              placeholder="Toko Maju Jaya"
              autoComplete="organization"
              className="input"
              value={f.storeName}
              disabled={busy}
              onChange={(e) => update("storeName", e.target.value)}
            />
          </div>

          {/* Jenis usaha */}
          <fieldset disabled={busy}>
            <legend className="label">Jenis usaha</legend>

            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((type) => {
                const selected = f.businessType === type.v;

                return (
                  <label
                    key={type.v}
                    className={`cursor-pointer rounded-xl border p-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${
                      selected
                        ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10 ring-1 ring-[rgb(var(--accent))]"
                        : "border-current/15 hover:border-current/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="businessType"
                      value={type.v}
                      checked={selected}
                      onChange={() =>
                        update("businessType", type.v)
                      }
                      className="sr-only"
                    />

                    <span className="block text-sm font-semibold">
                      {type.label}
                    </span>

                    <span className="block text-xs text-muted">
                      {type.hint}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            className="btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                Mendaftarkan...
              </>
            ) : (
              "Daftarkan toko"
            )}
          </button>

          {/* Privacy */}
          <p className="text-center text-xs text-muted">
            Dengan mendaftar, Anda menyetujui{" "}
            <Link
              href="/privasi"
              className="underline underline-offset-2"
            >
              Kebijakan Privasi
            </Link>{" "}
            kami.
          </p>
        </form>
      </AuthShell>
    </>
  );
}
