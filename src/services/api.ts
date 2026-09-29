import type { Brand, Product } from "@/types";
import { optionalLocalizedName } from "@/utils/localizedName";

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export type ProductsMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
};

export type ProductsResponse = {
  products: Product[];
  meta: ProductsMeta;
};

function toProducts(data: unknown): Product[] | null {
  if (!Array.isArray(data)) {
    return null;
  }

  const products: Product[] = [];

  for (const item of data) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const record = item as Record<string, unknown>;
    const price = toNumber(record.price);
    const id = record.id;
    const name = record.name;

    if (
      (typeof id !== "string" && typeof id !== "number") ||
      typeof name !== "string" ||
      price === null
    ) {
      return null;
    }

    const stock = toNumber(record.stock);

    products.push({
      id: String(id),
      name,
      nameEn: optionalLocalizedName(record.nameEn),
      nameZh: optionalLocalizedName(record.nameZh),
      price,
      image: typeof record.image === "string" ? record.image : undefined,
      stock: stock === null ? undefined : stock,
      brand: toBrand(record.brand),
    });
  }

  return products;
}

function toBrand(value: unknown): Brand | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if ((typeof record.id !== "string" && typeof record.id !== "number") || typeof record.name !== "string") {
    return null;
  }

  return {
    id: String(record.id),
    name: record.name,
    nameEn: optionalLocalizedName(record.nameEn),
    nameZh: optionalLocalizedName(record.nameZh),
    image: typeof record.image === "string" ? record.image : undefined,
  };
}

function toMeta(data: unknown, page: number): ProductsMeta | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;
  const hasMore = record.hasMore;

  if (typeof hasMore !== "boolean") {
    return null;
  }

  return {
    total: toNumber(record.total) ?? 0,
    page: toNumber(record.page) ?? page,
    limit: toNumber(record.limit) ?? 0,
    totalPages: toNumber(record.totalPages) ?? 0,
    hasMore,
  };
}

export async function getProducts({
  categoryId,
  brandId,
  search,
  page = 1,
}: {
  categoryId?: string;
  brandId?: string;
  search?: string;
  page?: number;
} = {}): Promise<ProductsResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }

  const params = new URLSearchParams({ page: String(page) });

  if (categoryId) {
    params.set("categoryId", categoryId);
  }

  if (brandId) {
    params.set("brandId", brandId);
  }

  if (search) {
    params.set("search", search);
  }

  const response = await fetch(`${baseUrl}/store/products?${params.toString()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Products request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { products?: unknown; meta?: unknown };
  const products = toProducts(payload.products);
  const meta = toMeta(payload.meta, page);

  if (!products || !meta) {
    throw new Error("Products response did not match the expected shape");
  }

  return {
    products: [...products].sort((left, right) => {
      const leftOut = (left.stock ?? 0) <= 0 ? 1 : 0;
      const rightOut = (right.stock ?? 0) <= 0 ? 1 : 0;
      return leftOut - rightOut;
    }),
    meta,
  };
}
