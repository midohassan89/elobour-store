"use client";

import AddressForm, { type AddressFormValues } from "@/components/account/AddressForm";
import OrderCards from "@/components/account/OrderCards";
import { ReturnStatusBadge } from "@/components/account/StatusBadge";
import LoginModal from "@/components/auth/LoginModal";
import { useI18n } from "@/components/i18n/LanguageProvider";
import ProductCard from "@/components/product/ProductCard";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import type { AccountAddress, AccountReturnRequest } from "@/lib/accountData";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { maskPhone } from "@/utils/maskPhone";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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

const tabClassName = (selected: boolean) =>
  `rounded-xl px-2 py-2.5 text-sm font-extrabold transition ${
    selected ? "bg-white text-primary shadow-sm dark:bg-gray-900" : "text-stone-600 hover:text-stone-900 dark:text-gray-400 dark:hover:text-gray-100"
  }`;

export default function ProfileAccount() {
  const { t, language } = useI18n();
  const user = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.ready);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [loginOpen, setLoginOpen] = useState(false);
  const [tab, setTab] = useState<"orders" | "returns" | "addresses" | "wishlist">("orders");
  const { products: wishlistProducts } = useWishlist();
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [returns, setReturns] = useState<AccountReturnRequest[]>([]);
  const [addresses, setAddresses] = useState<AccountAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AccountAddress | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const [addressFormKey, setAddressFormKey] = useState(0);
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
    if (next === "orders" || next === "returns" || next === "addresses" || next === "wishlist") {
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

  async function setDefaultAddress(addressId: string) {
    const response = await fetch(`/api/account/addresses/${encodeURIComponent(addressId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (!response.ok) return;
    setAddresses((current) => current.map((address) => ({ ...address, isDefault: address.id === addressId })));
  }

  async function removeAddress(addressId: string) {
    if (!user || !window.confirm(t("deleteAddressConfirm"))) return;
    const response = await fetch(
      `/api/customers/${encodeURIComponent(user.id)}/addresses/${encodeURIComponent(addressId)}`,
      { method: "DELETE" },
    );
    if (!response.ok) return;
    setAddresses((current) => current.filter((address) => address.id !== addressId));
    if (editing?.id === addressId) setEditing(null);
  }

  async function saveAddress(values: AddressFormValues) {
    setFormError(null);
    setSaving(true);
    const editingId = editing?.id;

    try {
      const response = await fetch(
        editingId ? `/api/account/addresses/${encodeURIComponent(editingId)}` : "/api/account/addresses",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const payload = (await response.json().catch(() => null)) as { address?: AccountAddress; error?: string } | null;

      if (!response.ok || !payload?.address) {
        setFormError(payload?.error === "invalid" ? t("addressRequiredFields") : t("addressFailed"));
        return;
      }

      const saved = payload.address;
      setAddresses((current) => {
        if (editingId) {
          return current.map((address) =>
            address.id === saved.id
              ? {
                  ...address,
                  ...saved,
                  isDefault: address.isDefault,
                  zone: saved.zoneId === address.zoneId ? address.zone : null,
                }
              : address,
          );
        }

        const next = saved.isDefault ? current.map((address) => ({ ...address, isDefault: false })) : current;
        return [saved, ...next.filter((address) => address.id !== saved.id)];
      });
      setEditing(null);
      setAddingAddress(false);
      setAddressFormKey((key) => key + 1);
    } catch {
      setFormError(t("addressFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (!authReady) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 text-center text-sm font-bold text-stone-500 sm:px-6 dark:text-gray-400">
        {t("loadingAccount")}
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-8 dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-2xl font-extrabold text-stone-950">{t("profileLoginTitle")}</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-gray-400">{t("profileLoginBody")}</p>
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
        <p className="mt-1 text-sm font-bold text-stone-500 dark:text-gray-400">{maskPhone(user.phone)}</p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-stone-100 p-1 sm:grid-cols-4 dark:bg-gray-800" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "orders"} onClick={() => setTab("orders")} className={tabClassName(tab === "orders")}>
          {t("myOrders")}
        </button>
        <button type="button" role="tab" aria-selected={tab === "returns"} onClick={() => setTab("returns")} className={tabClassName(tab === "returns")}>
          {t("myReturns")}
        </button>
        <button type="button" role="tab" aria-selected={tab === "addresses"} onClick={() => setTab("addresses")} className={tabClassName(tab === "addresses")}>
          {t("myAddresses")}
        </button>
        <button type="button" role="tab" aria-selected={tab === "wishlist"} onClick={() => setTab("wishlist")} className={tabClassName(tab === "wishlist")}>
          {t("wishlist")}
        </button>
      </div>

      {loading ? <p className="text-sm font-bold text-stone-500 dark:text-gray-400">{t("loadingAccount")}</p> : null}
      {loadError ? <p className="text-sm font-bold text-red-600">{loadError}</p> : null}

      {tab === "orders" && !loading ? (
        <div className="space-y-4">
          {orders.length === 0 && !loadError ? (
            <p className="rounded-3xl border border-dashed border-stone-200 px-4 py-10 text-center text-sm font-bold text-stone-500 dark:border-gray-800 dark:text-gray-400">
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
            <p className="rounded-3xl border border-dashed border-stone-200 px-4 py-10 text-center text-sm font-bold text-stone-500 dark:border-gray-800 dark:text-gray-400">
              {t("returnsEmpty")}
            </p>
          ) : null}
          {returns.map((request) => {
            const created = request.createdAt ? new Date(request.createdAt) : null;

            return (
              <article key={request.id} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/account/orders/${request.orderId}`} className="text-sm font-extrabold text-stone-900 hover:text-primary dark:text-gray-100">
                    #{request.orderId.slice(-6)}
                  </Link>
                  <ReturnStatusBadge status={request.status} />
                </div>
                {created && !Number.isNaN(created.getTime()) ? (
                  <p className="mt-1 text-xs font-semibold text-stone-500 dark:text-gray-400">
                    {created.toLocaleString(locale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                ) : null}
                <ul className="mt-3 space-y-1.5 text-sm text-stone-700 dark:text-gray-200">
                  {request.items.map((item) => (
                    <li key={item.id}>
                      {item.productName} × {item.quantity}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/account/returns/${request.id}`}
                  className="mt-4 inline-flex rounded-full border border-primary bg-white px-4 py-2 text-sm font-extrabold text-primary transition hover:bg-primary-50 dark:bg-gray-900"
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
            <p className="rounded-3xl border border-dashed border-stone-200 px-4 py-10 text-center text-sm font-bold text-stone-500 dark:border-gray-800 dark:text-gray-400">
              {t("addressesEmpty")}
            </p>
          ) : null}
          {addresses.map((address) => (
            <article key={address.id} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold text-stone-950 dark:text-gray-100">{address.title}</h2>
                {address.isDefault ? (
                  <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-extrabold text-primary-800">
                    {t("defaultAddress")}
                  </span>
                ) : null}
                <div className="ms-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(address);
                    setAddingAddress(false);
                    setFormError(null);
                  }}
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm font-extrabold text-stone-700 transition hover:bg-stone-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  {t("editAddress")}
                </button>
                {!address.isDefault ? (
                  <button
                    type="button"
                    onClick={() => void setDefaultAddress(address.id)}
                    className="rounded-full border border-primary px-4 py-2 text-sm font-extrabold text-primary"
                  >
                    {t("setDefaultAddress")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void removeAddress(address.id)}
                  className="rounded-full border border-red-300 bg-red-50 px-4 py-2 text-sm font-extrabold text-red-800 dark:border-red-400 dark:bg-red-950 dark:text-red-100"
                >
                  {t("deleteAddress")}
                </button>
                </div>
              </div>
              {address.recipientName ? (
                <p className="mt-2 text-sm font-bold text-stone-800 dark:text-gray-100">{address.recipientName}</p>
              ) : null}
              <p className="mt-2 text-sm leading-6 text-stone-700 dark:text-gray-200">{address.street}</p>
              <p className="text-sm font-bold text-stone-500 dark:text-gray-400">{address.city}</p>
              {address.phoneNumber ? (
                <p className="text-sm font-bold text-stone-500 dark:text-gray-400">{address.phoneNumber}</p>
              ) : null}
            </article>
          ))}

          {editing || addingAddress ? (
          <AddressForm
            key={editing?.id ?? `new-${addressFormKey}`}
            initialData={editing}
            title={editing ? t("editAddress") : t("addAddress")}
            pending={saving}
            error={formError}
            onSubmit={(values) => void saveAddress(values)}
            onCancel={() => {
              setEditing(null);
              setAddingAddress(false);
              setFormError(null);
            }}
          />
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setAddingAddress(true);
                setFormError(null);
              }}
              className="rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-white"
            >
              {t("addNewAddress")}
            </button>
          )}
        </div>
      ) : null}

      {tab === "wishlist" && !loading ? (
        <>
        {wishlistProducts.some((product) => (product.stock ?? 0) > 0) ? (
          <button
            type="button"
            onClick={() => {
              for (const product of wishlistProducts) {
                if ((product.stock ?? 0) <= 0) continue;
                addItem(
                  {
                    id: product.id,
                    name: product.name,
                    nameEn: product.nameEn,
                    nameZh: product.nameZh,
                    price: product.salePrice && product.salePrice > 0 ? product.salePrice : product.price,
                    isWeighed: product.isWeighed,
                    image: product.image,
                  },
                  product.isWeighed ? 0.25 : 1,
                );
              }
              toast.success(t("addedToCart"));
            }}
            className="mb-4 rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-white"
          >
            {t("addAvailableToCart")}
          </button>
        ) : null}
        {wishlistProducts.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-stone-200 px-4 py-10 text-center text-sm font-bold text-stone-500 dark:border-gray-800 dark:text-gray-400">
            {t("wishlistEmpty")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {wishlistProducts.map((product) => (
              <ProductCard key={product.id} {...product} image={product.image ?? ""} />
            ))}
          </div>
        )}
        </>
      ) : null}
    </section>
  );
}
