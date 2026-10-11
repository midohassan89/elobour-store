import { cancelCustomerOrder } from "@/lib/accountData";
import { currentCustomer } from "@/lib/erpAccount";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const customer = await currentCustomer();

  if (!customer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;

  if (!id || body?.status !== "CANCELLED") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  try {
    const result = await cancelCustomerOrder(customer.id, id);

    if (result === "not_found") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    if (result === "not_allowed") {
      return NextResponse.json({ error: "not allowed" }, { status: 409 });
    }

    return NextResponse.json({ ok: true, status: "CANCELLED" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/orders/patch]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
