import { test, expect } from "@playwright/test";

test.describe("Secure Error Handling", () => {
  test("should not expose internal details for malformed JSON", async ({
    request,
  }) => {
    const response = await request.post("/payments", {
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `malformed-${Date.now()}`,
        "X-Rate-Limit-Key": `malformed-${Date.now()}`,
      },
      data: "{invalid-json",
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);

    const body = await response.text();

    expect(body).not.toContain("node_modules");
    expect(body).not.toContain("/home/");
    expect(body).not.toContain("postgres");
    expect(body).not.toContain("SELECT");
    expect(body).not.toContain("stack");
  });

  test("should not expose internal details for an invalid payment id", async ({
    request,
  }) => {
    const response = await request.get(
      "/payments/not-a-valid-uuid"
    );

    expect([400, 404, 500]).toContain(response.status());

    const body = await response.text();

    expect(body).not.toContain("node_modules");
    expect(body).not.toContain("/home/");
    expect(body).not.toContain("postgres");
    expect(body).not.toContain("SELECT");
    expect(body).not.toContain("stack");
  });

  test("should not expose database implementation details in error responses", async ({
    request,
  }) => {
    const response = await request.post("/payments", {
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `error-security-${Date.now()}`,
        "X-Rate-Limit-Key": `error-security-${Date.now()}`,
      },
      data: {
        amount: -999,
        currency: "XYZ",
        customerEmail: "bad",
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.text();

    expect(body).not.toContain("pg");
    expect(body).not.toContain("PostgreSQL");
    expect(body).not.toContain("database.ts");
    expect(body).not.toContain("payment.routes.ts");
    expect(body).not.toContain("SQL");
  });
});
