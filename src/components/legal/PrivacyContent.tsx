"use client";

import LegalArticle from "@/components/legal/LegalArticle";
import { useI18n } from "@/components/i18n/LanguageProvider";

export default function PrivacyContent() {
  const { t } = useI18n();

  return (
    <LegalArticle title={t("privacyTitle")}>
      <p>{t("privacyLead")}</p>
      <section>
        <h2 className="text-lg font-extrabold text-stone-900 dark:text-gray-100">{t("privacyDataTitle")}</h2>
        <p className="mt-2">{t("privacyDataBody")}</p>
      </section>
      <section>
        <h2 className="text-lg font-extrabold text-stone-900 dark:text-gray-100">{t("privacyPurposeTitle")}</h2>
        <p className="mt-2">{t("privacyPurposeBody")}</p>
      </section>
      <section>
        <h2 className="text-lg font-extrabold text-stone-900 dark:text-gray-100">{t("privacySharingTitle")}</h2>
        <p className="mt-2">{t("privacySharingBody")}</p>
      </section>
    </LegalArticle>
  );
}
