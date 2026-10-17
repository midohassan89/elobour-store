import { listActiveDeliveryZones } from "@/lib/deliveryZones";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const zones = (await listActiveDeliveryZones()).map((zone) => ({
      id: zone.id,
      name: zone.nameAr,
      nameAr: zone.nameAr,
      nameEn: zone.nameEn,
      nameZh: zone.nameZh,
      fee: zone.deliveryFee,
      deliveryFee: zone.deliveryFee,
      minOrder: zone.minOrder,
      estimatedTime: zone.estimatedTime,
    }));

    return NextResponse.json({ zones }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/delivery-zones]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
