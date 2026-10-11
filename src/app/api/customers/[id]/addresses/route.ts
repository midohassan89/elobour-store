import { listCustomerAddresses } from "@/lib/accountData";
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

  if (customer.id !== id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  try {
    const addresses = await listCustomerAddresses(customer.id);

    return NextResponse.json(
      { ok: true, addresses },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[api/customers/addresses]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
