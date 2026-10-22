"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import type { Language } from "@/locales/types";

const logoSrc: Record<Language, string> = {
  ar: "/logos/logo-ar.svg",
  en: "/logos/logo-en.svg",
  zh: "/logos/logo-zh.svg",
};

const variantClassName = {
  header:
    "h-8 max-w-[120px] sm:h-10 sm:max-w-[160px] md:h-12 md:max-w-[200px] object-contain shrink-0",
  footer: "h-12 max-w-[180px] object-contain sm:h-14 sm:max-w-[220px]",
  card: "h-9 max-w-[148px] object-contain",
} as const;

type BrandLogoProps = {
  variant?: keyof typeof variantClassName;
  className?: string;
};

export default function BrandLogo({ variant = "header", className }: BrandLogoProps) {
  const { language, t } = useI18n();

  return (
    <img
      src={logoSrc[language]}
      alt={t("storeName")}
      width={200}
      height={112}
      className={`w-auto ${className ?? variantClassName[variant]}`}
    />
  );
}
