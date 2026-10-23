"use client";

import { Eye, EyeOff, X } from "lucide-react";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { useAuthStore } from "@/store/authStore";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
};

type PhoneState = {
  exists: boolean;
  hasPassword: boolean;
  hasName: boolean;
};

const inputClass =
  "w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-lg text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/20 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-900";

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const { t } = useI18n();
  const login = useAuthStore((state) => state.login);
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phoneState, setPhoneState] = useState<PhoneState | null>(null);
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
    setPassword("");
    setShowPassword(false);
    setPhoneState(null);
    setError(null);
    setPending(false);
  }, [open]);

  if (!open || !mounted) {
    return null;
  }

  const needsName = phoneState ? !phoneState.exists || !phoneState.hasName : false;
  const settingPassword = phoneState ? !phoneState.hasPassword : false;

  function resetPhoneStep() {
    setPhoneState(null);
    setFullName("");
    setPassword("");
    setShowPassword(false);
    setError(null);
  }

  function errorText(code: string) {
    if (code === "invalid_phone") return t("loginInvalidPhone");
    if (code === "name_required") return t("loginNameRequired");
    if (code === "password_required") return t("loginPasswordRequired");
    if (code === "password_short") return t("loginPasswordShort");
    if (code === "incorrect_password") return t("loginIncorrectPassword");
    return t("loginFailed");
  }

  async function checkPhone() {
    const response = await fetch("/api/customer/check-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = (await response.json().catch(() => null)) as
      | { exists?: unknown; hasPassword?: unknown; hasName?: unknown; error?: unknown }
      | null;

    if (!response.ok || !data || typeof data.exists !== "boolean") {
      throw new Error(response.status === 400 ? "invalid_phone" : "failed");
    }

    setPhoneState({
      exists: data.exists,
      hasPassword: data.hasPassword === true,
      hasName: data.hasName === true,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);

    try {
      if (!phoneState) {
        await checkPhone();
        return;
      }

      if (needsName && !fullName.trim()) {
        setError(t("loginNameRequired"));
        return;
      }
      if (password.length < 6) {
        setError(password.length === 0 ? t("loginPasswordRequired") : t("loginPasswordShort"));
        return;
      }

      await login({
        phone,
        password,
        name: needsName ? fullName.trim() : undefined,
      });
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "failed";
      setError(errorText(message));
    } finally {
      setPending(false);
    }
  }

  const submitLabel = !phoneState
    ? t("loginSubmit")
    : !phoneState.exists
      ? t("loginCreateAccount")
      : settingPassword
        ? t("loginSetPasswordSubmit")
        : t("login");

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
        <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-phone" className="mb-2 block text-sm font-bold text-stone-800 dark:text-gray-100">
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
                if (phoneState) resetPhoneStep();
              }}
              placeholder={t("phonePlaceholder")}
              className={inputClass}
            />
            {phoneState ? (
              <button
                type="button"
                onClick={resetPhoneStep}
                className="mt-2 text-sm font-bold text-primary"
              >
                {t("loginChangePhone")}
              </button>
            ) : null}
          </div>

          {phoneState?.exists && !phoneState.hasPassword ? (
            <p className="rounded-2xl bg-primary-50 px-4 py-3 text-sm font-semibold leading-7 text-primary-800 dark:bg-primary/15 dark:text-primary-100">
              {t("loginWelcomeSetPassword")}
            </p>
          ) : null}

          {phoneState && needsName ? (
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
                className={inputClass}
              />
            </div>
          ) : null}

          {phoneState ? (
            <div>
              <label htmlFor="login-password" className="mb-2 block text-sm font-bold text-stone-800 dark:text-gray-100">
                {!phoneState.exists
                  ? t("loginCreatePassword")
                  : settingPassword
                    ? t("loginNewPassword")
                    : t("loginPassword")}
                <span className="text-primary"> *</span>
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={settingPassword ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${inputClass} pe-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? t("loginHidePassword") : t("loginShowPassword")}
                  aria-pressed={showPassword}
                  className="absolute end-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-stone-500 hover:text-stone-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-primary py-3.5 text-base font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-primary-500 hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
          >
            {pending ? (phoneState ? t("loginPending") : t("loginChecking")) : submitLabel}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
