"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import ProductCard from "@/components/product/ProductCard";
import ProductGridSkeleton from "@/components/product/ProductGridSkeleton";
import { getProducts } from "@/services/api";
import type { Product } from "@/types";
import { SearchX } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ProductGridProps = {
  titleKey?: "products" | "featuredProducts";
};

export default function ProductGrid({ titleKey = "products" }: ProductGridProps) {
  const router = useRouter();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("categoryId") ?? "";
  const brandId = searchParams.get("brandId") ?? "";
  const search = searchParams.get("search") ?? "";
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const filtersRef = useRef({ categoryId, brandId, search });

  useEffect(() => {
    let ignore = false;
    const filtersChanged =
      filtersRef.current.categoryId !== categoryId ||
      filtersRef.current.brandId !== brandId ||
      filtersRef.current.search !== search;
    filtersRef.current = { categoryId, brandId, search };

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
  }, [page, categoryId, brandId, search]);

  if (loading && productsList.length === 0) {
    return <ProductGridSkeleton />;
  }

  const isEmpty = !loading && productsList.length === 0;

  return (
    <section
      aria-label={t("products")}
      className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6"
    >
      <h2 className="mb-4 text-xl font-extrabold sm:text-2xl">{t(titleKey)}</h2>
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <SearchX className="h-16 w-16 text-stone-400" aria-hidden="true" />
          <h3 className="mt-5 text-xl font-extrabold text-stone-900">{t("emptyTitle")}</h3>
          <p className="mt-2 max-w-md text-sm leading-7 text-stone-500">{t("emptySubtitle")}</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg"
          >
            {t("browseAll")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {productsList.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              nameEn={product.nameEn}
              nameZh={product.nameZh}
              brand={product.brand}
              price={product.price}
              image={product.image}
              stock={product.stock}
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
            className="rounded-full bg-primary px-8 py-3 text-base font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-primary-300 disabled:shadow-none"
          >
            {loading ? t("loading") : t("loadMore")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
