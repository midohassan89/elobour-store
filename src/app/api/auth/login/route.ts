import { findCustomerByPhone, normalizePhone, saveCustomerName } from "@/lib/customers";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { phone?: unknown; name?: unknown };

  try {
    body = (await request.json()) as { phone?: unknown; name?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  const phone = normalizePhone(String(body.phone ?? ""));
  const name = String(body.name ?? "").trim().slice(0, 80);

  if (!phone) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  try {
    const existing = await findCustomerByPhone(phone);

    if (existing?.name?.trim()) {
      const response = NextResponse.json({ user: existing });
      response.cookies.set(sessionCookieName(), createSessionToken(existing), sessionCookieOptions());
      return response;
    }

    if (!name) {
      return NextResponse.json({ needsName: true });
    }

    const customer = existing
      ? await saveCustomerName(existing.id, name)
      : await prisma.customer.create({
          data: { phone, name, pointsBalance: 0 },
          select: { id: true, phone: true, name: true, pointsBalance: true },
        });
    const response = NextResponse.json({ user: customer });

    response.cookies.set(sessionCookieName(), createSessionToken(customer), sessionCookieOptions());

    return response;
  } catch (error) {
    console.error("[api/auth/login]", error);
    const message = error instanceof Error ? error.message : "Could not sign in";
    return NextResponse.json({ error: "failed", message }, { status: 500 });
  }
}
