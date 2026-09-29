"use client";

import { X } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Barcode from "react-barcode";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { useAuthStore } from "@/store/authStore";

type LoyaltyCardModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function LoyaltyCardModal({ open, onClose }: LoyaltyCardModalProps) {
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
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

  if (!open || !mounted || !user) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/50 p-4 sm:items-center">
      <button
        type="button"
        aria-label={t("close")}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="loyalty-card-title"
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="bg-gradient-to-br from-primary-700 via-primary to-primary-400 px-6 pb-8 pt-5 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="absolute end-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-sm font-bold text-primary-50">{t("storeName")}</p>
          <h2 id="loyalty-card-title" className="mt-2 text-2xl font-extrabold">
            {t("loyaltyCard")}
          </h2>
          <p className="mt-4 text-3xl font-extrabold tracking-tight">
            {t("pointsBadge", { count: user.pointsBalance })}
          </p>
        </div>

        <div className="px-5 pb-6">
          <div className="-mt-6 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
            <Barcode
              value={user.phone}
              format="CODE128"
              background="#ffffff"
              lineColor="#111111"
              width={2}
              height={84}
              margin={12}
              displayValue
              fontSize={16}
            />
          </div>
          <p className="mt-4 text-center text-sm font-semibold leading-7 text-stone-600">
            {t("loyaltyCardHint")}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
