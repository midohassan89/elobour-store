import { getLoyaltySettings } from "@/lib/loyalty";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** GET /api/loyalty — public earn/redeem ratios from StoreSetting. */
export async function GET() {
  const settings = await getLoyaltySettings();

  console.log("[api/loyalty] points_earn_ratio", settings.earnRatio);

  return NextResponse.json(
    {
      points_earn_ratio: settings.earnRatio,
      points_redeem_value: settings.redeemValue,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
