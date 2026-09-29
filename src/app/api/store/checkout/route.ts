import { findCustomerById } from "@/lib/customers";
import { prisma } from "@/lib/prisma";
import { readSessionToken, sessionCookieName } from "@/lib/session";
import { discountForPoints, pointsForAmount, SHIPPING_FEES } from "@/utils/points";
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
  phone?: unknown;
  address?: unknown;
  notes?: unknown;
  totalAmount?: unknown;
  shippingFee?: unknown;
  pointsRedeemed?: unknown;
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
    const customerName = String(body.customerName ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const address = String(body.address ?? "").trim();
    const notes = body.notes == null || String(body.notes).trim() === "" ? null : String(body.notes).trim();
    const totalAmount = Number(body.totalAmount);
    const shippingFee = Number(body.shippingFee ?? 0);
    const items = Array.isArray(body.items) ? body.items : [];

    const cookieStore = await cookies();
    const session = readSessionToken(cookieStore.get(sessionCookieName())?.value);
    const customer = session ? findCustomerById(session.id) : null;
    const customerId = customer?.id?.trim() || "";
    const isGuest = !customerId || !phone;

    const normalizedItems = items.flatMap((raw) => {
      if (!raw || typeof raw !== "object") {
        return [];
      }

      const item = raw as Partial<CheckoutItem>;
      const price = Number(item.price);
      const quantity = Math.floor(Number(item.quantity));
      const productId = String(item.productId ?? "").trim();

      if (!productId || !Number.isFinite(price) || price < 0 || !Number.isFinite(quantity) || quantity < 1) {
        return [];
      }

      return [{ productId, quantity, price }];
    });

    if (!customerName || !phone || !address || normalizedItems.length !== items.length || items.length === 0) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const pointsRedeemed = isGuest ? 0 : wholePoints(Number(body.pointsRedeemed ?? 0));
    const discount = isGuest ? 0 : discountForPoints(pointsRedeemed);
    const pointsEarned = isGuest ? 0 : wholePoints(pointsForAmount(subtotal - discount));
    const shippingAllowed = SHIPPING_FEES.some((fee) => fee === shippingFee);

    if (
      !isGuest &&
      (!customer || pointsRedeemed > customer.pointsBalance || discount - subtotal > 0.001)
    ) {
      return NextResponse.json({ error: "points" }, { status: 400 });
    }

    if (
      !shippingAllowed ||
      !Number.isFinite(totalAmount) ||
      Math.abs(subtotal - discount + shippingFee - totalAmount) > 0.02
    ) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
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

        if (!isGuest) {
          await tx.customer.update({
            where: { id: customerId },
            data: {
              pointsBalance: { increment: pointsEarned - pointsRedeemed },
            },
          });

          if (pointsRedeemed > 0) {
            await tx.pointsTransaction.create({
              data: {
                points: -pointsRedeemed,
                type: "REDEEM",
                description: `Order ${order.id}`,
                customer: { connect: { id: customerId } },
              },
            });
          }

          if (pointsEarned > 0) {
            await tx.pointsTransaction.create({
              data: {
                points: pointsEarned,
                type: "EARN",
                description: `Order ${order.id}`,
                customer: { connect: { id: customerId } },
              },
            });
          }
        }
      });
    } catch (error) {
      console.error("CHECKOUT DB ERROR:", error);
      const message = error instanceof Error ? error.message : "Could not create order";

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
