"use client";

import OrderCards from "@/components/account/OrderCards";
import { ReturnStatusBadge } from "@/components/account/StatusBadge";
import LoginModal from "@/components/auth/LoginModal";
import { useI18n } from "@/components/i18n/LanguageProvider";
import type { AccountReturnRequest } from "@/lib/accountData";
import { useAuthStore } from "@/store/authStore";
import { maskPhone } from "@/utils/maskPhone";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type AccountOrder = {
  id: string;
  address: string;
  totalAmount: number;
  status: string;
  pointsEarned: number;
  pointsRedeemed: number;
  createdAt: string;
  returnRequests?: { id: string }[];
  items: {
    id: string;
    productName: string;
    quantity: number;
    price: number;
  }[];
};

type AccountAddress = {
  id: string;
  title: string;
  street: string;
  city: string;
  isDefault: boolean;
};

const fieldClassName =
  "w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/20";

const tabClassName = (selected: boolean) =>
  `rounded-xl px-2 py-2.5 text-sm font-extrabold transition ${
    selected ? "bg-white text-primary shadow-sm" : "text-stone-600 hover:text-stone-900"
  }`;

export default function ProfileAccount() {
  const { t, language } = useI18n();
  const user = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.ready);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [loginOpen, setLoginOpen] = useState(false);
  const [tab, setTab] = useState<"orders" | "returns" | "addresses">("orders");
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [returns, setReturns] = useState<AccountReturnRequest[]>([]);
  const [addresses, setAddresses] = useState<AccountAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState("");
  const [cancelErrorId, setCancelErrorId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!authReady) {
      void hydrate();
    }
  }, [authReady, hydrate]);

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("tab");
    if (next === "orders" || next === "returns" || next === "addresses") {
      setTab(next);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const controller = new AbortController();
    if (!hasLoaded.current) {
      setLoading(true);
    }
    setLoadError(null);

    Promise.all([
      fetch("/api/account/orders", { cache: "no-store", signal: controller.signal }),
      fetch("/api/account/returns", { cache: "no-store", signal: controller.signal }),
      fetch("/api/account/addresses", { cache: "no-store", signal: controller.signal }),
    ])
      .then(async ([ordersResponse, returnsResponse, addressesResponse]) => {
        if (!ordersResponse.ok || !returnsResponse.ok || !addressesResponse.ok) {
          throw new Error("failed");
        }

        const ordersPayload = (await ordersResponse.json()) as { orders?: AccountOrder[] };
        const returnsPayload = (await returnsResponse.json()) as { returns?: AccountReturnRequest[] };
        const addressesPayload = (await addressesResponse.json()) as { addresses?: AccountAddress[] };
        setOrders(Array.isArray(ordersPayload.orders) ? ordersPayload.orders : []);
        setReturns(Array.isArray(returnsPayload.returns) ? returnsPayload.returns : []);
        setAddresses(Array.isArray(addressesPayload.addresses) ? addressesPayload.addresses : []);
        hasLoaded.current = true;
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setLoadError(t("accountLoadFailed"));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [user, t, refreshKey]);

  async function cancelOrder(orderId: string) {
    if (!window.confirm(t("cancelOrderConfirm"))) {
      return;
    }

    setCancellingId(orderId);
    setCancelErrorId("");

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      if (!response.ok) {
        setCancelErrorId(orderId);
        return;
      }

      setOrders((current) =>
        current.map((order) => (order.id === orderId ? { ...order, status: "CANCELLED" } : order)),
      );
      void hydrate();
    } catch {
      setCancelErrorId(orderId);
    } finally {
      setCancellingId("");
    }
  }

  async function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const response = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, street, city }),
      });
      const payload = (await response.json().catch(() => null)) as { address?: AccountAddress; error?: string } | null;

      if (!response.ok || !payload?.address) {
        setFormError(payload?.error === "invalid" ? t("addressRequiredFields") : t("addressFailed"));
        return;
      }

      setAddresses((current) => {
        const next = payload.address?.isDefault
          ? current.map((address) => ({ ...address, isDefault: false }))
          : current;
        return [payload.address as AccountAddress, ...next.filter((address) => address.id !== payload.address?.id)];
      });
      setTitle("");
      setStreet("");
      setCity("");
    } catch {
      setFormError(t("addressFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (!authReady) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 text-center text-sm font-bold text-stone-500 sm:px-6">
        {t("loadingAccount")}
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <h1 className="text-2xl font-extrabold text-stone-950">{t("profileLoginTitle")}</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">{t("profileLoginBody")}</p>
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="mt-6 rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-white transition hover:bg-primary-500"
          >
            {t("login")}
          </button>
        </div>
        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      </section>
    );
  }

  const locale = language === "zh" ? "zh-CN" : language === "en" ? "en" : "ar-EG";

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-stone-950 sm:text-3xl">{t("profileTitle")}</h1>
        <p className="mt-1 text-sm font-bold text-stone-500">{maskPhone(user.phone)}</p>
      </header>

      <div className="mb-6 grid grid-cols-3 gap-1 rounded-2xl bg-stone-100 p-1" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "orders"} onClick={() => setTab("orders")} className={tabClassName(tab === "orders")}>
          {t("myOrders")}
        </button>
        <button type="button" role="tab" aria-selected={tab === "returns"} onClick={() => setTab("returns")} className={tabClassName(tab === "returns")}>
          {t("myReturns")}
        </button>
        <button type="button" role="tab" aria-selected={tab === "addresses"} onClick={() => setTab("addresses")} className={tabClassName(tab === "addresses")}>
          {t("myAddresses")}
        </button>
      </div>

      {loading ? <p className="text-sm font-bold text-stone-500">{t("loadingAccount")}</p> : null}
      {loadError ? <p className="text-sm font-bold text-red-600">{loadError}</p> : null}

      {tab === "orders" && !loading ? (
        <div className="space-y-4">
          {orders.length === 0 && !loadError ? (
            <p className="rounded-3xl border border-dashed border-stone-200 px-4 py-10 text-center text-sm font-bold text-stone-500">
              {t("ordersEmpty")}
            </p>
          ) : null}
          <OrderCards
            orders={orders}
            cancellingId={cancellingId}
            cancelErrorId={cancelErrorId}
            onCancel={(orderId) => void cancelOrder(orderId)}
            onReturnCreated={() => setRefreshKey((current) => current + 1)}
          />
        </div>
      ) : null}

      {tab === "returns" && !loading ? (
        <div className="space-y-4">
          {returns.length === 0 && !loadError ? (
            <p className="rounded-3xl border border-dashed border-stone-200 px-4 py-10 text-center text-sm font-bold text-stone-500">
              {t("returnsEmpty")}
            </p>
          ) : null}
          {returns.map((request) => {
            const created = request.createdAt ? new Date(request.createdAt) : null;

            return (
              <article key={request.id} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/account/orders/${request.orderId}`} className="text-sm font-extrabold text-stone-900 hover:text-primary">
                    #{request.orderId.slice(-6)}
                  </Link>
                  <ReturnStatusBadge status={request.status} />
                </div>
                {created && !Number.isNaN(created.getTime()) ? (
                  <p className="mt-1 text-xs font-semibold text-stone-500">
                    {created.toLocaleString(locale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                ) : null}
                <ul className="mt-3 space-y-1.5 text-sm text-stone-700">
                  {request.items.map((item) => (
                    <li key={item.id}>
                      {item.productName} × {item.quantity}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/account/returns/${request.id}`}
                  className="mt-4 inline-flex rounded-full border border-primary bg-white px-4 py-2 text-sm font-extrabold text-primary transition hover:bg-primary-50"
                >
                  {t("trackReturn")}
                </Link>
              </article>
            );
          })}
        </div>
      ) : null}

      {tab === "addresses" && !loading ? (
        <div className="space-y-4">
          {addresses.length === 0 && !loadError ? (
            <p className="rounded-3xl border border-dashed border-stone-200 px-4 py-10 text-center text-sm font-bold text-stone-500">
              {t("addressesEmpty")}
            </p>
          ) : null}
          {addresses.map((address) => (
            <article key={address.id} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold text-stone-950">{address.title}</h2>
                {address.isDefault ? (
                  <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-extrabold text-primary-800">
                    {t("defaultAddress")}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-stone-700">{address.street}</p>
              <p className="text-sm font-bold text-stone-500">{address.city}</p>
            </article>
          ))}

          <form onSubmit={(event) => void addAddress(event)} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-extrabold text-stone-950">{t("addAddress")}</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm font-bold text-stone-700">
                {t("addressTitleLabel")}
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("addressTitlePlaceholder")}
                  className={fieldClassName}
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-stone-700">
                {t("addressStreetLabel")}
                <input
                  value={street}
                  onChange={(event) => setStreet(event.target.value)}
                  placeholder={t("addressStreetPlaceholder")}
                  className={fieldClassName}
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-stone-700">
                {t("addressCityLabel")}
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder={t("addressCityPlaceholder")}
                  className={fieldClassName}
                  required
                />
              </label>
            </div>
            {formError ? <p className="mt-3 text-sm font-bold text-red-600">{formError}</p> : null}
            <button
              type="submit"
              disabled={saving}
              className="mt-4 w-full rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-white transition hover:bg-primary-500 disabled:opacity-60 sm:w-auto"
            >
              {saving ? t("savingAddress") : t("saveAddress")}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
