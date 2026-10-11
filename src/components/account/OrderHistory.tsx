"use client";

import OrderCards, { type OrderCardData } from "@/components/account/OrderCards";
import LoginModal from "@/components/auth/LoginModal";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useState } from "react";

export default function OrderHistory() {
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.ready);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [loginOpen, setLoginOpen] = useState(false);
  const [orders, setOrders] = useState<OrderCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [cancellingId, setCancellingId] = useState("");
  const [cancelErrorId, setCancelErrorId] = useState("");

  useEffect(() => {
    if (!authReady) {
      void hydrate();
    }
  }, [authReady, hydrate]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);

    fetch("/api/account/orders", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("failed");
        }

        const payload = (await response.json()) as { orders?: OrderCardData[] };
        setOrders(Array.isArray(payload.orders) ? payload.orders : []);
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
  }, [user]);

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

      setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, status: "CANCELLED" } : order)));
      void hydrate();
    } catch {
      setCancelErrorId(orderId);
    } finally {
      setCancellingId("");
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

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-6 text-2xl font-extrabold text-stone-950 sm:text-3xl">{t("myOrders")}</h1>
      {loadError ? <p className="text-sm font-bold text-red-600">{t("accountLoadFailed")}</p> : null}
      {!loadError && orders.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-stone-200 px-4 py-10 text-center text-sm font-bold text-stone-500">
          {t("ordersEmpty")}
        </p>
      ) : (
        <OrderCards orders={orders} cancellingId={cancellingId} cancelErrorId={cancelErrorId} onCancel={(id) => void cancelOrder(id)} />
      )}
    </section>
  );
}
