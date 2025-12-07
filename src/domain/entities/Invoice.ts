export interface Invoice {
  id: string;
  customerId?: string;
  customerName?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentType: "cash" | "credit" | "installment";
  paymentStatus: "paid" | "partial" | "unpaid";
  paidAmount: number;
  remainingAmount: number;
  paymentMethodIds: string[];
  paymentMethodAmounts: Record<string, number>;
  userId: string;
  userName: string;
  createdAt: string;
  dueDate?: string;
  installmentPlan?: InstallmentPlan;
  shiftId?: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  unitId: string;
  unitName: string;
  conversionFactor: number;
  priceTypeId: string;
  priceTypeName: string;
  returnedQuantity?: number;
  warehouseId?: string;
  productUnitId?: string;
  selectedUnitName?: string;
}

export interface InstallmentPlan {
  numberOfInstallments: number;
  installmentAmount: number;
  interestRate: number;
  startDate: string;
  payments: InstallmentPayment[];
}

export interface InstallmentPayment {
  id: string;
  dueDate: string;
  amount: number;
  paid: boolean;
  paidDate?: string;
}
