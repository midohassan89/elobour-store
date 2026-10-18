import { randomUUID } from "crypto";
import { customerJson, customerOptions, resolveRequestCustomer } from "@/lib/customerRequest";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AddressRow = {
  id: string;
  customerId: string;
  title: string;
  recipientName: string | null;
  fullAddress: string;
  details: string | null;
  phone: string | null;
  deliveryZoneId: string | null;
  isDefault: number | boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

function serialize(row: AddressRow) {
  const details = row.details || row.fullAddress;
  const isDefault = row.isDefault === true || row.isDefault === 1;
  return {
    id: row.id,
    customerId: row.customerId,
    label: row.title,
    title: row.title,
    recipientName: row.recipientName,
    details,
    street: details,
    fullAddress: row.fullAddress,
    phone: row.phone,
    deliveryZoneId: row.deliveryZoneId,
    isDefault,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function GET(request: Request) {
  const customer = await resolveRequestCustomer(request);
  if (!customer) {
    const phone = new URL(request.url).searchParams.get("phone");
    if (phone) return customerJson({ ok: true, addresses: [], customerId: null, phone });
    return customerJson({ error: "Unauthorized" }, 401);
  }

  const rows = await prisma.$queryRaw<AddressRow[]>`
    SELECT id, customerId, title, recipientName, fullAddress, details, phone, deliveryZoneId, isDefault, createdAt, updatedAt
    FROM CustomerAddress
    WHERE customerId = ${customer.id}
    ORDER BY isDefault DESC, createdAt DESC
  `;

  return customerJson({
    ok: true,
    customerId: customer.id,
    phone: customer.phone,
    addresses: rows.map(serialize),
  });
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return customerJson({ error: "Invalid request body" }, 400);
  }

  const customer = await resolveRequestCustomer(request, body);
  if (!customer) return customerJson({ error: "Unauthorized" }, 401);

  const label = String(body.label ?? body.title ?? "").trim();
  const details = String(body.details ?? body.fullAddress ?? body.street ?? "").trim();
  const recipientName = String(body.recipientName ?? "").trim() || null;
  const phone = String(body.phone ?? body.phoneNumber ?? "").trim() || null;
  const deliveryZoneId = String(body.deliveryZoneId ?? body.zoneId ?? "").trim() || null;
  const isDefault = body.isDefault === true || body.isDefault === 1 || body.isDefault === "true";

  if (!label || !details) {
    return customerJson({ error: "label and details are required" }, 400);
  }

  if (isDefault) {
    await prisma.$executeRaw`
      UPDATE CustomerAddress SET isDefault = 0 WHERE customerId = ${customer.id}
    `;
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  await prisma.$executeRaw`
    INSERT INTO CustomerAddress (
      id, customerId, title, recipientName, fullAddress, details, phone,
      deliveryZoneId, isDefault, createdAt, updatedAt
    ) VALUES (
      ${id}, ${customer.id}, ${label}, ${recipientName}, ${details}, ${details}, ${phone},
      ${deliveryZoneId}, ${isDefault ? 1 : 0}, ${now}, ${now}
    )
  `;

  const rows = await prisma.$queryRaw<AddressRow[]>`
    SELECT id, customerId, title, recipientName, fullAddress, details, phone, deliveryZoneId, isDefault, createdAt, updatedAt
    FROM CustomerAddress WHERE id = ${id}
  `;

  return customerJson({ ok: true, address: rows[0] ? serialize(rows[0]) : null }, 201);
}

export function OPTIONS() {
  return customerOptions();
}
