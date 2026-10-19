"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import type { AccountReturnRequest } from "@/lib/accountData";
import { useAuthStore } from "@/store/authStore";
import { FormEvent, useEffect, useState } from "react";

type ReturnOrder = {
  id: string;
  items: {
    id: string;
    productName: string;
    quantity: number;
  }[];
};

type ReturnRequestModalProps = {
  order: ReturnOrder | null;
  onClose: () => void;
  onSuccess: () => void;
};

function reservedQuantity(returns: AccountReturnRequest[], orderItemId: string) {
  return returns.reduce((sum, request) => {
    if (request.status === "CANCELLED") {
      return sum;
    }

    return sum + request.items.filter((item) => item.orderItemId === orderItemId).reduce((itemSum, item) => itemSum + item.quantity, 0);
  }, 0);
}

export default function ReturnRequestModal({ order, onClose, onSuccess }: ReturnRequestModalProps) {
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const [returns, setReturns] = useState<AccountReturnRequest[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!order) {
      return;
    }

    const controller = new AbortController();
    setQuantities(Object.fromEntries(order.items.map((item) => [item.id, 0])));
    setFormError(null);
    setLoading(true);

    fetch(`/api/account/orders/${order.id}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("failed");
        }

        const payload = (await response.json()) as {
          order?: { returnRequests?: AccountReturnRequest[]; returns?: AccountReturnRequest[] };
        };
        const list = payload.order?.returnRequests ?? payload.order?.returns ?? [];
        setReturns(Array.isArray(list) ? list : []);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setReturns([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [order]);

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
          reason,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setFormError(payload?.error === "exceeds" ? t("returnExceeds") : t("returnRequestFailed"));
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setFormError(t("returnRequestFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!order) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 p-4 sm:items-center">
      <form
        onSubmit={(event) => void submitReturn(event)}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-xl dark:bg-gray-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-title"
      >
        <h2 id="return-title" className="text-xl font-extrabold text-stone-950">
          {t("requestReturn")}
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-gray-400">{t("returnSelectItems")}</p>
        <ul className="mt-4 space-y-3">
          {order.items.map((item) => {
            const remaining = Math.max(0, item.quantity - reservedQuantity(returns, item.id));
            const quantity = quantities[item.id] ?? 0;

            return (
              <li key={item.id} className="rounded-2xl border border-stone-200 p-3 dark:border-gray-800">
                <p className="font-bold text-stone-900 dark:text-gray-100">{item.productName}</p>
                <p className="mt-1 text-xs font-semibold text-stone-500 dark:text-gray-400">
                  {t("returnPurchased")}: {item.quantity}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(item.id, remaining, quantity - 1)}
                    disabled={loading || remaining === 0 || quantity === 0}
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
                    disabled={loading || remaining === 0}
                    aria-label={t("returnQuantity")}
                    className="h-10 w-20 rounded-2xl border border-stone-200 text-center text-base font-extrabold text-stone-950 outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 disabled:bg-stone-50 dark:border-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(item.id, remaining, quantity + 1)}
                    disabled={loading || remaining === 0 || quantity >= remaining}
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
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-extrabold text-stone-800 dark:text-gray-100">{t("returnReason")}</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("returnReasonPlaceholder")}
            rows={2}
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
        </label>
        {formError ? <p className="mt-3 text-sm font-bold text-red-600">{formError}</p> : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            disabled={submitting || loading}
            className="rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-white transition hover:bg-primary-500 disabled:opacity-60"
          >
            {submitting ? t("savingAddress") : t("confirmReturnRequest")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-300 dark:border-gray-700 px-5 py-3 text-sm font-bold text-stone-600 transition hover:bg-stone-50 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {t("cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
