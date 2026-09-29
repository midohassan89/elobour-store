import { prisma } from "@/lib/prisma";
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

    const products = rows.map((product) => ({
      id: product.id,
      name: product.name,
      nameEn: product.nameEn,
      nameZh: product.nameZh,
      price: product.price,
      // Null / empty imageUrl is allowed — ProductCard shows a placeholder.
      image: product.imageUrl || null,
      categoryId: product.categoryId,
      stock: product.stockQuantity,
      stockStatus: product.stockStatus,
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
