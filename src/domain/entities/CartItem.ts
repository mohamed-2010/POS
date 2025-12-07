export interface CartItem {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  stock: number;
  quantity: number;
  customPrice?: number;
  priceTypeId?: string;
  priceTypeName?: string;
  unitId?: string;
  unitName?: string;
  prices?: Record<string, number>;
  // Multi-unit support
  productUnitId?: string; // ID of the ProductUnit record
  conversionFactor?: number; // How many base units = 1 of this unit
  selectedUnitName?: string; // Display name of selected unit
}
