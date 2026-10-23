import { dictionaries } from "@/locales";
import { isLanguage, type TranslationKey } from "@/locales/types";
import type { Metadata } from "next";
import { cookies } from "next/headers";

export async function legalMetadata(titleKey: TranslationKey): Promise<Metadata> {
  const cookieStore = await cookies();
  const saved = cookieStore.get("lang")?.value;
  const language = isLanguage(saved) ? saved : "ar";

  return {
    title: dictionaries[language][titleKey],
    alternates: { canonical: `https://echinamart.com${titleKey === "privacyTitle" ? "/privacy" : titleKey === "deleteAccountTitle" ? "/delete-account" : "/support"}` },
  };
}
