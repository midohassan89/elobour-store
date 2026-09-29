"use client";

import { translate } from "@/locales";
import {
  directionFor,
  type Language,
  type TranslationKey,
} from "@/locales/types";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type LanguageContextValue = {
  language: Language;
  dir: "rtl" | "ltr";
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function applyLanguage(language: Language) {
  const dir = directionFor(language);
  document.documentElement.lang = language;
  document.documentElement.dir = dir;
  document.body.lang = language;
  document.body.dir = dir;
}

function persistLanguage(language: Language) {
  document.cookie = `lang=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
  localStorage.setItem("lang", language);
}

export function LanguageProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: Language;
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      dir: directionFor(language),
      setLanguage: (nextLanguage) => {
        applyLanguage(nextLanguage);
        persistLanguage(nextLanguage);
        setLanguageState(nextLanguage);
      },
      t: (key, vars) => translate(language, key, vars),
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useI18n must be used within LanguageProvider");
  }

  return context;
}
