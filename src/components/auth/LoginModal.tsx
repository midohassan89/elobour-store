"use client";

import { X } from "lucide-react";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { useAuthStore } from "@/store/authStore";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const { t } = useI18n();
  const login = useAuthStore((state) => state.login);
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      return;
    }

    setPhone("");
    setFullName("");
    setNeedsName(false);
    setError(null);
    setPending(false);
  }, [open]);

  if (!open || !mounted) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setError(null);

    if (needsName && !fullName.trim()) {
      setError(t("loginNameRequired"));
      setPending(false);
      return;
    }

    try {
      const result = await login(phone, needsName ? fullName.trim() : undefined);

      if (result === "needs_name") {
        setNeedsName(true);
        return;
      }

      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "failed";
      if (message === "invalid_phone") {
        setError(t("loginInvalidPhone"));
      } else if (message === "failed" || message === "") {
        setError(t("loginFailed"));
      } else {
        setError(message);
      }
    } finally {
      setPending(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/50 p-4 sm:items-center">
      <button
        type="button"
        aria-label={t("close")}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8 dark:bg-gray-900"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="absolute end-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="text-sm font-bold text-primary">{t("storeName")}</p>
        <h2 id="login-title" className="mt-2 text-2xl font-extrabold text-stone-900 dark:text-gray-100">
          {t("loginTitle")}
        </h2>
        <p className="mt-2 text-sm leading-7 text-stone-500 dark:text-gray-400">{t("loginSubtitle")}</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label htmlFor="login-phone" className="block text-sm font-bold text-stone-800 dark:text-gray-100">
            {t("phone")}
          </label>
          <input
            id="login-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              setNeedsName(false);
              setFullName("");
            }}
            placeholder={t("phonePlaceholder")}
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-lg text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/20 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-900"
          />
          {needsName ? (
            <div>
              <label htmlFor="login-name" className="mb-2 block text-sm font-bold text-stone-800 dark:text-gray-100">
                {t("fullName")}
                <span className="text-primary"> *</span>
              </label>
              <input
                id="login-name"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-lg text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/20 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-900"
              />
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-primary py-3.5 text-base font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-primary-500 hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
          >
            {pending ? t("loginPending") : t("loginSubmit")}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
