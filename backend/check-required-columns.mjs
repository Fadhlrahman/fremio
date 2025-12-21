import pg from "pg";

const pool = new pg.Pool({
  host: "localhost",
  port: 5432,
  database: "fremio",
  user: "postgres",
  password: "postgres123",
});

console.log("Checking payment_transactions NOT NULL columns...\n");

const result = await pool.query(`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns 
  WHERE table_name = 'payment_transactions'
    AND is_nullable = 'NO'
  ORDER BY ordinal_position
`);

console.log("NOT NULL columns:");
result.rows.forEach((col) => {
  console.log(
    `  ${col.column_name} (${col.data_type}) - Default: ${
      col.column_default || "NONE"
    }`
  );
});

await pool.end();
