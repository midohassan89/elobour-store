import BrandFilter from "@/components/brand/BrandFilter";
import CategoryNav from "@/components/layout/CategoryNav";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ProductGrid from "@/components/product/ProductGrid";
import ProductGridSkeleton from "@/components/product/ProductGridSkeleton";
import { Suspense } from "react";

export default function ShopPage() {
  return (
    <>
      <Header />
      <Suspense fallback={null}>
        <CategoryNav />
        <BrandFilter />
      </Suspense>
      <main className="flex-1 pt-6">
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
