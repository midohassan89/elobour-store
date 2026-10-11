import { prisma } from "@/lib/prisma";

export type DeliveryZone = {
  id: string;
  nameAr: string;
  nameEn: string;
  nameZh: string;
  deliveryFee: number;
};

type ZoneRow = {
  id: string;
  nameAr: string;
  nameEn: string | null;
  nameZh: string | null;
  deliveryFee: number;
};

function toZone(row: ZoneRow): DeliveryZone {
  return {
    id: row.id,
    nameAr: row.nameAr,
    nameEn: row.nameEn ?? "",
    nameZh: row.nameZh ?? "",
    deliveryFee: Number(row.deliveryFee) || 0,
  };
}

export async function listActiveDeliveryZones(): Promise<DeliveryZone[]> {
  const rows = await prisma.$queryRaw<ZoneRow[]>`
    SELECT id, nameAr, nameEn, nameZh, deliveryFee
    FROM DeliveryZone
    WHERE isActive = 1
    ORDER BY nameAr ASC
  `;

  return rows.map(toZone);
}

export async function findActiveDeliveryZone(id: string): Promise<DeliveryZone | null> {
  const rows = await prisma.$queryRaw<ZoneRow[]>`
    SELECT id, nameAr, nameEn, nameZh, deliveryFee
    FROM DeliveryZone
    WHERE id = ${id} AND isActive = 1
    LIMIT 1
  `;

  return rows[0] ? toZone(rows[0]) : null;
}
