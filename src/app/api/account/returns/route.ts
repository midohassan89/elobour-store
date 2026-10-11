import { listCustomerReturns } from "@/lib/accountData";
import { currentCustomer } from "@/lib/erpAccount";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await currentCustomer();

  if (!customer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const returns = await listCustomerReturns(customer.id);

    return NextResponse.json({ returns }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/account/returns]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
