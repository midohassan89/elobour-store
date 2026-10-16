export interface Brand {
  id: string;
  name: string;
  nameEn?: string;
  nameZh?: string;
  image?: string;
}

export interface ProductPackage {
  id: string;
  name: string;
  nameEn?: string;
  nameZh?: string;
  itemsCount: number;
}

export interface Product {
  id: string;
  name: string;
  nameEn?: string;
  nameZh?: string;
  price: number;
  salePrice?: number | null;
  image?: string;
  stock?: number;
  isWeighed?: boolean;
  /** Base selling unit from the catalog, when the product has one. */
  unit?: string;
  unitEn?: string;
  unitZh?: string;
  packages?: ProductPackage[];
  brand?: Brand | null;
}

export interface Category {
  id: string;
  name: string;
  nameEn?: string;
  nameZh?: string;
}
