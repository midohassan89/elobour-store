"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import { normalizeOrderStatus, type OrderStatus } from "@/lib/orderStatus";
import type { TranslationKey } from "@/locales/types";
import {
  ArrowLeftRight,
  Ban,
  CheckCircle,
  ClipboardCheck,
  Clock,
  FileClock,
  Package,
  PackageCheck,
  Truck,
  XCircle,
  type LucideIcon,
} from "lucide-react";

type Tone = {
  icon: LucideIcon;
  label: TranslationKey;
  className: string;
};

const ORDER_TONES: Record<OrderStatus, Tone> = {
  PENDING: { icon: Clock, label: "statusPending", className: "bg-amber-100 text-amber-800" },
  CONFIRMED: { icon: ClipboardCheck, label: "statusConfirmed", className: "bg-blue-50 text-blue-700" },
  PREPARING: { icon: Package, label: "statusPreparing", className: "bg-indigo-50 text-indigo-700" },
  SHIPPED: { icon: Truck, label: "statusShipped", className: "bg-purple-50 text-purple-700" },
  COMPLETED: { icon: CheckCircle, label: "statusCompleted", className: "bg-green-100 text-green-700" },
  DELIVERED: { icon: CheckCircle, label: "statusCompleted", className: "bg-green-100 text-green-700" },
  CANCELLED: { icon: XCircle, label: "statusCancelled", className: "bg-red-50 text-red-700" },
  RETURNED: { icon: PackageCheck, label: "statusReturned", className: "bg-green-50 text-green-700" },
  PARTIALLY_RETURNED: { icon: PackageCheck, label: "statusPartiallyReturned", className: "bg-amber-100 text-amber-800" },
};

const RETURN_TONES: Record<string, Tone> = {
  PENDING: { icon: FileClock, label: "returnStatusPending", className: "bg-amber-100 text-amber-800" },
  CONFIRMED: { icon: ClipboardCheck, label: "returnStatusConfirmed", className: "bg-blue-50 text-blue-700" },
  COLLECTING: { icon: ArrowLeftRight, label: "returnStatusCollecting", className: "bg-purple-50 text-purple-700" },
  COMPLETED: { icon: PackageCheck, label: "returnStatusCompleted", className: "bg-green-50 text-green-700" },
  CANCELLED: { icon: Ban, label: "returnStatusCancelled", className: "bg-red-50 text-red-700" },
};

function StatusBadge({ tone, fallback }: { tone: Tone | null; fallback: string }) {
  const { t } = useI18n();
  const Icon = tone?.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold ${
        tone?.className ?? "bg-stone-100 text-stone-600"
      }`}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {tone ? t(tone.label) : fallback}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const normalized = normalizeOrderStatus(status);
  return <StatusBadge tone={normalized ? ORDER_TONES[normalized] : null} fallback={status} />;
}

export function ReturnStatusBadge({ status }: { status: string }) {
  const key = status.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return <StatusBadge tone={RETURN_TONES[key] ?? null} fallback={status} />;
}
