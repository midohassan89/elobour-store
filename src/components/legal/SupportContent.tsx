"use client";

import LegalArticle from "@/components/legal/LegalArticle";
import { useI18n } from "@/components/i18n/LanguageProvider";

const SUPPORT_PHONE = "01009972972";

export default function SupportContent() {
  const { t } = useI18n();

  return (
    <LegalArticle title={t("supportTitle")}>
      <p>{t("supportLead")}</p>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-stone-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <dt className="text-xs font-extrabold text-stone-500 dark:text-gray-400">{t("supportPhoneLabel")}</dt>
          <dd className="mt-1 text-base font-extrabold text-stone-900 dark:text-gray-100" dir="ltr">
            <a href={`tel:+2${SUPPORT_PHONE}`} className="hover:text-primary">{SUPPORT_PHONE}</a>
          </dd>
          <dd className="mt-1">
            <a href={`https://wa.me/2${SUPPORT_PHONE}`} className="text-sm font-bold text-primary">
              WhatsApp
            </a>
          </dd>
        </div>
        <div className="rounded-3xl border border-stone-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <dt className="text-xs font-extrabold text-stone-500 dark:text-gray-400">{t("supportEmailLabel")}</dt>
          <dd className="mt-1 text-base font-extrabold text-stone-900 dark:text-gray-100" dir="ltr">
            <a href={`mailto:${t("supportEmailValue")}`} className="hover:text-primary">
              {t("supportEmailValue")}
            </a>
          </dd>
        </div>
        <div className="rounded-3xl border border-stone-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <dt className="text-xs font-extrabold text-stone-500 dark:text-gray-400">{t("supportHoursLabel")}</dt>
          <dd className="mt-1 font-extrabold text-stone-900 dark:text-gray-100">{t("supportHoursValue")}</dd>
        </div>
        <div className="rounded-3xl border border-stone-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <dt className="text-xs font-extrabold text-stone-500 dark:text-gray-400">{t("supportAddressLabel")}</dt>
          <dd className="mt-1 font-extrabold text-stone-900 dark:text-gray-100">{t("supportAddressValue")}</dd>
        </div>
      </dl>
    </LegalArticle>
  );
}
