import bcrypt from "bcryptjs";
import { normalizePhone, type StoreCustomer } from "@/lib/customers";
import { prisma } from "@/lib/prisma";

export const MIN_CUSTOMER_PASSWORD = 6;

export type CustomerAccount = StoreCustomer & {
  password: string | null;
};

export function customerPasswordError(value: unknown): "required" | "short" | "long" | null {
  if (typeof value !== "string" || value.length === 0) return "required";
  if (value.length < MIN_CUSTOMER_PASSWORD) return "short";
  if (value.length > 128) return "long";
  return null;
}

export function hashCustomerPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyCustomerPassword(password: string, hash: string | null | undefined) {
  if (!hash || !password) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

type AccountRow = {
  id: string;
  phone: string;
  name: string | null;
  password: string | null;
  pointsBalance: number | bigint | null;
};

function toAccount(row: AccountRow): CustomerAccount {
  const name = row.name?.trim() || null;
  return {
    id: row.id,
    phone: row.phone,
    name,
    pointsBalance: Number(row.pointsBalance ?? 0),
    password: row.password || null,
  };
}

/** Active customer for this phone. Exact numbers win over a partial match. */
export async function findCustomerAccount(rawInput: string) {
  const phone = normalizePhone(rawInput);
  if (!phone) return null;

  const raw = rawInput.trim();
  const rows = await prisma.$queryRaw<AccountRow[]>`
    SELECT id, phone, name, password, pointsBalance
    FROM Customer
    WHERE deletedAt IS NULL
      AND (
        phone = ${phone}
        OR phone = ${raw}
        OR phone LIKE ${`%${phone.slice(-10)}`}
      )
    ORDER BY CASE
      WHEN phone = ${phone} THEN 0
      WHEN phone = ${raw} THEN 1
      ELSE 2
    END
    LIMIT 1
  `;

  return rows[0] ? toAccount(rows[0]) : null;
}

export function accountState(account: CustomerAccount | null) {
  return {
    exists: Boolean(account),
    hasPassword: Boolean(account?.password),
    hasName: Boolean(account?.name),
    name: account?.name ?? null,
  };
}

export function publicCustomer(account: CustomerAccount): StoreCustomer {
  return {
    id: account.id,
    phone: account.phone,
    name: account.name,
    pointsBalance: account.pointsBalance,
  };
}
