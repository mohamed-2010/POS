export interface PaymentMethod {
  id: string;
  name: string;
  type: "cash" | "wallet" | "visa" | "bank_transfer" | "other";
  isActive: boolean;
  createdAt: string;
}
