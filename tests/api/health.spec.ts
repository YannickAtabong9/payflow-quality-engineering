import { test, expect } from "@playwright/test";

test.describe("Health API", () => {
  test("should return healthy service status", async ({ request }) => {
    const response = await request.get("/health");

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body).toEqual({
      status: "ok",
      service: "payflow-api",
    });
  });

  test("should confirm database connectivity", async ({ request }) => {
    const response = await request.get("/health/db");

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.status).toBe("ok");
    expect(body.database).toBe("connected");
    expect(body.time).toBeTruthy();
  });
});
