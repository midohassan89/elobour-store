"use client";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ProductCard from "@/components/product/ProductCard";
import { useI18n } from "@/components/i18n/LanguageProvider";
import type { Product } from "@/types";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const productId = typeof params.id === "string" ? params.id : "";
  const { t } = useI18n();
  const [product, setProduct] = useState<Product | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!productId) return;
    let ignore = false;
    fetch(`/api/products?id=${encodeURIComponent(productId)}&limit=1`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { products?: Product[] }) => {
        if (ignore) return;
        const next = data.products?.[0] ?? null;
        setProduct(next);
        setMissing(!next);
      })
      .catch(() => {
        if (!ignore) setMissing(true);
      });
    return () => {
      ignore = true;
    };
  }, [productId]);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        {product ? <ProductCard {...product} image={product.image ?? ""} priority /> : null}
        {missing ? <p className="text-center text-sm font-bold text-stone-500 dark:text-gray-400">{t("noResults")}</p> : null}
      </main>
      <Footer />
    </>
  );
}
