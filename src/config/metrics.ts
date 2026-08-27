import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

export const metricsRegistry = new Registry();

collectDefaultMetrics({
  register: metricsRegistry,
});

export const httpRequestsTotal = new Counter({
  name: "payflow_http_requests_total",
  help: "Total number of HTTP requests handled by PayFlow",
  labelNames: ["method", "route", "status_code"],
  registers: [metricsRegistry],
});

export const httpRequestDuration = new Histogram({
  name: "payflow_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  registers: [metricsRegistry],
});

export const paymentsCreatedTotal = new Counter({
  name: "payflow_payments_created_total",
  help: "Total number of payment creation attempts",
  labelNames: ["status"],
  registers: [metricsRegistry],
});
