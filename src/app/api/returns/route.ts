import { createCustomerReturn } from "@/lib/accountData";
import { currentCustomer } from "@/lib/erpAccount";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type IncomingItem = { orderItemId?: unknown; quantity?: unknown };

export async function POST(request: Request) {
  const customer = await currentCustomer();

  if (!customer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    orderId?: unknown;
    customerId?: unknown;
    items?: unknown;
  } | null;
  const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
  const customerId = typeof body?.customerId === "string" ? body.customerId.trim() : "";

  if (!orderId || !customerId || customerId !== customer.id || !Array.isArray(body?.items)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const items = body.items.flatMap((raw) => {
    const item = raw as IncomingItem;
    const orderItemId = typeof item.orderItemId === "string" ? item.orderItemId : "";
    const quantity = Number(item.quantity);
    return orderItemId ? [{ orderItemId, quantity }] : [];
  });

  try {
    const result = await createCustomerReturn(customer.id, orderId, items);

    if ("error" in result) {
      const status = result.error === "not_found" ? 404 : result.error === "not_allowed" ? 409 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true, id: result.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/returns]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
