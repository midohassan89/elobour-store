"use client";

import AddressForm, { type AddressFormValues } from "@/components/account/AddressForm";
import LoginModal from "@/components/auth/LoginModal";
import DeliveryTimePicker, {
  isDeliveryTimeAllowed,
  nextValidDeliveryTime,
} from "@/components/checkout/DeliveryTimePicker";
import { useI18n } from "@/components/i18n/LanguageProvider";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { useLoyaltySettings } from "@/hooks/useLoyaltySettings";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { formatEstimatedTime } from "@/utils/estimatedTime";
import { getLocalizedName } from "@/utils/localizedName";
import { formatQuantity } from "@/utils/quantity";
import {
  discountForPoints,
  formatPointsAmount,
  maxRedeemablePointsStep,
  POINTS_REDEEM_STEP,
} from "@/utils/points";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type DeliveryZone = {
  id: string;
  nameAr: string;
  nameEn: string;
  nameZh: string;
  deliveryFee: number;
  minOrder: number;
  estimatedTime: string | null;
};

type AppliedCoupon = {
  code: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
};

type SavedAddress = {
  id: string;
  title: string;
  street: string;
  city: string;
  recipientName: string | null;
  phoneNumber: string | null;
  zoneId: string | null;
  isDefault: boolean;
  zone: DeliveryZone | null;
};

const DEFAULT_ADDRESS_CITY = "العين السخنة";

const fieldClassName =
  "w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/20 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-900";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readZone(value: unknown): DeliveryZone | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.id !== "string" || !record.id) {
    return null;
  }

  return {
    id: record.id,
    nameAr: text(record.nameAr) || text(record.name),
    nameEn: text(record.nameEn),
    nameZh: text(record.nameZh),
    deliveryFee: Number(record.deliveryFee ?? record.fee) || 0,
    minOrder: Number(record.minOrder) || 0,
    estimatedTime: text(record.estimatedTime) || null,
  };
}

function readAddress(value: unknown): SavedAddress | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.id !== "string" || !record.id) {
    return null;
  }

  return {
    id: record.id,
    title: text(record.title),
    street: text(record.street),
    city: text(record.city),
    recipientName: text(record.recipientName) || null,
    phoneNumber: text(record.phoneNumber) || null,
    zoneId: text(record.zoneId) || null,
    isDefault: record.isDefault === true || Number(record.isDefault) === 1,
    zone: readZone(record.zone),
  };
}

function emptyAddressDraft(zoneId = ""): AddressFormValues {
  return {
    title: "",
    recipientName: "",
    street: "",
    phoneNumber: "",
    city: DEFAULT_ADDRESS_CITY,
    zoneId,
  };
}

