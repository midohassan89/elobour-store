"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80";

export default function HeroBanner() {
  const { t } = useI18n();

  return (
    <section
      aria-label={t("exclusiveOffers")}
      className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8"
    >
      <div className="relative h-[300px] w-full overflow-hidden rounded-3xl shadow-sm md:h-[400px]">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-l from-gray-900/90 to-transparent ltr:bg-gradient-to-r"
        />
        <div className="absolute inset-0 z-10 flex w-full flex-col justify-center px-8 text-right text-white md:w-2/3 md:px-16 ltr:text-left">
          <span className="mb-4 inline-block w-fit rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">
            {t("exclusiveOffers")}
          </span>
          <h1 className="mb-4 text-3xl font-extrabold leading-tight md:text-5xl">
            {t("weeklyOffersTitle")}
          </h1>
          <p className="mb-8 text-lg text-gray-200 md:text-xl">{t("heroSubtitle")}</p>
          <Link
            href="/shop"
            className="flex w-fit items-center gap-2 rounded-full bg-orange-500 px-8 py-3 font-bold text-white transition-colors hover:bg-orange-600"
          >
            {t("shopNow")}
            <ArrowLeft className="h-5 w-5 ltr:rotate-180" />
          </Link>
        </div>
      </div>
    </section>
  );
}
