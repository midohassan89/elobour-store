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
  isDefault: boolean;
};

type AddressRow = {
  id: string;
  title: string;
  street: string;
  city: string;
  isDefault: number | boolean | bigint;
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
    SELECT id, title, street, city, isDefault
    FROM Address
    WHERE customerId = ${customerId}
    ORDER BY isDefault DESC, createdAt DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    street: row.street,
    city: row.city,
    isDefault: isDefaultAddress(row.isDefault),
  }));
}

export async function createCustomerAddress(
  customerId: string,
  input: { title: string; street: string; city: string },
): Promise<AccountAddress> {
  const title = input.title.trim().slice(0, 80);
  const street = input.street.trim().slice(0, 300);
  const city = input.city.trim().slice(0, 120);
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
      INSERT INTO Address (id, customerId, title, street, city, isDefault, createdAt, updatedAt)
      VALUES (${id}, ${customerId}, ${title}, ${street}, ${city}, ${makeDefault ? 1 : 0}, ${now}, ${now})
    `;

    return {
      id,
      title,
      street,
      city,
      isDefault: makeDefault,
    };
  });
}
