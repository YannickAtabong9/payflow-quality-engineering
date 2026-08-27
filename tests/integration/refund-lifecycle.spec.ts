import { test, expect } from "../fixtures";

test.describe("Refund Lifecycle Integration", () => {
  test("should keep API and database state consistent after a refund", async ({
    paymentClient,
    paymentData,
    idempotencyKey,
    database,
  }) => {
    const data = paymentData({
      amount: 60000,
      customerEmail: "refund-integration@example.com",
    });

    const key = idempotencyKey("refund-lifecycle");

    const createResponse = await paymentClient.createPayment(data, key);

    expect(createResponse.status()).toBe(201);

    const payment = await createResponse.json();

    await paymentClient.processPayment(payment.id);
    await paymentClient.completePayment(payment.id, "successful");

    const beforeRefund = await database.findPaymentById(payment.id);

    expect(beforeRefund?.status).toBe("successful");
    expect(beforeRefund?.amount).toBe(60000);

    const refundResponse = await paymentClient.refundPayment(payment.id);

    expect(refundResponse.status()).toBe(200);

    const refundedPayment = await refundResponse.json();

    expect(refundedPayment.status).toBe("refunded");

    const afterRefund = await database.findPaymentById(payment.id);

    expect(afterRefund).not.toBeNull();
    expect(afterRefund?.status).toBe("refunded");
    expect(afterRefund?.amount).toBe(60000);
    expect(afterRefund?.reference).toBe(payment.reference);

    const getResponse = await paymentClient.getPayment(payment.id);

    expect(getResponse.status()).toBe(200);

    const finalPayment = await getResponse.json();

    expect(finalPayment.status).toBe("refunded");
    expect(finalPayment.amount).toBe(afterRefund?.amount);
    expect(finalPayment.reference).toBe(afterRefund?.reference);
  });
});
