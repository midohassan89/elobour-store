import type { Language } from "@/locales/types";

type NamedItem = {
  name: string;
  nameEn?: string;
  nameZh?: string;
};

export function getLocalizedName(item: NamedItem, currentLang: Language) {
  if (currentLang === "zh" && item.nameZh) {
    return item.nameZh;
  }

  if (currentLang === "en" && item.nameEn) {
    return item.nameEn;
  }

  return item.name;
}

export function optionalLocalizedName(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}
