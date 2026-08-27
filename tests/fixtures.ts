import { test as base, expect } from "@playwright/test";
import { PaymentClient } from "./clients/payment.client";
import {
  findPaymentById,
  countPaymentsByIdempotencyKey,
} from "./helpers/database.helper";
import {
  createPaymentData,
  createIdempotencyKey,
} from "./factories/payment.factory";

type DatabaseHelper = {
  findPaymentById: typeof findPaymentById;
  countPaymentsByIdempotencyKey: typeof countPaymentsByIdempotencyKey;
};

type TestFixtures = {
  paymentClient: PaymentClient;
  database: DatabaseHelper;
  paymentData: typeof createPaymentData;
  idempotencyKey: typeof createIdempotencyKey;
};

export const test = base.extend<TestFixtures>({
  paymentClient: async ({ request }, use) => {
    const client = new PaymentClient(request);
    await use(client);
  },

  database: async ({}, use) => {
    await use({
      findPaymentById,
      countPaymentsByIdempotencyKey,
    });
  },

  paymentData: async ({}, use) => {
    await use(createPaymentData);
  },

  idempotencyKey: async ({}, use) => {
    await use(createIdempotencyKey);
  },
});

export { expect };
