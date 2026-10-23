import {
  accountState,
  customerPasswordError,
  findCustomerAccount,
  hashCustomerPassword,
  publicCustomer,
  verifyCustomerPassword,
} from "@/lib/customerPassword";
import { normalizePhone } from "@/lib/customers";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function signedIn(account: { id: string; phone: string; name: string | null; pointsBalance: number }) {
  const user = publicCustomer({ ...account, password: null });
  const response = NextResponse.json({ user });
  response.cookies.set(sessionCookieName(), createSessionToken(user), sessionCookieOptions());
  return response;
}

export async function POST(request: Request) {
  let body: { phone?: unknown; name?: unknown; password?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  const phone = normalizePhone(String(body.phone ?? ""));
  const name = String(body.name ?? "").trim().slice(0, 80);
  const passwordError = customerPasswordError(body.password);

  if (!phone) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }
  if (passwordError === "required") {
    return NextResponse.json({ error: "password_required" }, { status: 400 });
  }
  if (passwordError) {
    return NextResponse.json({ error: "password_short" }, { status: 400 });
  }

  const password = String(body.password);

  try {
    const existing = await findCustomerAccount(phone);
    const state = accountState(existing);

    if (!existing) {
      if (!name) {
        return NextResponse.json({ error: "name_required" }, { status: 400 });
      }
      const hash = await hashCustomerPassword(password);
      const created = await prisma.customer.create({
        data: { phone, name, pointsBalance: 0 },
        select: { id: true, phone: true, name: true, pointsBalance: true },
      });
      await prisma.$executeRaw`
        UPDATE Customer SET password = ${hash} WHERE id = ${created.id}
      `;
      return signedIn(created);
    }

    if (!state.hasPassword) {
      if (!state.hasName && !name) {
        return NextResponse.json({ error: "name_required" }, { status: 400 });
      }
      const hash = await hashCustomerPassword(password);
      const savedName = state.hasName ? existing.name : name;
      const updated = await prisma.$executeRaw`
        UPDATE Customer
        SET password = ${hash},
            name = ${savedName},
            updatedAt = ${new Date().toISOString()}
        WHERE id = ${existing.id}
          AND (password IS NULL OR password = '')
      `;
      if (Number(updated) === 0) {
        return NextResponse.json({ error: "incorrect_password" }, { status: 401 });
      }
      return signedIn({ ...existing, name: savedName });
    }

    if (!(await verifyCustomerPassword(password, existing.password))) {
      return NextResponse.json({ error: "incorrect_password" }, { status: 401 });
    }

    return signedIn(existing);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") {
      return NextResponse.json({ error: "failed" }, { status: 409 });
    }
    console.error("[api/auth/login]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
