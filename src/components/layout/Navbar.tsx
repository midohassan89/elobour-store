"use client";

import { Menu, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import LoginModal from "@/components/auth/LoginModal";
import LoyaltyCardModal from "@/components/loyalty/LoyaltyCardModal";
import { useI18n } from "@/components/i18n/LanguageProvider";
import CartDrawer from "@/components/cart/CartDrawer";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import LiveSearch from "@/components/layout/LiveSearch";
import type { Category } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { getLocalizedName, optionalLocalizedName } from "@/utils/localizedName";
import { uniqueByArabicName } from "@/utils/uniqueByName";
import { maskPhone } from "@/utils/maskPhone";

export default function Navbar() {
  const { t, language } = useI18n();
  const user = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.ready);
  const logout = useAuthStore((state) => state.logout);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const itemCount = useCartStore((state) =>
    state.items.reduce((count, item) => count + item.quantity, 0),
  );
  const closeCart = useCallback(() => setCartOpen(false), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);
  const closeCard = useCallback(() => setCardOpen(false), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!authReady) {
      void hydrate();
    }
  }, [authReady, hydrate]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/categories", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load categories");
        }

        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          return;
        }

        const nextCategories = data.flatMap((item) => {
          if (!item || typeof item !== "object") {
            return [];
          }

          const record = item as Record<string, unknown>;

          if (
            (typeof record.id !== "string" && typeof record.id !== "number") ||
            typeof record.name !== "string"
          ) {
            return [];
          }

          return [
            {
              id: String(record.id),
              name: record.name,
              nameEn: optionalLocalizedName(record.nameEn),
              nameZh: optionalLocalizedName(record.nameZh),
            },
          ];
        });

        setCategories(uniqueByArabicName(nextCategories));
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setCategories([]);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, closeMenu]);

  return (
    <header className="sticky top-0 z-40 border-b border-primary-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:gap-6 lg:py-4">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="store-menu"
          aria-label={t("menu")}
          className="order-1 inline-flex h-12 w-12 items-center justify-center rounded-full border border-stone-200 text-stone-800 transition hover:border-primary hover:text-primary"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        <Link
          href="/"
          className="order-2 text-lg font-extrabold tracking-tight text-primary sm:text-2xl"
        >
          {t("storeName")}
        </Link>

        <div className="order-3 ms-auto flex flex-wrap items-center justify-end gap-2 lg:order-4">
          {authReady && user ? (
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setCardOpen(true)}
                className="rounded-full bg-stone-950 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-stone-800 sm:text-sm"
              >
                {t("loyaltyCard")}
              </button>
              <span className="text-xs font-bold tracking-wide text-stone-700 sm:text-sm">
                {maskPhone(user.phone)}
              </span>
              <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-extrabold text-primary-800">
                {t("pointsBadge", { count: user.pointsBalance })}
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                className="text-xs font-bold text-stone-500 transition hover:text-primary"
              >
                {t("logout")}
              </button>
            </div>
          ) : authReady ? (
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="rounded-full bg-primary px-3 py-2 text-xs font-extrabold text-white transition hover:bg-primary-700 sm:px-4 sm:text-sm"
            >
              {t("login")}
            </button>
          ) : null}
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={t("cartWithCount", { count: itemCount })}
            className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-stone-200 text-stone-800 transition hover:border-primary hover:text-primary"
          >
            <ShoppingCart className="h-6 w-6" />
            <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-white">
              {itemCount}
            </span>
          </button>
        </div>

        <div className="order-4 w-full lg:order-3 lg:min-w-0 lg:flex-1">
          <LiveSearch />
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-stone-100 bg-white">
          <nav
            id="store-menu"
            aria-label={t("menu")}
            className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 md:grid-cols-[220px_1fr]"
          >
            <ul className="space-y-1">
              <li>
                <Link
                  href="/"
                  onClick={closeMenu}
                  className="block rounded-2xl px-3 py-2.5 text-sm font-extrabold text-stone-900 transition hover:bg-primary-50 hover:text-primary"
                >
                  {t("home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/shop"
                  onClick={closeMenu}
                  className="block rounded-2xl px-3 py-2.5 text-sm font-extrabold text-stone-900 transition hover:bg-primary-50 hover:text-primary"
                >
                  {t("shop")}
                </Link>
              </li>
              <li>
                <Link
                  href="/#offers"
                  onClick={closeMenu}
                  className="block rounded-2xl px-3 py-2.5 text-sm font-extrabold text-stone-900 transition hover:bg-primary-50 hover:text-primary"
                >
                  {t("offers")}
                </Link>
              </li>
            </ul>

            {categories.length > 0 ? (
              <div>
                <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-stone-400">
                  {t("categories")}
                </p>
                <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <Link
                        href={`/shop?categoryId=${encodeURIComponent(category.id)}`}
                        onClick={closeMenu}
                        className="block rounded-2xl px-3 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 hover:text-primary"
                      >
                        {getLocalizedName(category, language)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </nav>
        </div>
      ) : null}

      <CartDrawer open={cartOpen} onClose={closeCart} />
      <LoginModal open={loginOpen} onClose={closeLogin} />
      <LoyaltyCardModal open={cardOpen} onClose={closeCard} />
    </header>
  );
}
