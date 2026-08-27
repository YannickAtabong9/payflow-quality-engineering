import { Pool } from "pg";

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "payflow",
  user: "payflow",
  password: "payflow_password",
});

export interface PaymentRecord {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  customerEmail: string;
  status: string;
  idempotencyKey: string | null;
}

export async function findPaymentById(
  id: string
): Promise<PaymentRecord | null> {
  const result = await pool.query(
    `
    SELECT
      id,
      reference,
      amount,
      currency,
      customer_email AS "customerEmail",
      status,
      idempotency_key AS "idempotencyKey"
    FROM payments
    WHERE id = $1;
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function countPaymentsByIdempotencyKey(
  idempotencyKey: string
): Promise<number> {
  const result = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM payments
    WHERE idempotency_key = $1;
    `,
    [idempotencyKey]
  );

  return result.rows[0].count;
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
