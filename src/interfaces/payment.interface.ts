export interface IPaymentMethod {
  id: string;
  type: string;
  details: Record<string, any>;
  isDefault: boolean;
  createdAt: Date;
}

export interface IInvoice {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  dueDate: Date;
  paidAt?: Date;
  items: Array<{
    description: string;
    amount: number;
  }>;
} 