import { test, expect } from "@playwright/test";

test.describe("API Rate Limiting", () => {
  test("should return 429 after exceeding the payment creation rate limit", async ({
    request,
  }) => {
    const rateLimitKey = `security-${Date.now()}`;

    const responses = await Promise.all(
      Array.from({ length: 101 }, (_, index) =>
        request.post("/payments", {
          headers: {
            "Content-Type": "application/json",
            "X-Rate-Limit-Key": rateLimitKey,
            "Idempotency-Key": `rate-limit-${Date.now()}-${index}`,
          },
          data: {
            amount: -1,
            currency: "NGN",
            customerEmail: "ratelimit@example.com",
          },
        })
      )
    );

    const statusCodes = responses.map((response) => response.status());

    expect(statusCodes).toContain(429);

    const rateLimitedCount = statusCodes.filter(
      (status) => status === 429
    ).length;

    expect(rateLimitedCount).toBeGreaterThan(0);

    const validationCount = statusCodes.filter(
      (status) => status === 400
    ).length;

    expect(validationCount).toBeGreaterThan(0);
  });
});
