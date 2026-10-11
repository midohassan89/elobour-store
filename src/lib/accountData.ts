import { randomUUID } from "crypto";
import { canCancelOrder, canRequestReturn } from "@/lib/orderStatus";
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

export type AccountReturnItem = {
  id: string;
  orderItemId: string;
  productName: string;
  quantity: number;
};

export type AccountReturnRequest = {
  id: string;
  status: string;
  createdAt: string;
  items: AccountReturnItem[];
};

export type AccountOrderDetails = AccountOrder & {
  returns: AccountReturnRequest[];
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

export async function cancelCustomerOrder(customerId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, customerId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, linkedProductId: true, bundleMultiplier: true },
            },
          },
        },
      },
    });

    if (!order) {
      return "not_found" as const;
    }

    if (!canCancelOrder(order.status)) {
      return "not_allowed" as const;
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });

    for (const item of order.items) {
      const product = item.product;
      const targetId =
        product.linkedProductId && product.bundleMultiplier ? product.linkedProductId : product.id;
      const amount =
        product.linkedProductId && product.bundleMultiplier
          ? item.quantity * product.bundleMultiplier
          : item.quantity;
      const updated = await tx.product.update({
        where: { id: targetId },
        data: { stockQuantity: { increment: amount } },
        select: { stockQuantity: true },
      });

      if (updated.stockQuantity > 0) {
        await tx.product.update({
          where: { id: targetId },
          data: { stockStatus: "instock" },
        });
      }
    }

    const earned = order.pointsEarned ?? 0;
    const redeemed = order.pointsRedeemed ?? 0;

    if (earned > 0 || redeemed > 0) {
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        select: { pointsBalance: true },
      });

      if (customer) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            pointsBalance: Math.max(0, customer.pointsBalance + redeemed - earned),
          },
        });

        if (redeemed > 0) {
          await tx.pointsTransaction.create({
            data: {
              points: redeemed,
              type: "EARN",
              description: `Cancel order ${order.id}`,
              customer: { connect: { id: customerId } },
            },
          });
        }

        if (earned > 0) {
          await tx.pointsTransaction.create({
            data: {
              points: -earned,
              type: "REDEEM",
              description: `Cancel order ${order.id}`,
              customer: { connect: { id: customerId } },
            },
          });
        }
      }
    }

    return "ok" as const;
  });
}

type ReturnRow = {
  id: string;
  status: string;
  createdAt: string | Date;
  itemId: string;
  orderItemId: string;
  quantity: number | bigint;
  productName: string;
};

function asIso(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

export async function getCustomerOrder(customerId: string, orderId: string): Promise<AccountOrderDetails | null> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId },
    include: {
      items: {
        include: {
          product: { select: { name: true } },
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  const rows = await prisma.$queryRaw<ReturnRow[]>`
    SELECT
      ReturnRequest.id AS id,
      ReturnRequest.status AS status,
      ReturnRequest.createdAt AS createdAt,
      ReturnItem.id AS itemId,
      ReturnItem.orderItemId AS orderItemId,
      ReturnItem.quantity AS quantity,
      Product.name AS productName
    FROM ReturnRequest
    INNER JOIN ReturnItem ON ReturnItem.returnRequestId = ReturnRequest.id
    INNER JOIN OrderItem ON OrderItem.id = ReturnItem.orderItemId
    INNER JOIN Product ON Product.id = OrderItem.productId
    WHERE ReturnRequest.orderId = ${orderId}
      AND ReturnRequest.customerId = ${customerId}
    ORDER BY ReturnRequest.createdAt DESC
  `;

  const returns = new Map<string, AccountReturnRequest>();

  for (const row of rows) {
    const current = returns.get(row.id) ?? {
      id: row.id,
      status: row.status,
      createdAt: asIso(row.createdAt),
      items: [],
    };
    current.items.push({
      id: row.itemId,
      orderItemId: row.orderItemId,
      productName: row.productName,
      quantity: Number(row.quantity),
    });
    returns.set(row.id, current);
  }

  return {
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
    returns: [...returns.values()],
  };
}

export async function createCustomerReturn(
  customerId: string,
  orderId: string,
  items: Array<{ orderItemId: string; quantity: number }>,
) {
  const requested = new Map<string, number>();

  for (const item of items) {
    const orderItemId = item.orderItemId.trim();
    if (!orderItemId || !Number.isInteger(item.quantity) || item.quantity < 1) {
      return { error: "invalid" as const };
    }

    requested.set(orderItemId, (requested.get(orderItemId) ?? 0) + item.quantity);
  }

  if (requested.size === 0) {
    return { error: "invalid" as const };
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, customerId },
      select: {
        id: true,
        status: true,
        items: { select: { id: true, quantity: true } },
      },
    });

    if (!order) {
      return { error: "not_found" as const };
    }

    if (!canRequestReturn(order.status)) {
      return { error: "not_allowed" as const };
    }

    const purchased = new Map(order.items.map((item) => [item.id, item.quantity]));

    for (const orderItemId of requested.keys()) {
      if (!purchased.has(orderItemId)) {
        return { error: "invalid" as const };
      }
    }

    const reservedRows = await tx.$queryRaw<Array<{ orderItemId: string; quantity: number | bigint }>>`
      SELECT ReturnItem.orderItemId AS orderItemId, ReturnItem.quantity AS quantity
      FROM ReturnItem
      INNER JOIN ReturnRequest ON ReturnRequest.id = ReturnItem.returnRequestId
      WHERE ReturnRequest.orderId = ${orderId}
        AND ReturnRequest.status != 'CANCELLED'
    `;
    const reserved = new Map<string, number>();

    for (const row of reservedRows) {
      reserved.set(row.orderItemId, (reserved.get(row.orderItemId) ?? 0) + Number(row.quantity));
    }

    for (const [orderItemId, quantity] of requested) {
      if ((reserved.get(orderItemId) ?? 0) + quantity > (purchased.get(orderItemId) ?? 0)) {
        return { error: "exceeds" as const };
      }
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await tx.$executeRaw`
      INSERT INTO ReturnRequest (id, orderId, customerId, status, pointsDeducted, createdAt, updatedAt)
      VALUES (${id}, ${orderId}, ${customerId}, 'PENDING', 0, ${now}, ${now})
    `;

    for (const [orderItemId, quantity] of requested) {
      await tx.$executeRaw`
        INSERT INTO ReturnItem (id, returnRequestId, orderItemId, quantity)
        VALUES (${randomUUID()}, ${id}, ${orderItemId}, ${quantity})
      `;
    }

    return { id };
  });
}
