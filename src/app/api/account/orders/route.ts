import { listCustomerOrders } from "@/lib/accountData";
import { currentCustomer } from "@/lib/erpAccount";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await currentCustomer();

  if (!customer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const orders = await listCustomerOrders(customer.id);

    return NextResponse.json({ orders }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/account/orders]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
