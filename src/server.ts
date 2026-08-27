import Fastify from "fastify";
import { paymentRoutes } from "./routes/payment.routes";
import { pool } from "./config/database";

const app = Fastify({
  logger: true,
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
