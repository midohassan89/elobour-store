import type { Language } from "@/locales/types";

/** Append a time unit when the zone stores a bare number such as "60". */
export function formatEstimatedTime(value: string, language: Language) {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return trimmed;
  if (language === "en") return `${trimmed} mins`;
  if (language === "zh") return `${trimmed} 分钟`;
  return `${trimmed} دقيقة`;
}
