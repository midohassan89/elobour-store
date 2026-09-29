import { DatabaseSync } from "node:sqlite";
import path from "path";

export type StoreCustomer = {
  id: string;
  phone: string;
  pointsBalance: number;
};

let database: DatabaseSync | null = null;

function databasePath() {
  const url = process.env.DATABASE_URL;

  if (!url?.startsWith("file:")) {
    throw new Error("DATABASE_URL is not set");
  }

  let filePath = url.slice("file:".length);

  if (filePath.startsWith("//")) {
    filePath = filePath.slice(2);
  }

  if (process.platform === "win32" && filePath.startsWith("/")) {
    filePath = filePath.slice(1);
  }

  return path.resolve(filePath);
}

function getDatabase() {
  if (!database) {
    database = new DatabaseSync(databasePath());
    database.exec("PRAGMA busy_timeout = 5000");
  }

  return database;
}

export function normalizePhone(input: string) {
  let digits = input.trim().replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("20") && digits.length === 12) {
    digits = `0${digits.slice(2)}`;
  }

  if (!/^01[0125]\d{8}$/.test(digits)) {
    return null;
  }

  return digits;
}

function toCustomer(row: Record<string, unknown> | undefined): StoreCustomer | null {
  if (!row || typeof row.id !== "string" || typeof row.phone !== "string") {
    return null;
  }

  const pointsBalance = Number(row.pointsBalance);

  return {
    id: row.id,
    phone: row.phone,
    pointsBalance: Number.isFinite(pointsBalance) ? pointsBalance : 0,
  };
}

export function findCustomerByPhone(phone: string) {
  const row = getDatabase()
    .prepare("SELECT id, phone, pointsBalance FROM Customer WHERE phone = ?")
    .get(phone) as Record<string, unknown> | undefined;

  return toCustomer(row);
}

export function findCustomerById(id: string) {
  const row = getDatabase()
    .prepare("SELECT id, phone, pointsBalance FROM Customer WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;

  return toCustomer(row);
}

export function findOrCreateCustomer(phone: string) {
  const existing = findCustomerByPhone(phone);

  if (existing) {
    return existing;
  }

  const now = Date.now();
  const id = crypto.randomUUID();

  try {
    getDatabase()
      .prepare(
        "INSERT INTO Customer (id, phone, name, password, pointsBalance, createdAt, updatedAt) VALUES (?, ?, NULL, NULL, 0, ?, ?)",
      )
      .run(id, phone, now, now);
  } catch (error) {
    const created = findCustomerByPhone(phone);

    if (created) {
      return created;
    }

    throw error;
  }

  return { id, phone, pointsBalance: 0 };
}
