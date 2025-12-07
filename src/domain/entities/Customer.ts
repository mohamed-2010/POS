export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  nationalId?: string;
  creditLimit: number;
  currentBalance: number;
  loyaltyPoints: number;
  createdAt: string;
  notes?: string;
}
