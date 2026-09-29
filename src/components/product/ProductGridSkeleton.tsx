"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";

function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
      <div className="aspect-square rounded-xl bg-stone-200" />
      <div className="mt-3 h-4 w-4/5 rounded bg-stone-200" />
      <div className="mt-2 h-4 w-3/5 rounded bg-stone-200" />
      <div className="mt-3 h-5 w-1/3 rounded bg-stone-200" />
      <div className="mt-4 h-10 rounded-full bg-stone-200" />
    </div>
  );
}

export default function ProductGridSkeleton() {
  const { t } = useI18n();

  return (
    <section
      aria-label={t("products")}
      aria-busy="true"
      className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6"
    >
      <span className="sr-only">{t("loadingProducts")}</span>
      <div className="mb-4 h-8 w-36 animate-pulse rounded bg-stone-200" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="animate-pulse">
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}
