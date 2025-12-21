// Run payment system database migration - CommonJS version
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "fremio",
  user: process.env.DB_USER || "salwa",
  password: process.env.DB_PASSWORD || "",
});

async function runMigration() {
  console.log("🚀 Running payment system migration...");

  try {
    // Read migration file
    const migrationPath = path.join(
      __dirname,
      "..",
      "database",
      "migrations",
      "002_create_payment_system.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("📄 Migration file loaded");
    console.log("🔗 Connecting to database...");

    // Execute migration
    await pool.query(migrationSQL);

    console.log("✅ Payment system migration completed successfully!");
    console.log("\nCreated tables:");
    console.log("  - frame_packages");
    console.log("  - payment_transactions");
    console.log("  - user_package_access");
    console.log("\nCreated indexes and triggers");

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error("Stack:", error.stack);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
