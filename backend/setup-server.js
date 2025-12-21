import express from "express";
import https from "https";
import fs from "fs";
import bcrypt from "bcryptjs";
import pg from "pg";

const app = express();
app.use(express.json());

// Database pool
const pool = new pg.Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "fremio",
  user: process.env.DB_USER || "salwa",
  password: process.env.DB_PASSWORD || "fremio2024",
});

// Endpoint to create admin user
app.post("/setup-admin", async (req, res) => {
  try {
    const email = "admin@fremio.com";
    const password = "admin123";
    const displayName = "Fremio Admin";
    const role = "admin";

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    console.log("🔐 Creating admin user...");
    console.log("📧 Email:", email);
    console.log("🔑 Password:", password);

    // Check if exists
    const checkResult = await pool.query(
      "SELECT id, email, role FROM users WHERE email = $1",
      [email]
    );

    if (checkResult.rows.length > 0) {
      // Update password
      await pool.query(
        "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2",
        [passwordHash, email]
      );

      console.log("✅ Admin password updated");

      return res.json({
        success: true,
        message: "Admin password updated",
        user: checkResult.rows[0],
      });
    }

    // Insert new admin
    const insertResult = await pool.query(
      "INSERT INTO users (email, password_hash, display_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, display_name, role",
      [email, passwordHash, displayName, role]
    );

    console.log("✅ Admin user created");

    res.json({
      success: true,
      message: "Admin user created",
      user: insertResult.rows[0],
    });
  } catch (error) {
    console.error("❌ Error:", error);

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        message:
          "PostgreSQL is not running. Please start PostgreSQL service first.",
        error: "Database connection refused",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
      error: error.code,
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ success: true, message: "Setup server running" });
});

// Start server
const PORT = 5051;
const options = {
  key: fs.readFileSync("localhost+3-key.pem"),
  cert: fs.readFileSync("localhost+3.pem"),
};

https.createServer(options, app).listen(PORT, () => {
  console.log(`\n✅ Setup server running on https://localhost:${PORT}`);
  console.log(`\n📝 To create admin user, run:`);
  console.log(`   curl.exe -k -X POST https://localhost:${PORT}/setup-admin\n`);
});
