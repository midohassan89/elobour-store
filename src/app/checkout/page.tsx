"use client";

import LoginModal from "@/components/auth/LoginModal";
import DeliveryTimePicker, {
  isDeliveryTimeAllowed,
  nextValidDeliveryTime,
} from "@/components/checkout/DeliveryTimePicker";
import { useI18n } from "@/components/i18n/LanguageProvider";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import type { Language } from "@/locales/types";
import { useLoyaltySettings } from "@/hooks/useLoyaltySettings";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { getLocalizedName } from "@/utils/localizedName";
import {
  discountForPoints,
  formatPointsAmount,
  maxRedeemablePoints,
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
  "w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/20";

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
    nameAr: text(record.nameAr),
    nameEn: text(record.nameEn),
    nameZh: text(record.nameZh),
    deliveryFee: Number(record.deliveryFee) || 0,
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

function zoneLabel(zone: Partial<DeliveryZone> | null | undefined, language: Language) {
  const nameEn = text(zone?.nameEn);
  const nameZh = text(zone?.nameZh);
  const nameAr = text(zone?.nameAr);

  if (language === "en" && nameEn) {
    return nameEn;
  }

  if (language === "zh" && nameZh) {
    return nameZh;
  }

  return nameAr;
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
  const [redeemEnabled, setRedeemEnabled] = useState(false);
  const [pointsInput, setPointsInput] = useState("0");
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
  const [loginOpen, setLoginOpen] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [titleChoice, setTitleChoice] = useState<"home" | "work" | "other">("home");
  const [customTitle, setCustomTitle] = useState("");
  const [deliveryTime, setDeliveryTime] = useState(() => nextValidDeliveryTime());
  const [phoneNumber, setPhoneNumber] = useState("");
  const [street, setStreet] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState("");
  const deliveryZones = zones ?? [];
  const savedAddresses = addresses ?? [];
  const selectedZone = deliveryZones.find((zone) => zone.id === selectedZoneId) ?? null;
  const selectedSaved = savedAddresses.find((address) => address.id === addressChoice) ?? null;
  const shippingFee = selectedZone?.deliveryFee ?? selectedSaved?.zone?.deliveryFee ?? 0;
  const maxRedeemable = user
    ? maxRedeemablePoints(user.pointsBalance ?? 0, totalPrice, redeemValue)
    : 0;
  const requestedPoints = redeemEnabled ? Math.floor(Number(pointsInput) || 0) : 0;
  const pointsRedeemed = Math.min(Math.max(0, requestedPoints), maxRedeemable);
  const pointsDiscount = discountForPoints(pointsRedeemed, redeemValue);
  const merchandiseDue = Math.max(0, totalPrice - pointsDiscount);
  const finalTotal = merchandiseDue + shippingFee;
  const earnedPoints = Math.floor(merchandiseDue * earnRatio);
  const resolvedAddressTitle =
    titleChoice === "other"
      ? customTitle.trim()
      : titleChoice === "work"
        ? t("addressTitleWork")
        : t("addressTitleHome");
  const isLoading = !authReady || Boolean(user?.id && (!zonesLoaded || !addressesLoaded));
  const activeRecipient = showNewAddressForm ? recipientName.trim() : text(selectedSaved?.recipientName);
  const activePhone = showNewAddressForm ? phoneNumber.trim() : text(selectedSaved?.phoneNumber);
  const activeStreet = showNewAddressForm ? street.trim() : text(selectedSaved?.street);
  const activeCity = showNewAddressForm ? DEFAULT_ADDRESS_CITY : text(selectedSaved?.city) || DEFAULT_ADDRESS_CITY;
  const addressReady = Boolean(deliveryTime && activeRecipient && activePhone && activeStreet && activeCity && selectedZone) &&
    (showNewAddressForm ? Boolean(resolvedAddressTitle) : Boolean(selectedSaved));

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
          setPhoneNumber("");
          setRecipientName("");
          return;
        }

        setShowNewAddressForm(false);
        setAddressChoice(preferred.id);
        setPhoneNumber(preferred.phoneNumber || "");
        setRecipientName(preferred.recipientName || "");
        setStreet(preferred.street);
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
    setPhoneNumber(address.phoneNumber || "");
    setRecipientName(address.recipientName || "");
    setStreet(address.street);
    if (address.zoneId) {
      setSelectedZoneId(address.zoneId);
    }
  }

  function selectNewAddress() {
    setShowNewAddressForm(true);
    setAddressChoice("new");
    setStreet("");
    setTitleChoice("home");
    setCustomTitle("");
    setRecipientName("");
    setPhoneNumber("");
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

  async function saveNewAddress() {
    if (!user?.id || savingAddress) {
      return;
    }

    if (
      !selectedZone ||
      !recipientName.trim() ||
      !street.trim() ||
      !phoneNumber.trim() ||
      !resolvedAddressTitle
    ) {
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
          title: resolvedAddressTitle,
          recipientName: recipientName.trim(),
          street: street.trim(),
          city: DEFAULT_ADDRESS_CITY,
          phoneNumber: phoneNumber.trim(),
          zoneId: selectedZone.id,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { address?: unknown } | null;
      const created = readAddress(payload?.address);

      if (!response.ok || !created) {
        setError(t("addressFailed"));
        return;
      }

      const saved = { ...created, zone: selectedZone, zoneId: selectedZone.id };
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
        setStreet("");
        setRecipientName("");
        setPhoneNumber("");
        setTitleChoice("home");
        setCustomTitle("");
        return;
      }

      selectSavedAddress(preferred);
    } catch {
      setError(t("addressFailed"));
    } finally {
      setDeletingAddressId("");
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
      Number.isNaN(scheduledAt.getTime()) ||
      (showNewAddressForm && !resolvedAddressTitle)
    ) {
      setError(t("addressRequired"));
      return;
    }

    if (!isDeliveryTimeAllowed(scheduledAt)) {
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
          deliveryTime: scheduledAt.toISOString(),
          totalAmount: finalTotal,
          pointsRedeemed,
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
          ) : isLoading ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-5" aria-busy="true" aria-live="polite">
              <div className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 lg:col-span-3">
                <div className="h-12 animate-pulse rounded-2xl bg-stone-100" />
                <div className="h-24 animate-pulse rounded-2xl bg-stone-100" />
                <div className="h-12 animate-pulse rounded-2xl bg-stone-100" />
                <div className="h-12 animate-pulse rounded-2xl bg-stone-100" />
              </div>
              <div className="h-56 animate-pulse rounded-3xl bg-stone-100 lg:col-span-2" />
            </div>
          ) : !user ? (
            <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-stone-200 bg-white px-6 py-12 text-center shadow-sm">
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
              <form
                onSubmit={handleSubmit}
                className="space-y-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-3"
              >
                {(savedAddresses || []).length > 0 && !showNewAddressForm ? (
                  <fieldset className="space-y-3">
                    <legend className="text-sm font-extrabold text-stone-950">{t("savedAddresses")}</legend>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {(savedAddresses || []).map((address) => {
                        const selected = addressChoice === address?.id;

                        return (
                          <div
                            key={address?.id}
                            className={`flex h-32 items-start gap-2 rounded-2xl border px-3 py-2.5 transition ${
                              selected
                                ? "border-primary bg-primary-50 ring-2 ring-primary/20"
                                : "border-stone-200 bg-white"
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
                                  selected ? "border-primary bg-primary" : "border-stone-300 bg-white"
                                }`}
                                aria-hidden="true"
                              >
                                {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-extrabold text-stone-950">
                                  {address?.recipientName || address?.title}
                                </span>
                                {address?.recipientName ? (
                                  <span className="block truncate text-xs font-bold text-stone-500">
                                    {address.title}
                                  </span>
                                ) : null}
                                <span className="block truncate text-xs leading-5 text-stone-600">
                                  {address?.street}
                                </span>
                                <span className="block truncate text-xs font-bold text-stone-800">
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
                        className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 px-3 text-sm font-extrabold text-stone-800 transition hover:border-primary hover:bg-primary-50 hover:text-primary"
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
                  <div className="space-y-5 rounded-3xl border border-stone-100 bg-stone-50/70 p-4 sm:p-5">
                    <div>
                      <label htmlFor="address-title" className="mb-2 block text-sm font-bold">
                        {t("addressTitleLabel")}
                      </label>
                      <select
                        id="address-title"
                        value={titleChoice}
                        onChange={(event) => setTitleChoice(event.target.value as "home" | "work" | "other")}
                        className={fieldClassName}
                      >
                        <option value="home">{t("addressTitleHome")}</option>
                        <option value="work">{t("addressTitleWork")}</option>
                        <option value="other">{t("addressTitleOther")}</option>
                      </select>
                      {titleChoice === "other" ? (
                        <input
                          id="address-title-custom"
                          value={customTitle}
                          onChange={(event) => setCustomTitle(event.target.value)}
                          placeholder={t("addressTitleCustom")}
                          className={`${fieldClassName} mt-3`}
                          required
                        />
                      ) : null}
                    </div>

                    <div>
                      <label htmlFor="recipient-name" className="mb-2 block text-sm font-bold">
                        {t("recipientName")}
                        <span className="text-primary"> *</span>
                      </label>
                      <input
                        id="recipient-name"
                        name="recipientName"
                        type="text"
                        required
                        autoComplete="name"
                        value={recipientName}
                        onChange={(event) => setRecipientName(event.target.value)}
                        className={fieldClassName}
                      />
                    </div>

                    <div>
                      <label htmlFor="detailed-address" className="mb-2 block text-sm font-bold">
                        {t("addressDetails")}
                      </label>
                      <input
                        id="detailed-address"
                        type="text"
                        required
                        value={street}
                        onChange={(event) => setStreet(event.target.value)}
                        placeholder={t("addressPlaceholder")}
                        className={fieldClassName}
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="mb-2 block text-sm font-bold">
                        {t("phone")}
                        <span className="text-primary"> *</span>
                      </label>
                      <input
                        id="phone"
                        name="phoneNumber"
                        type="tel"
                        inputMode="tel"
                        required
                        autoComplete="tel"
                        value={phoneNumber}
                        onChange={(event) => setPhoneNumber(event.target.value)}
                        placeholder={t("phonePlaceholder")}
                        className={fieldClassName}
                      />
                    </div>

                    <div>
                      <label htmlFor="delivery-zone" className="mb-2 block text-sm font-bold">
                        {t("deliveryArea")}
                      </label>
                      <select
                        id="delivery-zone"
                        required
                        value={selectedZoneId}
                        onChange={(event) => setSelectedZoneId(event.target.value)}
                        className={fieldClassName}
                      >
                        {(deliveryZones || []).map((zone) => (
                          <option key={zone?.id} value={zone?.id}>
                            {zoneLabel(zone, language)}
                          </option>
                        ))}
                      </select>
                      {zonesLoaded && (zonesError || (deliveryZones || []).length === 0) ? (
                        <p className="mt-2 text-sm font-bold text-red-600">{t("zonesUnavailable")}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => void saveNewAddress()}
                        disabled={savingAddress}
                        className="rounded-full bg-primary px-6 py-3.5 text-base font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-primary-500 hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
                      >
                        {savingAddress ? t("savingAddress") : t("saveAddress")}
                      </button>
                      {(savedAddresses || []).length > 0 ? (
                        <button
                          type="button"
                          onClick={cancelNewAddress}
                          className="rounded-full border border-stone-300 bg-transparent px-6 py-3.5 text-base font-bold text-stone-500 transition hover:border-stone-400 hover:bg-stone-100 hover:text-stone-800"
                        >
                          {t("cancel")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div>
                  <label htmlFor="delivery-time" className="mb-2 block text-sm font-bold">
                    {t("deliveryTime")}
                  </label>
                  <DeliveryTimePicker
                    id="delivery-time"
                    selected={deliveryTime}
                    onChange={setDeliveryTime}
                    locale={language}
                  />
                  <p className="mt-2 text-sm text-stone-500">{t("deliveryTimeHint")}</p>
                </div>

                {authReady && user && Number(user.pointsBalance) > 0 ? (
                  <fieldset className="rounded-3xl border border-primary-200 bg-primary-50 p-4">
                    <legend className="px-1 text-sm font-extrabold text-primary-900">
                      {t("redeemPoints")}
                    </legend>
                    <p className="text-sm font-semibold leading-7 text-primary-900">
                      {t("pointsWorth", {
                        points: user?.pointsBalance ?? 0,
                        amount: formatPointsAmount(discountForPoints(user?.pointsBalance ?? 0, redeemValue)),
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
                  disabled={items.length === 0 || pending || !addressReady}
                  className="w-full rounded-full bg-primary py-3.5 text-base font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-primary-500 hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
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
                    {(items || []).map((item) => (
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
                    <div className="flex items-center justify-between text-primary-800">
                      <dt>{t("pointsDiscount")}</dt>
                      <dd className="font-bold">
                        -{formatPointsAmount(pointsDiscount)} {t("currency")}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <dt>{t("shippingFee")}</dt>
                    <dd className={`font-bold ${shippingFee === 0 ? "text-emerald-700" : ""}`}>
                      {deliveryFeeLabel(shippingFee)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between text-base font-extrabold">
                    <dt>{t("finalTotal")}</dt>
                    <dd className="text-primary">
                      {finalTotal} {t("currency")}
                    </dd>
                  </div>
                </dl>
                {ready && items.length > 0 ? (
                  <p className="mt-4 rounded-2xl bg-primary-50 px-3 py-2 text-sm font-bold text-primary-800">
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
