import { customerJson, customerOptions, resolveRequestCustomer } from "@/lib/customerRequest";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type NotificationRow = {
  id: string;
  titleAr: string;
  titleEn: string;
  titleZh: string;
  bodyAr: string;
  bodyEn: string;
  bodyZh: string;
  type: string;
  orderId: string | null;
  isRead: number | boolean;
  createdAt: string | Date;
};

export async function GET(request: Request) {
  const customer = await resolveRequestCustomer(request);
  if (!customer) return customerJson({ error: "Unauthorized" }, 401);

  const rows = await prisma.$queryRaw<NotificationRow[]>`
    SELECT id, titleAr, titleEn, titleZh, bodyAr, bodyEn, bodyZh, type, orderId, isRead, createdAt
    FROM CustomerNotification
    WHERE customerId = ${customer.id} OR customerId IS NULL
    ORDER BY createdAt DESC
    LIMIT 100
  `;

  return customerJson({
    ok: true,
    notifications: rows.map((row) => ({
      id: row.id,
      titleAr: row.titleAr,
      titleEn: row.titleEn,
      titleZh: row.titleZh,
      bodyAr: row.bodyAr,
      bodyEn: row.bodyEn,
      bodyZh: row.bodyZh,
      type: row.type,
      orderId: row.orderId,
      isRead: row.isRead === true || row.isRead === 1,
      createdAt: new Date(row.createdAt).toISOString(),
    })),
  });
}

export function OPTIONS() {
  return customerOptions();
}
