const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "fremio",
  user: process.env.DB_USER || "fremio_user",
  password: process.env.DB_PASSWORD || "fremio123",

  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test connection on startup
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    console.error(
      "   Make sure PostgreSQL is running and credentials are correct."
    );
    console.error("   Run: npm run db:setup to create the database.");
  } else {
    console.log("✅ Database connected successfully");
    console.log(`   Database: ${process.env.DB_NAME || "fremio"}`);
  }
});

// Handle pool errors
pool.on("error", (err) => {
  console.error("❌ Unexpected database error:", err);
  // Don't exit - allow app to continue
});

module.exports = pool;
