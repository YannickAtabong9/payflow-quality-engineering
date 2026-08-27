import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 10 },
    { duration: "20s", target: 10 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

export default function () {
  const idempotencyKey = `k6-${__VU}-${__ITER}-${Date.now()}`;

  const payload = JSON.stringify({
    amount: 5000,
    currency: "NGN",
    customerEmail: `k6-${__VU}-${__ITER}@example.com`,
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
  };

  const response = http.post(
    "http://127.0.0.1:3000/payments",
    payload,
    params
  );

  check(response, {
    "status is 201": (r) => r.status === 201,
    "response contains payment id": (r) =>
      r.json("id") !== undefined,
    "payment starts pending": (r) =>
      r.json("status") === "pending",
  });

  sleep(1);
}
