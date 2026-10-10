import { prisma } from "@/lib/prisma";

export type StoreCustomer = {
  id: string;
  phone: string;
  pointsBalance: number;
};

const customerSelect = {
  id: true,
  phone: true,
  pointsBalance: true,
} as const;

export function normalizePhone(input: string) {
  const western = input
    .trim()
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
  let digits = western.replace(/[^\d+]/g, "");

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

export async function findCustomerByPhone(phone: string) {
  return prisma.customer.findUnique({
    where: { phone },
    select: customerSelect,
  });
}

export async function findCustomerById(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    select: customerSelect,
  });
}

export async function findOrCreateCustomer(phone: string): Promise<StoreCustomer> {
  const existing = await findCustomerByPhone(phone);

  if (existing) {
    return existing;
  }

  try {
    return await prisma.customer.create({
      data: { phone, pointsBalance: 0 },
      select: customerSelect,
    });
  } catch (error) {
    const created = await findCustomerByPhone(phone);

    if (created) {
      return created;
    }

    throw error;
  }
}
