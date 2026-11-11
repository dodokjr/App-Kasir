
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Tone = "success" | "error" | "warning" | "info";

interface ConfirmOptions {
  title: string;
  text?: string;
  ok?: string;
  cancel?: string;
  danger?: boolean;
}

interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

interface FeedbackContextType {
  ok: (message: string) => void;
  fail: (message: string) => void;
  warn: (message: string) => void;
  info: (message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextType | null>(null);

export function FeedbackProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);

  const resolver = useRef<((value: boolean) => void) | null>(null);
  const toastId = useRef(0);

  const showToast = useCallback((tone: Tone, message: string) => {
    const id = ++toastId.current;
    setToast({ id, tone, message });
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => {
      setToast((current) =>
        current?.id === toast.id ? null : current
      );
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [toast]);

  const confirm = useCallback((options: ConfirmOptions) => {
    // Selesaikan dialog sebelumnya jika masih terbuka.
    resolver.current?.(false);

    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setDialog(options);
    });
  }, []);

  const closeDialog = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
  };

  const value: FeedbackContextType = {
    ok: (message) => showToast("success", message),
    fail: (message) => showToast("error", message),
    warn: (message) => showToast("warning", message),
    info: (message) => showToast("info", message),
    confirm,
  };

  const toneClasses: Record<Tone, string> = {
    success: "border-green-500 bg-green-50 text-green-800",
    error: "border-red-500 bg-red-50 text-red-800",
    warning: "border-yellow-500 bg-yellow-50 text-yellow-800",
    info: "border-blue-500 bg-blue-50 text-blue-800",
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {toast && (
        <div
          key={toast.id}
          role="alert"
          className={`fixed right-4 top-4 z-[9999] max-w-sm rounded-lg border p-4 shadow-lg ${toneClasses[toast.tone]}`}
        >
          {toast.message}
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-3 font-bold"
            aria-label="Tutup notifikasi"
          >
            ×
          </button>
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-dialog-title"
            className="w-full max-w-md rounded-xl bg-white p-6 text-gray-900 shadow-2xl"
          >
            <h2
              id="feedback-dialog-title"
              className="text-lg font-semibold"
            >
              {dialog.title}
            </h2>

            {dialog.text && (
              <p className="mt-2 text-sm text-gray-600">
                {dialog.text}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => closeDialog(false)}
                className="rounded-lg border px-4 py-2"
              >
                {dialog.cancel || "Batal"}
              </button>

              <button
                type="button"
                onClick={() => closeDialog(true)}
                className={`rounded-lg px-4 py-2 text-white ${
                  dialog.danger
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {dialog.ok || "Ya, lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error(
      "useFeedback harus digunakan di dalam FeedbackProvider."
    );
  }

  return context;
}

interface AlertProps {
  tone?: Tone;
  title?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Alert({
  tone = "info",
  title,
  action,
  className = "",
  children,
}: AlertProps) {
  const classes: Record<Tone, string> = {
    success: "border-green-500 bg-green-50 text-green-800",
    error: "border-red-500 bg-red-50 text-red-800",
    warning: "border-yellow-500 bg-yellow-50 text-yellow-800",
    info: "border-blue-500 bg-blue-50 text-blue-800",
  };

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border p-4 ${classes[tone]} ${className}`}
    >
      {title && <div className="mb-1 font-semibold">{title}</div>}
      <div>{children}</div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
