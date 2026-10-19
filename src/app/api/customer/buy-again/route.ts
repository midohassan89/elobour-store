import { currentCustomer } from "@/lib/erpAccount";
import { prisma } from "@/lib/prisma";
import { resolveProductImage } from "@/utils/productImage";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ products: [] });

  const rows = await prisma.$queryRaw<Array<{ productId: string }>>`
    SELECT OrderItem.productId AS productId
    FROM OrderItem
    INNER JOIN "Order" ON "Order".id = OrderItem.orderId
    WHERE "Order".customerId = ${customer.id}
    GROUP BY OrderItem.productId
    ORDER BY MAX("Order".createdAt) DESC
    LIMIT 12
  `;
  const ids = rows.map((row) => row.productId);
  if (!ids.length) return NextResponse.json({ products: [] });

  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
    select: {
      id: true,
      name: true,
      nameEn: true,
      nameZh: true,
      price: true,
      salePrice: true,
      imageUrl: true,
      stockQuantity: true,
      stockStatus: true,
      isWeighed: true,
    },
  });
  const byId = new Map(products.map((product) => [product.id, product]));

  return NextResponse.json({
    products: ids.flatMap((id) => {
      const product = byId.get(id);
      if (!product) return [];
      const inStock = product.stockQuantity > 0 && product.stockStatus.toLowerCase() !== "outofstock";
      if (!inStock) return [];
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
