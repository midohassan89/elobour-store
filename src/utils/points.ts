export const DEFAULT_POINTS_EARN_RATIO = 10;
export const DEFAULT_POINTS_REDEEM_VALUE = 1000;
export const SHIPPING_FEES = [0, 50, 60, 80] as const;

export type LoyaltyRates = {
  earnRatio: number;
  redeemValue: number;
};

export const DEFAULT_LOYALTY_RATES: LoyaltyRates = {
  earnRatio: DEFAULT_POINTS_EARN_RATIO,
  redeemValue: DEFAULT_POINTS_REDEEM_VALUE,
};

export function positiveRate(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

/** Points earned for a merchandise amount, using points per 1 EGP. */
export function pointsForAmount(amount: number, earnRatio = DEFAULT_POINTS_EARN_RATIO) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.floor(amount * positiveRate(earnRatio, DEFAULT_POINTS_EARN_RATIO));
}

/** EGP discount for a points balance, using points required per 1 EGP. */
export function discountForPoints(points: number, redeemValue = DEFAULT_POINTS_REDEEM_VALUE) {
  if (!Number.isFinite(points) || points <= 0) {
    return 0;
  }

  return points / positiveRate(redeemValue, DEFAULT_POINTS_REDEEM_VALUE);
}

export function maxRedeemablePoints(
  pointsBalance: number,
  cartTotal: number,
  redeemValue = DEFAULT_POINTS_REDEEM_VALUE,
) {
  if (pointsBalance <= 0 || cartTotal <= 0) {
    return 0;
  }

  const perEgp = positiveRate(redeemValue, DEFAULT_POINTS_REDEEM_VALUE);

  return Math.min(Math.floor(pointsBalance), Math.floor(cartTotal * perEgp));
}

export function formatPointsAmount(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}
