import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ProductGrid from "@/components/product/ProductGrid";
import ProductGridSkeleton from "@/components/product/ProductGridSkeleton";
import { Suspense } from "react";

export default function SearchPage() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-6">
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid queryParam="q" titleKey="searchResultsTitle" requireQuery />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
