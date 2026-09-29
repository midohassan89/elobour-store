export const POINTS_PER_EGP = 10;
export const POINTS_FOR_ONE_EGP = 1000;
export const SHIPPING_FEES = [0, 50, 60, 80] as const;

export function pointsForAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.floor(amount * POINTS_PER_EGP);
}

export function discountForPoints(points: number) {
  if (!Number.isFinite(points) || points <= 0) {
    return 0;
  }

  return points / POINTS_FOR_ONE_EGP;
}

export function maxRedeemablePoints(pointsBalance: number, cartTotal: number) {
  if (pointsBalance <= 0 || cartTotal <= 0) {
    return 0;
  }

  return Math.min(Math.floor(pointsBalance), Math.floor(cartTotal * POINTS_FOR_ONE_EGP));
}

export function formatPointsAmount(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}
