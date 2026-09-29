"use server";

import { findCustomerById } from "@/lib/customers";
import { readSessionToken, sessionCookieName } from "@/lib/session";
import { discountForPoints, pointsForAmount, SHIPPING_FEES } from "@/utils/points";
import { cookies } from "next/headers";

export type StoreOrderItem = {
  productId: string;
  quantity: number;
  price: number;
};

export type StoreOrderInput = {
  customerName: string;
  phone: string;
  address: string;
  notes?: string;
  totalAmount: number;
  shippingFee?: number;
  pointsRedeemed?: number;
  items: StoreOrderItem[];
};

export type OrderErrorCode = "unauthorized" | "unavailable" | "invalid" | "points" | "failed";

export type PlaceOrderResult =
  | { ok: true }
  | { ok: false; error: OrderErrorCode };

function failureCode(status: number, error: string): OrderErrorCode {
  if (status === 401) {
    return "unauthorized";
  }

  if (error.includes("not found")) {
    return "unavailable";
  }

  if (error.toLowerCase().includes("points")) {
    return "points";
  }

  if (status === 400) {
    return "invalid";
  }

  return "failed";
}

export async function placeStoreOrder(input: StoreOrderInput): Promise<PlaceOrderResult> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.STORE_API_KEY;

  if (!baseUrl || !apiKey) {
    return {
      ok: false,
      error: "unauthorized",
    };
  }

  const cookieStore = await cookies();
  const session = readSessionToken(cookieStore.get(sessionCookieName())?.value);
  const customer = session ? findCustomerById(session.id) : null;
  const pointsRedeemed = Math.floor(Number(input.pointsRedeemed ?? 0));
  const shippingFee = Number(input.shippingFee ?? 0);
  const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = discountForPoints(pointsRedeemed);
  const shippingAllowed = SHIPPING_FEES.some((fee) => fee === shippingFee);

  if (
    !Number.isInteger(pointsRedeemed) ||
    pointsRedeemed < 0 ||
    !shippingAllowed ||
    !Number.isFinite(subtotal) ||
    discount - subtotal > 0.001 ||
    Math.abs(subtotal - discount + shippingFee - input.totalAmount) > 0.02
  ) {
    return { ok: false, error: "invalid" };
  }

  if ((!customer && pointsRedeemed > 0) || (customer && pointsRedeemed > customer.pointsBalance)) {
    return { ok: false, error: "points" };
  }

  const items = input.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    price: item.price,
  }));
  const orderPayload = customer
    ? {
        customerName: input.customerName,
        phone: input.phone,
        address: input.address,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        totalAmount: input.totalAmount,
        shippingFee,
        customerId: customer.id,
        pointsRedeemed,
        pointsEarned: pointsForAmount(subtotal - discount),
        items,
      }
    : {
        customerName: input.customerName,
        phone: input.phone,
        address: input.address,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        totalAmount: input.totalAmount,
        shippingFee,
        items,
      };

  const response = await fetch(`${baseUrl}/store/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(orderPayload),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
    const error = typeof payload?.error === "string" ? payload.error : "";
    return { ok: false, error: failureCode(response.status, error) };
  }

  return { ok: true };
}
