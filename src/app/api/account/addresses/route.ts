import { currentCustomer, fetchCustomerApi } from "@/lib/erpAccount";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export type AccountAddress = {
  id: string;
  title: string;
  street: string;
  city: string;
  isDefault: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function readAddress(value: unknown): AccountAddress | null {
  const record = asRecord(value);

  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.title !== "string" ||
    typeof record.street !== "string" ||
    typeof record.city !== "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    title: record.title,
    street: record.street,
    city: record.city,
    isDefault: record.isDefault === true,
  };
}

export async function GET() {
  const customer = await currentCustomer();

  if (!customer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetchCustomerApi(customer.id, "/addresses");

    if (!response) {
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }

    const payload = (await response.json().catch(() => null)) as { addresses?: unknown } | null;

    if (!response.ok || !Array.isArray(payload?.addresses)) {
      return NextResponse.json({ error: "failed" }, { status: 502 });
    }

    return NextResponse.json(
      {
        addresses: payload.addresses.flatMap((address) => {
          const parsed = readAddress(address);
          return parsed ? [parsed] : [];
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const customer = await currentCustomer();

  if (!customer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    street?: unknown;
    city?: unknown;
  } | null;
  const title = String(body?.title ?? "").trim();
  const street = String(body?.street ?? "").trim();
  const city = String(body?.city ?? "").trim();

  if (!title || !street || !city) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  try {
    const response = await fetchCustomerApi(customer.id, "/addresses", {
      method: "POST",
      body: JSON.stringify({ title, street, city }),
    });

    if (!response) {
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }

    const payload = (await response.json().catch(() => null)) as { address?: unknown } | null;
    const address = readAddress(payload?.address);

    if (!response.ok || !address) {
      return NextResponse.json({ error: "failed" }, { status: 502 });
    }

    return NextResponse.json({ address }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
