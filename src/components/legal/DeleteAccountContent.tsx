"use client";

import LegalArticle from "@/components/legal/LegalArticle";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { FormEvent, useState } from "react";

export default function DeleteAccountContent() {
  const { t } = useI18n();
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorCode, setErrorCode] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus("pending");
    setErrorCode("");
    try {
      const response = await fetch("/api/account/deletion-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setErrorCode(data.error ?? "FAILED");
        setStatus("error");
        return;
      }
      setStatus("success");
      setPhone("");
    } catch {
      setErrorCode("FAILED");
      setStatus("error");
    }
  }

  const message =
    status === "success"
      ? t("deleteAccountSuccess")
      : status === "error"
        ? errorCode === "INVALID_PHONE"
          ? t("deleteAccountInvalidPhone")
          : t("deleteAccountFailed")
        : "";

  return (
    <LegalArticle title={t("deleteAccountTitle")}>
      <p>{t("deleteAccountLead")}</p>
      <section>
        <h2 className="text-lg font-extrabold text-stone-900 dark:text-gray-100">{t("deleteAccountStepsTitle")}</h2>
        <ol className="mt-2 list-decimal space-y-1 ps-5">
          <li>{t("deleteAccountStep1")}</li>
          <li>{t("deleteAccountStep2")}</li>
        </ol>
      </section>
      <section className="rounded-3xl border border-stone-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-extrabold text-stone-900 dark:text-gray-100">{t("deleteAccountFormTitle")}</h2>
        <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-3">
          <label className="block text-sm font-bold text-stone-700 dark:text-gray-300" htmlFor="deletion-phone">
            {t("deleteAccountPhone")}
          </label>
          <input
            id="deletion-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="01xxxxxxxxx"
            className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
          <button
            type="submit"
            disabled={status === "pending"}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
          >
            {status === "pending" ? t("deleteAccountPending") : t("deleteAccountSubmit")}
          </button>
          {message ? (
            <p className={status === "success" ? "font-bold text-primary" : "font-bold text-red-600 dark:text-red-300"}>
              {message}
            </p>
          ) : null}
        </form>
      </section>
      <p>{t("deleteAccountScope")}</p>
    </LegalArticle>
  );
}
