import { CreatePaymentRequest } from "../clients/payment.client";

export function createPaymentData(
  overrides: Partial<CreatePaymentRequest> = {}
): CreatePaymentRequest {
  return {
    amount: 5000,
    currency: "NGN",
    customerEmail: `qa-${Date.now()}@example.com`,
    ...overrides,
  };
}

export function createIdempotencyKey(prefix = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)}`;
}
