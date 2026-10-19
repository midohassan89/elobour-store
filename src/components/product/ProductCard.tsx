"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import QuantityStepper from "@/components/product/QuantityStepper";
import { cartLineKey, useCartStore } from "@/store/cartStore";
import type { Language } from "@/locales/types";
import type { ProductPackage } from "@/types";
import { getLocalizedName } from "@/utils/localizedName";
import { resolveProductImage } from "@/utils/productImage";
import { quantityStep } from "@/utils/quantity";
import SafeImage from "@/components/ui/SafeImage";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { useLoyaltySettings } from "@/hooks/useLoyaltySettings";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

function shortPackageLabel(productName: string, packageName: string, itemsCount: number) {
  const name = packageName.trim();
  const base = productName.trim();
  let label = name;

  if (base && label.includes(base)) {
    label = label.replaceAll(base, " ");
  }

  label = label
    .replace(/[-–—|:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!label) {
    const tail = name
      .split(/\s*[-–—]\s*/)
      .map((part) => part.trim())
      .filter((part) => part && part !== base)
      .at(-1);

    label = tail && tail.length <= 18 ? tail : "";
  }

  if (!label || label.length > 18) {
    const tokens = (label || name).split(/\s+/).filter(Boolean);
    const countToken = tokens.find((token) => token === String(itemsCount));
    const typeToken = countToken
      ? tokens[tokens.lastIndexOf(countToken) - 1]
      : tokens.find((token) => token !== base && !/^\d+$/.test(token));

    if (typeToken && countToken) {
      return `${typeToken} ${countToken}`;
    }

    if (typeToken && itemsCount > 1) {
      return `${typeToken} ${itemsCount}`;
    }

    return itemsCount > 1 ? String(itemsCount) : name;
  }

  if (itemsCount > 1 && !label.includes(String(itemsCount)) && !label.includes(" ")) {
    return `${label} ${itemsCount}`;
  }

  return label;
}

function translatePackageName(name: string, locale: Language) {
  if (!name) return "";
  if (locale === "ar") return name;

  const dict: Record<string, { en: string; zh: string }> = {
    كرتونة: { en: "Carton", zh: "箱" },
    شرينك: { en: "Shrink", zh: "收缩装" },
    علبة: { en: "Box", zh: "盒" },
    كيس: { en: "Bag", zh: "袋" },
    باكت: { en: "Packet", zh: "包" },
  };

  let translatedName = name;

  Object.keys(dict).forEach((key) => {
    if (translatedName.includes(key)) {
      const replacement = locale === "en" ? dict[key].en : dict[key].zh;
      translatedName = translatedName.replace(key, replacement);
    }
  });

  return translatedName;
}

function packageNameForLocale(pkg: ProductPackage, locale: Language) {
  if (locale === "en") {
    return pkg.nameEn || pkg.name;
  }

  if (locale === "zh") {
    return pkg.nameZh || pkg.name;
  }

  return pkg.name;
}

function baseUnitNameForLocale(
  locale: Language,
  unit?: string,
  unitEn?: string,
  unitZh?: string,
) {
  if (locale === "en") {
    return unitEn?.trim() || "Piece";
  }

  if (locale === "zh") {
    return unitZh?.trim() || "件";
  }

  return unit?.trim() || "قطعة";
}

function piecePriceLabel(locale: Language, unitName: string, basePrice: number) {
  if (locale === "en") {
    return `(${unitName} price: EGP ${basePrice})`;
  }

  if (locale === "zh") {
    return `(${unitName} 单价: EGP ${basePrice})`;
  }

  return `(سعر ${unitName}: ${basePrice} ج.م)`;
}

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
  salePrice?: number | null;
  image?: string;
  stock?: number;
  isWeighed?: boolean;
  unit?: string;
  unitEn?: string;
  unitZh?: string;
  packages?: ProductPackage[];
  priority?: boolean;
};

