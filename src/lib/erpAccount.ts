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
