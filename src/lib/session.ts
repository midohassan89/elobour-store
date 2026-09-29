import { createHmac, timingSafeEqual } from "crypto";
import type { StoreCustomer } from "@/lib/customers";

const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type SessionPayload = StoreCustomer & {
  exp: number;
};

function secret() {
  const value = process.env.AUTH_SECRET;

  if (!value) {
    throw new Error("AUTH_SECRET is not set");
  }

  return value;
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function sessionCookieName() {
  return COOKIE_NAME;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export function createSessionToken(customer: StoreCustomer) {
  const payload: SessionPayload = {
    ...customer,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string | undefined): StoreCustomer | null {
  if (!token) {
    return null;
  }

  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  const expected = sign(body);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;

    if (
      typeof payload.id !== "string" ||
      typeof payload.phone !== "string" ||
      typeof payload.pointsBalance !== "number" ||
      typeof payload.exp !== "number" ||
      payload.exp < Date.now()
    ) {
      return null;
    }

    return {
      id: payload.id,
      phone: payload.phone,
      pointsBalance: payload.pointsBalance,
    };
  } catch {
    return null;
  }
}
