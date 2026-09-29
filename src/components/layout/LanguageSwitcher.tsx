"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import type { Language } from "@/locales/types";

const options: { id: Language; label: string }[] = [
  { id: "ar", label: "عربي" },
  { id: "en", label: "EN" },
  { id: "zh", label: "中文" },
];

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="inline-flex rounded-full border border-stone-200 bg-white p-1"
    >
      {options.map((option) => {
        const active = language === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setLanguage(option.id)}
            aria-pressed={active}
            className={`rounded-full px-2.5 py-1 text-xs font-bold transition sm:px-3 sm:text-sm ${
              active ? "bg-primary text-white" : "text-stone-600 hover:text-primary"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
