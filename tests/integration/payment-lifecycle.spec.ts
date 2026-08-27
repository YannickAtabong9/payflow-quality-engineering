import { test, expect } from "../fixtures";

test.describe("Payment Lifecycle Integration", () => {
  test("should keep API and database state consistent through the payment lifecycle", async ({
    paymentClient,
    paymentData,
    idempotencyKey,
    database,
  }) => {
    const data = paymentData({
      amount: 45000,
      customerEmail: "integration@example.com",
    });

    const key = idempotencyKey("lifecycle");

    // 1. Create payment through the API
    const createResponse = await paymentClient.createPayment(data, key);

    expect(createResponse.status()).toBe(201);

    const createdPayment = await createResponse.json();

    // 2. Verify initial database state
    const createdRecord = await database.findPaymentById(
      createdPayment.id
    );

    expect(createdRecord).not.toBeNull();
    expect(createdRecord?.status).toBe("pending");
    expect(createdRecord?.amount).toBe(45000);

    // 3. Move payment to processing
    const processResponse = await paymentClient.processPayment(
      createdPayment.id
    );

    expect(processResponse.status()).toBe(200);

    // 4. Verify database state changed
    const processingRecord = await database.findPaymentById(
      createdPayment.id
    );

    expect(processingRecord?.status).toBe("processing");

    // 5. Complete the payment
    const completeResponse = await paymentClient.completePayment(
      createdPayment.id,
      "successful"
    );

    expect(completeResponse.status()).toBe(200);

    // 6. Verify final database state
    const successfulRecord = await database.findPaymentById(
      createdPayment.id
    );

    expect(successfulRecord?.status).toBe("successful");

    // 7. Verify the API reflects the same final state
    const getResponse = await paymentClient.getPayment(
      createdPayment.id
    );

    expect(getResponse.status()).toBe(200);

    const retrievedPayment = await getResponse.json();

    expect(retrievedPayment.id).toBe(successfulRecord?.id);
    expect(retrievedPayment.amount).toBe(successfulRecord?.amount);
    expect(retrievedPayment.status).toBe(successfulRecord?.status);
    expect(retrievedPayment.reference).toBe(
      successfulRecord?.reference
    );
  });
});
