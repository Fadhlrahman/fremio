import pg from "pg";

const pool = new pg.Pool({
  host: "localhost",
  port: 5432,
  database: "fremio",
  user: "postgres",
  password: "postgres123",
});

console.log("Checking users in database...\n");

const result = await pool.query(`
  SELECT id, email, display_name, role, created_at, is_active
  FROM users
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 5
`);

if (result.rows.length === 0) {
  console.log("❌ No active users found in database!");
} else {
  console.log(`✅ Found ${result.rows.length} active users:\n`);

  result.rows.forEach((user, i) => {
    console.log(`${i + 1}. Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.display_name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${user.created_at.toLocaleString()}\n`);
  });
}

await pool.end();
