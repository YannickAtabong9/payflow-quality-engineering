import { Pool } from "pg";

export const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "payflow",
  user: "payflow",
  password: "payflow_password",
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL error:", error);
});
