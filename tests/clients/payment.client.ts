import { APIRequestContext, APIResponse } from "@playwright/test";

export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  customerEmail: string;
}

export interface PaymentResponse {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  customerEmail: string;
  status: string;
  createdAt: string;
}

export class PaymentClient {
  constructor(private readonly request: APIRequestContext) {}

  async createPayment(
    data: CreatePaymentRequest,
    idempotencyKey?: string
  ): Promise<APIResponse> {
    const headers: Record<string, string> = {};

    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    return this.request.post("/payments", {
      data,
      headers,
    });
  }

  async getPayment(id: string): Promise<APIResponse> {
    return this.request.get(`/payments/${id}`);
  }

  async processPayment(id: string): Promise<APIResponse> {
    return this.request.post(`/payments/${id}/process`, {
      data: {},
    });
  }

  async completePayment(
    id: string,
    outcome: "successful" | "failed"
  ): Promise<APIResponse> {
    return this.request.post(`/payments/${id}/complete`, {
      data: {
        outcome,
      },
    });
  }
}
