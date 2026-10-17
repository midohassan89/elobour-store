import { prisma } from "@/lib/prisma";

export type CouponRecord = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrder: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: Date | null;
  isActive: boolean;
};

export type CouponQuote = {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  discountAmount: number;
};

export type CouponQuoteResult = { ok: true; quote: CouponQuote } | { ok: false; error: string };

type CouponRow = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrder: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number | null;
  expiresAt: string | Date | null;
  isActive: number | boolean | bigint;
};

function toCoupon(row: CouponRow): CouponRecord {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discountType,
    discountValue: Number(row.discountValue) || 0,
    minOrder: Number(row.minOrder) || 0,
    maxDiscount: row.maxDiscount == null ? null : Number(row.maxDiscount),
    usageLimit: row.usageLimit == null ? null : Number(row.usageLimit),
    usedCount: Number(row.usedCount) || 0,
    expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
    isActive: row.isActive === true || Number(row.isActive) === 1,
  };
}

export async function findCouponByCode(code: string, db: Pick<typeof prisma, "$queryRaw"> = prisma) {
  const rows = await db.$queryRaw<CouponRow[]>`
    SELECT id, code, discountType, discountValue, minOrder, maxDiscount, usageLimit, usedCount, expiresAt, isActive
    FROM Coupon
    WHERE code = ${code}
    LIMIT 1
  `;

  return rows[0] ? toCoupon(rows[0]) : null;
}

/** Price a coupon against a goods subtotal. Does not increment usedCount. */
export function quoteCoupon(coupon: CouponRecord | null, subtotal: number, now = new Date()): CouponQuoteResult {
  if (!coupon) {
    return { ok: false, error: "Coupon not found" };
  }

  if (!coupon.isActive) {
    return { ok: false, error: "Coupon is inactive" };
  }

  if (coupon.expiresAt && coupon.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, error: "Coupon has expired" };
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, error: "Coupon usage limit reached" };
  }

  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return { ok: false, error: "subtotal must be 0 or greater" };
  }

  if (subtotal + 0.001 < coupon.minOrder) {
    return { ok: false, error: "Order is below the coupon minimum" };
  }

  const discountType =
    coupon.discountType === "FIXED" ? "FIXED" : coupon.discountType === "PERCENTAGE" ? "PERCENTAGE" : null;

  if (!discountType) {
    return { ok: false, error: "Coupon is invalid" };
  }

  let amount = discountType === "PERCENTAGE" ? subtotal * (coupon.discountValue / 100) : coupon.discountValue;

  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "Coupon is invalid" };
  }

  if (coupon.maxDiscount != null && amount > coupon.maxDiscount) {
    amount = coupon.maxDiscount;
  }

  if (amount > subtotal) {
    amount = subtotal;
  }

  amount = Math.round(amount * 100) / 100;

  return {
    ok: true,
    quote: {
      id: coupon.id,
      code: coupon.code,
      discountType,
      discountValue: coupon.discountValue,
      discountAmount: amount,
    },
  };
}
