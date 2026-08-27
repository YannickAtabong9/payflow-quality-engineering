export type PaymentStatus =
  | "pending"
  | "processing"
  | "successful"
  | "failed"
  | "refunded";

export interface Payment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  customerEmail: string;
  status: PaymentStatus;
  createdAt: string;
}
