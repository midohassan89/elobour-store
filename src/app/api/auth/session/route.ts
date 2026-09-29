import { findCustomerById } from "@/lib/customers";
import {
  createSessionToken,
  readSessionToken,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const session = readSessionToken(cookieStore.get(sessionCookieName())?.value);

  if (!session) {
    return NextResponse.json({ user: null });
  }

  try {
    const customer = findCustomerById(session.id);

    if (!customer) {
      const response = NextResponse.json({ user: null });
      response.cookies.set(sessionCookieName(), "", { ...sessionCookieOptions(), maxAge: 0 });
      return response;
    }

    const response = NextResponse.json({ user: customer });
    response.cookies.set(sessionCookieName(), createSessionToken(customer), sessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
