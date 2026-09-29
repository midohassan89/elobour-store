import ar from "@/locales/ar";
import en from "@/locales/en";
import zh from "@/locales/zh";
import { type Dictionary, type Language, type TranslationKey } from "@/locales/types";

export const dictionaries: Record<Language, Dictionary> = {
  ar,
  en,
  zh,
};

export function translate(
  language: Language,
  key: TranslationKey,
  vars?: Record<string, string | number>,
) {
  let value: string = dictionaries[language][key];

  if (!vars) {
    return value;
  }

  for (const [name, replacement] of Object.entries(vars)) {
    value = value.replaceAll(`{{${name}}}`, String(replacement));
  }

  return value;
}

export type { Language, TranslationKey };
