/**
 * Users Routes - Simple endpoint for fetching all users
 */
import express from "express";
import pg from "pg";
import { verifyToken, requireAdmin } from "../middleware/auth.js";

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "fremio",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres123",
});

const router = express.Router();

// GET all users (admin only)
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, display_name, role, is_active, created_at FROM users ORDER BY created_at DESC",
    );

    res.json({
      success: true,
      users: result.rows.map((u) => ({
        ...u,
        status: u.is_active ? "active" : "inactive",
      })),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

export default router;
