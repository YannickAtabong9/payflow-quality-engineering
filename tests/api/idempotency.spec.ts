import { test, expect } from "../fixtures";

test.describe("Payment Idempotency", () => {
  test("should return the same payment for a repeated request", async ({
    paymentClient,
    paymentData,
    idempotencyKey,
  }) => {
    const key = idempotencyKey("repeat");

    const data = paymentData({
      amount: 7500,
      customerEmail: "repeat@example.com",
    });

    const firstResponse = await paymentClient.createPayment(data, key);

    expect(firstResponse.status()).toBe(201);

    const firstPayment = await firstResponse.json();

    const secondResponse = await paymentClient.createPayment(data, key);

    expect(secondResponse.status()).toBe(200);

    const secondPayment = await secondResponse.json();

    expect(secondPayment).toEqual(firstPayment);
  });

  test("should reject reuse of an idempotency key with different data", async ({
    paymentClient,
    paymentData,
    idempotencyKey,
  }) => {
    const key = idempotencyKey("conflict");

    const firstResponse = await paymentClient.createPayment(
      paymentData({
        amount: 5000,
        customerEmail: "first@example.com",
      }),
      key
    );

    expect(firstResponse.status()).toBe(201);

    const secondResponse = await paymentClient.createPayment(
      paymentData({
        amount: 99000,
        customerEmail: "second@example.com",
      }),
      key
    );

    expect(secondResponse.status()).toBe(409);

    const body = await secondResponse.json();

    expect(body.error).toBe("IDEMPOTENCY_CONFLICT");
  });

  test("should create only one payment under concurrent identical requests", async ({
    paymentClient,
    paymentData,
    idempotencyKey,
    database,
  }) => {
    const key = idempotencyKey("concurrent");

    const data = paymentData({
      amount: 8500,
      customerEmail: "concurrent@example.com",
    });

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        paymentClient.createPayment(data, key)
      )
    );

    const payments = await Promise.all(
      responses.map(async (response) => {
        expect([200, 201]).toContain(response.status());
        return response.json();
      })
    );

    const paymentIds = new Set(
      payments.map((payment) => payment.id)
    );

    expect(paymentIds.size).toBe(1);

    const paymentCount =
      await database.countPaymentsByIdempotencyKey(key);

    expect(paymentCount).toBe(1);
  });
});
