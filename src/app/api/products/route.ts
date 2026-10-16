import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/products — storefront catalog via the shared ERP SQLite database.
 * Products with empty imageUrl or zero stock are still returned.
 */
export async function GET(request: NextRequest) {
  try {
    const categoryId = request.nextUrl.searchParams.get("categoryId")?.trim() ?? "";
    const brandId = request.nextUrl.searchParams.get("brandId")?.trim() ?? "";
    const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
    const pageRaw = Number(request.nextUrl.searchParams.get("page") ?? "1");
    const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "20");
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
    const limit =
      Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.floor(limitRaw) : 20;
    const skip = (page - 1) * limit;

    const where = {
      isActive: true,
      // Temporarily include soft-deleted rows so the catalog is never empty during sync.
      ...(categoryId ? { categoryId } : {}),
      ...(brandId ? { brandId } : {}),
      ...(search ? { name: { contains: search } } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { brand: true },
        orderBy: [{ stockStatus: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const productIds = rows.map((product) => product.id);
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

    const products = rows.map((product) => ({
      id: product.id,
      name: product.name,
      nameEn: product.nameEn,
      nameZh: product.nameZh,
      price: product.price,
      salePrice:
        product.salePrice != null && product.salePrice > 0 ? product.salePrice : null,
      // Null / empty imageUrl is allowed — ProductCard shows a placeholder.
      image: product.imageUrl || null,
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
