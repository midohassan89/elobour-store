"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import ProductCard from "@/components/product/ProductCard";
import ProductGridSkeleton from "@/components/product/ProductGridSkeleton";
import { getProducts } from "@/services/api";
import type { Product } from "@/types";
import { SearchX } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ProductSort = "" | "price_asc" | "price_desc" | "instock";

type ProductGridProps = {
  titleKey?: "products" | "featuredProducts" | "searchResultsTitle";
  queryParam?: string;
  requireQuery?: boolean;
  showSort?: boolean;
};

export default function ProductGrid({
  titleKey = "products",
  queryParam = "search",
  requireQuery = false,
  showSort = false,
}: ProductGridProps) {
  const router = useRouter();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("categoryId") ?? "";
  const brandId = searchParams.get("brandId") ?? "";
  const search = (searchParams.get(queryParam) ?? "").trim();
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<ProductSort>("");
  const filtersRef = useRef({ categoryId, brandId, search, sort });

  useEffect(() => {
    if (requireQuery && !search) {
      return;
    }

    let ignore = false;
    const filtersChanged =
      filtersRef.current.categoryId !== categoryId ||
      filtersRef.current.brandId !== brandId ||
      filtersRef.current.search !== search ||
      filtersRef.current.sort !== sort;
    filtersRef.current = { categoryId, brandId, search, sort };

    const timeoutId = window.setTimeout(() => {
      if (filtersChanged && page !== 1) {
        setProductsList([]);
        setPage(1);
        setHasMore(false);
        return;
      }

      if (filtersChanged) {
        setProductsList([]);
      }

      setLoading(true);

      getProducts({
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        search: search || undefined,
        page,
        sort: sort || undefined,
      })
        .then((result) => {
          if (ignore) {
            return;
          }

          setProductsList((current) => {
            if (page === 1) {
              return result.products;
            }

            const seen = new Set(current.map((product) => product.id));
            const nextProducts = result.products.filter((product) => !seen.has(product.id));
            return [...current, ...nextProducts];
          });
          setHasMore(result.meta.hasMore);
        })
        .catch(() => {
          if (ignore) {
            return;
          }

          if (page === 1) {
            setProductsList([]);
          }

          setHasMore(false);
        })
        .finally(() => {
          if (!ignore) {
            setLoading(false);
          }
        });
    }, 0);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [page, categoryId, brandId, search, requireQuery, sort]);

  if (requireQuery && !search) {
    return (
      <section
        aria-label={t("searchResultsTitle")}
        className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6"
      >
        <h2 className="mb-4 text-xl font-extrabold sm:text-2xl">{t("searchResultsTitle")}</h2>
        <p className="text-sm leading-7 text-stone-500 dark:text-gray-400">{t("searchPrompt")}</p>
      </section>
    );
  }

  if (loading && productsList.length === 0) {
    return <ProductGridSkeleton />;
  }

  const isEmpty = !loading && productsList.length === 0;

  return (
    <section
      aria-label={t("products")}
      className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold sm:text-2xl">{t(titleKey)}</h2>
        {showSort ? (
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["", t("featuredProducts")],
                ["price_asc", t("sortLowPrice")],
                ["price_desc", t("sortHighPrice")],
                ["instock", t("sortInStock")],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value || "default"}
                type="button"
                aria-pressed={sort === value}
                onClick={() => {
                  setProductsList([]);
                  setPage(1);
                  setSort(value);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-extrabold transition ${
                  sort === value
                    ? "bg-primary text-white"
                    : "border border-stone-200 bg-white text-stone-700 hover:border-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <SearchX className="h-16 w-16 text-stone-400 dark:text-gray-500" aria-hidden="true" />
          <h3 className="mt-5 text-xl font-extrabold text-stone-900 dark:text-gray-100">
            {search ? t("noResultsFor", { query: search }) : t("emptyTitle")}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-7 text-stone-500 dark:text-gray-400">{t("emptySubtitle")}</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-primary-500 hover:shadow-lg"
          >
            {t("browseAll")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-4">
          {productsList.map((product, index) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              nameEn={product.nameEn}
              nameZh={product.nameZh}
              brand={product.brand}
              price={product.price}
              salePrice={product.salePrice}
              image={product.image}
              stock={product.stock}
              isWeighed={product.isWeighed === true}
              unit={product.unit}
              unitEn={product.unitEn}
              unitZh={product.unitZh}
              packages={product.packages}
              priority={index < 4}
            />
          ))}
        </div>
      )}

      {!isEmpty && hasMore ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            disabled={loading}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-full bg-primary px-8 py-3 text-base font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-primary-500 hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-primary-300 disabled:shadow-none"
          >
            {loading ? t("loading") : t("loadMore")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
