import { Prisma } from "@prisma/client";
import { customerJson, customerOptions, resolveRequestCustomer } from "@/lib/customerRequest";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  let body: { ids?: unknown; customerId?: unknown; phone?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const customer = await resolveRequestCustomer(request, body);
  if (!customer) return customerJson({ error: "Unauthorized" }, 401);

  const ids = Array.isArray(body.ids)
    ? body.ids.map((id) => String(id).trim()).filter(Boolean)
    : [];

  const updated = ids.length
    ? await prisma.$executeRaw`
        UPDATE CustomerNotification
        SET isRead = 1
        WHERE customerId = ${customer.id}
          AND isRead = 0
          AND id IN (${Prisma.join(ids)})
      `
    : await prisma.$executeRaw`
        UPDATE CustomerNotification
        SET isRead = 1
        WHERE customerId = ${customer.id} AND isRead = 0
      `;

  return customerJson({ ok: true, updated: Number(updated) });
}

export function OPTIONS() {
  return customerOptions();
}
