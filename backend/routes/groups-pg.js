import express from "express";
import pg from "pg";

const router = express.Router();

// Database pool
const pool = new pg.Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "fremio",
  user: process.env.DB_USER || "salwa",
  password: process.env.DB_PASSWORD || "",
});

// Generate short share ID
function generateShareId() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Public share endpoint - no auth required
router.post("/public-share", async (req, res) => {
  try {
    const { title, frames } = req.body;

    if (!Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({ error: "Frames list is required" });
    }

    // Keep payload small-ish to prevent abuse
    const capped = frames.slice(0, 50).map((f) => ({
      shareId: f?.shareId,
      title: f?.title || "Frame",
      description: f?.description || "",
      thumbnail: f?.thumbnail || null,
    }));

    const invalid = capped.some((f) => !f.shareId);
    if (invalid) {
      return res.status(400).json({ error: "Each frame must have shareId" });
    }

    const shareId = generateShareId();
    const result = await pool.query(
      `INSERT INTO shared_groups (share_id, title, frames)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [shareId, title || "Group Frames", JSON.stringify(capped)]
    );

    res.json({ success: true, group: result.rows[0] });
  } catch (error) {
    console.error("❌ [Groups] Error creating public share:", error);
    res.status(500).json({ error: "Failed to create group share" });
  }
});

// Get shared group by share_id (public)
router.get("/share/:shareId", async (req, res) => {
  try {
    const { shareId } = req.params;

    const result = await pool.query(
      `SELECT share_id, title, frames, created_at
       FROM shared_groups
       WHERE share_id = $1`,
      [shareId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.json({ success: true, group: result.rows[0] });
  } catch (error) {
    console.error("❌ [Groups] Error fetching group:", error);
    res.status(500).json({ error: "Failed to fetch group" });
  }
});

export default router;
