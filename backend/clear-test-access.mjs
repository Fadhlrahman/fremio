import pg from "pg";

const pool = new pg.Pool({
  host: "localhost",
  port: 5432,
  database: "fremio",
  user: "postgres",
  password: "postgres123",
});

console.log("🧹 Clearing test user access to test full flow...\n");

const userId = "5ce1388b-5b8c-4d92-a3a6-8df381977721";

// Delete all access for test user
const result = await pool.query(
  "DELETE FROM user_package_access WHERE user_id = $1 RETURNING *",
  [userId]
);

if (result.rowCount > 0) {
  console.log(`✅ Deleted ${result.rowCount} access records`);
  console.log(`\n📝 User can now test full payment flow from scratch\n`);
} else {
  console.log("No access records to delete");
}

await pool.end();
