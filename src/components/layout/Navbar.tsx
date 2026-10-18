"use client";

import { Menu, ShoppingCart, User, X } from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import LoginModal from "@/components/auth/LoginModal";
import LoyaltyCardModal from "@/components/loyalty/LoyaltyCardModal";
import { useI18n } from "@/components/i18n/LanguageProvider";
import CartDrawer from "@/components/cart/CartDrawer";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import NotificationBell from "@/components/notifications/NotificationBell";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import LiveSearch from "@/components/layout/LiveSearch";
import type { Category } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { getLocalizedName, optionalLocalizedName } from "@/utils/localizedName";
import { uniqueByArabicName } from "@/utils/uniqueByName";

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
  const wishlistCount = useWishlist().ids.length;
  const itemCount = useCartStore((state) =>
    state.items.reduce((count, item) => count + item.quantity, 0),
  );
  const previousItemCount = useRef(itemCount);
  const [cartPop, setCartPop] = useState(false);

  useEffect(() => {
    if (itemCount > previousItemCount.current) {
      setCartPop(true);
      const timeoutId = window.setTimeout(() => setCartPop(false), 700);
      previousItemCount.current = itemCount;
      return () => window.clearTimeout(timeoutId);
    }

    previousItemCount.current = itemCount;
  }, [itemCount]);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);
  const closeCard = useCallback(() => setCardOpen(false), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const clockReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const hour = clockReady ? new Date().getHours() : 12;
  const isMorning = hour >= 5 && hour < 12;
  const greeting = user?.name
    ? t(isMorning ? "greetingMorning" : "greetingEvening", { name: user.name })
    : t(isMorning ? "greetingMorningPlain" : "greetingEveningPlain");

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
    <header className="sticky top-0 z-40 border-b border-primary-100 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:gap-5 lg:py-4">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="store-menu"
          aria-label={t("menu")}
          className="order-1 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-800 transition hover:border-primary hover:text-primary dark:border-gray-800 dark:text-gray-100"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        <Link
          href="/"
          className="order-2 shrink-0 whitespace-nowrap text-lg font-extrabold tracking-tight text-primary sm:text-2xl"
        >
          {t("storeName")}
        </Link>

        <div className="order-3 ms-auto flex w-fit max-w-full flex-wrap items-center justify-end gap-2 lg:order-4 lg:ms-0 lg:max-w-sm">
          {authReady && user ? (
            <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1.5">
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-2 text-xs font-extrabold text-stone-800 transition hover:border-primary hover:text-primary sm:text-sm dark:border-gray-800 dark:text-gray-100"
              >
                <User className="h-4 w-4" />
                {t("myAccount")}
              </Link>
              <button
                type="button"
                onClick={() => setCardOpen(true)}
                className="rounded-full bg-stone-950 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-stone-800 sm:text-sm"
              >
                {t("loyaltyCard")}
              </button>
              <span className="max-w-40 truncate text-xs font-extrabold text-stone-800 sm:max-w-none sm:text-sm dark:text-gray-100">
                {clockReady ? greeting : t("greetingEveningPlain")}
              </span>
              <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-extrabold text-primary-800">
                {t("pointsBadge", { count: user.pointsBalance })}
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                className="text-xs font-bold text-stone-500 transition hover:text-primary dark:text-gray-400"
              >
                {t("logout")}
              </button>
            </div>
          ) : authReady ? (
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="rounded-full bg-primary px-3 py-2 text-xs font-extrabold text-white transition hover:bg-primary-500 sm:px-4 sm:text-sm"
            >
              {t("login")}
            </button>
          ) : null}
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? (
            <Link
              href="/account?tab=wishlist"
              aria-label={t("wishlistWithCount", { count: wishlistCount })}
              className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-stone-200 text-lg text-stone-800 transition hover:border-primary hover:text-primary dark:border-gray-800 dark:text-gray-100"
            >
              {wishlistCount > 0 ? "❤️" : "♡"}
              <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-white dark:text-white">
                {wishlistCount}
              </span>
            </Link>
          ) : null}
          <NotificationBell />
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={t("cartWithCount", { count: itemCount })}
            className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-800 transition hover:border-primary hover:text-primary dark:border-gray-800 dark:text-gray-100"
          >
            <ShoppingCart className="h-6 w-6" />
            <span
              className={`absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-white dark:text-white ${
                cartPop ? "animate-bounce" : ""
              }`}
            >
              {Number.isInteger(itemCount) ? itemCount : Math.round(itemCount * 100) / 100}
            </span>
          </button>
        </div>

        <div className="order-4 w-full min-w-0 lg:order-3 lg:w-auto lg:max-w-3xl lg:flex-1">
          <Suspense
            fallback={
              <div className="h-12 w-full rounded-full border border-stone-200 bg-stone-50 sm:h-14 dark:border-gray-800 dark:bg-gray-900" />
            }
          >
            <LiveSearch />
          </Suspense>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-stone-100 bg-white dark:border-gray-800 dark:bg-gray-900">
          <nav
            id="store-menu"
            aria-label={t("menu")}
            className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 md:grid-cols-[220px_1fr]"
          >
            <ul className="space-y-1">
              {user ? (
                <li>
                  <Link
                    href="/profile"
                    onClick={closeMenu}
                    className="block rounded-2xl px-3 py-2.5 text-sm font-extrabold text-primary transition hover:bg-primary-50"
                  >
                    {t("myAccount")}
                  </Link>
                </li>
              ) : null}
              <li>
                <Link
                  href="/"
                  onClick={closeMenu}
                  className="block rounded-2xl px-3 py-2.5 text-sm font-extrabold text-stone-900 transition hover:bg-primary-50 hover:text-primary dark:text-gray-100"
                >
                  {t("home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/shop"
                  onClick={closeMenu}
                  className="block rounded-2xl px-3 py-2.5 text-sm font-extrabold text-stone-900 transition hover:bg-primary-50 hover:text-primary dark:text-gray-100"
                >
                  {t("shop")}
                </Link>
              </li>
              <li>
                <Link
                  href="/#offers"
                  onClick={closeMenu}
                  className="block rounded-2xl px-3 py-2.5 text-sm font-extrabold text-stone-900 transition hover:bg-primary-50 hover:text-primary dark:text-gray-100"
                >
                  {t("offers")}
                </Link>
              </li>
            </ul>

            {categories.length > 0 ? (
              <div>
                <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-stone-400 dark:text-gray-500">
                  {t("categories")}
                </p>
                <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <Link
                        href={`/shop?categoryId=${encodeURIComponent(category.id)}`}
                        onClick={closeMenu}
                        className="block rounded-2xl px-3 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 hover:text-primary dark:text-gray-200 dark:hover:bg-gray-800"
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
