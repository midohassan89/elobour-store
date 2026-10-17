import { prisma } from "@/lib/prisma";

export type DeliveryZone = {
  id: string;
  nameAr: string;
  nameEn: string;
  nameZh: string;
  deliveryFee: number;
  minOrder: number;
  estimatedTime: string | null;
};

type ZoneRow = {
  id: string;
  nameAr: string;
  nameEn: string | null;
  nameZh: string | null;
  deliveryFee: number;
  minOrder: number | null;
  estimatedTime: string | null;
};

function toZone(row: ZoneRow): DeliveryZone {
  return {
    id: row.id,
    nameAr: row.nameAr,
    nameEn: row.nameEn ?? "",
    nameZh: row.nameZh ?? "",
    deliveryFee: Number(row.deliveryFee) || 0,
    minOrder: Number(row.minOrder) || 0,
    estimatedTime: row.estimatedTime?.trim() || null,
  };
}

export async function listActiveDeliveryZones(): Promise<DeliveryZone[]> {
  const rows = await prisma.$queryRaw<ZoneRow[]>`
    SELECT id, nameAr, nameEn, nameZh, deliveryFee, minOrder, estimatedTime
    FROM DeliveryZone
    WHERE isActive = 1
    ORDER BY nameAr ASC
  `;

  return rows.map(toZone);
}

export async function findActiveDeliveryZone(id: string): Promise<DeliveryZone | null> {
  const rows = await prisma.$queryRaw<ZoneRow[]>`
    SELECT id, nameAr, nameEn, nameZh, deliveryFee, minOrder, estimatedTime
    FROM DeliveryZone
    WHERE id = ${id} AND isActive = 1
    LIMIT 1
  `;

  return rows[0] ? toZone(rows[0]) : null;
}
