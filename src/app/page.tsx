import BrandCarousel from "@/components/brand/BrandCarousel";
import CategoryGrid from "@/components/category/CategoryGrid";
import HeroBanner from "@/components/home/HeroBanner";
import HomeRails from "@/components/home/HomeRails";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ProductGrid from "@/components/product/ProductGrid";
import ProductGridSkeleton from "@/components/product/ProductGridSkeleton";
import { Suspense } from "react";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div id="offers">
          <HeroBanner />
        </div>
        <CategoryGrid />
        <BrandCarousel />
        <HomeRails />

        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid titleKey="featuredProducts" showSort />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
