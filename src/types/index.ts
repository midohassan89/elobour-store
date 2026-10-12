export interface Brand {
  id: string;
  name: string;
  nameEn?: string;
  nameZh?: string;
  image?: string;
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
  brand?: Brand | null;
}

export interface Category {
  id: string;
  name: string;
  nameEn?: string;
  nameZh?: string;
}
