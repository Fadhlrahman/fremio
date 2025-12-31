const express = require("express");
const db = require("../config/database");

const router = express.Router();

function generateShareId(length = 8) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function insertSharedGroup({ title, frames, preferences }) {
  // Try a few times to avoid rare share_id collisions
  for (let attempt = 0; attempt < 5; attempt++) {
    const shareId = generateShareId(8);
    try {
      const preferencesJson =
        preferences && typeof preferences === "object"
          ? JSON.stringify(preferences)
          : typeof preferences === "string"
            ? preferences
            : null;

      const result = await db.query(
        `INSERT INTO shared_groups (share_id, title, frames, preferences)
         VALUES ($1, $2, $3, $4)
         RETURNING share_id, title, frames, preferences, created_at`,
        [
          shareId,
          title || "Group Frames",
          JSON.stringify(frames),
          preferencesJson,
        ]
      );
      return result.rows[0];
    } catch (error) {
      // 23505 = unique_violation (share_id collision)
      if (error && error.code === "23505") continue;

      // 42703 = undefined_column (older schema without preferences)
      if (error && error.code === "42703") {
        const fallback = await db.query(
          `INSERT INTO shared_groups (share_id, title, frames)
           VALUES ($1, $2, $3)
           RETURNING share_id, title, frames, created_at`,
          [shareId, title || "Group Frames", JSON.stringify(frames)]
        );
        const row = fallback.rows[0];
        return { ...row, preferences: null };
      }

      throw error;
    }
  }

  const err = new Error("Failed to generate unique share ID");
  err.status = 500;
  throw err;
}

/**
 * POST /api/groups/public-share
 * Create a public share record for a group of frames (no auth)
 */
router.post("/public-share", async (req, res) => {
  try {
    const { title, frames, preferences } = req.body || {};

    if (!Array.isArray(frames) || frames.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Frames list is required" });
    }

    // Keep payload small-ish to prevent abuse
    const capped = frames.slice(0, 50).map((f) => ({
      shareId: f?.shareId,
      title: f?.title || "Frame",
      description: f?.description || "",
      thumbnail: f?.thumbnail || null,
    }));

    if (capped.some((f) => !f.shareId)) {
      return res
        .status(400)
        .json({ success: false, message: "Each frame must have shareId" });
    }

    const group = await insertSharedGroup({
      title,
      frames: capped,
      preferences,
    });

    res.json({ success: true, group });
  } catch (error) {
    console.error("❌ [Groups] Error creating public share:", error);

    // Likely schema missing (migrations not run)
    if (error && error.code === "42P01") {
      return res.status(500).json({
        success: false,
        message: "Database schema missing: shared_groups table not found",
      });
    }

    res
      .status(500)
      .json({ success: false, message: "Failed to create group share" });
  }
});

/**
 * GET /api/groups/share/:shareId
 * Fetch a shared group by share id (public)
 */
router.get("/share/:shareId", async (req, res) => {
  try {
    const { shareId } = req.params;

    let result;
    try {
      result = await db.query(
        `SELECT share_id, title, frames, preferences, created_at
         FROM shared_groups
         WHERE share_id = $1`,
        [shareId]
      );
    } catch (error) {
      // 42703 = undefined_column (older schema without preferences)
      if (error && error.code === "42703") {
        result = await db.query(
          `SELECT share_id, title, frames, created_at
           FROM shared_groups
           WHERE share_id = $1`,
          [shareId]
        );
        if (result.rows.length > 0) {
          result.rows[0].preferences = null;
        }
      } else {
        throw error;
      }
    }

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    res.json({ success: true, group: result.rows[0] });
  } catch (error) {
    console.error("❌ [Groups] Error fetching group:", error);
    if (error && error.code === "42P01") {
      return res.status(500).json({
        success: false,
        message: "Database schema missing: shared_groups table not found",
      });
    }
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch group" });
  }
});

module.exports = router;
