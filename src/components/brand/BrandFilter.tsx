"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import type { Brand } from "@/types";
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

export default function BrandFilter() {
  const { t, language } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeBrandId = searchParams.get("brandId");
  const categoryId = searchParams.get("categoryId") ?? "";
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();

    if (categoryId) {
      params.set("categoryId", categoryId);
    }

    const query = params.toString();

    fetch(query ? `/api/brands?${query}` : "/api/brands", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load brands");
        }

        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          return;
        }

        const nextBrands = data.flatMap((item) => {
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
              image: typeof record.image === "string" ? record.image : undefined,
            },
          ];
        });

        setBrands(uniqueByArabicName(nextBrands));
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setBrands([]);
      });

    return () => controller.abort();
  }, [categoryId]);

  function selectBrand(brandId: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (brandId) {
      params.set("brandId", brandId);
    } else {
      params.delete("brandId");
    }

    const query = params.toString();
    router.push(query ? `/shop?${query}` : "/shop");
  }

  if (brands.length === 0) {
    return null;
  }

  return (
    <nav aria-label={t("brands")} className="border-b border-stone-200 bg-stone-50">
      <div className={scrollRowClassName}>
        <span className="shrink-0 text-sm font-extrabold text-stone-800">{t("brands")}</span>
        <button
          type="button"
          onClick={() => selectBrand(null)}
          className={pillClassName(!activeBrandId)}
          aria-current={!activeBrandId ? "true" : undefined}
        >
          {t("all")}
        </button>
        {brands.map((brand) => {
          const active = activeBrandId === brand.id;

          return (
            <button
              key={brand.id}
              type="button"
              onClick={() => selectBrand(brand.id)}
              className={pillClassName(active)}
              aria-current={active ? "true" : undefined}
            >
              {getLocalizedName(brand, language)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
