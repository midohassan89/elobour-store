import { prisma } from "@/lib/prisma";
import { resolveProductImage } from "@/utils/productImage";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/products — storefront catalog via the shared ERP SQLite database.
 * Products with empty imageUrl or zero stock are still returned.
 */
export async function GET(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get("id")?.trim() ?? "";
    const categoryId = request.nextUrl.searchParams.get("categoryId")?.trim() ?? "";
    const brandId = request.nextUrl.searchParams.get("brandId")?.trim() ?? "";
    const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
    const sort = request.nextUrl.searchParams.get("sort")?.trim() ?? "";
    const offersOnly = request.nextUrl.searchParams.get("offers") === "1";
    const pageRaw = Number(request.nextUrl.searchParams.get("page") ?? "1");
    const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "20");
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
    const limit =
      Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.floor(limitRaw) : 20;
    const skip = (page - 1) * limit;

    const filters: Prisma.Sql[] = [Prisma.sql`isActive = 1`];
    if (productId) filters.push(Prisma.sql`id = ${productId}`);
    if (categoryId) filters.push(Prisma.sql`categoryId = ${categoryId}`);
    if (brandId) filters.push(Prisma.sql`brandId = ${brandId}`);
    if (search) {
      const like = `%${search.replace(/[%_]/g, "")}%`;
      filters.push(
        Prisma.sql`(name LIKE ${like} OR IFNULL(nameEn, '') LIKE ${like} OR IFNULL(nameZh, '') LIKE ${like})`,
      );
    }
    if (offersOnly) {
      filters.push(
        Prisma.sql`salePrice IS NOT NULL AND salePrice > 0 AND stockQuantity > 0 AND lower(COALESCE(stockStatus, '')) != 'outofstock'`,
      );
    }
    if (sort === "instock") {
      filters.push(Prisma.sql`stockQuantity > 0 AND lower(COALESCE(stockStatus, '')) != 'outofstock'`);
    }

    const priceOrder =
      sort === "price_asc"
        ? Prisma.sql`CASE WHEN salePrice IS NOT NULL AND salePrice > 0 THEN salePrice ELSE price END ASC`
        : sort === "price_desc"
          ? Prisma.sql`CASE WHEN salePrice IS NOT NULL AND salePrice > 0 THEN salePrice ELSE price END DESC`
          : Prisma.sql`createdAt DESC`;
    const whereSql = Prisma.join(filters, " AND ");
    const rankedIds = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM Product
      WHERE ${whereSql}
      ORDER BY
        CASE
          WHEN stockQuantity > 0
            AND lower(COALESCE(stockStatus, '')) != 'outofstock'
            AND imageUrl IS NOT NULL
            AND trim(imageUrl) != ''
            AND imageUrl NOT LIKE '%placeholder%'
          THEN 0
          WHEN stockQuantity > 0 AND lower(COALESCE(stockStatus, '')) != 'outofstock'
          THEN 1
          ELSE 2
        END ASC,
        ${priceOrder}
      LIMIT ${limit} OFFSET ${skip}
    `);
    const countRows = await prisma.$queryRaw<Array<{ total: number | bigint }>>(Prisma.sql`
      SELECT COUNT(*) AS total FROM Product WHERE ${whereSql}
    `);
    const total = Number(countRows[0]?.total ?? 0);
    const orderedIds = rankedIds.map((row) => row.id);
    const rows = orderedIds.length
      ? await prisma.product.findMany({
          where: { id: { in: orderedIds } },
          include: { brand: true },
        })
      : [];
    const rowById = new Map(rows.map((product) => [product.id, product]));
    const orderedRows = orderedIds.flatMap((id) => {
      const product = rowById.get(id);
      return product ? [product] : [];
    });

    const productIds = orderedRows.map((product) => product.id);
    const packageRows = productIds.length
      ? await prisma.$queryRaw<
          Array<{
            id: string;
            productId: string;
            name: string;
            nameEn: string | null;
            nameZh: string | null;
            packSize: number;
          }>
        >(Prisma.sql`
          SELECT id, productId, name, nameEn, nameZh, packSize
          FROM ProductPackage
          WHERE productId IN (${Prisma.join(productIds)})
        `)
      : [];
    const packagesByProduct = new Map<string, typeof packageRows>();

    for (const row of packageRows) {
      const current = packagesByProduct.get(row.productId) ?? [];
      current.push(row);
      packagesByProduct.set(row.productId, current);
    }

    const products = orderedRows.map((product) => ({
      id: product.id,
      name: product.name,
      nameEn: product.nameEn,
      nameZh: product.nameZh,
      price: product.price,
      salePrice:
        product.salePrice != null && product.salePrice > 0 ? product.salePrice : null,
      image: resolveProductImage(product.imageUrl) || null,
      categoryId: product.categoryId,
      stock: product.stockQuantity,
      stockStatus: product.stockStatus,
      isWeighed: product.isWeighed === true,
      packages: (packagesByProduct.get(product.id) ?? []).flatMap((pkg) => {
        const itemsCount = Math.floor(Number(pkg.packSize));
        const name = pkg.name.trim();

        if (!name || !Number.isFinite(itemsCount) || itemsCount < 1) {
          return [];
        }

        return [
          {
            id: pkg.id,
            name,
            nameEn: pkg.nameEn,
            nameZh: pkg.nameZh,
            itemsCount,
          },
        ];
      }),
      brand: product.brand
        ? {
            id: product.brand.id,
            name: product.brand.name,
            nameEn: product.brand.nameEn,
            nameZh: product.brand.nameZh,
            image: product.brand.image,
          }
        : null,
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      products,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error("[api/products]", error);
    const message = error instanceof Error ? error.message : "Could not load products";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
