import { customerJson, customerOptions, resolveRequestCustomer } from "@/lib/customerRequest";
import { prisma } from "@/lib/prisma";
import { resolveProductImage } from "@/utils/productImage";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const customer = await resolveRequestCustomer(request);
  if (!customer) return customerJson({ error: "Unauthorized" }, 401);

  const items = await prisma.$queryRaw<Array<{ productId: string }>>`
    SELECT productId FROM WishlistItem
    WHERE customerId = ${customer.id}
    ORDER BY createdAt DESC
  `;
  const ids = items.map((item) => item.productId);
  const products = ids.length
    ? await prisma.product.findMany({
        where: { id: { in: ids }, isDeleted: false },
        select: {
          id: true,
          name: true,
          nameEn: true,
          nameZh: true,
          price: true,
          salePrice: true,
          imageUrl: true,
          stockQuantity: true,
          isWeighed: true,
        },
      })
    : [];
  const byId = new Map(products.map((product) => [product.id, product]));

  return customerJson({
    ok: true,
    wishlistIds: ids,
    products: ids.flatMap((id) => {
      const product = byId.get(id);
      if (!product) return [];
      return [
        {
          id: product.id,
          name: product.name,
          nameEn: product.nameEn,
          nameZh: product.nameZh,
          price: product.price,
          salePrice: product.salePrice != null && product.salePrice > 0 ? product.salePrice : null,
          image: resolveProductImage(product.imageUrl) || null,
          stock: product.stockQuantity,
          isWeighed: product.isWeighed === true,
          packages: [],
        },
      ];
    }),
  });
}

export async function POST(request: Request) {
  let body: { productId?: unknown; customerId?: unknown; phone?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return customerJson({ error: "Invalid request body" }, 400);
  }

  const customer = await resolveRequestCustomer(request, body);
  if (!customer) return customerJson({ error: "Unauthorized" }, 401);

  const productId = String(body.productId ?? "").trim();
  if (!productId) return customerJson({ error: "productId is required" }, 400);

  const product = await prisma.product.findFirst({
    where: { id: productId, isDeleted: false },
    select: { id: true },
  });
  if (!product) return customerJson({ error: "Product not found" }, 404);

  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM WishlistItem
    WHERE customerId = ${customer.id} AND productId = ${productId}
    LIMIT 1
  `;

  if (existing[0]) {
    await prisma.$executeRaw`DELETE FROM WishlistItem WHERE id = ${existing[0].id}`;
    return customerJson({ ok: true, wished: false, productId });
  }

  await prisma.$executeRaw`
    INSERT INTO WishlistItem (id, customerId, productId, createdAt)
    VALUES (${randomUUID()}, ${customer.id}, ${productId}, ${new Date().toISOString()})
  `;
  return customerJson({ ok: true, wished: true, productId });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  let productId = url.searchParams.get("productId")?.trim() ?? "";
  let body: { productId?: unknown; customerId?: unknown; phone?: unknown } = {};
  if (!productId) {
    try {
      body = (await request.json()) as typeof body;
      productId = String(body.productId ?? "").trim();
    } catch {
      body = {};
    }
  }

  const customer = await resolveRequestCustomer(request, body);
  if (!customer) return customerJson({ error: "Unauthorized" }, 401);
  if (!productId) return customerJson({ error: "productId is required" }, 400);

  await prisma.$executeRaw`
    DELETE FROM WishlistItem
    WHERE customerId = ${customer.id} AND productId = ${productId}
  `;
  return customerJson({ ok: true, wished: false, productId });
}

export function OPTIONS() {
  return customerOptions();
}
