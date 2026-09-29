"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import type { TranslationKey } from "@/locales/types";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { getLocalizedName } from "@/utils/localizedName";
import {
  discountForPoints,
  formatPointsAmount,
  maxRedeemablePoints,
  pointsForAmount,
} from "@/utils/points";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const DELIVERY_AREAS = [
  { id: "areaTeda", fee: 0 },
  { id: "areaPorto", fee: 50 },
  { id: "areaStella", fee: 60 },
  { id: "areaTelal", fee: 80 },
] as const satisfies readonly { id: TranslationKey; fee: number }[];

const fieldClassName =
  "w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/20";

export default function CheckoutPage() {
  const { t, language } = useI18n();
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const totalPrice = useCartStore((state) => state.totalPrice);
  const clearCart = useCartStore((state) => state.clearCart);
  const user = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.ready);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [submitted, setSubmitted] = useState(false);
  const [redeemEnabled, setRedeemEnabled] = useState(false);
  const [pointsInput, setPointsInput] = useState("0");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<(typeof DELIVERY_AREAS)[number]>(
    DELIVERY_AREAS[0],
  );
  const [detailedAddress, setDetailedAddress] = useState("");
  const shippingFee = selectedArea.fee;
  const maxRedeemable = user ? maxRedeemablePoints(user.pointsBalance, totalPrice) : 0;
  const requestedPoints = redeemEnabled ? Math.floor(Number(pointsInput) || 0) : 0;
  const pointsRedeemed = Math.min(Math.max(0, requestedPoints), maxRedeemable);
  const pointsDiscount = discountForPoints(pointsRedeemed);
  const merchandiseDue = Math.max(0, totalPrice - pointsDiscount);
  const finalTotal = merchandiseDue + shippingFee;
  const earnedPoints = pointsForAmount(merchandiseDue);

  useEffect(() => {
    if (!authReady) {
      void hydrate();
    }
  }, [authReady, hydrate]);

  useEffect(() => {
    if (!submitted) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.push("/");
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [submitted, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (items.length === 0 || submitted || pending) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const customerName = String(formData.get("fullName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const addressDetails = detailedAddress.trim();

    if (!addressDetails) {
      setError(t("addressRequired"));
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone,
          address: `${t(selectedArea.id)} - ${addressDetails}`,
          totalAmount: finalTotal,
          shippingFee,
          pointsRedeemed,
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });
      const result = (await response.json().catch(() => null)) as { error?: unknown } | null;
      const errorCode = typeof result?.error === "string" ? result.error : "";

      if (!response.ok) {
        setError(
          errorCode === "unauthorized" || response.status === 401
            ? t("orderUnauthorized")
            : errorCode.toLowerCase().includes("not found")
              ? t("orderUnavailable")
              : errorCode === "invalid" || response.status === 400
                ? errorCode.toLowerCase().includes("points")
                  ? t("orderPoints")
                  : t("orderInvalid")
                : errorCode.toLowerCase().includes("points")
                  ? t("orderPoints")
                  : t("orderFailed"),
        );
        setPending(false);
        return;
      }

      clearCart();
      void hydrate();
      setSubmitted(true);
    } catch {
      setError(t("orderFailed"));
      setPending(false);
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
          <h1 className="text-2xl font-extrabold sm:text-3xl">{t("checkoutTitle")}</h1>
          <p className="mt-2 text-sm leading-7 text-stone-600 sm:text-base">{t("checkoutIntro")}</p>

          {submitted ? (
            <p
              role="status"
              className="mt-8 rounded-3xl bg-primary-50 px-6 py-10 text-center text-xl font-extrabold text-primary-800"
            >
              {t("orderReceived")}
            </p>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-5">
              <form
                onSubmit={handleSubmit}
                className="space-y-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-3"
              >
                <div>
                  <label htmlFor="full-name" className="mb-2 block text-sm font-bold">
                    {t("fullName")}
                  </label>
                  <input
                    id="full-name"
                    name="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    className={fieldClassName}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="mb-2 block text-sm font-bold">
                    {t("phone")}
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="text"
                    inputMode="tel"
                    required
                    autoComplete="tel"
                    placeholder={t("phonePlaceholder")}
                    className={fieldClassName}
                  />
                </div>

                <div>
                  <label htmlFor="delivery-area" className="mb-2 block text-sm font-bold">
                    {t("deliveryArea")}
                  </label>
                  <select
                    id="delivery-area"
                    name="deliveryArea"
                    required
                    value={selectedArea.id}
                    onChange={(event) => {
                      const area = DELIVERY_AREAS.find((entry) => entry.id === event.target.value);
                      if (area) {
                        setSelectedArea(area);
                      }
                    }}
                    className={fieldClassName}
                  >
                    {DELIVERY_AREAS.map((area) => (
                      <option key={area.id} value={area.id}>
                        {t(area.id)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="detailed-address" className="mb-2 block text-sm font-bold">
                    {t("addressDetails")}
                  </label>
                  <input
                    id="detailed-address"
                    name="detailedAddress"
                    type="text"
                    required
                    value={detailedAddress}
                    onChange={(event) => setDetailedAddress(event.target.value)}
                    placeholder={t("addressPlaceholder")}
                    className={fieldClassName}
                  />
                </div>

                {authReady && user && user.pointsBalance > 0 ? (
                  <fieldset className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                    <legend className="px-1 text-sm font-extrabold text-amber-900">
                      {t("redeemPoints")}
                    </legend>
                    <p className="text-sm font-semibold leading-7 text-amber-900">
                      {t("pointsWorth", {
                        points: user.pointsBalance,
                        amount: formatPointsAmount(discountForPoints(user.pointsBalance)),
                      })}
                    </p>
                    <label className="mt-3 flex items-center gap-2 text-sm font-bold text-stone-800">
                      <input
                        type="checkbox"
                        checked={redeemEnabled}
                        onChange={(event) => {
                          const enabled = event.target.checked;
                          setRedeemEnabled(enabled);
                          if (enabled) {
                            setPointsInput(String(maxRedeemable));
                          }
                        }}
                        className="h-4 w-4 accent-primary"
                      />
                      {t("redeemPoints")}
                    </label>
                    {redeemEnabled ? (
                      <input
                        type="number"
                        min={0}
                        max={maxRedeemable}
                        step={1}
                        value={pointsInput}
                        onChange={(event) => {
                          const next = Math.floor(Number(event.target.value) || 0);
                          setPointsInput(String(Math.min(Math.max(0, next), maxRedeemable)));
                        }}
                        className={`${fieldClassName} mt-3`}
                      />
                    ) : null}
                  </fieldset>
                ) : null}

                {error ? (
                  <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={items.length === 0 || pending}
                  className="w-full rounded-full bg-primary py-3.5 text-base font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
                >
                  {pending ? t("submittingOrder") : t("confirmOrder")}
                </button>
              </form>

              <aside className="h-fit rounded-3xl border border-stone-200 bg-stone-50 p-5 sm:p-6 lg:col-span-2">
                <h2 className="text-lg font-extrabold">{t("orderSummary")}</h2>
                {items.length === 0 ? (
                  <p className="mt-6 text-sm text-stone-500">{t("cartEmpty")}</p>
                ) : (
                  <ul className="mt-4 divide-y divide-stone-200">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="font-semibold leading-6">
                            {getLocalizedName(item, language)}
                          </p>
                          <p className="mt-1 text-sm text-stone-500">
                            {item.quantity} × {item.price} {t("currency")}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-extrabold text-primary">
                          {item.price * item.quantity} {t("currency")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <dl className="mt-4 space-y-3 border-t border-stone-200 pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <dt>{t("subtotal")}</dt>
                    <dd className="font-bold">
                      {totalPrice} {t("currency")}
                    </dd>
                  </div>
                  {pointsDiscount > 0 ? (
                    <div className="flex items-center justify-between text-amber-800">
                      <dt>{t("pointsDiscount")}</dt>
                      <dd className="font-bold">
                        -{formatPointsAmount(pointsDiscount)} {t("currency")}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <dt>{t("shippingFee")}</dt>
                    <dd className="font-bold">
                      {shippingFee} {t("currency")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between text-base font-extrabold">
                    <dt>{t("finalTotal")}</dt>
                    <dd className="text-primary">
                      {finalTotal} {t("currency")}
                    </dd>
                  </div>
                </dl>
                {items.length > 0 ? (
                  <p className="mt-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
                    {t("earnOnOrder", { count: earnedPoints })}
                  </p>
                ) : null}
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
