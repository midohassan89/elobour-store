import { customerJson, customerOptions, resolveRequestCustomer } from "@/lib/customerRequest";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const customer = await resolveRequestCustomer(request);
  if (!customer) return customerJson({ error: "Unauthorized" }, 401);

  return customerJson({
    ok: true,
    customer: {
      id: customer.id,
      phone: customer.phone,
      name: customer.name,
      pointsBalance: customer.pointsBalance,
    },
  });
}

export function OPTIONS() {
  return customerOptions();
}
