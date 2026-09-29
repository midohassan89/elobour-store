import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        products: { some: { isDeleted: false } },
      },
      select: {
        id: true,
        name: true,
        nameEn: true,
        nameZh: true,
        slug: true,
        _count: { select: { products: true } },
      },
      orderBy: { products: { _count: "desc" } },
    });

    return NextResponse.json(
      categories.map(({ _count, ...category }) => ({
        ...category,
        productCount: _count.products,
      })),
    );
  } catch (error) {
    console.error("[api/categories]", error);
    return NextResponse.json({ error: "Could not load categories" }, { status: 500 });
  }
}
