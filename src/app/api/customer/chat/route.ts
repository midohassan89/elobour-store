import { randomUUID } from "crypto";
import { isChatAttachmentPath } from "@/lib/chatAttachment";
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
  attachmentUrl: string | null;
  attachmentType: string | null;
  createdAt: string | Date;
};

function attachmentFields(url: string | null, type: string | null) {
  const attachmentUrl = url?.trim() || null;
  const attachmentType = type === "IMAGE" || type === "FILE" ? type : null;
  return {
    attachmentUrl,
    attachmentType: attachmentUrl ? attachmentType ?? "FILE" : null,
  };
}

function erpConfig() {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  const apiKey = process.env.STORE_API_KEY ?? "";
  if (!base || !apiKey) return null;
  return { base, apiKey };
}

function erpHeaders(phone: string, lang: string, apiKey: string) {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "x-customer-phone": phone,
    "x-phone": phone,
    "x-lang": lang,
  };
}

async function erpChatMessages(phone: string, lang: string) {
  const config = erpConfig();
  if (!config || !phone) return null;
  const response = await fetch(`${config.base}/api/customer/chat?lang=${encodeURIComponent(lang)}`, {
    headers: erpHeaders(phone, lang, config.apiKey),
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return null;
  const data = (await response.json()) as { messages?: ChatRow[] };
  return Array.isArray(data.messages) ? data.messages : [];
}

async function erpSendChat(input: {
  phone: string;
  name: string | null;
  text: string;
  lang: string;
  attachmentUrl: string | null;
  attachmentType: string | null;
}) {
  const config = erpConfig();
  if (!config || !input.phone) return null;
  const response = await fetch(`${config.base}/api/customer/chat`, {
    method: "POST",
    headers: erpHeaders(input.phone, input.lang, config.apiKey),
    body: JSON.stringify({
      text: input.text,
      lang: input.lang,
      phone: input.phone,
      name: input.name,
      attachmentUrl: input.attachmentUrl ?? "",
      attachmentType: input.attachmentType,
    }),
  }).catch(() => null);
  if (!response?.ok) return null;
  const data = (await response.json()) as { message?: ChatRow };
  return data.message ?? null;
}

function visibleText(row: Pick<ChatRow, "textAr" | "textEn" | "textZh">, lang: LangCode) {
  if (lang === "en") return row.textEn || row.textAr;
  if (lang === "zh") return row.textZh || row.textAr;
  return row.textAr;
}

export async function GET(request: Request) {
  const customer = await resolveRequestCustomer(request);
  if (!customer) return customerJson({ error: "Unauthorized" }, 401);

  const lang = langFrom(new URL(request.url).searchParams.get("lang") ?? request.headers.get("x-lang"));
  const remote = await erpChatMessages(customer.phone, lang);
  if (remote) {
    return customerJson({
      ok: true,
      messages: remote.map((row) => ({
        id: row.id,
        senderRole: row.senderRole,
        text: visibleText(row, lang),
        textAr: row.textAr,
        textEn: row.textEn,
        textZh: row.textZh,
        originalText: row.originalText,
        originalLang: row.originalLang,
        attachmentUrl: row.attachmentUrl,
        attachmentType: row.attachmentType,
        createdAt: new Date(row.createdAt).toISOString(),
      })),
    });
  }
  await prisma.$executeRaw`
    UPDATE ChatMessage
    SET isReadByCustomer = 1
    WHERE customerId = ${customer.id} AND senderRole = 'ADMIN' AND isReadByCustomer = 0
  `;
  const rows = await prisma.$queryRaw<ChatRow[]>`
    SELECT id, senderRole, originalText, originalLang, textAr, textEn, textZh,
           attachmentUrl, attachmentType, createdAt
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
      attachmentUrl: row.attachmentUrl,
      attachmentType: row.attachmentType,
      createdAt: new Date(row.createdAt).toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  let body: {
    text?: unknown;
    lang?: unknown;
    customerId?: unknown;
    phone?: unknown;
    attachmentUrl?: unknown;
    attachmentType?: unknown;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return customerJson({ error: "Invalid request body" }, 400);
  }

  const text = String(body.text ?? "").trim();
  const attachment = attachmentFields(
    typeof body.attachmentUrl === "string" ? body.attachmentUrl : "",
    typeof body.attachmentType === "string" ? body.attachmentType : "",
  );
  if (!text && !attachment.attachmentUrl) {
    return customerJson({ error: "text is required" }, 400);
  }
  if (attachment.attachmentUrl && !isChatAttachmentPath(attachment.attachmentUrl)) {
    return customerJson({ error: "Invalid attachment" }, 400);
  }

  const customer = await resolveRequestCustomer(request, body);
  if (!customer) return customerJson({ error: "Unauthorized" }, 401);

  const lang = langFrom(body.lang ?? request.headers.get("x-lang"));
  const remote = await erpSendChat({
    phone: customer.phone,
    name: customer.name,
    text,
    lang,
    attachmentUrl: attachment.attachmentUrl,
    attachmentType: attachment.attachmentType,
  });
  if (remote) {
    return customerJson(
      {
        ok: true,
        message: {
          id: remote.id,
          senderRole: remote.senderRole || "CUSTOMER",
          text: visibleText(remote, lang),
          textAr: remote.textAr,
          textEn: remote.textEn,
          textZh: remote.textZh,
          originalText: text,
          originalLang: lang,
          attachmentUrl: remote.attachmentUrl ?? attachment.attachmentUrl,
          attachmentType: remote.attachmentType ?? attachment.attachmentType,
          createdAt: remote.createdAt ? new Date(remote.createdAt).toISOString() : new Date().toISOString(),
        },
      },
      201,
    );
  }
  const translated = text
    ? await translateTrio(text, lang)
    : { textAr: "", textEn: "", textZh: "", originalText: "", originalLang: lang };
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  await prisma.$executeRaw`
    INSERT INTO ChatMessage (
      id, customerId, senderRole, originalText, originalLang,
      textAr, textEn, textZh, attachmentUrl, attachmentType,
      isReadByAdmin, isReadByCustomer, createdAt
    ) VALUES (
      ${id}, ${customer.id}, 'CUSTOMER', ${text}, ${lang},
      ${translated.textAr}, ${translated.textEn}, ${translated.textZh},
      ${attachment.attachmentUrl}, ${attachment.attachmentType},
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
        textAr: translated.textAr,
        textEn: translated.textEn,
        textZh: translated.textZh,
        originalText: text,
        originalLang: lang,
        attachmentUrl: attachment.attachmentUrl,
        attachmentType: attachment.attachmentType,
        createdAt,
      },
    },
    201,
  );
}

export function OPTIONS() {
  return customerOptions();
}
