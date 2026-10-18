"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import type { Product } from "@/types";
import { useAuthStore } from "@/store/authStore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";

type WishlistContextValue = {
  ids: string[];
  products: Product[];
  toggle: (productId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const ready = useAuthStore((state) => state.ready);
  const { t } = useI18n();
  const [ids, setIds] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setIds([]);
      setProducts([]);
      return;
    }

    const response = await fetch("/api/customer/wishlist", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { wishlistIds?: string[]; products?: Product[] };
    setIds(Array.isArray(data.wishlistIds) ? data.wishlistIds : []);
    setProducts(Array.isArray(data.products) ? data.products : []);
  }, [user]);

  useEffect(() => {
    if (!ready) return;
    void refresh();
  }, [ready, refresh]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!user) {
        toast.error(t("loginToWishlist"));
        return;
      }

      const response = await fetch("/api/customer/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!response.ok) return;
      await refresh();
    },
    [refresh, t, user],
  );

  const value = useMemo(
    () => ({ ids, products, toggle, refresh }),
    [ids, products, refresh, toggle],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  return (
    useContext(WishlistContext) ?? {
      ids: [],
      products: [],
      toggle: async () => {},
      refresh: async () => {},
    }
  );
}
