import { findOrCreateCustomer, normalizePhone } from "@/lib/customers";
import {
  createSessionToken,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { phone?: unknown };

  try {
    body = (await request.json()) as { phone?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  const phone = normalizePhone(String(body.phone ?? ""));

  if (!phone) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  try {
    const customer = findOrCreateCustomer(phone);
    const response = NextResponse.json({ user: customer });

    response.cookies.set(sessionCookieName(), createSessionToken(customer), sessionCookieOptions());

    return response;
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
