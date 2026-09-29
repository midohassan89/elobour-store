"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import type { Category } from "@/types";
import { categoryIconFor } from "@/utils/categoryIcon";
import { getLocalizedName, optionalLocalizedName } from "@/utils/localizedName";
import { uniqueByArabicName } from "@/utils/uniqueByName";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function CategoryGrid() {
  const { t, language } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/categories", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load categories");
        }

        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          return;
        }

        const nextCategories = data.flatMap((item) => {
          if (!item || typeof item !== "object") {
            return [];
          }

          const record = item as Record<string, unknown>;

          if (
            (typeof record.id !== "string" && typeof record.id !== "number") ||
            typeof record.name !== "string"
          ) {
            return [];
          }

          return [
            {
              id: String(record.id),
              name: record.name,
              nameEn: optionalLocalizedName(record.nameEn),
              nameZh: optionalLocalizedName(record.nameZh),
            },
          ];
        });

        setCategories(uniqueByArabicName(nextCategories));
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setCategories([]);
      });

    return () => controller.abort();
  }, []);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={t("shopByCategory")}
      className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6"
    >
      <h2 className="relative mb-6 text-2xl font-bold text-gray-900">
        {t("shopByCategory")}
        <span
          aria-hidden="true"
          className="absolute -bottom-2 start-0 h-1 w-10 rounded-full bg-orange-500"
        />
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        {categories.map((category) => {
          const label = getLocalizedName(category, language);
          const Icon = categoryIconFor(category.name);

          return (
            <Link
              key={category.id}
              href={`/shop?categoryId=${encodeURIComponent(category.id)}`}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-500 hover:shadow-md"
            >
              <Icon className="h-8 w-8 text-orange-500" strokeWidth={1.75} aria-hidden="true" />
              <span className="text-center text-sm font-semibold text-gray-700">{label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
