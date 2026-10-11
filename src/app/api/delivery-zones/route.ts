import { listActiveDeliveryZones } from "@/lib/deliveryZones";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const zones = await listActiveDeliveryZones();

    return NextResponse.json({ zones }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/delivery-zones]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
