import { prisma } from "@/lib/prisma";
import {
  DEFAULT_LOYALTY_RATES,
  DEFAULT_POINTS_EARN_RATIO,
  DEFAULT_POINTS_REDEEM_VALUE,
  positiveRate,
  type LoyaltyRates,
} from "@/utils/points";

const EARN_KEY = "points_earn_ratio";
const REDEEM_KEY = "points_redeem_value";

/**
 * Read loyalty ratios from the shared ERP StoreSetting table.
 * A missing table or invalid value falls back to 10 points per EGP.
 */
export async function getLoyaltySettings(): Promise<LoyaltyRates> {
  try {
    const rows = await prisma.$queryRaw<Array<{ key: string; value: string }>>`
      SELECT key, value
      FROM StoreSetting
      WHERE key = ${EARN_KEY} OR key = ${REDEEM_KEY}
    `;
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    const storedEarnRatio = byKey.get(EARN_KEY);
    const earnRatio = positiveRate(storedEarnRatio, DEFAULT_POINTS_EARN_RATIO);
    const redeemValue = positiveRate(byKey.get(REDEEM_KEY), DEFAULT_POINTS_REDEEM_VALUE);

    console.log(
      "[loyalty] points_earn_ratio",
      storedEarnRatio == null
        ? `missing, fallback ${DEFAULT_POINTS_EARN_RATIO}`
        : `${storedEarnRatio} -> ${earnRatio}`,
    );

    return { earnRatio, redeemValue };
  } catch (error) {
    console.error("[loyalty] points_earn_ratio fetch failed, fallback", DEFAULT_POINTS_EARN_RATIO, error);
    return DEFAULT_LOYALTY_RATES;
  }
}
