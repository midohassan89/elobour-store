import { findCouponByCode, quoteCoupon } from "@/lib/coupons";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** POST /api/coupons/validate — body: { code, subtotal } */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: unknown; subtotal?: unknown } | null;
  const code = String(body?.code ?? "").trim().toUpperCase();
  const subtotal = Number(body?.subtotal);

  if (!code) {
    return NextResponse.json({ valid: false, error: "code is required" }, { status: 400 });
  }

  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return NextResponse.json({ valid: false, error: "subtotal must be 0 or greater" }, { status: 400 });
  }

  try {
    const coupon = await findCouponByCode(code);
    const quoted = quoteCoupon(coupon, subtotal);

    if (!quoted.ok) {
      return NextResponse.json({
        valid: false,
        error: quoted.error,
        ...(quoted.minOrder != null ? { minOrder: quoted.minOrder, amount: quoted.minOrder } : {}),
      });
    }

    return NextResponse.json({
      valid: true,
      code: quoted.quote.code,
      discountType: quoted.quote.discountType,
      discountValue: quoted.quote.discountValue,
      discountAmount: quoted.quote.discountAmount,
    });
  } catch (error) {
    console.error("[api/coupons/validate]", error);
    return NextResponse.json({ valid: false, error: "failed" }, { status: 500 });
  }
}
