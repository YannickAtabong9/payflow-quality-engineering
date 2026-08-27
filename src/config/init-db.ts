import { pool } from "./database";

const initializeDatabase = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY,
      reference VARCHAR(100) UNIQUE NOT NULL,
      amount INTEGER NOT NULL CHECK (amount > 0),
      currency VARCHAR(3) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      status VARCHAR(20) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      idempotency_key VARCHAR(100),
      request_hash VARCHAR(64)
    );
  `);

  await pool.query(`
    ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);
  `);

  await pool.query(`
    ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS request_hash VARCHAR(64);
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_unique
    ON payments (idempotency_key)
    WHERE idempotency_key IS NOT NULL;
  `);

  console.log("Payments table ready.");
};

initializeDatabase()
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
