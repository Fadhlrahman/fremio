import pg from "pg";

const pool = new pg.Pool({
  host: "localhost",
  port: 5432,
  database: "fremio",
  user: "postgres",
  password: "postgres123",
});

console.log("Checking migrated data in user_package_access...\n");

// Check access records
const result = await pool.query(`
  SELECT 
    user_id,
    package_ids,
    is_active,
    access_end,
    start_date
  FROM user_package_access
  ORDER BY created_at DESC
`);

if (result.rows.length === 0) {
  console.log("❌ No access records found!");
} else {
  console.log(`✅ Found ${result.rows.length} access records:\n`);

  result.rows.forEach((row, i) => {
    const isExpired = new Date(row.access_end) < new Date();
    console.log(`${i + 1}. User: ${row.user_id.substring(0, 20)}...`);
    console.log(`   Package IDs: [${row.package_ids.join(", ")}]`);
    console.log(`   Active: ${row.is_active ? "✅" : "❌"}`);
    console.log(`   Expires: ${row.access_end.toLocaleString()}`);
    console.log(`   Status: ${isExpired ? "⏰ Expired" : "✅ Valid"}\n`);
  });
}

await pool.end();
