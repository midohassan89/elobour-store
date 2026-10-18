import { customerJson, customerOptions } from "@/lib/customerRequest";
import { normalizePhone } from "@/lib/customers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { phone?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return customerJson({ error: "Invalid request body" }, 400);
  }

  const raw = String(body.phone ?? "").trim();
  const phone = normalizePhone(raw) || raw;
  if (!phone) return customerJson({ error: "phone is required" }, 400);

  const rows = await prisma.$queryRaw<Array<{ name: string | null; pinHash: string | null }>>`
    SELECT name, pinHash
    FROM Customer
    WHERE phone = ${phone}
       OR phone = ${raw}
       OR phone LIKE ${`%${phone.slice(-10)}`}
    LIMIT 1
  `;
  const customer = rows[0];
  const name = customer?.name?.trim() || null;

  return customerJson({
    exists: Boolean(customer),
    hasName: Boolean(name),
    name,
    hasPin: Boolean(customer?.pinHash),
  });
}

export function OPTIONS() {
  return customerOptions();
}
