
"use client";

import { useState } from "react";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
  disabled?: boolean;
}

export default function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  minLength,
  disabled = false,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        disabled={disabled}
        className="input pr-20"
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => setShow((current) => !current)}
        aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 rounded-r-lg px-3 text-xs font-medium text-muted transition hover:text-current disabled:cursor-not-allowed disabled:opacity-50"
      >
        {show ? "Sembunyikan" : "Lihat"}
      </button>
    </div>
  );
}
