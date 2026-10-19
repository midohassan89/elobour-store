import { setDefaultCustomerAddress, updateCustomerAddress } from "@/lib/accountData";
import { findActiveDeliveryZone } from "@/lib/deliveryZones";
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
  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    street?: unknown;
    city?: unknown;
    recipientName?: unknown;
    phoneNumber?: unknown;
    zoneId?: unknown;
    isDefault?: unknown;
  } | null;
  if (body?.isDefault === true && !String(body?.title ?? "").trim()) {
    const updated = await setDefaultCustomerAddress(customer.id, id);
    if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const title = String(body?.title ?? "").trim();
  const street = String(body?.street ?? "").trim();
  const city = String(body?.city ?? "").trim();
  const recipientName = String(body?.recipientName ?? "").trim();
  const phoneNumber = String(body?.phoneNumber ?? "").trim();
  const zoneId = String(body?.zoneId ?? "").trim();

  if (!id || !title || !street) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  if (zoneId && !(await findActiveDeliveryZone(zoneId))) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  try {
    const address = await updateCustomerAddress(customer.id, id, {
      title,
      street,
      city: city || "العين السخنة",
      recipientName,
      phoneNumber,
      zoneId,
    });

    if (!address) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json({ address }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/account/addresses/update]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
