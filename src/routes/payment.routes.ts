import { FastifyInstance } from "fastify";
import crypto from "crypto";
import { pool } from "../config/database";
import { Payment } from "../types/payment";
import { createPaymentSchema } from "../schemas/payment.schema";
import { paymentsCreatedTotal } from "../config/metrics";

type PaymentOutcome = "successful" | "failed";

const createRequestHash = (
  amount: number,
  currency: string,
  customerEmail: string
): string => {
  const payload = JSON.stringify({
    amount,
    currency,
    customerEmail,
  });

  return crypto.createHash("sha256").update(payload).digest("hex");
};

export async function paymentRoutes(app: FastifyInstance) {
  app.post(
    "/payments",
    {
      config: {
        rateLimit: {
          max: 100,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
    const result = createPaymentSchema.safeParse(request.body);

    if (!result.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid payment request",
        details: result.error.issues,
      });
    }

    const idempotencyKey = request.headers["idempotency-key"];

    if (!idempotencyKey || Array.isArray(idempotencyKey)) {
      return reply.code(400).send({
        error: "MISSING_IDEMPOTENCY_KEY",
        message: "Idempotency-Key header is required",
      });
    }

    const { amount, currency, customerEmail } = result.data;

    const requestHash = createRequestHash(
      amount,
      currency,
      customerEmail
    );

    try {
      const id = crypto.randomUUID();
      const reference = `pf_${crypto.randomUUID()}`;

      const insertResult = await pool.query(
        `
        INSERT INTO payments (
          id,
          reference,
          amount,
          currency,
          customer_email,
          status,
          idempotency_key,
          request_hash
        )
        VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
        ON CONFLICT (idempotency_key)
        WHERE idempotency_key IS NOT NULL
        DO NOTHING
        RETURNING
          id,
          reference,
          amount,
          currency,
          customer_email AS "customerEmail",
          status,
          created_at AS "createdAt";
        `,
        [
          id,
          reference,
          amount,
          currency,
          customerEmail,
          idempotencyKey,
          requestHash,
        ]
      );

      if (insertResult.rows.length > 0) {
        const payment: Payment = insertResult.rows[0];

        paymentsCreatedTotal.inc({
          status: "created",
        });

        return reply.code(201).send(payment);
      }

      const existingPayment = await pool.query(
        `
        SELECT
          id,
          reference,
          amount,
          currency,
          customer_email AS "customerEmail",
          status,
          created_at AS "createdAt",
          request_hash AS "requestHash"
        FROM payments
        WHERE idempotency_key = $1;
        `,
        [idempotencyKey]
      );

      if (existingPayment.rows.length === 0) {
        return reply.code(500).send({
          error: "IDEMPOTENCY_ERROR",
          message: "Unable to resolve idempotent payment request",
        });
      }

      const existing = existingPayment.rows[0];

      if (existing.requestHash !== requestHash) {
        return reply.code(409).send({
          error: "IDEMPOTENCY_CONFLICT",
          message:
            "Idempotency-Key has already been used with different payment data",
        });
      }

      delete existing.requestHash;

      return reply.code(200).send(existing);
    } catch (error) {
      app.log.error(error);

      return reply.code(500).send({
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to create payment",
      });
    }
    }
  );

  app.get("/payments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await pool.query(
        `
        SELECT
          id,
          reference,
          amount,
          currency,
          customer_email AS "customerEmail",
          status,
          created_at AS "createdAt"
        FROM payments
        WHERE id = $1;
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: "PAYMENT_NOT_FOUND",
          message: "Payment not found",
        });
      }

      const payment: Payment = result.rows[0];

      return reply.code(200).send(payment);
    } catch (error) {
      app.log.error(error);

      return reply.code(500).send({
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve payment",
      });
    }
  });

  app.post("/payments/:id/process", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await pool.query(
        `
        UPDATE payments
        SET status = 'processing'
        WHERE id = $1
        AND status = 'pending'
        RETURNING
          id,
          reference,
          amount,
          currency,
          customer_email AS "customerEmail",
          status,
          created_at AS "createdAt";
        `,
        [id]
      );

      if (result.rows.length === 0) {
        const paymentResult = await pool.query(
          `
          SELECT status
          FROM payments
          WHERE id = $1;
          `,
          [id]
        );

        if (paymentResult.rows.length === 0) {
          return reply.code(404).send({
            error: "PAYMENT_NOT_FOUND",
            message: "Payment not found",
          });
        }

        return reply.code(409).send({
          error: "INVALID_PAYMENT_STATE",
          message: "Only pending payments can be processed",
          currentStatus: paymentResult.rows[0].status,
        });
      }

      const payment: Payment = result.rows[0];

      return reply.code(200).send(payment);
    } catch (error) {
      app.log.error(error);

      return reply.code(500).send({
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to process payment",
      });
    }
  });

  app.post("/payments/:id/complete", async (request, reply) => {
    const { id } = request.params as { id: string };

    const body = request.body as {
      outcome?: PaymentOutcome;
    };

    if (body.outcome !== "successful" && body.outcome !== "failed") {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: 'Outcome must be either "successful" or "failed"',
      });
    }

    try {
      const result = await pool.query(
        `
        UPDATE payments
        SET status = $1
        WHERE id = $2
        AND status = 'processing'
        RETURNING
          id,
          reference,
          amount,
          currency,
          customer_email AS "customerEmail",
          status,
          created_at AS "createdAt";
        `,
        [body.outcome, id]
      );

      if (result.rows.length === 0) {
        const paymentResult = await pool.query(
          `
          SELECT status
          FROM payments
          WHERE id = $1;
          `,
          [id]
        );

        if (paymentResult.rows.length === 0) {
          return reply.code(404).send({
            error: "PAYMENT_NOT_FOUND",
            message: "Payment not found",
          });
        }

        return reply.code(409).send({
          error: "INVALID_PAYMENT_STATE",
          message: "Only processing payments can be completed",
          currentStatus: paymentResult.rows[0].status,
        });
      }

      const payment: Payment = result.rows[0];

      return reply.code(200).send(payment);
    } catch (error) {
      app.log.error(error);

      return reply.code(500).send({
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to complete payment",
      });
    }
  });

  app.post("/payments/:id/refund", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await pool.query(
        `
        UPDATE payments
        SET status = 'refunded'
        WHERE id = $1
        AND status = 'successful'
        RETURNING
          id,
          reference,
          amount,
          currency,
          customer_email AS "customerEmail",
          status,
          created_at AS "createdAt";
        `,
        [id]
      );

      if (result.rows.length === 0) {
        const paymentResult = await pool.query(
          `
          SELECT status
          FROM payments
          WHERE id = $1;
          `,
          [id]
        );

        if (paymentResult.rows.length === 0) {
          return reply.code(404).send({
            error: "PAYMENT_NOT_FOUND",
            message: "Payment not found",
          });
        }

        return reply.code(409).send({
          error: "INVALID_PAYMENT_STATE",
          message: "Only successful payments can be refunded",
          currentStatus: paymentResult.rows[0].status,
        });
      }

      const payment: Payment = result.rows[0];

      return reply.code(200).send(payment);
    } catch (error) {
      app.log.error(error);

      return reply.code(500).send({
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to refund payment",
      });
    }
  });
}
