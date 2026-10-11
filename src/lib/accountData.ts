import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export type AccountOrderItem = {
  id: string;
  productName: string;
  quantity: number;
  price: number;
};

export type AccountOrder = {
  id: string;
  address: string;
  totalAmount: number;
  status: string;
  pointsEarned: number;
  pointsRedeemed: number;
  createdAt: string;
  items: AccountOrderItem[];
};

export type AccountAddress = {
  id: string;
  title: string;
  street: string;
  city: string;
  recipientName: string | null;
  phoneNumber: string | null;
  zoneId: string | null;
  isDefault: boolean;
  zone: {
    id: string;
    nameAr: string;
    nameEn: string;
    nameZh: string;
    deliveryFee: number;
  } | null;
};

type AddressRow = {
  id: string;
  title: string;
  street: string;
  city: string;
  recipientName: string | null;
  phoneNumber: string | null;
  zoneId: string | null;
  isDefault: number | boolean | bigint;
  zoneNameAr: string | null;
  zoneNameEn: string | null;
  zoneNameZh: string | null;
  zoneFee: number | null;
};

function isDefaultAddress(value: AddressRow["isDefault"]) {
  return value === true || Number(value) === 1;
}

export async function listCustomerOrders(customerId: string): Promise<AccountOrder[]> {
  const orders = await prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: { select: { name: true } },
        },
      },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    address: order.address,
    totalAmount: order.totalAmount,
    status: order.status,
    pointsEarned: order.pointsEarned ?? 0,
    pointsRedeemed: order.pointsRedeemed ?? 0,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.price,
    })),
  }));
}

export async function listCustomerAddresses(customerId: string): Promise<AccountAddress[]> {
  const rows = await prisma.$queryRaw<AddressRow[]>`
    SELECT
      Address.id,
      Address.title,
      Address.street,
      Address.city,
      Address.recipientName,
      Address.phoneNumber,
      Address.zoneId,
      Address.isDefault,
      DeliveryZone.nameAr AS zoneNameAr,
      DeliveryZone.nameEn AS zoneNameEn,
      DeliveryZone.nameZh AS zoneNameZh,
      DeliveryZone.deliveryFee AS zoneFee
    FROM Address
    LEFT JOIN DeliveryZone ON DeliveryZone.id = Address.zoneId
    WHERE Address.customerId = ${customerId}
    ORDER BY Address.isDefault DESC, Address.createdAt DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    street: row.street,
    city: row.city,
    recipientName: row.recipientName,
    phoneNumber: row.phoneNumber,
    zoneId: row.zoneId,
    isDefault: isDefaultAddress(row.isDefault),
    zone:
      row.zoneId && row.zoneNameAr
        ? {
            id: row.zoneId,
            nameAr: row.zoneNameAr,
            nameEn: row.zoneNameEn ?? "",
            nameZh: row.zoneNameZh ?? "",
            deliveryFee: Number(row.zoneFee) || 0,
          }
        : null,
  }));
}

export async function createCustomerAddress(
  customerId: string,
  input: {
    title: string;
    street: string;
    city: string;
    recipientName?: string | null;
    phoneNumber?: string | null;
    zoneId?: string | null;
  },
): Promise<AccountAddress> {
  const title = input.title.trim().slice(0, 80);
  const street = input.street.trim().slice(0, 300);
  const city = input.city.trim().slice(0, 120) || "العين السخنة";
  const recipientName = input.recipientName?.trim().slice(0, 80) || null;
  const phoneNumber = input.phoneNumber?.trim().slice(0, 30) || null;
  const zoneId = input.zoneId?.trim() || null;
  const id = randomUUID();
  const now = new Date().toISOString();

  return prisma.$transaction(async (tx) => {
    const counted = await tx.$queryRaw<Array<{ total: number | bigint }>>`
      SELECT COUNT(*) AS total
      FROM Address
      WHERE customerId = ${customerId}
    `;
    const makeDefault = Number(counted[0]?.total ?? 0) === 0;

    if (makeDefault) {
      await tx.$executeRaw`
        UPDATE Address
        SET isDefault = 0, updatedAt = ${now}
        WHERE customerId = ${customerId} AND isDefault = 1
      `;
    }

    await tx.$executeRaw`
      INSERT INTO Address (
        id, customerId, title, street, city, recipientName, phoneNumber, zoneId, isDefault, createdAt, updatedAt
      )
      VALUES (
        ${id}, ${customerId}, ${title}, ${street}, ${city}, ${recipientName}, ${phoneNumber}, ${zoneId},
        ${makeDefault ? 1 : 0}, ${now}, ${now}
      )
    `;

    return {
      id,
      title,
      street,
      city,
      recipientName,
      phoneNumber,
      zoneId,
      isDefault: makeDefault,
      zone: null,
    };
  });
}

export async function deleteCustomerAddress(customerId: string, addressId: string) {
  const now = new Date().toISOString();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM Address
      WHERE id = ${addressId} AND customerId = ${customerId}
      LIMIT 1
    `;

    if (!existing[0]) {
      return false;
    }

    await tx.$executeRaw`
      DELETE FROM Address
      WHERE id = ${addressId} AND customerId = ${customerId}
    `;

    const defaults = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM Address
      WHERE customerId = ${customerId} AND isDefault = 1
      LIMIT 1
    `;

    if (!defaults[0]) {
      const next = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM Address
        WHERE customerId = ${customerId}
        ORDER BY createdAt DESC
        LIMIT 1
      `;

      if (next[0]) {
        await tx.$executeRaw`
          UPDATE Address
          SET isDefault = 1, updatedAt = ${now}
          WHERE id = ${next[0].id}
        `;
      }
    }

    return true;
  });
}
