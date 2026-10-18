import { randomUUID } from "crypto";
import { customerJson, customerOptions, resolveRequestCustomer } from "@/lib/customerRequest";
import { langFrom, translateTrio, type LangCode } from "@/lib/translateText";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ChatRow = {
  id: string;
  senderRole: string;
  originalText: string;
  originalLang: string;
  textAr: string;
  textEn: string;
  textZh: string;
  createdAt: string | Date;
};

function visibleText(row: Pick<ChatRow, "textAr" | "textEn" | "textZh">, lang: LangCode) {
  if (lang === "en") return row.textEn || row.textAr;
  if (lang === "zh") return row.textZh || row.textAr;
  return row.textAr;
}

export async function GET(request: Request) {
  const customer = await resolveRequestCustomer(request);
  if (!customer) return customerJson({ error: "Unauthorized" }, 401);

  const lang = langFrom(new URL(request.url).searchParams.get("lang") ?? request.headers.get("x-lang"));
  await prisma.$executeRaw`
    UPDATE ChatMessage
    SET isReadByCustomer = 1
    WHERE customerId = ${customer.id} AND senderRole = 'ADMIN' AND isReadByCustomer = 0
  `;
  const rows = await prisma.$queryRaw<ChatRow[]>`
    SELECT id, senderRole, originalText, originalLang, textAr, textEn, textZh, createdAt
    FROM ChatMessage
    WHERE customerId = ${customer.id}
    ORDER BY createdAt ASC
    LIMIT 200
  `;

  return customerJson({
    ok: true,
    messages: rows.map((row) => ({
      id: row.id,
      senderRole: row.senderRole,
      text: visibleText(row, lang),
      textAr: row.textAr,
      textEn: row.textEn,
      textZh: row.textZh,
      originalText: row.originalText,
      originalLang: row.originalLang,
      createdAt: new Date(row.createdAt).toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  let body: { text?: unknown; lang?: unknown; customerId?: unknown; phone?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return customerJson({ error: "Invalid request body" }, 400);
  }

  const text = String(body.text ?? "").trim();
  if (!text) return customerJson({ error: "text is required" }, 400);

  const customer = await resolveRequestCustomer(request, body);
  if (!customer) return customerJson({ error: "Unauthorized" }, 401);

  const lang = langFrom(body.lang ?? request.headers.get("x-lang"));
  const translated = await translateTrio(text, lang);
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  await prisma.$executeRaw`
    INSERT INTO ChatMessage (
      id, customerId, senderRole, originalText, originalLang,
      textAr, textEn, textZh, isReadByAdmin, isReadByCustomer, createdAt
    ) VALUES (
      ${id}, ${customer.id}, 'CUSTOMER', ${text}, ${lang},
      ${translated.textAr}, ${translated.textEn}, ${translated.textZh},
      0, 1, ${createdAt}
    )
  `;

  return customerJson(
    {
      ok: true,
      message: {
        id,
        senderRole: "CUSTOMER",
        text: visibleText(translated, lang),
        ...translated,
        createdAt,
      },
    },
    201,
  );
}

export function OPTIONS() {
  return customerOptions();
}
