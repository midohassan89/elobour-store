import { findCustomerById, normalizePhone, type StoreCustomer } from "@/lib/customers";
import { currentCustomer } from "@/lib/erpAccount";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const customerCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-api-key, x-customer-id, x-customer-phone, x-phone, x-lang",
};

export function customerJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: customerCorsHeaders });
}

export function customerOptions() {
  return new NextResponse(null, { status: 204, headers: customerCorsHeaders });
}

function bearerToken(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return match?.[1]?.trim() ?? "";
}

function looksLikePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function requestCustomerId(request: Request, bodyCustomerId?: unknown) {
  const headerId = String(request.headers.get("x-customer-id") ?? "").trim();
  if (headerId) return headerId;

  const token = bearerToken(request);
  if (token && !looksLikePhone(token)) return token;

  if (typeof bodyCustomerId === "string" && bodyCustomerId.trim()) {
    return bodyCustomerId.trim();
  }

  return new URL(request.url).searchParams.get("customerId")?.trim() ?? "";
}

export function requestPhone(request: Request, bodyPhone?: unknown) {
  const headerPhone = String(
    request.headers.get("x-customer-phone") ?? request.headers.get("x-phone") ?? "",
  ).trim();
  if (headerPhone) return normalizePhone(headerPhone) || headerPhone;

  const token = bearerToken(request);
  if (token && looksLikePhone(token)) return normalizePhone(token) || token;

  const fromBody = String(bodyPhone ?? "").trim();
  if (fromBody) return normalizePhone(fromBody) || fromBody;

  const url = new URL(request.url);
  const fromQuery = String(url.searchParams.get("phone") ?? url.searchParams.get("mobile") ?? "").trim();
  return fromQuery ? normalizePhone(fromQuery) || fromQuery : "";
}

/** Website cookie session first, then a mobile Bearer token or phone. */
export async function resolveRequestCustomer(
  request: Request,
  body?: { customerId?: unknown; phone?: unknown },
): Promise<StoreCustomer | null> {
  const session = await currentCustomer();
  if (session) return session;

  const customerId = requestCustomerId(request, body?.customerId);
  if (customerId) {
    const byId = await findCustomerById(customerId);
    if (byId) return byId;
  }

  const phone = requestPhone(request, body?.phone);
  if (!phone) return null;

  const rows = await prisma.$queryRaw<StoreCustomer[]>`
    SELECT id, phone, name, pointsBalance
    FROM Customer
    WHERE phone = ${phone}
       OR phone LIKE ${`%${phone.slice(-10)}`}
    LIMIT 1
  `;
  return rows[0] ?? null;
}
