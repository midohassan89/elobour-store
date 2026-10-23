import { randomUUID } from "crypto";
import { normalizePhone } from "@/lib/customers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const REQUEST_TEXT = "[deletion-request] طلب حذف الحساب والبيانات نهائياً";

export async function POST(request: Request) {
  let body: { phone?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "INVALID_PHONE" }, { status: 400 });
  }

  const phone = normalizePhone(String(body.phone ?? ""));
  if (!phone) {
    return Response.json({ error: "INVALID_PHONE" }, { status: 400 });
  }

  const customers = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM Customer
    WHERE phone = ${phone} AND deletedAt IS NULL
    LIMIT 1
  `;
  const customer = customers[0];

  if (customer) {
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM ChatMessage
      WHERE customerId = ${customer.id} AND originalText = ${REQUEST_TEXT}
      LIMIT 1
    `;
    if (existing.length === 0) {
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      await prisma.$executeRaw`
        INSERT INTO ChatMessage (
          id, customerId, senderRole, originalText, originalLang,
          textAr, textEn, textZh, isReadByAdmin, isReadByCustomer, createdAt
        ) VALUES (
          ${id}, ${customer.id}, 'CUSTOMER', ${REQUEST_TEXT}, 'ar',
          ${"طلب العميل حذف الحساب والبيانات نهائياً من صفحة الموقع."},
          ${"The customer requested permanent account and data deletion from the website."},
          ${"客户通过网站申请永久删除账户和数据。"},
          0, 1, ${createdAt}
        )
      `;
    }
  }

  return Response.json({ ok: true });
}