export default function CheckoutPage() {
  const { t, language } = useI18n();
  const router = useRouter();
  const items = useCartStore((state) => state.items) ?? [];
  const totalPrice = useCartStore((state) => state.totalPrice) ?? 0;
  const clearCart = useCartStore((state) => state.clearCart);
  const { earnRatio, redeemValue, ready } = useLoyaltySettings();
  const user = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.ready);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [submitted, setSubmitted] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<"asap" | "schedule">("asap");
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponPending, setCouponPending] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [zonesError, setZonesError] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [addressChoice, setAddressChoice] = useState("");
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [addressFormKey, setAddressFormKey] = useState(0);
  const [draft, setDraft] = useState<AddressFormValues>(() => emptyAddressDraft());
  const [loginOpen, setLoginOpen] = useState(false);
  const [deliveryTime, setDeliveryTime] = useState(() => nextValidDeliveryTime());
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState("");
  const deliveryZones = zones ?? [];
  const savedAddresses = addresses ?? [];
  const selectedZone = deliveryZones.find((zone) => zone.id === selectedZoneId) ?? null;
  const selectedSaved = savedAddresses.find((address) => address.id === addressChoice) ?? null;
  const shippingFee = selectedZone?.deliveryFee ?? selectedSaved?.zone?.deliveryFee ?? 0;
  const couponDiscount = appliedCoupon?.discountAmount ?? 0;
  const goodsAfterCoupon = Math.max(0, totalPrice - couponDiscount);
  const maxStepPoints = user
    ? maxRedeemablePointsStep(user.pointsBalance ?? 0, goodsAfterCoupon, redeemValue)
    : 0;
  const pointsRedeemed = Math.min(Math.max(0, pointsToRedeem), maxStepPoints);
  const pointsDiscount = discountForPoints(pointsRedeemed, redeemValue);
  const merchandiseDue = Math.max(0, goodsAfterCoupon - pointsDiscount);
  const belowMinOrder = Boolean(selectedZone && selectedZone.minOrder > 0 && totalPrice + 0.001 < selectedZone.minOrder);
  const finalTotal = merchandiseDue + shippingFee;
  const earnedPoints = Math.floor(merchandiseDue * earnRatio);
  const resolvedAddressTitle = showNewAddressForm ? draft.title.trim() : text(selectedSaved?.title);
  const isLoading = !authReady || Boolean(user?.id && (!zonesLoaded || !addressesLoaded));
  const activeRecipient = showNewAddressForm ? draft.recipientName.trim() : text(selectedSaved?.recipientName);
  const activePhone = showNewAddressForm ? draft.phoneNumber.trim() : text(selectedSaved?.phoneNumber);
  const activeStreet = showNewAddressForm ? draft.street.trim() : text(selectedSaved?.street);
  const activeCity = showNewAddressForm ? DEFAULT_ADDRESS_CITY : text(selectedSaved?.city) || DEFAULT_ADDRESS_CITY;
  const deliveryReady = deliveryMode === "asap" || isDeliveryTimeAllowed(deliveryTime);
  const addressReady =
    Boolean(deliveryReady && activeRecipient && activePhone && activeStreet && activeCity && selectedZone && !belowMinOrder) &&
    (showNewAddressForm ? Boolean(resolvedAddressTitle) : Boolean(selectedSaved));

  function couponFailureMessage(payload: { error?: string; minOrder?: number; amount?: number } | null) {
    if (payload?.error === "MIN_AMOUNT_NOT_MET") {
      const amount = Number(payload.amount ?? payload.minOrder);

      return t("couponMinAmount", { amount: formatPointsAmount(Number.isFinite(amount) ? amount : 0) });
    }

    if (payload?.error === "EXPIRED") {
      return t("couponExpired");
    }

    if (payload?.error === "LIMIT_REACHED") {
      return t("couponLimitReached");
    }

    return t("couponInvalid");
  }

  function deliveryFeeLabel(fee: number) {
    if (fee === 0) {
      return t("freeDelivery");
    }

    return `${fee} ${t("currency")}`;
  }

  useEffect(() => {
    console.log("Current Ratio in UI:", earnRatio);
  }, [earnRatio]);

  useEffect(() => {
    setPointsToRedeem((current) => (current > maxStepPoints ? maxStepPoints : current));
  }, [maxStepPoints]);

  useEffect(() => {
    const code = appliedCoupon?.code;

    if (!code) {
      return;
    }

    const controller = new AbortController();

    fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal: totalPrice }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as (AppliedCoupon & {
          valid?: boolean;
          error?: string;
          minOrder?: number;
          amount?: number;
        }) | null;

        if (!response.ok || !payload?.valid) {
          setAppliedCoupon(null);
          setCouponMessage(couponFailureMessage(payload));
          return;
        }

        setAppliedCoupon({
          code: payload.code,
          discountType: payload.discountType,
          discountValue: payload.discountValue,
          discountAmount: payload.discountAmount,
        });
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }
      });

    return () => controller.abort();
  }, [appliedCoupon?.code, totalPrice, t]);

  useEffect(() => {
    if (!authReady) {
      void hydrate();
    }
  }, [authReady, hydrate]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/delivery-zones", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("failed");
        }

        const payload = (await response.json()) as { zones?: unknown };
        const nextZones = Array.isArray(payload?.zones)
          ? payload.zones.flatMap((zone) => {
              const parsed = readZone(zone);
              return parsed ? [parsed] : [];
            })
          : [];
        setZones(nextZones);
        setSelectedZoneId((current) =>
          nextZones.some((zone) => zone.id === current) ? current : nextZones[0]?.id || "",
        );
        setZonesLoaded(true);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }

        setZonesError(true);
        setZonesLoaded(true);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!user?.id) {
      setAddresses([]);
      setAddressChoice("new");
      setShowNewAddressForm(true);
      setAddressesLoaded(true);
      return;
    }

    const controller = new AbortController();
    const customerId = user.id;
    setAddressesLoaded(false);

    fetch(`/api/customers/${encodeURIComponent(customerId)}/addresses`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("failed");
        }

        const payload = (await response.json()) as { addresses?: unknown };
        const nextAddresses = Array.isArray(payload?.addresses)
          ? payload.addresses.flatMap((address) => {
              const parsed = readAddress(address);
              return parsed ? [parsed] : [];
            })
          : [];
        setAddresses(nextAddresses);
        const preferred = nextAddresses.find((address) => address.isDefault) ?? nextAddresses[0];

        if (!preferred) {
          setAddressChoice("new");
          setShowNewAddressForm(true);
          setDraft(emptyAddressDraft());
          return;
        }

        setShowNewAddressForm(false);
        setAddressChoice(preferred.id);
        if (preferred.zoneId) {
          setSelectedZoneId(preferred.zoneId);
        }
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }

        setAddressChoice("new");
        setShowNewAddressForm(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setAddressesLoaded(true);
        }
      });

    return () => controller.abort();
  }, [authReady, user]);

  useEffect(() => {
    if (!submitted) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.push("/");
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [submitted, router]);

  function selectSavedAddress(address: SavedAddress) {
    setShowNewAddressForm(false);
    setAddressChoice(address.id);
    if (address.zoneId) {
      setSelectedZoneId(address.zoneId);
    }
  }

  function selectNewAddress() {
    setShowNewAddressForm(true);
    setAddressChoice("new");
    setDraft(emptyAddressDraft(selectedZoneId));
    setAddressFormKey((key) => key + 1);
  }

  function cancelNewAddress() {
    const preferred =
      savedAddresses.find((address) => address.isDefault) ?? savedAddresses[0];

    if (!preferred) {
      setShowNewAddressForm(true);
      return;
    }

    selectSavedAddress(preferred);
  }

  async function saveNewAddress(values: AddressFormValues) {
    const zone = deliveryZones.find((item) => item.id === values.zoneId) ?? null;

    if (!user?.id || savingAddress) {
      return;
    }

    if (!zone || !values.recipientName.trim() || !values.street.trim() || !values.phoneNumber.trim() || !values.title.trim()) {
      setError(t("addressRequired"));
      return;
    }

    setSavingAddress(true);
    setError(null);

    try {
      const response = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title.trim(),
          recipientName: values.recipientName.trim(),
          street: values.street.trim(),
          city: values.city.trim() || DEFAULT_ADDRESS_CITY,
          phoneNumber: values.phoneNumber.trim(),
          zoneId: zone.id,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { address?: unknown } | null;
      const created = readAddress(payload?.address);

      if (!response.ok || !created) {
        setError(t("addressFailed"));
        return;
      }

      const saved = { ...created, zone, zoneId: zone.id };
      setAddresses((current) => [saved, ...(current || []).filter((address) => address.id !== saved.id)]);
      selectSavedAddress(saved);
    } catch {
      setError(t("addressFailed"));
    } finally {
      setSavingAddress(false);
    }
  }

  async function deleteSavedAddress(address: SavedAddress) {
    if (!user?.id || deletingAddressId) {
      return;
    }

    if (!window.confirm(t("deleteAddressConfirm"))) {
      return;
    }

    setDeletingAddressId(address.id);
    setError(null);

    try {
      const response = await fetch(
        `/api/customers/${encodeURIComponent(user.id)}/addresses/${encodeURIComponent(address.id)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        setError(t("addressFailed"));
        return;
      }

      const remaining = (savedAddresses || []).filter((item) => item.id !== address.id);
      setAddresses(remaining);

      if (addressChoice !== address.id) {
        return;
      }

      const preferred = remaining.find((item) => item.isDefault) ?? remaining[0];

      if (!preferred) {
        setAddressChoice("new");
        setShowNewAddressForm(true);
        setDraft(emptyAddressDraft(selectedZoneId));
        setAddressFormKey((key) => key + 1);
        return;
      }

      selectSavedAddress(preferred);
    } catch {
      setError(t("addressFailed"));
    } finally {
      setDeletingAddressId("");
    }
  }

  async function applyCoupon() {
    const code = couponInput.trim();

    if (!code || couponPending) {
      return;
    }

    setCouponPending(true);
    setCouponMessage(null);

    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: totalPrice }),
      });
      const payload = (await response.json().catch(() => null)) as (AppliedCoupon & {
        valid?: boolean;
        error?: string;
        minOrder?: number;
        amount?: number;
      }) | null;

      if (!response.ok || !payload?.valid) {
        setAppliedCoupon(null);
        setCouponMessage(couponFailureMessage(payload));
        return;
      }

      setAppliedCoupon({
        code: payload.code,
        discountType: payload.discountType,
        discountValue: payload.discountValue,
        discountAmount: payload.discountAmount,
      });
      setCouponInput(payload.code);
      setCouponMessage(t("couponApplied"));
    } catch {
      setCouponMessage(t("couponInvalid"));
    } finally {
      setCouponPending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (items.length === 0 || submitted || pending) {
      return;
    }

    const phone = activePhone;
    const addressDetails = activeStreet;
    const addressCity = activeCity;
    const scheduledAt = deliveryTime;

    if (
      !addressReady ||
      !activeRecipient ||
      !selectedZone ||
      !phone ||
      !addressDetails ||
      !addressCity ||
      (deliveryMode === "schedule" && Number.isNaN(scheduledAt.getTime())) ||
      (showNewAddressForm && !resolvedAddressTitle)
    ) {
      setError(belowMinOrder ? t("minOrderNotMet", { amount: formatPointsAmount(selectedZone?.minOrder ?? 0) }) : t("addressRequired"));
      return;
    }

    if (deliveryMode === "schedule" && !isDeliveryTimeAllowed(scheduledAt)) {
      setDeliveryTime(nextValidDeliveryTime());
      setError(t("deliveryTimeTooSoon"));
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: activeRecipient,
          phone,
          phoneNumber: phone,
          address: [selectedZone.nameAr, addressDetails, addressCity].filter(Boolean).join(" - "),
          zoneId: selectedZone.id,
          deliveryFee: selectedZone.deliveryFee,
          shippingFee: selectedZone.deliveryFee,
          deliveryTime: deliveryMode === "asap" ? "ASAP" : scheduledAt.toISOString(),
          totalAmount: finalTotal,
          pointsRedeemed,
          couponCode: appliedCoupon?.code ?? "",
          saveAddress: showNewAddressForm,
          addressTitle: resolvedAddressTitle,
          street: addressDetails,
          city: addressCity || DEFAULT_ADDRESS_CITY,
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: unknown;
        minOrder?: unknown;
        amount?: unknown;
      } | null;
      const errorCode = typeof result?.error === "string" ? result.error : "";

      if (!response.ok) {
        if (
          errorCode === "MIN_AMOUNT_NOT_MET" ||
          errorCode === "EXPIRED" ||
          errorCode === "LIMIT_REACHED" ||
          errorCode === "INVALID" ||
          errorCode === "coupon"
        ) {
          const message = couponFailureMessage({
            error: errorCode,
            minOrder: typeof result?.minOrder === "number" ? result.minOrder : undefined,
            amount: typeof result?.amount === "number" ? result.amount : undefined,
          });
          setAppliedCoupon(null);
          setCouponMessage(message);
          setError(message);
          setPending(false);
          return;
        }

        setError(
          errorCode === "unauthorized" || response.status === 401
            ? t("orderUnauthorized")
            : errorCode.toLowerCase().includes("not found")
              ? t("orderUnavailable")
              : errorCode === "delivery_time"
                ? t("deliveryTimeTooSoon")
                : errorCode === "min_order"
                  ? t("orderMin")
                  : errorCode === "coupon"
                    ? t("orderCoupon")
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
          <p className="mt-2 text-sm leading-7 text-stone-600 sm:text-base dark:text-gray-400">{t("checkoutIntro")}</p>

          {submitted ? (
            <p
              role="status"
              className="mt-8 rounded-3xl bg-primary-50 px-6 py-10 text-center text-xl font-extrabold text-primary-800"
            >
              {t("orderReceived")}
            </p>
          ) : isLoading ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-5" aria-busy="true" aria-live="polite">
              <div className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 lg:col-span-3 dark:border-gray-800 dark:bg-gray-900">
                <div className="h-12 animate-pulse rounded-2xl bg-stone-100 dark:bg-gray-800" />
                <div className="h-24 animate-pulse rounded-2xl bg-stone-100 dark:bg-gray-800" />
                <div className="h-12 animate-pulse rounded-2xl bg-stone-100 dark:bg-gray-800" />
                <div className="h-12 animate-pulse rounded-2xl bg-stone-100 dark:bg-gray-800" />
              </div>
              <div className="h-56 animate-pulse rounded-3xl bg-stone-100 lg:col-span-2 dark:bg-gray-800" />
            </div>
          ) : !user ? (
            <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-stone-200 bg-white px-6 py-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xl font-extrabold leading-9 text-stone-950">{t("loginToCheckout")}</p>
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="mt-6 rounded-full bg-primary px-8 py-3.5 text-base font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-primary-500 hover:shadow-lg"
              >
                {t("loginOrRegister")}
              </button>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-5">
              <div className="space-y-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-3 dark:border-gray-800 dark:bg-gray-900">
                {(savedAddresses || []).length > 0 && !showNewAddressForm ? (
                  <fieldset className="space-y-3">
                    <legend className="text-sm font-extrabold text-stone-950 dark:text-gray-100">{t("savedAddresses")}</legend>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {(savedAddresses || []).map((address) => {
                        const selected = addressChoice === address?.id;

                        return (
                          <div
                            key={address?.id}
                            className={`flex h-32 items-start gap-2 rounded-2xl border px-3 py-2.5 transition ${
                              selected
                                ? "border-primary bg-primary-50 ring-2 ring-primary/20"
                                : "border-stone-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                            }`}
                          >
                            <button
                              type="button"
                              aria-pressed={selected}
                              onClick={() => selectSavedAddress(address)}
                              className="flex min-w-0 flex-1 items-start gap-2 text-start"
                            >
                              <span
                                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                  selected ? "border-primary bg-primary" : "border-stone-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                                }`}
                                aria-hidden="true"
                              >
                                {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                              </span>
                              <span className="min-w-0">
                                <span className={`block truncate text-sm font-extrabold text-stone-950${selected ? "" : " dark:text-gray-200"}`}>
                                  {address?.recipientName || address?.title}
                                </span>
                                {address?.recipientName ? (
                                  <span className={`block truncate text-xs font-bold text-stone-500${selected ? "" : " dark:text-gray-200"}`}>
                                    {address.title}
                                  </span>
                                ) : null}
                                <span className={`block truncate text-xs leading-5 text-stone-600${selected ? "" : " dark:text-gray-200"}`}>
                                  {address?.street}
                                </span>
                                <span className={`block truncate text-xs font-bold text-stone-800${selected ? "" : " dark:text-gray-200"}`}>
                                  {address?.phoneNumber || ""}
                                </span>
                              </span>
                            </button>
                            <button
                              type="button"
                              aria-label={t("deleteAddress")}
                              disabled={deletingAddressId === address?.id}
                              onClick={() => void deleteSavedAddress(address)}
                              className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1 text-xs font-extrabold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t("deleteAddress")}
                            </button>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={selectNewAddress}
                        className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 dark:border-gray-700 bg-stone-50 px-3 text-sm font-extrabold text-stone-800 transition hover:border-primary hover:bg-primary-50 hover:text-primary dark:bg-gray-900 dark:text-gray-100"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-current text-2xl leading-none">
                          +
                        </span>
                        {t("addNewAddress")}
                      </button>
                    </div>
                  </fieldset>
                ) : null}

                {showNewAddressForm ? (
                  <AddressForm
                    key={addressFormKey}
                    zones={deliveryZones}
                    zonesUnavailable={zonesLoaded && (zonesError || deliveryZones.length === 0)}
                    pending={savingAddress}
                    onChange={(values) => {
                      setDraft(values);
                      if (values.zoneId) {
                        setSelectedZoneId(values.zoneId);
                      }
                    }}
                    onSubmit={(values) => void saveNewAddress(values)}
                    onCancel={(savedAddresses || []).length > 0 ? cancelNewAddress : undefined}
                    error={error}
                  />
                ) : null}

                {!showNewAddressForm ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                <hr className="my-8 border-gray-200 dark:border-gray-800" />
                <div>
                  <p className="mb-2 block text-sm font-bold text-stone-900 dark:text-gray-100">{t("deliveryTime")}</p>
                  {selectedZone?.estimatedTime ? (
                    <p className="mb-3 text-sm font-bold text-stone-600 dark:text-gray-300">
                      {t("estimatedArrival", { time: formatEstimatedTime(selectedZone.estimatedTime, language) })}
                    </p>
                  ) : null}
                  {belowMinOrder && selectedZone ? (
                    <p role="alert" className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                      {t("minOrderNotMet", { amount: formatPointsAmount(selectedZone.minOrder) })}
                    </p>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      aria-pressed={deliveryMode === "asap"}
                      onClick={() => setDeliveryMode("asap")}
                      className={`rounded-2xl border px-4 py-3 text-start text-sm font-extrabold transition ${
                        deliveryMode === "asap"
                          ? "border-primary bg-primary-50 text-primary-900 ring-2 ring-primary/20"
                          : "border-stone-200 bg-white text-stone-800 hover:border-primary dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {t("deliverAsap")}
                    </button>
                    <button
                      type="button"
                      aria-pressed={deliveryMode === "schedule"}
                      onClick={() => setDeliveryMode("schedule")}
                      className={`rounded-2xl border px-4 py-3 text-start text-sm font-extrabold transition ${
                        deliveryMode === "schedule"
                          ? "border-primary bg-primary-50 text-primary-900 ring-2 ring-primary/20"
                          : "border-stone-200 bg-white text-stone-800 hover:border-primary dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {t("scheduleDelivery")}
                    </button>
                  </div>
                  {deliveryMode === "schedule" ? (
                    <div className="mt-3">
                      <DeliveryTimePicker
                        id="delivery-time"
                        selected={deliveryTime}
                        onChange={setDeliveryTime}
                        locale={language}
                      />
                      <p className="mt-2 text-sm text-stone-500 dark:text-gray-400">{t("deliveryTimeHint")}</p>
                    </div>
                  ) : null}
                </div>

                {authReady && user ? (
                  <fieldset className="rounded-3xl border border-primary-200 bg-primary-50 p-4 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    <legend className="px-1 text-sm font-extrabold text-primary-900 dark:text-gray-200">
                      {t("redeemPoints")}
                    </legend>
                    {(user.pointsBalance ?? 0) < POINTS_REDEEM_STEP ? (
                      <p className="text-sm font-semibold leading-7 text-primary-900 dark:text-gray-200">
                        {t("pointsRedeemStarts", { points: user.pointsBalance ?? 0 })}
                      </p>
                    ) : (
                      <>
                        <p className="text-sm font-semibold leading-7 text-primary-900 dark:text-gray-200">
                          {t("pointsRedeemChoice", {
                            points: pointsRedeemed,
                            amount: formatPointsAmount(pointsDiscount),
                          })}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setPointsToRedeem((current) => Math.max(0, current - POINTS_REDEEM_STEP))}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-lg font-extrabold text-stone-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                          >
                            −
                          </button>
                          <span className="min-w-24 text-center text-base font-extrabold text-stone-950 dark:text-gray-100">
                            {pointsRedeemed.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setPointsToRedeem((current) => Math.min(maxStepPoints, current + POINTS_REDEEM_STEP))
                            }
                            disabled={pointsRedeemed >= maxStepPoints}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-lg font-extrabold text-stone-800 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                          >
                            +
                          </button>
                        </div>
                      </>
                    )}
                  </fieldset>
                ) : null}

                <div>
                  <label htmlFor="coupon-code" className="mb-2 block text-sm font-bold text-stone-900 dark:text-gray-100">
                    {t("couponLabel")}
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      id="coupon-code"
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.target.value)}
                      className={fieldClassName}
                      autoCapitalize="characters"
                    />
                    <button
                      type="button"
                      onClick={() => void applyCoupon()}
                      disabled={couponPending || couponInput.trim() === ""}
                      className="rounded-full bg-primary px-6 py-3 text-sm font-extrabold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                    >
                      {couponPending ? t("applyingCoupon") : t("applyCoupon")}
                    </button>
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCouponMessage(null);
                          setCouponInput("");
                        }}
                        className="rounded-full border border-stone-300 px-6 py-3 text-sm font-extrabold text-stone-600 dark:border-gray-700 dark:text-gray-300"
                      >
                        {t("removeCoupon")}
                      </button>
                    ) : null}
                  </div>
                  {couponMessage ? (
                    <p className={`mt-2 text-sm font-bold ${appliedCoupon ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>
                      {couponMessage}
                    </p>
                  ) : null}
                </div>

                {error ? (
                  <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={items.length === 0 || pending || !addressReady || belowMinOrder}
                  className="w-full rounded-full border-none bg-primary py-3.5 text-base font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                >
                  {pending ? t("submittingOrder") : t("confirmOrder")}
                </button>
                </form>
                ) : null}
              </div>

              <aside className="h-fit rounded-3xl border border-stone-200 bg-stone-50 p-5 sm:p-6 lg:col-span-2 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-lg font-extrabold dark:text-gray-100">{t("orderSummary")}</h2>
                {items.length === 0 ? (
                  <p className="mt-6 text-sm text-stone-500 dark:text-gray-400">{t("cartEmpty")}</p>
                ) : (
                  <ul className="mt-4 divide-y divide-stone-200 dark:divide-gray-800">
                    {(items || []).map((item) => (
                      <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="font-semibold leading-6 dark:text-gray-100">
                            {getLocalizedName(item, language)}
                          </p>
                          <p className="mt-1 text-sm text-stone-500 dark:text-gray-400">
                            {formatQuantity(item.quantity, item.isWeighed === true)}
                            {item.isWeighed ? ` ${t("kilogram")}` : ""} × {item.price} {t("currency")}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-extrabold text-primary">
                          {item.price * item.quantity} {t("currency")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <dl className="mt-4 space-y-3 border-t border-stone-200 pt-4 text-sm dark:border-gray-800 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <dt>{t("subtotal")}</dt>
                    <dd className="font-bold dark:text-gray-100">
                      {totalPrice} {t("currency")}
                    </dd>
                  </div>
                  {couponDiscount > 0 ? (
                    <div className="flex items-center justify-between text-primary-800 dark:text-gray-200">
                      <dt>{t("couponDiscount")}</dt>
                      <dd className="font-bold">
                        -{formatPointsAmount(couponDiscount)} {t("currency")}
                      </dd>
                    </div>
                  ) : null}
                  {pointsDiscount > 0 ? (
                    <div className="flex items-center justify-between text-primary-800 dark:text-gray-200">
                      <dt>{t("pointsDiscount")}</dt>
                      <dd className="font-bold">
                        -{formatPointsAmount(pointsDiscount)} {t("currency")}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <dt>{t("shippingFee")}</dt>
                    <dd className={`font-bold ${shippingFee === 0 ? "text-emerald-700 dark:text-emerald-400" : "dark:text-gray-100"}`}>
                      {deliveryFeeLabel(shippingFee)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between text-base font-extrabold dark:text-gray-100">
                    <dt>{t("finalTotal")}</dt>
                    <dd className="text-primary">
                      {finalTotal} {t("currency")}
                    </dd>
                  </div>
                </dl>
                {ready && items.length > 0 ? (
                  <p className="mt-4 rounded-2xl bg-primary-50 px-3 py-2 text-sm font-bold text-primary-800 dark:border dark:border-gray-700 dark:bg-gray-800 dark:text-emerald-400">
                    {t("earnOnOrder", { count: earnedPoints })}
                  </p>
                ) : null}
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
