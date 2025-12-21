import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: "localhost",
  database: "fremio",
  user: "postgres",
  password: "postgres123",
  port: 5432,
});

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename LIKE '%access%'
      ORDER BY tablename
    `);

    console.log('Tables with "access" in name:');
    result.rows.forEach((row) => console.log("  -", row.tablename));

    const result2 = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename LIKE '%package%'
      ORDER BY tablename
    `);

    console.log('\nTables with "package" in name:');
    result2.rows.forEach((row) => console.log("  -", row.tablename));

    await pool.end();
  } catch (error) {
    console.error("Error:", error.message);
    await pool.end();
  }
}

checkTables();
