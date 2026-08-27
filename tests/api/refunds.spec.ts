import { test, expect } from "../fixtures";

test.describe("Refunds API", () => {
  test("should refund a successful payment and persist the refunded state", async ({
    paymentClient,
    paymentData,
    idempotencyKey,
    database,
  }) => {
    const payment = await paymentClient.createPayment(
      paymentData({
        amount: 30000,
        customerEmail: "refund-success@example.com",
      }),
      idempotencyKey("refund")
    );

    expect(payment.status()).toBe(201);

    const createdPayment = await payment.json();

    const processResponse = await paymentClient.processPayment(
      createdPayment.id
    );

    expect(processResponse.status()).toBe(200);

    const completeResponse = await paymentClient.completePayment(
      createdPayment.id,
      "successful"
    );

    expect(completeResponse.status()).toBe(200);

    const refundResponse = await paymentClient.refundPayment(
      createdPayment.id
    );

    expect(refundResponse.status()).toBe(200);

    const refundedPayment = await refundResponse.json();

    expect(refundedPayment.status).toBe("refunded");

    const databasePayment = await database.findPaymentById(
      createdPayment.id
    );

    expect(databasePayment).not.toBeNull();
    expect(databasePayment?.status).toBe("refunded");
    expect(databasePayment?.amount).toBe(30000);
  });

  test("should reject refunding a pending payment", async ({
    paymentClient,
    paymentData,
    idempotencyKey,
  }) => {
    const response = await paymentClient.createPayment(
      paymentData({
        amount: 10000,
        customerEmail: "refund-pending@example.com",
      }),
      idempotencyKey("refund-pending")
    );

    const payment = await response.json();

    const refundResponse = await paymentClient.refundPayment(payment.id);

    expect(refundResponse.status()).toBe(409);

    const body = await refundResponse.json();

    expect(body.error).toBe("INVALID_PAYMENT_STATE");
    expect(body.currentStatus).toBe("pending");
  });

  test("should reject refunding a failed payment", async ({
    paymentClient,
    paymentData,
    idempotencyKey,
  }) => {
    const response = await paymentClient.createPayment(
      paymentData({
        amount: 15000,
        customerEmail: "refund-failed@example.com",
      }),
      idempotencyKey("refund-failed")
    );

    const payment = await response.json();

    await paymentClient.processPayment(payment.id);
    await paymentClient.completePayment(payment.id, "failed");

    const refundResponse = await paymentClient.refundPayment(payment.id);

    expect(refundResponse.status()).toBe(409);

    const body = await refundResponse.json();

    expect(body.error).toBe("INVALID_PAYMENT_STATE");
    expect(body.currentStatus).toBe("failed");
  });

  test("should reject refunding an already refunded payment", async ({
    paymentClient,
    paymentData,
    idempotencyKey,
  }) => {
    const response = await paymentClient.createPayment(
      paymentData({
        amount: 20000,
        customerEmail: "refund-again@example.com",
      }),
      idempotencyKey("refund-again")
    );

    const payment = await response.json();

    await paymentClient.processPayment(payment.id);
    await paymentClient.completePayment(payment.id, "successful");

    const firstRefund = await paymentClient.refundPayment(payment.id);

    expect(firstRefund.status()).toBe(200);

    const secondRefund = await paymentClient.refundPayment(payment.id);

    expect(secondRefund.status()).toBe(409);

    const body = await secondRefund.json();

    expect(body.error).toBe("INVALID_PAYMENT_STATE");
    expect(body.currentStatus).toBe("refunded");
  });

  test("should return 404 when refunding a non-existent payment", async ({
    paymentClient,
  }) => {
    const response = await paymentClient.refundPayment(
      "00000000-0000-0000-0000-000000000000"
    );

    expect(response.status()).toBe(404);

    const body = await response.json();

    expect(body.error).toBe("PAYMENT_NOT_FOUND");
  });
});
