import { findCustomerById } from "@/lib/customers";
import { findCouponByCode, quoteCoupon } from "@/lib/coupons";
import { prisma } from "@/lib/prisma";
import { readSessionToken, sessionCookieName } from "@/lib/session";
import { getLoyaltySettings } from "@/lib/loyalty";
import { findActiveDeliveryZone } from "@/lib/deliveryZones";
import { createCustomerAddress } from "@/lib/accountData";
import { discountForPoints, pointsForAmount, pointsRedeemStepError } from "@/utils/points";
import { normalizeOrderQuantity } from "@/utils/quantity";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CheckoutItem = {
  productId: string;
  quantity: number;
  price: number;
};

type CheckoutBody = {
  customerName?: unknown;
  recipientName?: unknown;
  phone?: unknown;
  phoneNumber?: unknown;
  address?: unknown;
  notes?: unknown;
  deliveryTime?: unknown;
  totalAmount?: unknown;
  shippingFee?: unknown;
  deliveryFee?: unknown;
  zoneId?: unknown;
  saveAddress?: unknown;
  addressTitle?: unknown;
  street?: unknown;
  city?: unknown;
  pointsRedeemed?: unknown;
  couponCode?: unknown;
  items?: unknown;
};

function wholePoints(value: number) {
  const points = Math.floor(Number(value));

  if (!Number.isInteger(points) || points < 0) {
    throw new Error("Points must be a non-negative integer");
  }

  return points;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const recipientName = String(body.recipientName ?? "").trim();
    const customerName = recipientName;
    const phoneNumber = String(body.phoneNumber ?? body.phone ?? "").trim();
    const phone = phoneNumber;
    const address = String(body.address ?? "").trim();
    const deliveryTimeRaw = String(body.deliveryTime ?? "").trim();
    const isAsap = deliveryTimeRaw.toUpperCase() === "ASAP";
    const deliveryDate = new Date(deliveryTimeRaw);
    const deliveryTime = isAsap || Number.isNaN(deliveryDate.getTime()) ? "" : deliveryDate.toISOString();
    const extraNotes = body.notes == null || String(body.notes).trim() === "" ? "" : String(body.notes).trim();
    const notes =
      [extraNotes, isAsap ? "deliveryTime: ASAP" : deliveryTime ? `deliveryTime: ${deliveryTime}` : ""]
        .filter(Boolean)
        .join("\n") || null;
    const totalAmount = Number(body.totalAmount);
    const zoneId = String(body.zoneId ?? "").trim();
    const items = Array.isArray(body.items) ? body.items : [];
    const zone = zoneId ? await findActiveDeliveryZone(zoneId) : null;
    const shippingFee = zone?.deliveryFee ?? Number.NaN;
    const requestedFee = Number(body.deliveryFee ?? body.shippingFee);

    const cookieStore = await cookies();
    const session = readSessionToken(cookieStore.get(sessionCookieName())?.value);
    const customer = session ? await findCustomerById(session.id) : null;

    if (!customer) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const customerId = customer.id.trim();
    const isGuest = !customerId || !phone;

    const requestedItems = items.flatMap((raw) => {
      if (!raw || typeof raw !== "object") {
        return [];
      }

      const item = raw as Partial<CheckoutItem>;
      const price = Number(item.price);
      const quantity = Number(item.quantity);
      const productId = String(item.productId ?? "").trim();

      if (!productId || !Number.isFinite(price) || price < 0 || !Number.isFinite(quantity)) {
        return [];
      }

      return [{ productId, quantity, price }];
    });
    const catalog = await prisma.product.findMany({
      where: {
        id: { in: requestedItems.map((item) => item.productId) },
        isActive: true,
      },
      select: { id: true, isWeighed: true },
    });
    const weighedById = new Map(catalog.map((product) => [product.id, product.isWeighed === true]));
    const normalizedItems = requestedItems.flatMap((item) => {
      const quantity = normalizeOrderQuantity(item.quantity, weighedById.get(item.productId) === true);

      if (quantity === null || !weighedById.has(item.productId)) {
        return [];
      }

      return [{ ...item, quantity }];
    });

    if (
      !customerName ||
      !phone ||
      !address ||
      (!isAsap && !deliveryTime) ||
      normalizedItems.length !== items.length ||
      items.length === 0
    ) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    if (!isAsap && deliveryDate.getTime() < Date.now() + 60 * 60 * 1000) {
      return NextResponse.json({ error: "delivery_time" }, { status: 400 });
    }

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const loyalty = await getLoyaltySettings();
    const pointsRedeemed = isGuest ? 0 : wholePoints(Number(body.pointsRedeemed ?? 0));
    const couponCode = String(body.couponCode ?? "").trim().toUpperCase();
    const coupon = couponCode ? await findCouponByCode(couponCode) : null;
    const quotedCoupon = couponCode ? quoteCoupon(coupon, subtotal) : null;

    if (quotedCoupon && !quotedCoupon.ok) {
      return NextResponse.json(
        {
          error: quotedCoupon.error,
          ...(quotedCoupon.minOrder != null ? { minOrder: quotedCoupon.minOrder, amount: quotedCoupon.minOrder } : {}),
        },
        { status: 400 },
      );
    }

    const couponDiscount = quotedCoupon?.ok ? quotedCoupon.quote.discountAmount : 0;
    const goodsAfterCoupon = Math.max(0, subtotal - couponDiscount);

    if (pointsRedeemStepError(pointsRedeemed)) {
      return NextResponse.json({ error: "points" }, { status: 400 });
    }

    const pointsDiscount = isGuest ? 0 : discountForPoints(pointsRedeemed, loyalty.redeemValue);
    const pointsEarned = isGuest ? 0 : wholePoints(pointsForAmount(goodsAfterCoupon - pointsDiscount, loyalty.earnRatio));

    if (
      !isGuest &&
      (!customer ||
        pointsRedeemed > customer.pointsBalance ||
        pointsDiscount - goodsAfterCoupon > 0.001)
    ) {
      return NextResponse.json({ error: "points" }, { status: 400 });
    }

    if (zone && subtotal + 0.001 < zone.minOrder) {
      return NextResponse.json({ error: "min_order" }, { status: 400 });
    }

    if (
      !zone ||
      !Number.isFinite(requestedFee) ||
      Math.abs(requestedFee - shippingFee) > 0.02 ||
      !Number.isFinite(totalAmount) ||
      Math.abs(goodsAfterCoupon - pointsDiscount + shippingFee - totalAmount) > 0.02
    ) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    if (!isGuest && body.saveAddress === true) {
      const title = String(body.addressTitle ?? "").trim();
      const street = String(body.street ?? "").trim();
      const city = String(body.city ?? "").trim() || "العين السخنة";

      if (title && street && city && recipientName) {
        await createCustomerAddress(customerId, {
          title,
          street,
          city,
          recipientName,
          phoneNumber,
          zoneId,
        });
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        if (!isGuest) {
          const existingCustomer = await tx.customer.findUnique({
            where: { id: customerId },
            select: { id: true, pointsBalance: true },
          });

          if (!existingCustomer) {
            throw new Error("Customer not found");
          }

          if (pointsRedeemed > existingCustomer.pointsBalance) {
            throw new Error("Insufficient points");
          }
        }

        const order = await tx.order.create({
          data: {
            customerName,
            phone,
            address,
            notes,
            totalAmount,
            pointsEarned: isGuest ? undefined : pointsEarned,
            pointsRedeemed: isGuest ? undefined : pointsRedeemed,
            customer: customerId && !isGuest ? { connect: { id: customerId } } : undefined,
            items: {
              create: normalizedItems.map((item) => ({
                quantity: item.quantity,
                price: item.price,
                product: { connect: { id: item.productId } },
              })),
            },
          },
        });

        for (const item of normalizedItems) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { id: true, linkedProductId: true, bundleMultiplier: true },
          });
          const targetId =
            product?.linkedProductId && product.bundleMultiplier
              ? product.linkedProductId
              : item.productId;
          const amount =
            product?.linkedProductId && product.bundleMultiplier
              ? item.quantity * product.bundleMultiplier
              : item.quantity;
          const updated = await tx.product.update({
            where: { id: targetId },
            data: { stockQuantity: { decrement: amount } },
            select: { stockQuantity: true },
          });

          if (updated.stockQuantity <= 0) {
            await tx.product.update({
              where: { id: targetId },
              data: { stockStatus: "outofstock" },
            });
          }
        }

        if (!isGuest && pointsRedeemed > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: { pointsBalance: { decrement: pointsRedeemed } },
          });
          await tx.pointsTransaction.create({
            data: {
              points: -pointsRedeemed,
              type: "REDEEM",
              description: `Order ${order.id}`,
              customer: { connect: { id: customerId } },
            },
          });
        }

        if (quotedCoupon?.ok) {
          const fresh = await findCouponByCode(quotedCoupon.quote.code, tx);
          const again = quoteCoupon(fresh, subtotal);

          if (!again.ok || Math.abs(again.quote.discountAmount - couponDiscount) > 0.001) {
            throw new Error(again.ok ? "INVALID" : again.error);
          }

          const bumped = await tx.$executeRaw`
            UPDATE Coupon
            SET usedCount = usedCount + 1
            WHERE id = ${again.quote.id}
              AND isActive = 1
              AND usedCount = ${fresh?.usedCount ?? -1}
              AND (usageLimit IS NULL OR usedCount < usageLimit)
          `;

          if (Number(bumped) !== 1) {
            throw new Error("coupon");
          }
        }

        const counters = await tx.$queryRaw<Array<{ nextValue: number | bigint }>>`
          INSERT INTO OrderNumberCounter (channel, nextValue)
          VALUES ('WEB', 1002)
          ON CONFLICT(channel) DO UPDATE SET nextValue = nextValue + 1
          RETURNING nextValue
        `;
        const issued = Number(counters[0]?.nextValue ?? 1002) - 1;
        const orderNumber = `WEB-${issued}`;

        await tx.$executeRaw`
          UPDATE "Order"
          SET
            orderNumber = ${orderNumber},
            deliveryTime = ${isAsap ? null : deliveryTime},
            pointsDiscount = ${pointsDiscount},
            couponCode = ${couponCode || null},
            couponDiscount = ${couponDiscount},
            deliveryZoneId = ${zone.id},
            shippingFee = ${shippingFee}
          WHERE id = ${order.id}
        `;
      });
    } catch (error) {
      console.error("CHECKOUT DB ERROR:", error);
      const message = error instanceof Error ? error.message : "Could not create order";

      if (message === "coupon" || message === "INVALID" || message === "EXPIRED" || message === "LIMIT_REACHED" || message === "MIN_AMOUNT_NOT_MET") {
        return NextResponse.json({ error: message === "coupon" ? "INVALID" : message }, { status: 400 });
      }

      if (message === "Customer not found" || message === "Insufficient points") {
        return NextResponse.json(
          { error: message === "Insufficient points" ? "points" : "not found" },
          { status: 400 },
        );
      }

      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("CHECKOUT DB ERROR:", error);
    const message = error instanceof Error ? error.message : "Could not create order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
