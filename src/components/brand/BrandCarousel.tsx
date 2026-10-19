"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import type { Brand } from "@/types";
import { brandImageUrl } from "@/utils/brandVisual";
import { getLocalizedName, optionalLocalizedName } from "@/utils/localizedName";
import { uniqueByArabicName } from "@/utils/uniqueByName";
import HorizontalScroller from "@/components/ui/HorizontalScroller";
import { Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function BrandLogo({ imageUrl, label }: { imageUrl: string; label: string }) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return <Store className="h-5 w-5 text-primary" aria-hidden="true" />;
  }

  return (
    // Brand logos may be ERP upload paths or remote files.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt=""
      className="h-8 w-8 object-contain"
      onError={() => setFailed(true)}
    />
  );
}

export default function BrandCarousel() {
  const { t, language } = useI18n();
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/brands", { signal: controller.signal })
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
  }, []);

  if (brands.length === 0) {
    return null;
  }

  return (
    <section aria-label={t("shopByBrand")} className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
      <h2 className="relative mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
        {t("shopByBrand")}
        <span
          aria-hidden="true"
          className="absolute -bottom-2 start-0 h-1 w-10 rounded-full bg-green-600"
        />
      </h2>
      <HorizontalScroller>
        {brands.map((brand) => {
          const imageUrl = brandImageUrl(brand.image);
          const label = getLocalizedName(brand, language);

          return (
            <Link
              key={brand.id}
              href={`/shop?brandId=${encodeURIComponent(brand.id)}`}
              className="flex shrink-0 items-center gap-3 rounded-full border border-gray-200 bg-white px-3 py-2 shadow-sm transition hover:border-primary hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50">
                <BrandLogo imageUrl={imageUrl} label={label} />
              </span>
              <span className="max-w-40 text-sm font-extrabold leading-5 text-gray-800 dark:text-gray-100">
                {label}
              </span>
            </Link>
          );
        })}
      </HorizontalScroller>
    </section>
  );
}
