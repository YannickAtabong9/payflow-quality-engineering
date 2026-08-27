import { test, expect } from "../fixtures";

test.describe("Payments API", () => {
  test("should create a pending payment", async ({ paymentClient }) => {
    const response = await paymentClient.createPayment(
      {
        amount: 5000,
        currency: "NGN",
        customerEmail: "qa@example.com",
      },
      `create-payment-${Date.now()}`
    );

    expect(response.status()).toBe(201);

    const payment = await response.json();

    expect(payment.amount).toBe(5000);
    expect(payment.currency).toBe("NGN");
    expect(payment.customerEmail).toBe("qa@example.com");
    expect(payment.status).toBe("pending");
    expect(payment.id).toBeTruthy();
    expect(payment.reference).toBeTruthy();
  });

  test("should retrieve a created payment", async ({ paymentClient }) => {
    const createResponse = await paymentClient.createPayment(
      {
        amount: 10000,
        currency: "NGN",
        customerEmail: "retrieve@example.com",
      },
      `retrieve-payment-${Date.now()}`
    );

    expect(createResponse.status()).toBe(201);

    const createdPayment = await createResponse.json();

    const getResponse = await paymentClient.getPayment(createdPayment.id);

    expect(getResponse.status()).toBe(200);

    const retrievedPayment = await getResponse.json();

    expect(retrievedPayment).toEqual(createdPayment);
  });

  test("should process a pending payment", async ({ paymentClient }) => {
    const createResponse = await paymentClient.createPayment(
      {
        amount: 15000,
        currency: "NGN",
        customerEmail: "process@example.com",
      },
      `process-payment-${Date.now()}`
    );

    const payment = await createResponse.json();

    const processResponse = await paymentClient.processPayment(payment.id);

    expect(processResponse.status()).toBe(200);

    const processedPayment = await processResponse.json();

    expect(processedPayment.status).toBe("processing");
  });

  test("should complete a payment successfully", async ({ paymentClient }) => {
    const createResponse = await paymentClient.createPayment(
      {
        amount: 20000,
        currency: "NGN",
        customerEmail: "success@example.com",
      },
      `success-payment-${Date.now()}`
    );

    const payment = await createResponse.json();

    await paymentClient.processPayment(payment.id);

    const completeResponse = await paymentClient.completePayment(
      payment.id,
      "successful"
    );

    expect(completeResponse.status()).toBe(200);

    const completedPayment = await completeResponse.json();

    expect(completedPayment.status).toBe("successful");
  });

  test("should reject a negative payment amount", async ({ paymentClient }) => {
    const response = await paymentClient.createPayment(
      {
        amount: -5000,
        currency: "NGN",
        customerEmail: "negative@example.com",
      },
      `negative-amount-${Date.now()}`
    );

    expect(response.status()).toBe(400);

    const body = await response.json();

    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("should reject an unsupported currency", async ({ paymentClient }) => {
    const response = await paymentClient.createPayment(
      {
        amount: 5000,
        currency: "ABC",
        customerEmail: "currency@example.com",
      },
      `invalid-currency-${Date.now()}`
    );

    expect(response.status()).toBe(400);

    const body = await response.json();

    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("should reject an invalid customer email", async ({ paymentClient }) => {
    const response = await paymentClient.createPayment(
      {
        amount: 5000,
        currency: "NGN",
        customerEmail: "not-an-email",
      },
      `invalid-email-${Date.now()}`
    );

    expect(response.status()).toBe(400);

    const body = await response.json();

    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("should reject a payment request without an idempotency key", async ({
    paymentClient,
  }) => {
    const response = await paymentClient.createPayment({
      amount: 5000,
      currency: "NGN",
      customerEmail: "missing-key@example.com",
    });

    expect(response.status()).toBe(400);

    const body = await response.json();

    expect(body.error).toBe("MISSING_IDEMPOTENCY_KEY");
  });

  test("should return 404 for a non-existent payment", async ({
    paymentClient,
  }) => {
    const response = await paymentClient.getPayment(
      "00000000-0000-0000-0000-000000000000"
    );

    expect(response.status()).toBe(404);

    const body = await response.json();

    expect(body.error).toBe("PAYMENT_NOT_FOUND");
  });

  test("should reject processing an already successful payment", async ({
    paymentClient,
  }) => {
    const createResponse = await paymentClient.createPayment(
      {
        amount: 5000,
        currency: "NGN",
        customerEmail: "state@example.com",
      },
      `invalid-state-${Date.now()}`
    );

    const payment = await createResponse.json();

    await paymentClient.processPayment(payment.id);
    await paymentClient.completePayment(payment.id, "successful");

    const response = await paymentClient.processPayment(payment.id);

    expect(response.status()).toBe(409);

    const body = await response.json();

    expect(body.error).toBe("INVALID_PAYMENT_STATE");
    expect(body.currentStatus).toBe("successful");
  });

  test("should reject reusing an idempotency key with different payment data", async ({
    paymentClient,
  }) => {
    const idempotencyKey = `conflict-${Date.now()}`;

    const firstResponse = await paymentClient.createPayment(
      {
        amount: 5000,
        currency: "NGN",
        customerEmail: "first@example.com",
      },
      idempotencyKey
    );

    expect(firstResponse.status()).toBe(201);

    const secondResponse = await paymentClient.createPayment(
      {
        amount: 99000,
        currency: "NGN",
        customerEmail: "second@example.com",
      },
      idempotencyKey
    );

    expect(secondResponse.status()).toBe(409);

    const body = await secondResponse.json();

    expect(body.error).toBe("IDEMPOTENCY_CONFLICT");
  });
});

test("should persist the created payment correctly in PostgreSQL", async ({
  paymentClient,
  database,
}) => {
  const paymentData = {
    amount: 25000,
    currency: "NGN",
    customerEmail: "database@example.com",
  };

  const response = await paymentClient.createPayment(
    paymentData,
    `database-validation-${Date.now()}`
  );

  expect(response.status()).toBe(201);

  const payment = await response.json();

  const databasePayment = await database.findPaymentById(payment.id);

  expect(databasePayment).not.toBeNull();

  expect(databasePayment).toMatchObject({
    id: payment.id,
    reference: payment.reference,
    amount: 25000,
    currency: "NGN",
    customerEmail: "database@example.com",
    status: "pending",
  });
});

test("should create a payment using generated test data", async ({
  paymentClient,
  paymentData,
  idempotencyKey,
}) => {
  const data = paymentData({
    amount: 30000,
    customerEmail: "factory@example.com",
  });

  const response = await paymentClient.createPayment(
    data,
    idempotencyKey("factory")
  );

  expect(response.status()).toBe(201);

  const payment = await response.json();

  expect(payment.amount).toBe(data.amount);
  expect(payment.currency).toBe(data.currency);
  expect(payment.customerEmail).toBe(data.customerEmail);
  expect(payment.status).toBe("pending");
});
