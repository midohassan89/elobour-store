"use client";

import { MapPin, Menu, ShoppingCart, Star, User, X } from "lucide-react";
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
  const [addressOpen, setAddressOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<Array<{ id: string; title: string; city: string; zoneName: string; isDefault: boolean }>>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
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
    if (!user) {
      setSavedAddresses([]);
      return;
    }
    const controller = new AbortController();
    fetch("/api/account/addresses", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((data: { addresses?: Array<Record<string, unknown>> }) => {
        const next = (data.addresses ?? []).flatMap((address) => {
          if (!address || typeof address.id !== "string") return [];
          const zone = address.zone && typeof address.zone === "object" ? (address.zone as Record<string, unknown>) : null;
          return [
            {
              id: address.id,
              title: typeof address.title === "string" ? address.title : "",
              city: typeof address.city === "string" ? address.city : "",
              zoneName: zone && typeof zone.nameAr === "string" ? zone.nameAr : "",
              isDefault: address.isDefault === true,
            },
          ];
        });
        setSavedAddresses(next);
        const stored = window.localStorage.getItem("egychina-address") ?? "";
        const preferred = next.find((address) => address.id === stored) ?? next.find((address) => address.isDefault) ?? next[0];
        setSelectedAddressId(preferred?.id ?? "");
      })
      .catch(() => setSavedAddresses([]));
    return () => controller.abort();
  }, [user]);

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

  const selectedAddress = savedAddresses.find((address) => address.id === selectedAddressId) ?? savedAddresses[0];
  const addressPlace = selectedAddress
    ? [selectedAddress.title, selectedAddress.zoneName || selectedAddress.city].filter(Boolean).join(" - ")
    : "";

  return (
    <header className="sticky top-0 z-40 border-b border-primary-100 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <div className="border-b border-stone-100 bg-stone-50 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <p className="min-w-0 truncate text-xs font-bold text-stone-700 dark:text-gray-300">
              {authReady && user ? (clockReady ? greeting : t("greetingEveningPlain")) : t("storeName")}
            </p>
            {user && savedAddresses.length > 0 ? (
              <div className="relative min-w-0">
                <button
                  type="button"
                  aria-expanded={addressOpen}
                  onClick={() => setAddressOpen((open) => !open)}
                  className="inline-flex max-w-[260px] items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-extrabold text-stone-800 md:max-w-[340px] dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">{t("deliveryTo", { place: addressPlace })}</span>
                </button>
                {addressOpen ? (
                  <div className="absolute z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    {savedAddresses.map((address) => (
                      <button
                        key={address.id}
                        type="button"
                        onClick={() => {
                          setSelectedAddressId(address.id);
                          window.localStorage.setItem("egychina-address", address.id);
                          setAddressOpen(false);
                        }}
                        className="block w-full px-4 py-3 text-start text-sm font-bold text-stone-800 hover:bg-stone-50 dark:text-gray-100 dark:hover:bg-gray-800"
                      >
                        {[address.title, address.zoneName || address.city].filter(Boolean).join(" - ")}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {authReady && user ? (
              <button
                type="button"
                onClick={() => setCardOpen(true)}
                className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-extrabold text-primary-800"
              >
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                {t("pointsBadge", { count: user.pointsBalance })}
              </button>
            ) : authReady ? (
              <button type="button" onClick={() => setLoginOpen(true)} className="text-xs font-extrabold text-primary">
                {t("login")}
              </button>
            ) : null}
            <LanguageSwitcher />
            <ThemeToggle />
            {authReady && user ? (
              <button type="button" onClick={() => void logout()} className="text-xs font-bold text-stone-500 hover:text-primary dark:text-gray-400">
                {t("logout")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:flex-nowrap lg:gap-4">
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

        <div className="order-4 w-full min-w-0 lg:order-3 lg:mx-4 lg:max-w-2xl lg:flex-1">
          <Suspense
            fallback={
              <div className="h-12 w-full rounded-full border border-stone-200 bg-stone-50 sm:h-14 dark:border-gray-800 dark:bg-gray-900" />
            }
          >
            <LiveSearch />
          </Suspense>
        </div>

        <div className="order-3 ms-auto flex items-center gap-1.5 md:order-5">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={t("cartWithCount", { count: itemCount })}
            className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-800 transition hover:border-primary hover:text-primary dark:border-gray-800 dark:text-gray-100"
          >
            <ShoppingCart className="h-5 w-5" />
            <span
              className={`absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-white dark:text-white ${
                cartPop ? "animate-bounce" : ""
              }`}
            >
              {Number.isInteger(itemCount) ? itemCount : Math.round(itemCount * 100) / 100}
            </span>
          </button>
          <NotificationBell />
          {user ? (
            <Link
              href="/account?tab=wishlist"
              aria-label={t("wishlistWithCount", { count: wishlistCount })}
              className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-200 text-lg text-stone-800 transition hover:border-primary hover:text-primary dark:border-gray-800 dark:text-gray-100"
            >
              {wishlistCount > 0 ? "❤️" : "♡"}
              <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-white dark:text-white">
                {wishlistCount}
              </span>
            </Link>
          ) : null}
          <Link
            href={user ? "/account" : "/profile"}
            aria-label={t("myAccount")}
            onClick={(event) => {
              if (!user) {
                event.preventDefault();
                setLoginOpen(true);
              }
            }}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-800 transition hover:border-primary hover:text-primary dark:border-gray-800 dark:text-gray-100"
          >
            <User className="h-5 w-5" />
          </Link>
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
