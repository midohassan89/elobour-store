import ProductGridSkeleton from "@/components/product/ProductGridSkeleton";

export default function Loading() {
  return (
    <main className="flex-1" aria-busy="true" aria-live="polite">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="h-56 animate-pulse rounded-3xl bg-stone-200 sm:h-72" />
      </div>
      <ProductGridSkeleton />
    </main>
  );
}
