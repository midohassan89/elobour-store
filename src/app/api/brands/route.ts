import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const categoryId = request.nextUrl.searchParams.get("categoryId")?.trim() ?? "";

    const brands = await prisma.brand.findMany({
      where: {
        products: {
          some: {
            isDeleted: false,
            ...(categoryId ? { categoryId } : {}),
          },
        },
      },
      select: {
        id: true,
        name: true,
        nameEn: true,
        nameZh: true,
        image: true,
        _count: {
          select: {
            products: {
              where: {
                isDeleted: false,
                ...(categoryId ? { categoryId } : {}),
              },
            },
          },
        },
      },
      orderBy: { products: { _count: "desc" } },
    });

    return NextResponse.json(
      brands.map(({ _count, ...brand }) => ({
        ...brand,
        productCount: _count.products,
      })),
    );
  } catch (error) {
    console.error("[api/brands]", error);
    return NextResponse.json({ error: "Could not load brands" }, { status: 500 });
  }
}
