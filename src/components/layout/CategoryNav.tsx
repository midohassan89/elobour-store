"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import type { Category } from "@/types";
import { getLocalizedName, optionalLocalizedName } from "@/utils/localizedName";
import { uniqueByArabicName } from "@/utils/uniqueByName";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const scrollRowClassName =
  "mx-auto flex max-w-7xl gap-2 overflow-x-auto whitespace-nowrap px-4 py-3 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden";

function pillClassName(active: boolean) {
  return `shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
    active
      ? "bg-primary text-white"
      : "border border-stone-300 bg-white text-stone-600 hover:border-primary hover:text-primary"
  }`;
}

export default function CategoryNav() {
  const { t, language } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategoryId = searchParams.get("categoryId");
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

  function selectCategory(categoryId: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (categoryId) {
      params.set("categoryId", categoryId);
    } else {
      params.delete("categoryId");
    }

    params.delete("brandId");

    const query = params.toString();
    router.push(query ? `/shop?${query}` : "/shop");
  }

  return (
    <nav aria-label={t("categories")} className="border-b border-stone-200 bg-white">
      <div className={scrollRowClassName}>
        <button
          type="button"
          onClick={() => selectCategory(null)}
          className={pillClassName(!activeCategoryId)}
          aria-current={!activeCategoryId ? "true" : undefined}
        >
          {t("all")}
        </button>
        {categories.map((category) => {
          const active = activeCategoryId === category.id;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => selectCategory(category.id)}
              className={pillClassName(active)}
              aria-current={active ? "true" : undefined}
            >
              {getLocalizedName(category, language)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
