export const WEIGHED_STEP = 0.25;

export function quantityStep(isWeighed: boolean) {
  return isWeighed ? WEIGHED_STEP : 1;
}

export function snapQuantity(quantity: number, isWeighed: boolean) {
  if (!Number.isFinite(quantity)) {
    return quantityStep(isWeighed);
  }

  if (!isWeighed) {
    return Math.round(quantity);
  }

  const snapped = Math.round(quantity / WEIGHED_STEP) * WEIGHED_STEP;
  return Math.round(snapped * 100) / 100;
}

export function normalizeOrderQuantity(quantity: number, isWeighed: boolean) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }

  if (!isWeighed) {
    return Number.isInteger(quantity) && quantity >= 1 ? quantity : null;
  }

  const snapped = snapQuantity(quantity, true);

  if (snapped < WEIGHED_STEP || Math.abs(snapped - quantity) > 0.02) {
    return null;
  }

  return snapped;
}

export function formatQuantity(quantity: number, isWeighed: boolean) {
  if (!isWeighed) {
    return String(Math.round(quantity));
  }

  return snapQuantity(quantity, true).toFixed(2);
}
