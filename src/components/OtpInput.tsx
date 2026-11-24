"use client";

import { useRef } from "react";

/** Kotak digit (OTP / PIN). Mendukung tempel, backspace, dan panah. `mask` menyembunyikan digit (untuk PIN).
 *  Kotak yang sudah terisi diberi warna aksen, dan ada jarak di tengah (3 + 3) supaya mudah dibaca. */
export default function OtpInput({
  value, onChange, onComplete, length = 6, disabled, mask, autoFocus, id, label,
}: {
  value: string; onChange: (v: string) => void; onComplete?: (v: string) => void;
  length?: number; disabled?: boolean; mask?: boolean; autoFocus?: boolean; id?: string; label: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");
  const gapAfter = length % 2 === 0 && length >= 4 ? length / 2 - 1 : -1;

  const set = (next: string) => {
    const v = next.replace(/\D/g, "").slice(0, length);
    onChange(v);
    if (v.length === length) onComplete?.(v);
  };

  return (
    <div role="group" aria-label={label} className="flex justify-between gap-1.5 sm:gap-2" id={id}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          suppressHydrationWarning
          type={mask ? "password" : "text"}
          inputMode="numeric"
          autoComplete={i === 0 && !mask ? "one-time-code" : "off"}
          maxLength={1}
          value={d}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`${label} digit ${i + 1}`}
          data-filled={d ? "true" : "false"}
          className={`input !rounded-xl !p-0 h-14 w-full min-w-0 text-center text-xl font-bold tabular-nums transition duration-150 focus:-translate-y-0.5 data-[filled=true]:border-accent data-[filled=true]:bg-accent/10 ${i === gapAfter ? "mr-1.5 sm:mr-3" : ""}`}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, "");
            if (!c) return;
            const arr = digits.slice(); arr[i] = c[c.length - 1];
            set(arr.join(""));
            refs.current[Math.min(i + 1, length - 1)]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              const arr = digits.slice();
              if (arr[i]) arr[i] = ""; else if (i > 0) { arr[i - 1] = ""; refs.current[i - 1]?.focus(); }
              onChange(arr.join("").replace(/\D/g, ""));
            } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            else if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const t = e.clipboardData.getData("text");
            set(t);
            refs.current[Math.min(t.replace(/\D/g, "").length, length) - 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}