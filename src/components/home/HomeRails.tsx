"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import ProductCard from "@/components/product/ProductCard";
import { getProducts } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import type { Product } from "@/types";
import { useEffect, useState } from "react";

function Rail({ title, products }: { title: string; products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
      <h2 className="mb-4 text-xl font-extrabold text-stone-950 sm:text-2xl dark:text-gray-100">{title}</h2>
      <div className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-4">
        {products.slice(0, 8).map((product, index) => (
          <ProductCard key={product.id} {...product} image={product.image ?? ""} priority={index < 4} />
        ))}
      </div>
    </section>
  );
}

export default function HomeRails() {
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const [buyAgain, setBuyAgain] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Product[]>([]);
  const [asian, setAsian] = useState<Product[]>([]);

  useEffect(() => {
    if (!user) {
      setBuyAgain([]);
      return;
    }
    const controller = new AbortController();
    fetch("/api/customer/buy-again", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((data: { products?: Product[] }) => setBuyAgain(Array.isArray(data.products) ? data.products : []))
      .catch(() => setBuyAgain([]));
    return () => controller.abort();
  }, [user]);

  useEffect(() => {
    let ignore = false;
    getProducts({ offers: true, limit: 8 })
      .then((result) => {
        if (!ignore) setOffers(result.products);
      })
      .catch(() => {
        if (!ignore) setOffers([]);
      });

    fetch("/api/categories")
      .then((response) => response.json())
      .then(async (data: unknown) => {
        if (!Array.isArray(data) || ignore) return;
        const match = data.find((item) => {
          if (!item || typeof item !== "object") return false;
          const record = item as Record<string, unknown>;
          const name = [record.name, record.nameEn, record.nameZh].filter((value) => typeof value === "string").join(" ");
          return /آسيو|صين|مستورد|asian|import/i.test(name);
        }) as Record<string, unknown> | undefined;
        const categoryId = match && (typeof match.id === "string" || typeof match.id === "number") ? String(match.id) : "";
        if (!categoryId) return;
        const result = await getProducts({ categoryId, limit: 8 });
        if (!ignore) setAsian(result.products);
      })
      .catch(() => {
        if (!ignore) setAsian([]);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <>
      <Rail title={t("buyAgain")} products={buyAgain} />
      <Rail title={t("specialOffers")} products={offers} />
      <Rail title={t("asianSpotlight")} products={asian} />
    </>
  );
}