export default function ProductCard({
  id,
  name,
  nameEn,
  nameZh,
  brand,
  price,
  salePrice,
  image,
  stock,
  isWeighed = false,
  unit,
  unitEn,
  unitZh,
  packages = [],
  priority = false,
}: ProductCardProps) {
  const { t, language } = useI18n();
  const { ids: wishlistIds, toggle: toggleWishlist } = useWishlist();
  const wished = wishlistIds.includes(id);
  const { earnRatio, ready } = useLoyaltySettings();
  const localizedName = getLocalizedName({ name, nameEn, nameZh }, language);
  const brandName = brand ? getLocalizedName(brand, language) : "";
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const [quantity, setQuantity] = useState(quantityStep(isWeighed));
  const isOutOfStock = stock !== undefined && stock <= 0;
  const hasSale = salePrice != null && salePrice > 0;
  const regularPrice = price;
  const priceDiscounted = hasSale ? salePrice : 0;
  const basePrice = priceDiscounted || regularPrice;
  const availablePackages = packages.filter(
    (pkg) => pkg.name.trim() !== "" && Number.isFinite(pkg.itemsCount) && pkg.itemsCount > 0,
  );
  const hasPackages = availablePackages.length > 0;
  const [selectedOption, setSelectedOption] = useState<"base" | ProductPackage>("base");
  const displayPrice =
    selectedOption === "base"
      ? basePrice
      : Math.round(basePrice * selectedOption.itemsCount * 100) / 100;
  const earnedPoints = Math.floor(displayPrice * earnRatio);
  const baseUnitLabel = baseUnitNameForLocale(language, unit, unitEn, unitZh);
  const packageId = selectedOption === "base" ? undefined : selectedOption.id;
  const lineKey = cartLineKey(id, packageId);
  const cartQuantity = useCartStore(
    (state) => state.items.find((item) => item.lineKey === lineKey)?.quantity ?? 0,
  );
  const discountPercent =
    hasSale && regularPrice > 0 ? Math.round((1 - (salePrice as number) / regularPrice) * 100) : 0;

  useEffect(() => {
    console.log("Current Ratio in UI:", earnRatio);
  }, [earnRatio]);

  const imageUrl = resolveProductImage(image);

  return (
    <article className="flex h-full flex-col overflow-visible rounded-xl border border-stone-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="relative aspect-square">
        <div className="absolute inset-0 overflow-hidden">
        {imageUrl ? (
          <SafeImage
            src={imageUrl}
            alt={localizedName}
            width={480}
            height={480}
            className="h-full w-full object-cover"
            priority={priority}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <ShoppingBag className="h-12 w-12 text-gray-300 stroke-[1.5] dark:text-gray-600" aria-hidden="true" />
          </div>
        )}
        </div>
        <button
          type="button"
          aria-pressed={wished}
          aria-label={t("wishlist")}
          onClick={() => void toggleWishlist(id)}
          className="absolute end-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg shadow-sm transition hover:bg-white dark:bg-gray-900/90"
        >
          {wished ? "❤️" : "♡"}
        </button>
        {isOutOfStock ? (
          <span className="absolute start-2 top-2 z-10 whitespace-nowrap rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
            {t("outOfStock")}
          </span>
        ) : discountPercent > 0 ? (
          <span className="absolute start-2 top-2 z-10 whitespace-nowrap rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white">
            -{discountPercent}%
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
      <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-stone-900 sm:text-base dark:text-gray-100">
        <Link href={`/product/${id}`} className="hover:text-primary">
          {localizedName}
        </Link>
      </h3>
      {brandName ? (
        <p className="mt-1 text-xs font-medium text-stone-400 dark:text-gray-500">{brandName}</p>
      ) : (
        <div className="mt-1 h-4" />
      )}
      {hasPackages ? (
        <div className="mt-2 flex flex-wrap justify-start gap-2" role="group" aria-label={localizedName}>
          <button
            type="button"
            aria-pressed={selectedOption === "base"}
            onClick={() => setSelectedOption("base")}
            className={`cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors ${
              selectedOption === "base"
                ? "border-primary bg-primary text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            }`}
          >
            {baseUnitLabel}
          </button>
          {availablePackages.map((pkg) => {
            const isSelected = selectedOption !== "base" && selectedOption.id === pkg.id;
            const packageName = packageNameForLocale(pkg, language);
            const packageLabel = translatePackageName(
              shortPackageLabel(
                packageName === pkg.name ? name : localizedName,
                packageName,
                pkg.itemsCount,
              ),
              language,
            );

            return (
              <button
                key={pkg.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedOption(pkg)}
                className={`max-w-full cursor-pointer rounded-lg border px-2.5 py-1 text-center text-xs font-bold whitespace-nowrap transition-colors ${
                  isSelected
                    ? "border-primary bg-primary text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                }`}
              >
                {packageLabel}
              </button>
            );
          })}
        </div>
      ) : null}
      </div>
      <div className="mt-auto flex flex-col gap-2 p-4 pt-0">
      <div>
      {selectedOption === "base" && hasSale ? (
        <p className="flex flex-wrap items-baseline gap-2">
          <span className="text-base font-extrabold text-primary">
            {displayPrice} {t("currency")}
          </span>
          <span className="text-sm text-gray-500 line-through dark:text-gray-400">
            {regularPrice} {t("currency")}
          </span>
        </p>
      ) : (
        <p className="text-base font-extrabold text-primary">
          {displayPrice} {t("currency")}
        </p>
      )}
      {selectedOption !== "base" ? (
        <p className="mt-1 text-center text-[10px] text-gray-500 dark:text-gray-400">
          {piecePriceLabel(language, baseUnitLabel, basePrice)}
        </p>
      ) : null}
      </div>
      {ready ? (
        <p className="inline-flex w-fit self-center rounded-full bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-800">
          {t("earnPoints", { count: earnedPoints })}
        </p>
      ) : null}
      {cartQuantity > 0 ? (
        <QuantityStepper
          name={localizedName}
          quantity={cartQuantity}
          isWeighed={isWeighed && !packageId}
          fluid
          onChange={(next) => updateQuantity(lineKey, next)}
        />
      ) : (
        <>
          {isWeighed && !packageId ? (
            <QuantityStepper
              name={localizedName}
              quantity={quantity}
              isWeighed
              fluid
              onChange={(next) => setQuantity(next < quantityStep(true) ? quantityStep(true) : next)}
            />
          ) : null}
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => {
              addItem(
                { id, name, nameEn, nameZh, price: displayPrice, isWeighed: isWeighed && !packageId, image, packageId, lineKey },
                isWeighed && !packageId ? quantity : 1,
              );
              toast.success(t("addedToCart"));
            }}
            className={`w-full rounded-full px-3 py-2.5 text-sm font-bold text-white ${
              isOutOfStock
                ? "cursor-not-allowed bg-gray-400"
                : "bg-primary transition duration-200 hover:-translate-y-0.5 hover:bg-primary-500 hover:shadow-lg active:translate-y-0"
            }`}
          >
            {isOutOfStock ? t("outOfStock") : t("addToCart")}
          </button>
        </>
      )}
      </div>
    </article>
  );
}
