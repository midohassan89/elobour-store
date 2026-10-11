import { deleteCustomerAddress } from "@/lib/accountData";
import { currentCustomer } from "@/lib/erpAccount";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; addressId: string }> },
) {
  const customer = await currentCustomer();

  if (!customer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id, addressId } = await context.params;

  if (customer.id !== id || !addressId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  try {
    const deleted = await deleteCustomerAddress(customer.id, addressId);

    if (!deleted) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/customers/addresses/delete]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
