import { customerJson, customerOptions } from "@/lib/customerRequest";
import { accountState, findCustomerAccount } from "@/lib/customerPassword";
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
  const phone = normalizePhone(raw);
  if (!phone) return customerJson({ error: "phone is required" }, 400);

  const account = await findCustomerAccount(raw);
  const state = accountState(account);
  const pinRows = account
    ? await prisma.$queryRaw<Array<{ pinHash: string | null }>>`
        SELECT pinHash FROM Customer WHERE id = ${account.id} LIMIT 1
      `
    : [];

  return customerJson({
    exists: state.exists,
    hasPassword: state.hasPassword,
    hasName: state.hasName,
    name: state.name,
    hasPin: Boolean(pinRows[0]?.pinHash),
  });
}

export function OPTIONS() {
  return customerOptions();
}
