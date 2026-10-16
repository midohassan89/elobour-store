"use client";

import { resolveProductImage } from "@/utils/productImage";
import { ShoppingBag, Trash, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/components/i18n/LanguageProvider";
import QuantityStepper from "@/components/product/QuantityStepper";
import { useCartStore } from "@/store/cartStore";
import { getLocalizedName } from "@/utils/localizedName";
import { useLoyaltySettings } from "@/hooks/useLoyaltySettings";

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { t, language } = useI18n();
  const { earnRatio, ready } = useLoyaltySettings();
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const totalPrice = useCartStore((state) => state.totalPrice);
  const earnedPoints = Math.floor(totalPrice * earnRatio);

  useEffect(() => {
    console.log("Current Ratio in UI:", earnRatio);
  }, [earnRatio]);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
      inert={!open}
    >
      <button
        type="button"
        aria-label={t("closeCart")}
        onClick={onClose}
        className={`absolute inset-0 bg-stone-950/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal={open}
        aria-labelledby="cart-title"
        className={`absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "rtl:-translate-x-full ltr:translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2 id="cart-title" className="text-lg font-extrabold">
            {t("cartTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <p className="py-16 text-center text-sm text-stone-500">
              {t("cartEmpty")}
            </p>
          ) : (
            <ul>
              {items.map((item) => {
                const localizedName = getLocalizedName(item, language);
                const imageUrl = resolveProductImage(item.image);

                return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 border-b border-stone-100 py-4"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                    {imageUrl ? (
                      // Product photos stay on /uploads and must not pass through /_next/image.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-stone-300" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-6">{localizedName}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {item.price} {t("currency")}
                    </p>
                  </div>

                  <QuantityStepper
                    name={localizedName}
                    quantity={item.quantity}
                    isWeighed={item.isWeighed === true}
                    onChange={(next) => updateQuantity(item.id, next)}
                  />

                  <button
                    type="button"
                    aria-label={t("removeItem", { name: localizedName })}
                    onClick={() => removeItem(item.id)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-500 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-stone-200 px-5 py-4">
          {ready && items.length > 0 ? (
            <p className="mb-3 rounded-2xl bg-primary-50 px-3 py-2 text-sm font-bold text-primary-800">
              {t("earnOnOrder", { count: earnedPoints })}
            </p>
          ) : null}
          <div className="mb-4 flex items-center justify-between text-base font-extrabold">
            <span>{t("total")}</span>
            <span className="text-primary">
              {totalPrice} {t("currency")}
            </span>
          </div>
          <Link
            href="/checkout"
            onClick={onClose}
            aria-disabled={items.length === 0}
            className={`flex w-full items-center justify-center rounded-full py-3 text-sm font-bold text-white transition ${
              items.length === 0
                ? "pointer-events-none bg-stone-300"
                : "bg-primary hover:bg-primary-500"
            }`}
          >
            {t("checkout")}
          </Link>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
