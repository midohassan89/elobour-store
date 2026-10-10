import { findCustomerById, type StoreCustomer } from "@/lib/customers";
import { readSessionToken, sessionCookieName } from "@/lib/session";
import { cookies } from "next/headers";

export async function currentCustomer(): Promise<StoreCustomer | null> {
  const cookieStore = await cookies();
  const session = readSessionToken(cookieStore.get(sessionCookieName())?.value);

  if (!session) {
    return null;
  }

  return findCustomerById(session.id);
}

export async function fetchCustomerApi(customerId: string, path: string, init?: RequestInit) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.STORE_API_KEY;

  if (!baseUrl || !apiKey) {
    return null;
  }

  return fetch(`${baseUrl}/customers/${encodeURIComponent(customerId)}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
  });
}
