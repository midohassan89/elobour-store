import { getCustomerReturn } from "@/lib/accountData";
import { currentCustomer } from "@/lib/erpAccount";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const customer = await currentCustomer();

  if (!customer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const returnRequest = await getCustomerReturn(customer.id, id);

    if (!returnRequest) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json({ returnRequest }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/account/returns/id]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
