"use client";

import LoginModal from "@/components/auth/LoginModal";
import { useI18n } from "@/components/i18n/LanguageProvider";
import type { AccountOrderDetails, AccountReturnRequest } from "@/lib/accountData";
import { canRequestReturn, normalizeOrderStatus, type OrderStatus } from "@/lib/orderStatus";
import type { TranslationKey } from "@/locales/types";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const ORDER_LABELS: Record<OrderStatus, TranslationKey> = {
  PENDING: "statusPending",
  CONFIRMED: "statusConfirmed",
  PREPARING: "statusPreparing",
  SHIPPED: "statusShipped",
  COMPLETED: "statusCompleted",
  DELIVERED: "statusCompleted",
  CANCELLED: "statusCancelled",
  RETURNED: "statusReturned",
  PARTIALLY_RETURNED: "statusPartiallyReturned",
};

const ORDER_CLASSES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800",
  CONFIRMED: "bg-primary-50 text-primary-800",
  PREPARING: "bg-orange-50 text-orange-800",
  SHIPPED: "bg-sky-50 text-sky-800",
  COMPLETED: "bg-green-50 text-green-800",
  DELIVERED: "bg-green-50 text-green-800",
  CANCELLED: "bg-red-50 text-red-700",
  RETURNED: "bg-red-50 text-red-700",
  PARTIALLY_RETURNED: "bg-red-50 text-red-700",
};

const RETURN_LABELS: Record<string, TranslationKey> = {
  PENDING: "returnStatusPending",
  CONFIRMED: "returnStatusConfirmed",
  COLLECTING: "returnStatusCollecting",
  COMPLETED: "returnStatusCompleted",
  CANCELLED: "returnStatusCancelled",
};

const RETURN_CLASSES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800",
  CONFIRMED: "bg-primary-50 text-primary-800",
  COLLECTING: "bg-orange-50 text-orange-800",
  COMPLETED: "bg-green-50 text-green-800",
  CANCELLED: "bg-red-50 text-red-700",
};

function badge(status: string, labels: Record<string, TranslationKey>, classes: Record<string, string>) {
  const key = labels[status];
  return {
    label: key ?? null,
    className: classes[status] ?? "bg-stone-100 text-stone-600",
  };
}

function reservedQuantity(returns: AccountReturnRequest[], orderItemId: string) {
  return returns.reduce((sum, request) => {
    if (request.status === "CANCELLED") {
      return sum;
    }

    return sum + request.items.filter((item) => item.orderItemId === orderItemId).reduce((itemSum, item) => itemSum + item.quantity, 0);
  }, 0);
}

