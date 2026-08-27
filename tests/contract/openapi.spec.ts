import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { parse } from "yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { getOpenApiDocument } from "../helpers/contract.helper";

test.describe("OpenAPI Contract", () => {
  test("should load a valid OpenAPI specification", async () => {
    const filePath = path.resolve(
      process.cwd(),
      "tests/contract/openapi.yaml"
    );

    const document = parse(fs.readFileSync(filePath, "utf-8"));

    expect(document.openapi).toBe("3.0.3");
    expect(document.info.title).toBe("PayFlow API");
    expect(document.paths).toBeDefined();
    expect(document.components.schemas.Payment).toBeDefined();
  });

  test("should validate the payment creation response against the contract", async ({
    request,
  }) => {
    const response = await request.post("/payments", {
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `contract-${Date.now()}`,
      },
      data: {
        amount: 5000,
        currency: "NGN",
        customerEmail: "contract@example.com",
      },
    });

    expect(response.status()).toBe(201);

    const body = await response.json();

    const document = await getOpenApiDocument();

    const paymentSchema = document.components?.schemas?.Payment;

    expect(paymentSchema).toBeDefined();

    const ajv = new Ajv({
      allErrors: true,
      strict: false,
    });

    addFormats(ajv);

    const validate = ajv.compile(paymentSchema as object);
    const valid = validate(body);

    expect(
      valid,
      validate.errors
        ? JSON.stringify(validate.errors, null, 2)
        : "Payment response does not match the OpenAPI Payment schema"
    ).toBe(true);
  });
});
