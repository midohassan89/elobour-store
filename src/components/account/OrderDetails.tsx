"use client";

import LoginModal from "@/components/auth/LoginModal";
import { useI18n } from "@/components/i18n/LanguageProvider";
import TimelineStepper, { type TimelineStep } from "@/components/ui/TimelineStepper";
import type { AccountOrderDetails } from "@/lib/accountData";
import { normalizeOrderStatus } from "@/lib/orderStatus";
import { useAuthStore } from "@/store/authStore";
import { CheckCircle, ClipboardCheck, Clock, Package, Truck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function deliveryTimeline(status: string) {
  const normalized = normalizeOrderStatus(status);

  if (normalized === "CANCELLED") {
    return { currentStatus: "CANCELLED", isCancelled: true };
  }

  if (
    normalized === "COMPLETED" ||
    normalized === "DELIVERED" ||
    normalized === "RETURNED" ||
    normalized === "PARTIALLY_RETURNED"
  ) {
    return { currentStatus: "COMPLETED", isCancelled: false };
  }

  return { currentStatus: normalized ?? status, isCancelled: false };
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
  const locale = language === "zh" ? "zh-CN" : language === "en" ? "en" : "ar-EG";
  const deliverySteps: TimelineStep[] = [
    { id: "PENDING", label: t("statusPending"), icon: Clock },
    { id: "CONFIRMED", label: t("statusConfirmed"), icon: ClipboardCheck },
    { id: "PREPARING", label: t("statusPreparing"), icon: Package },
    { id: "SHIPPED", label: t("statusShipped"), icon: Truck },
    { id: "COMPLETED", label: t("statusCompleted"), icon: CheckCircle },
  ];

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

  const created = order?.createdAt ? new Date(order.createdAt) : null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/profile?tab=orders" className="text-sm font-extrabold text-primary hover:text-primary-500">
        {t("backToOrders")}
      </Link>

      {loadError ? <p className="mt-6 text-sm font-bold text-red-600">{t("accountLoadFailed")}</p> : null}
      {missing ? <p className="mt-6 text-sm font-bold text-stone-500">{t("orderNotFound")}</p> : null}

      {order ? (
        <article className="mt-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <h1 className="text-2xl font-extrabold text-stone-950">#{order.id.slice(-6)}</h1>
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
          <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <TimelineStepper steps={deliverySteps} {...deliveryTimeline(order.status)} />
          </div>
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
        </article>
      ) : null}
    </section>
  );
}
