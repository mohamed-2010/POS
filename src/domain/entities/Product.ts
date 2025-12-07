export interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  prices: Record<string, number>;
  costPrice: number;
  unitId: string;
  defaultPriceTypeId?: string;
  category?: string;
  stock: number;
  barcode?: string;
  minStock?: number;
  expiryDate?: string;
  imageUrl?: string;
  hasMultipleUnits?: boolean;
}
