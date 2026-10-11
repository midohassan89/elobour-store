export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "COMPLETED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "PARTIALLY_RETURNED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const ALIASES: Record<string, OrderStatus> = {
  PENDING: "PENDING",
  "قيد الانتظار": "PENDING",
  CONFIRMED: "CONFIRMED",
  "تم التأكيد": "CONFIRMED",
  PREPARING: "PREPARING",
  "جاري التجهيز": "PREPARING",
  "جاري التحضير": "PREPARING",
  SHIPPED: "SHIPPED",
  "مشحون": "SHIPPED",
  COMPLETED: "COMPLETED",
  DELIVERED: "DELIVERED",
  "مكتمل": "COMPLETED",
  CANCELLED: "CANCELLED",
  CANCELED: "CANCELLED",
  "ملغي": "CANCELLED",
  RETURNED: "RETURNED",
  "مرتجع": "RETURNED",
  PARTIALLY_RETURNED: "PARTIALLY_RETURNED",
  "مرتجع جزئي": "PARTIALLY_RETURNED",
};

export function normalizeOrderStatus(status: string): OrderStatus | null {
  const trimmed = status.trim();
  const compact = trimmed.toUpperCase().replace(/[\s-]+/g, "_");

  return ALIASES[trimmed] ?? ALIASES[compact] ?? null;
}

export function canCancelOrder(status: string) {
  const normalized = normalizeOrderStatus(status);
  return normalized === "PENDING" || normalized === "CONFIRMED";
}

export function canRequestReturn(status: string) {
  const normalized = normalizeOrderStatus(status);
  return normalized === "COMPLETED" || normalized === "DELIVERED";
}
