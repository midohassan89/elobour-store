"use client";

import ReturnRequestModal from "@/components/account/ReturnRequestModal";
import { OrderStatusBadge } from "@/components/account/StatusBadge";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { canCancelOrder, canRequestReturn, normalizeOrderStatus } from "@/lib/orderStatus";
import { cartLineKey, useCartStore } from "@/store/cartStore";
import { formatOrderCode } from "@/utils/orderCode";
import { formatQuantity } from "@/utils/quantity";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

export type OrderCardData = {
  id: string;
  orderNumber?: string | null;
  address: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: {
    id: string;
    productId?: string;
    productName: string;
    image?: string | null;
    quantity: number;
    price: number;
    isWeighed?: boolean;
  }[];
  returnRequests?: { id: string }[];
};

type OrderCardsProps = {
  orders: OrderCardData[];
  cancellingId: string;
  cancelErrorId: string;
  onCancel: (orderId: string) => void;
  onReturnCreated?: () => void;
};

export default function OrderCards({ orders, cancellingId, cancelErrorId, onCancel, onReturnCreated }: OrderCardsProps) {
  const { t, language } = useI18n();
  const locale = language === "zh" ? "zh-CN" : language === "en" ? "en" : "ar-EG";
  const [returnOrder, setReturnOrder] = useState<OrderCardData | null>(null);
  const [returnedId, setReturnedId] = useState("");
  const addItem = useCartStore((state) => state.addItem);

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const created = order.createdAt ? new Date(order.createdAt) : null;
        const returnRequested = (order.returnRequests?.length ?? 0) > 0 || normalizeOrderStatus(order.status) === "RETURNED" || returnedId === order.id;

        return (
          <article key={order.id} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span dir="ltr" className="inline-block text-sm font-extrabold text-stone-900 dark:text-gray-100">{formatOrderCode(order.orderNumber, order.id)}</span>
              <OrderStatusBadge status={order.status} />
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
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3">
                  <span>
                        {item.productName} × {formatQuantity(item.quantity, item.isWeighed === true)}
                        {item.isWeighed ? ` ${t("kilogram")}` : ""}
                  </span>
                  <span className="shrink-0 font-bold">
                    {item.price} {t("currency")}
                  </span>
                </li>
              ))}
            </ul>
            {order.address ? <p className="mt-3 text-xs leading-5 text-stone-500 dark:text-gray-400">{order.address}</p> : null}
            <p className="mt-3 text-sm font-extrabold text-stone-950 dark:text-gray-100">
              {t("orderTotal")}: {order.totalAmount} {t("currency")}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {returnRequested ? (
                <span className="text-sm font-extrabold text-primary">{t("returnRequestedLabel")}</span>
              ) : (
                <>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="rounded-full border border-primary bg-white px-4 py-2 text-sm font-extrabold text-primary transition hover:bg-primary-50 dark:bg-gray-900"
                  >
                    {t("trackOrder")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      for (const item of order.items) {
                        if (!item.productId) continue;
                        addItem(
                          {
                            id: item.productId,
                            lineKey: cartLineKey(item.productId),
                            name: item.productName,
                            price: item.price,
                            isWeighed: item.isWeighed,
                            image: item.image ?? undefined,
                          },
                          item.quantity,
                        );
                      }
                      toast.success(t("addedToCart"));
                    }}
                    className="rounded-full border border-stone-300 px-4 py-2 text-sm font-extrabold text-stone-800 transition hover:bg-stone-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    {t("reorder")}
                  </button>
                  {canRequestReturn(order.status) ? (
                    <button
                      type="button"
                      onClick={() => setReturnOrder(order)}
                      className="rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-white transition hover:bg-primary-500"
                    >
                      {t("requestReturn")}
                    </button>
                  ) : null}
                </>
              )}
              {canCancelOrder(order.status) ? (
                <button
                  type="button"
                  onClick={() => onCancel(order.id)}
                  disabled={cancellingId === order.id}
                  className="rounded-full border border-red-300 bg-red-50 px-4 py-2 text-sm font-extrabold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-400 dark:bg-red-950 dark:text-red-100 dark:hover:bg-red-900"
                >
                  {cancellingId === order.id ? t("cancellingOrder") : t("cancelOrder")}
                </button>
              ) : null}
            </div>
            {cancelErrorId === order.id ? (
              <p className="mt-2 text-sm font-bold text-red-600">{t("cancelOrderFailed")}</p>
            ) : null}
          </article>
        );
      })}
      <ReturnRequestModal
        order={returnOrder}
        onClose={() => setReturnOrder(null)}
        onSuccess={() => {
          if (returnOrder) {
            setReturnedId(returnOrder.id);
          }
          onReturnCreated?.();
        }}
      />
    </div>
  );
}
