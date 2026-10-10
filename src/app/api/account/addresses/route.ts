import { createCustomerAddress, listCustomerAddresses } from "@/lib/accountData";
import { currentCustomer } from "@/lib/erpAccount";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await currentCustomer();

  if (!customer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const addresses = await listCustomerAddresses(customer.id);

    return NextResponse.json({ addresses }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/account/addresses]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const customer = await currentCustomer();

  if (!customer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    street?: unknown;
    city?: unknown;
  } | null;
  const title = String(body?.title ?? "").trim();
  const street = String(body?.street ?? "").trim();
  const city = String(body?.city ?? "").trim();

  if (!title || !street || !city) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  try {
    const address = await createCustomerAddress(customer.id, { title, street, city });

    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    console.error("[api/account/addresses]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
