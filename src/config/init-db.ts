import { pool } from "./database";

const createPaymentsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY,
      reference VARCHAR(100) UNIQUE NOT NULL,
      amount INTEGER NOT NULL CHECK (amount > 0),
      currency VARCHAR(3) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      status VARCHAR(20) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("Payments table ready.");
};

createPaymentsTable()
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