export default function OrderDetails() {
  const params = useParams<{ id: string }>();
  const orderId = typeof params.id === "string" ? params.id : "";
  const { t, language } = useI18n();
  const user = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.ready);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [loginOpen, setLoginOpen] = useState(false);
  const [order, setOrder] = useState<AccountOrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const locale = language === "zh" ? "zh-CN" : language === "en" ? "en" : "ar-EG";

  useEffect(() => {
    if (!authReady) {
      void hydrate();
    }
  }, [authReady, hydrate]);

  useEffect(() => {
    if (!user || !orderId) {
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    setMissing(false);

    fetch(`/api/account/orders/${orderId}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) {
          setMissing(true);
          setOrder(null);
          return;
        }

        if (!response.ok) {
          throw new Error("failed");
        }

        const payload = (await response.json()) as { order?: AccountOrderDetails };
        setOrder(payload.order ?? null);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [user, orderId]);

  function openReturn() {
    if (!order) {
      return;
    }

    setQuantities(Object.fromEntries(order.items.map((item) => [item.id, 0])));
    setFormError(null);
    setReturnOpen(true);
  }

  function setQuantity(itemId: string, max: number, next: number) {
    const quantity = Number.isFinite(next) ? Math.trunc(next) : 0;
    setQuantities((current) => ({
      ...current,
      [itemId]: Math.min(max, Math.max(0, quantity)),
    }));
  }

  async function submitReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!order || !user) {
      return;
    }

    const items = order.items
      .map((item) => ({ orderItemId: item.id, quantity: quantities[item.id] ?? 0 }))
      .filter((item) => item.quantity > 0);

    if (items.length === 0) {
      setFormError(t("returnNothingSelected"));
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          customerId: user.id,
          items,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setFormError(payload?.error === "exceeds" ? t("returnExceeds") : t("returnRequestFailed"));
        return;
      }

      const refreshed = await fetch(`/api/account/orders/${order.id}`, { cache: "no-store" });
      const next = (await refreshed.json().catch(() => null)) as { order?: AccountOrderDetails } | null;
      if (refreshed.ok && next?.order) {
        setOrder(next.order);
      }

      setReturnOpen(false);
      setSuccess(true);
    } catch {
      setFormError(t("returnRequestFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!authReady || (user && loading)) {
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

  const orderStatus = order ? normalizeOrderStatus(order.status) : null;
  const orderBadge = orderStatus ? badge(orderStatus, ORDER_LABELS, ORDER_CLASSES) : null;
  const created = order?.createdAt ? new Date(order.createdAt) : null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/profile" className="text-sm font-extrabold text-primary hover:text-primary-500">
        {t("backToOrders")}
      </Link>

      {loadError ? <p className="mt-6 text-sm font-bold text-red-600">{t("accountLoadFailed")}</p> : null}
      {missing ? <p className="mt-6 text-sm font-bold text-stone-500">{t("orderNotFound")}</p> : null}

      {order ? (
        <article className="mt-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-extrabold text-stone-950">#{order.id.slice(-6)}</h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${orderBadge?.className ?? "bg-stone-100 text-stone-600"}`}>
              {orderBadge?.label ? t(orderBadge.label) : order.status}
            </span>
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
          <ul className="mt-4 space-y-2 text-sm text-stone-700">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3">
                <span>
                  {item.productName} × {item.quantity}
                </span>
                <span className="shrink-0 font-bold">
                  {item.price} {t("currency")}
                </span>
              </li>
            ))}
          </ul>
          {order.address ? <p className="mt-4 text-sm leading-6 text-stone-500">{order.address}</p> : null}
          <p className="mt-3 text-sm font-extrabold text-stone-950">
            {t("orderTotal")}: {order.totalAmount} {t("currency")}
          </p>

          {success ? (
            <p role="status" className="mt-4 rounded-2xl bg-primary-50 px-3 py-2 text-sm font-bold text-primary-900">
              {t("returnRequested")}
            </p>
          ) : null}

          {canRequestReturn(order.status) ? (
            <button
              type="button"
              onClick={openReturn}
              className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-primary-500"
            >
              {t("requestReturn")}
            </button>
          ) : null}

          {order.returns.length > 0 ? (
            <section className="mt-6 border-t border-stone-100 pt-5">
              <h2 className="text-base font-extrabold text-stone-950">{t("returnStatusTitle")}</h2>
              <div className="mt-3 space-y-3">
                {order.returns.map((request) => {
                  const statusBadge = badge(request.status, RETURN_LABELS, RETURN_CLASSES);
                  const requestedAt = new Date(request.createdAt);

                  return (
                    <div key={request.id} className="rounded-2xl border border-stone-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${statusBadge.className}`}>
                          {statusBadge.label ? t(statusBadge.label) : request.status}
                        </span>
                        {!Number.isNaN(requestedAt.getTime()) ? (
                          <span className="text-xs font-semibold text-stone-500">
                            {requestedAt.toLocaleString(locale, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        ) : null}
                      </div>
                      <ul className="mt-2 space-y-1 text-sm text-stone-700">
                        {request.items.map((item) => (
                          <li key={item.id}>
                            {item.productName} × {item.quantity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </article>
      ) : null}

      {returnOpen && order ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 p-4 sm:items-center">
          <form
            onSubmit={(event) => void submitReturn(event)}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="return-title"
          >
            <h2 id="return-title" className="text-xl font-extrabold text-stone-950">
              {t("requestReturn")}
            </h2>
            <p className="mt-1 text-sm text-stone-500">{t("returnSelectItems")}</p>
            <ul className="mt-4 space-y-3">
              {order.items.map((item) => {
                const remaining = Math.max(0, item.quantity - reservedQuantity(order.returns, item.id));
                const quantity = quantities[item.id] ?? 0;

                return (
                  <li key={item.id} className="rounded-2xl border border-stone-200 p-3">
                    <p className="font-bold text-stone-900">{item.productName}</p>
                    <p className="mt-1 text-xs font-semibold text-stone-500">
                      {t("returnPurchased")}: {item.quantity}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity(item.id, remaining, quantity - 1)}
                        disabled={remaining === 0 || quantity === 0}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-primary text-lg font-extrabold text-primary disabled:border-stone-200 disabled:text-stone-300"
                        aria-label={t("decreaseQuantity", { name: item.productName })}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={remaining}
                        value={quantity}
                        onChange={(event) => setQuantity(item.id, remaining, Number(event.target.value))}
                        disabled={remaining === 0}
                        aria-label={t("returnQuantity")}
                        className="h-10 w-20 rounded-2xl border border-stone-200 text-center text-base font-extrabold text-stone-950 outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 disabled:bg-stone-50"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity(item.id, remaining, quantity + 1)}
                        disabled={remaining === 0 || quantity >= remaining}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-primary text-lg font-extrabold text-primary disabled:border-stone-200 disabled:text-stone-300"
                        aria-label={t("increaseQuantity", { name: item.productName })}
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {formError ? <p className="mt-3 text-sm font-bold text-red-600">{formError}</p> : null}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-white transition hover:bg-primary-500 disabled:opacity-60"
              >
                {submitting ? t("savingAddress") : t("confirmReturnRequest")}
              </button>
              <button
                type="button"
                onClick={() => setReturnOpen(false)}
                className="rounded-full border border-stone-300 px-5 py-3 text-sm font-bold text-stone-600 transition hover:bg-stone-50"
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
