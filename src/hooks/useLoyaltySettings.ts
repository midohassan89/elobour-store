"use client";

import {
  DEFAULT_LOYALTY_RATES,
  DEFAULT_POINTS_EARN_RATIO,
  DEFAULT_POINTS_REDEEM_VALUE,
  positiveRate,
  type LoyaltyRates,
} from "@/utils/points";
import { useEffect, useState } from "react";

function loadLoyaltySettings() {
  return fetch("/api/loyalty", {
    cache: "no-store",
    headers: { "Cache-Control": "no-store" },
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Loyalty settings request failed with status ${response.status}`);
      }

      const body = (await response.json()) as {
        points_earn_ratio?: unknown;
        points_redeem_value?: unknown;
      };
      const earnRatio = positiveRate(body.points_earn_ratio, DEFAULT_POINTS_EARN_RATIO);

      console.log("[useLoyaltySettings] points_earn_ratio", body.points_earn_ratio, "->", earnRatio);

      return {
        earnRatio,
        redeemValue: positiveRate(body.points_redeem_value, DEFAULT_POINTS_REDEEM_VALUE),
      };
    })
    .catch((error: unknown) => {
      console.error(
        "[useLoyaltySettings] points_earn_ratio fetch failed, fallback",
        DEFAULT_POINTS_EARN_RATIO,
        error,
      );
      return DEFAULT_LOYALTY_RATES;
    });
}

export function useLoyaltySettings() {
  const [settings, setSettings] = useState<LoyaltyRates>(DEFAULT_LOYALTY_RATES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let ignore = false;

    loadLoyaltySettings().then((value) => {
      if (!ignore) {
        setSettings(value);
        setReady(true);
      }
    });

    return () => {
      ignore = true;
    };
  }, []);

  return { ...settings, ready };
}
