import http from "k6/http";
import { check } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 10 },
    { duration: "20s", target: 25 },
    { duration: "20s", target: 50 },
    { duration: "20s", target: 100 },
    { duration: "20s", target: 50 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: [
      "p(95)<500",
      "p(99)<1000",
    ],
  },
};

export default function () {
  const idempotencyKey = `load-${__VU}-${__ITER}-${Date.now()}`;

  const payload = JSON.stringify({
    amount: 5000,
    currency: "NGN",
    customerEmail: `load-${__VU}-${__ITER}@example.com`,
  });

  const response = http.post(
    "http://127.0.0.1:3000/payments",
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
    }
  );

  check(response, {
    "status is 201": (r) => r.status === 201,
    "response contains payment id": (r) =>
      r.json("id") !== undefined,
    "payment starts pending": (r) =>
      r.json("status") === "pending",
  });
}
