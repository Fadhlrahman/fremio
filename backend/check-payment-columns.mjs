import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: "localhost",
  database: "fremio",
  user: "postgres",
  password: "postgres123",
  port: 5432,
});

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payment_transactions' 
      ORDER BY ordinal_position
    `);

    console.log("payment_transactions columns:");
    result.rows.forEach((row) => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });

    await pool.end();
  } catch (error) {
    console.error("Error:", error.message);
    await pool.end();
  }
}

checkColumns();
