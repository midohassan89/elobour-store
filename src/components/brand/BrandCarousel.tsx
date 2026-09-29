"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import type { Brand } from "@/types";
import { brandImageUrl } from "@/utils/brandVisual";
import { getLocalizedName, optionalLocalizedName } from "@/utils/localizedName";
import { uniqueByArabicName } from "@/utils/uniqueByName";
import Link from "next/link";
import { useEffect, useState } from "react";

function BrandLogo({ imageUrl, label }: { imageUrl: string; label: string }) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return <span className="text-2xl font-bold text-gray-400">{label.slice(0, 1)}</span>;
  }

  return (
    // Brand logos may be ERP upload paths or remote files.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt=""
      className="h-12 w-12 object-contain"
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
      <h2 className="relative mb-6 text-2xl font-bold text-gray-900">
        {t("shopByBrand")}
        <span
          aria-hidden="true"
          className="absolute -bottom-2 start-0 h-1 w-10 rounded-full bg-orange-500"
        />
      </h2>
      <div className="flex gap-6 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {brands.map((brand) => {
          const imageUrl = brandImageUrl(brand.image);
          const label = getLocalizedName(brand, language);

          return (
            <Link
              key={brand.id}
              href={`/shop?brandId=${encodeURIComponent(brand.id)}`}
              className="flex shrink-0 cursor-pointer flex-col items-center"
            >
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 shadow-sm transition-colors hover:border-orange-400 hover:bg-orange-50">
                <BrandLogo imageUrl={imageUrl} label={label} />
              </span>
              <span className="mt-2 w-20 truncate text-center text-xs font-medium text-gray-600">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
