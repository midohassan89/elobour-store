"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";
import { getLocalizedName, optionalLocalizedName } from "@/utils/localizedName";
import { Search } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

function resolveProductImage(image: string) {
  let cleanPath = image;

  if (cleanPath.startsWith("public/")) {
    cleanPath = cleanPath.replace(/^public\//, "/");
  }

  if (cleanPath.startsWith("uploads/")) {
    cleanPath = cleanPath.replace(/^uploads\//, "/uploads/");
  }

  cleanPath = cleanPath.replace(
    /(https?:\/{2,})|(\/{2,})/gi,
    (_match, protocol: string | undefined) => {
      if (protocol) {
        return `${protocol.slice(0, protocol.indexOf(":") + 1)}//`;
      }

      return "/";
    },
  );

  if (cleanPath.startsWith("/uploads")) {
    return `http://localhost:3001${cleanPath}`;
  }

  return cleanPath;
}

function toSearchResults(data: unknown): Product[] {
  const list = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        Array.isArray((data as { products?: unknown }).products)
      ? (data as { products: unknown[] }).products
      : null;

  if (!list) {
    return [];
  }

  return list.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const record = item as Record<string, unknown>;
    const price = typeof record.price === "number" ? record.price : Number(record.price);
    const id = record.id;
    const name = record.name;

    if (
      (typeof id !== "string" && typeof id !== "number") ||
      typeof name !== "string" ||
      !Number.isFinite(price)
    ) {
      return [];
    }

    const stock = typeof record.stock === "number" ? record.stock : Number(record.stock);

    return [
      {
        id: String(id),
        name,
        nameEn: optionalLocalizedName(record.nameEn),
        nameZh: optionalLocalizedName(record.nameZh),
        price,
        image: typeof record.image === "string" ? record.image : undefined,
        stock: Number.isFinite(stock) ? stock : undefined,
      },
    ];
  });
}

export default function LiveSearch() {
  const { t, language } = useI18n();
  const addItem = useCartStore((state) => state.addItem);
  const containerRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextTerm = term.trim();
      setDebouncedTerm(nextTerm);
      setLoading(nextTerm.length >= 2);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [term]);

  useEffect(() => {
    if (debouncedTerm.length < 2) {
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

    if (!baseUrl) {
      return;
    }

    const controller = new AbortController();

    fetch(`${baseUrl}/store/products?search=${encodeURIComponent(debouncedTerm)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Search failed");
        }

        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        setResults(toSearchResults(data));
        setOpen(true);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setResults([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [debouncedTerm]);

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const query = term.trim();
  const showResults = open && query.length >= 2 && debouncedTerm.length >= 2;

  return (
    <div ref={containerRef} className="relative w-full">
      <label htmlFor="live-search" className="sr-only">
        {t("searchProducts")}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
      />
      <input
        id="live-search"
        type="search"
        value={term}
        placeholder={t("searchPlaceholder")}
        autoComplete="off"
        onChange={(event) => {
          const value = event.target.value;
          setTerm(value);

          if (value.trim() === "") {
            setDebouncedTerm("");
            setResults([]);
            setOpen(false);
            setLoading(false);
          }
        }}
        onFocus={() => {
          if (query.length >= 2 && results.length > 0) {
            setOpen(true);
          }
        }}
        className="h-12 w-full rounded-full border border-stone-200 bg-stone-50 ps-12 pe-4 text-base text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/20 sm:h-14"
      />

      {showResults ? (
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl bg-white shadow-lg ring-1 ring-stone-200">
          {loading ? (
            <p className="px-4 py-3 text-sm text-stone-500">{t("searching")}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-stone-500">{t("noResults")}</p>
          ) : (
            <ul>
              {results.map((product) => {
                const imageUrl = product.image ? resolveProductImage(product.image) : "";
                const isOutOfStock = product.stock !== undefined && product.stock <= 0;
                const localizedName = getLocalizedName(product, language);

                return (
                  <li
                    key={product.id}
                    className="flex items-center gap-3 border-b border-stone-100 px-3 py-2 last:border-b-0"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-stone-900">{localizedName}</p>
                      <p className="text-sm font-extrabold text-primary">
                        {product.price} {t("currency")}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() =>
                        addItem({
                          id: product.id,
                          name: product.name,
                          nameEn: product.nameEn,
                          nameZh: product.nameZh,
                          price: product.price,
                        })
                      }
                      className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                      {isOutOfStock ? t("outOfStock") : t("add")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
