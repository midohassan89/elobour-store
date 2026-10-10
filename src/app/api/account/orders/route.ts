import { currentCustomer, fetchCustomerApi } from "@/lib/erpAccount";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type OrderItem = {
  id: string;
  productName: string;
  quantity: number;
  price: number;
};

type AccountOrder = {
  id: string;
  address: string;
  totalAmount: number;
  status: string;
  pointsEarned: number;
  pointsRedeemed: number;
  createdAt: string;
  items: OrderItem[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function readOrder(value: unknown): AccountOrder | null {
  const record = asRecord(value);

  if (!record || typeof record.id !== "string") {
    return null;
  }

  const items = Array.isArray(record.items)
    ? record.items.flatMap((item) => {
        const row = asRecord(item);

        if (!row || typeof row.id !== "string" || typeof row.productName !== "string") {
          return [];
        }

        return [
          {
            id: row.id,
            productName: row.productName,
            quantity: Number(row.quantity) || 0,
            price: Number(row.price) || 0,
          },
        ];
      })
    : [];

  return {
    id: record.id,
    address: typeof record.address === "string" ? record.address : "",
    totalAmount: Number(record.totalAmount) || 0,
    status: typeof record.status === "string" ? record.status : "PENDING",
    pointsEarned: Number(record.pointsEarned) || 0,
    pointsRedeemed: Number(record.pointsRedeemed) || 0,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : "",
    items,
  };
}

export async function GET() {
  const customer = await currentCustomer();

  if (!customer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetchCustomerApi(customer.id, "/orders");

    if (!response) {
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }

    const payload = (await response.json().catch(() => null)) as { orders?: unknown } | null;

    if (!response.ok || !Array.isArray(payload?.orders)) {
      return NextResponse.json({ error: "failed" }, { status: 502 });
    }

    return NextResponse.json(
      { orders: payload.orders.flatMap((order) => {
          const parsed = readOrder(order);
          return parsed ? [parsed] : [];
        }) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
