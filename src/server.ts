import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { paymentRoutes } from "./routes/payment.routes";
import { pool } from "./config/database";
import {
  metricsRegistry,
  httpRequestsTotal,
  httpRequestDuration,
} from "./config/metrics";

declare module "fastify" {
  interface FastifyRequest {
    startTime?: bigint;
  }
}

const app = Fastify({
  logger: true,
});

app.addHook("onRequest", async (request) => {
  request.startTime = process.hrtime.bigint();
});

app.addHook("onResponse", async (request, reply) => {
  const route = request.routeOptions.url ?? "unknown";
  const statusCode = reply.statusCode.toString();

  const startTime = request.startTime;

  if (startTime) {
    const durationNanoseconds =
      process.hrtime.bigint() - startTime;

    const durationSeconds =
      Number(durationNanoseconds) / 1_000_000_000;

    httpRequestDuration.observe(
      {
        method: request.method,
        route,
        status_code: statusCode,
      },
      durationSeconds
    );
  }

  httpRequestsTotal.inc({
    method: request.method,
    route,
    status_code: statusCode,
  });
});

app.register(rateLimit, {
  global: false,

  keyGenerator: (request) => {
    return (
      (request.headers["x-rate-limit-key"] as string) ||
      request.ip
    );
  },
});

app.get("/health", async () => {
  return {
    status: "ok",
    service: "payflow-api",
  };
});

app.get("/health/db", async (_request, reply) => {
  try {
    const result = await pool.query("SELECT NOW()");

    return reply.send({
      status: "ok",
      database: "connected",
      time: result.rows[0].now,
    });
  } catch (error) {
    app.log.error(error);

    return reply.code(500).send({
      status: "error",
      database: "disconnected",
    });
  }
});

app.get("/metrics", async (_request, reply) => {
  reply.header("Content-Type", metricsRegistry.contentType);

  return metricsRegistry.metrics();
});

app.register(paymentRoutes);

const start = async () => {
  try {
    await app.listen({
      port: 3000,
      host: "0.0.0.0",
    });

    console.log("PayFlow API running on port 3000");
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
