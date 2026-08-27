import { test, expect } from "../fixtures";

test.describe("Payment Input Security", () => {
  test("should reject SQL injection in customer email", async ({
    paymentClient,
    idempotencyKey,
  }) => {
    const response = await paymentClient.createPayment(
      {
        amount: 5000,
        currency: "NGN",
        customerEmail: "' OR 1=1 --",
      },
      idempotencyKey("sql-injection-email")
    );

    expect(response.status()).toBe(400);

    const body = await response.json();

    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("should reject SQL injection in currency", async ({
    paymentClient,
    idempotencyKey,
  }) => {
    const response = await paymentClient.createPayment(
      {
        amount: 5000,
        currency: "' OR 1=1 --",
        customerEmail: "security@example.com",
      },
      idempotencyKey("sql-injection-currency")
    );

    expect(response.status()).toBe(400);

    const body = await response.json();

    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("should reject a decimal payment amount", async ({
    paymentClient,
    idempotencyKey,
  }) => {
    const response = await paymentClient.createPayment(
      {
        amount: 1000.5,
        currency: "NGN",
        customerEmail: "decimal@example.com",
      },
      idempotencyKey("decimal-amount")
    );

    expect(response.status()).toBe(400);

    const body = await response.json();

    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("should reject a zero payment amount", async ({
    paymentClient,
    idempotencyKey,
  }) => {
    const response = await paymentClient.createPayment(
      {
        amount: 0,
        currency: "NGN",
        customerEmail: "zero@example.com",
      },
      idempotencyKey("zero-amount")
    );

    expect(response.status()).toBe(400);

    const body = await response.json();

    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("should reject a string amount instead of a number", async ({
    request,
    idempotencyKey,
  }) => {
    const response = await request.post("/payments", {
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey("string-amount"),
      },
      data: {
        amount: "5000",
        currency: "NGN",
        customerEmail: "type@example.com",
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();

    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("should reject an unknown currency value", async ({
    paymentClient,
    idempotencyKey,
  }) => {
    const response = await paymentClient.createPayment(
      {
        amount: 5000,
        currency: "XYZ",
        customerEmail: "currency@example.com",
      },
      idempotencyKey("unknown-currency")
    );

    expect(response.status()).toBe(400);

    const body = await response.json();

    expect(body.error).toBe("VALIDATION_ERROR");
  });
});

test("should not persist malicious payment data in PostgreSQL", async ({
  paymentClient,
  idempotencyKey,
  database,
}) => {
  const key = idempotencyKey("malicious-db");

  const response = await paymentClient.createPayment(
    {
      amount: 5000,
      currency: "NGN",
      customerEmail: "' OR 1=1 --",
    },
    key
  );

  expect(response.status()).toBe(400);

  const body = await response.json();

  expect(body.error).toBe("VALIDATION_ERROR");

  const paymentCount =
    await database.countPaymentsByIdempotencyKey(key);

  expect(paymentCount).toBe(0);
});
