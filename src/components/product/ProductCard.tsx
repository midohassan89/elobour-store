"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import { useCartStore } from "@/store/cartStore";
import { getLocalizedName } from "@/utils/localizedName";
import { pointsForAmount } from "@/utils/points";
import { ShoppingBag } from "lucide-react";
import Image from "next/image";

type ProductCardProps = {
  id: string;
  name: string;
  nameEn?: string;
  nameZh?: string;
  brand?: {
    name: string;
    nameEn?: string;
    nameZh?: string;
  } | null;
  price: number;
  image?: string;
  stock?: number;
};

export default function ProductCard({
  id,
  name,
  nameEn,
  nameZh,
  brand,
  price,
  image,
  stock,
}: ProductCardProps) {
  const { t, language } = useI18n();
  const localizedName = getLocalizedName({ name, nameEn, nameZh }, language);
  const brandName = brand ? getLocalizedName(brand, language) : "";
  const addItem = useCartStore((state) => state.addItem);
  const isOutOfStock = stock !== undefined && stock <= 0;
  let cleanPath = image || "";

  if (cleanPath.startsWith("public/")) {
    cleanPath = cleanPath.replace(/^public\//, "/");
  }

  if (cleanPath.startsWith("uploads/")) {
    cleanPath = cleanPath.replace(/^uploads\//, "/uploads/");
  }

  cleanPath = cleanPath.replace(
    /(https?:\/{2,})|(\/{2,})/gi,
    (match, protocol: string | undefined) => {
      if (protocol) {
        return `${protocol.slice(0, protocol.indexOf(":") + 1)}//`;
      }

      return "/";
    },
  );

  const imageUrl = cleanPath.startsWith("/uploads")
    ? `http://localhost:3001${cleanPath}`
    : cleanPath;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="relative overflow-hidden rounded-xl">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={localizedName}
            width={480}
            height={192}
            className="h-48 w-full object-cover"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center border-b border-gray-100/50 bg-gradient-to-br from-gray-50 to-gray-100">
            <ShoppingBag className="h-12 w-12 text-gray-300 stroke-[1.5]" aria-hidden="true" />
          </div>
        )}
        {isOutOfStock ? (
          <span className="absolute top-2 right-2 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
            {t("outOfStock")}
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-stone-900 sm:text-base">
        {localizedName}
      </h3>
      {brandName ? <p className="mt-1 text-xs font-medium text-stone-400">{brandName}</p> : null}
      <p className="mt-2 text-base font-extrabold text-primary">
        {price} {t("currency")}
      </p>
      <p className="mt-2 inline-flex w-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
        {t("earnPoints", { count: pointsForAmount(price) })}
      </p>
      <button
        type="button"
        disabled={isOutOfStock}
        onClick={() => addItem({ id, name, nameEn, nameZh, price })}
        className={`mt-auto w-full rounded-full px-3 py-2.5 text-sm font-bold text-white ${
          isOutOfStock
            ? "cursor-not-allowed bg-gray-400"
            : "bg-primary transition duration-200 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg active:translate-y-0"
        }`}
      >
        {isOutOfStock ? t("outOfStock") : t("addToCart")}
      </button>
    </article>
  );
}
