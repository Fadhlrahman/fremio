// Test database connection and run migration
import pkg from "pg";
const { Pool } = pkg;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create pool connection
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "fremio",
  user: process.env.DB_USER || "salwa",
  password: process.env.DB_PASSWORD || "",
});

async function testAndMigrate() {
  console.log("🧪 Testing database connection...");

  try {
    // Test connection
    const result = await pool.query("SELECT NOW() as current_time");
    console.log("✅ Database connected:", result.rows[0].current_time);

    // Check if tables exist
    const checkTables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('frame_packages', 'payment_transactions', 'user_package_access')
      ORDER BY table_name;
    `);

    console.log("\n📊 Existing payment tables:", checkTables.rows.length);
    checkTables.rows.forEach((row) => console.log(`  - ${row.table_name}`));

    if (checkTables.rows.length === 3) {
      console.log(
        "\n✅ All payment tables already exist! No migration needed."
      );
      process.exit(0);
    }

    // Run migration
    console.log("\n🚀 Running payment system migration...");
    const migrationPath = path.join(
      __dirname,
      "database",
      "migrations",
      "002_create_payment_system.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    await pool.query(migrationSQL);

    console.log("\n✅ Payment system migration completed successfully!");
    console.log("\nCreated tables:");
    console.log("  - frame_packages");
    console.log("  - payment_transactions");
    console.log("  - user_package_access");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

testAndMigrate();
