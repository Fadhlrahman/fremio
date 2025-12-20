import express from "express";
import { body, query } from "express-validator";
import { getFirestore } from "../config/firebase.js";
import {
  verifyToken,
  requireAdmin,
  requireKreator,
  optionalAuth,
} from "../middleware/auth.js";
import validate from "../middleware/validator.js";
import { uploadImage, handleUploadError } from "../middleware/upload.js";
import storageService from "../services/storageService.js";
import pg from "pg";

const router = express.Router();

// PostgreSQL pool for VPS mode
const pool = new pg.Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "fremio",
  user: process.env.DB_USER || "salwa",
  password: process.env.DB_PASSWORD || "",
});

/**
 * GET /api/frames
 * Get all public frames with pagination and filtering
 */
/**
 * GET /api/frames
 * Get all frames with pagination (uses PostgreSQL)
 */
router.get(
  "/",
  optionalAuth,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const category = req.query.category;
      const offset = (page - 1) * limit;

      let queryText = `
        SELECT id, name, description, category, image_path, thumbnail_path, 
               slots, max_captures, is_premium, is_active, view_count, 
               download_count, created_by, created_at, updated_at,
               layout, canvas_background, canvas_width, canvas_height, display_order, is_hidden
        FROM frames 
        WHERE is_active = true AND is_hidden = false
      `;
      const queryParams = [];
      let paramIndex = 1;

      if (category) {
        queryText += ` AND category = $${paramIndex}`;
        queryParams.push(category);
        paramIndex++;
      }

      queryText += ` ORDER BY display_order ASC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await pool.query(queryText, queryParams);

      // Get total count
      let countQuery = "SELECT COUNT(*) FROM frames WHERE is_active = true AND is_hidden = false";
      const countParams = [];
      if (category) {
        countQuery += " AND category = $1";
        countParams.push(category);
      }
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      // Format frames for response
      const frames = result.rows.map((frame) => {
        const slots = typeof frame.slots === "string" ? JSON.parse(frame.slots) : (frame.slots || []);
        const layout = typeof frame.layout === "string" ? JSON.parse(frame.layout) : (frame.layout || {});
        // Construct full URL for images
        const baseUrl = "https://api.fremio.id";
        const imageUrl = frame.image_path?.startsWith("http")
          ? frame.image_path
          : `${baseUrl}${frame.image_path}`;
        const thumbnailUrl = (frame.thumbnail_path || frame.image_path)?.startsWith("http")
          ? (frame.thumbnail_path || frame.image_path)
          : `${baseUrl}${frame.thumbnail_path || frame.image_path}`;
        
        return {
          id: frame.id,
          name: frame.name,
          description: frame.description,
          category: frame.category,
          imagePath: frame.image_path,
          imageUrl: imageUrl,
          thumbnailUrl: thumbnailUrl,
          slots: slots,
          maxCaptures: frame.max_captures,
          isPremium: frame.is_premium,
          isActive: frame.is_active,
          viewCount: frame.view_count,
          downloadCount: frame.download_count,
          createdBy: frame.created_by,
          createdAt: frame.created_at,
          updatedAt: frame.updated_at,
          displayOrder: frame.display_order ?? 999,
          // Include layout with elements for overlay/background
          layout: {
            aspectRatio: layout.aspectRatio || "9:16",
            orientation: layout.orientation || "portrait",
            backgroundColor: frame.canvas_background || layout.backgroundColor || "#ffffff",
            elements: layout.elements || [],
          },
          canvasBackground: frame.canvas_background || "#ffffff",
          canvasWidth: frame.canvas_width || 1080,
          canvasHeight: frame.canvas_height || 1920,
          isCustom: true,
        };
      });

      res.json({
        success: true,
        frames,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Get frames error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get frames",
      });
    }
  }
);

/**
 * GET /api/frames/:id
 * Get single frame by ID (PostgreSQL)
 */
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM frames WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Frame not found",
      });
    }

    const frame = result.rows[0];

    // Increment view count
    await pool.query(
      `UPDATE frames SET view_count = view_count + 1 WHERE id = $1`,
      [req.params.id]
    );

    res.json({
      success: true,
      frame: {
        id: frame.id,
        name: frame.name,
        description: frame.description,
        category: frame.category,
        imagePath: frame.image_path,
        // Construct full URL for images
        imageUrl: frame.image_path?.startsWith("http")
          ? frame.image_path
          : `https://api.fremio.id${frame.image_path}`,
        slots: typeof frame.slots === "string" ? JSON.parse(frame.slots) : frame.slots,
        layout: typeof frame.layout === "string" ? JSON.parse(frame.layout) : frame.layout,
        canvasBackground: frame.canvas_background,
        canvasWidth: frame.canvas_width,
        canvasHeight: frame.canvas_height,
        maxCaptures: frame.max_captures,
        isPremium: frame.is_premium,
        isActive: frame.is_active,
        viewCount: frame.view_count,
        downloadCount: frame.download_count,
        createdBy: frame.created_by,
        createdAt: frame.created_at,
        updatedAt: frame.updated_at,
      },
    });
  } catch (error) {
    console.error("Get frame error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get frame",
    });
  }
});

/**
 * GET /api/frames/:id/config
 * Get frame config for EditPhoto page
 */
router.get("/:id/config", optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM frames WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Frame not found",
      });
    }

    const frame = result.rows[0];
    const slots = typeof frame.slots === "string" ? JSON.parse(frame.slots) : (frame.slots || []);
    const layout = typeof frame.layout === "string" ? JSON.parse(frame.layout) : (frame.layout || {});
    
    // Canvas dimensions
    const W = frame.canvas_width || 1080;
    const H = frame.canvas_height || 1920;
    
    // Build image URL - use full URL
    const imageUrl = frame.image_path?.startsWith("http")
      ? frame.image_path
      : `https://api.fremio.id${frame.image_path}`;

    // Build designer elements from slots (photo placeholders)
    const photoElements = slots.map((s, i) => ({
      id: s.id || `photo_${i + 1}`,
      type: "photo",
      x: Math.round((s.left || 0) * W),
      y: Math.round((s.top || 0) * H),
      width: Math.round((s.width || 0.3) * W),
      height: Math.round((s.height || 0.2) * H),
      zIndex: s.zIndex || 1,
      data: {
        photoIndex: s.photoIndex !== undefined ? s.photoIndex : i,
        image: null,
        borderRadius: s.borderRadius || 0,
      }
    }));

    // Build overlay elements from layout.elements (upload/overlay images)
    const overlayElements = (layout.elements || []).map((el) => {
      // Restore normalized positions to pixel values
      const restoredX = el.xNorm !== undefined ? Math.round(el.xNorm * W) : (el.x || 0);
      const restoredY = el.yNorm !== undefined ? Math.round(el.yNorm * H) : (el.y || 0);
      const restoredWidth = el.widthNorm !== undefined ? Math.round(el.widthNorm * W) : (el.width || 100);
      const restoredHeight = el.heightNorm !== undefined ? Math.round(el.heightNorm * H) : (el.height || 100);

      return {
        ...el,
        x: restoredX,
        y: restoredY,
        width: restoredWidth,
        height: restoredHeight,
        zIndex: el.zIndex || 10,
        // Mark as overlay so frontend knows not to treat it as a photo slot
        data: {
          ...el.data,
          __isOverlay: true,
        },
      };
    });

    // Combine all elements
    const allElements = [...photoElements, ...overlayElements];

    // Build config for EditPhoto
    const config = {
      id: frame.id,
      name: frame.name,
      description: frame.description,
      maxCaptures: frame.max_captures || slots.length,
      duplicatePhotos: false,
      imagePath: imageUrl,
      frameImage: imageUrl,
      thumbnailUrl: imageUrl,
      slots: slots,
      canvasBackground: frame.canvas_background || layout.backgroundColor || "#ffffff",
      canvasWidth: W,
      canvasHeight: H,
      designer: {
        elements: allElements,
        background: frame.canvas_background || layout.backgroundColor || "#ffffff",
      },
      layout: {
        aspectRatio: layout.aspectRatio || "9:16",
        orientation: layout.orientation || "portrait",
        backgroundColor: frame.canvas_background || layout.backgroundColor || "#ffffff",
        elements: layout.elements || [],
      },
      category: frame.category,
      isCustom: true,
    };

    res.json(config);
  } catch (error) {
    console.error("Get frame config error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get frame config",
    });
  }
});

/**
 * POST /api/frames
 * Create new frame (Admin/Kreator only)
 * Supports both Firebase and PostgreSQL (VPS mode)
 */
router.post(
  "/",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        id,
        name,
        description,
        category,
        categories,
        maxCaptures,
        max_captures,
        duplicatePhotos,
        slots,
        layout,
        tags,
        imagePath,
        image_path,
        canvasBackground,
        canvasWidth,
        canvasHeight,
        createdBy,
      } = req.body;

      // Validate name
      if (!name || name.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Frame name is required",
        });
      }

      // Parse slots if string
      let parsedSlots = slots;
      if (typeof slots === "string") {
        try {
          parsedSlots = JSON.parse(slots);
        } catch (e) {
          parsedSlots = [];
        }
      }

      // Parse layout if string
      let parsedLayout = layout;
      if (typeof layout === "string") {
        try {
          parsedLayout = JSON.parse(layout);
        } catch (e) {
          parsedLayout = null;
        }
      }

      const frameId = id || `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const finalImagePath = imagePath || image_path || null;
      const finalMaxCaptures = maxCaptures || max_captures || parsedSlots?.length || 1;
      const finalCategory = category || (categories && categories[0]) || "custom";

      // DEBUG: Log layout data
      console.log("📦 [CREATE FRAME] Layout data received:");
      console.log("  - Raw layout type:", typeof layout);
      console.log("  - Parsed layout:", JSON.stringify(parsedLayout, null, 2)?.substring(0, 500));
      console.log("  - Layout elements count:", parsedLayout?.elements?.length || 0);

      // Get user ID (UUID) for created_by - can be null if not found
      const createdByUserId = req.user?.userId || null;

      // Use PostgreSQL for VPS mode
      try {
        const result = await pool.query(
          `INSERT INTO frames (id, name, description, category, image_path, slots, max_captures, layout, canvas_background, canvas_width, canvas_height, created_by, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             category = EXCLUDED.category,
             image_path = EXCLUDED.image_path,
             slots = EXCLUDED.slots,
             max_captures = EXCLUDED.max_captures,
             layout = EXCLUDED.layout,
             canvas_background = EXCLUDED.canvas_background,
             canvas_width = EXCLUDED.canvas_width,
             canvas_height = EXCLUDED.canvas_height,
             updated_at = NOW()
           RETURNING *`,
          [
            frameId,
            name.trim(),
            description || "",
            finalCategory,
            finalImagePath,
            JSON.stringify(parsedSlots || []),
            finalMaxCaptures,
            JSON.stringify(parsedLayout || {}),
            canvasBackground || "#ffffff",
            canvasWidth || 1080,
            canvasHeight || 1920,
            createdByUserId,
          ]
        );

        const frame = result.rows[0];

        console.log(`✅ Frame created: ${frame.name} (${frame.id})`);

        res.status(201).json({
          success: true,
          message: "Frame berhasil dibuat",
          frame: {
            id: frame.id,
            name: frame.name,
            description: frame.description,
            category: frame.category,
            imagePath: frame.image_path,
            slots: frame.slots,
            maxCaptures: frame.max_captures,
          },
        });
      } catch (dbError) {
        console.error("PostgreSQL error:", dbError);
        
        // Fallback to Firebase if PostgreSQL fails
        try {
          const db = getFirestore();
          if (db) {
            const frameData = {
              name: name.trim(),
              description: description || "",
              category: finalCategory,
              imagePath: finalImagePath,
              slots: parsedSlots || [],
              maxCaptures: finalMaxCaptures,
              layout: parsedLayout,
              status: "approved",
              createdBy: req.user?.email || createdBy || "admin",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await db.collection("custom_frames").doc(frameId).set(frameData);

            res.status(201).json({
              success: true,
              message: "Frame berhasil dibuat (Firebase)",
              frame: { id: frameId, ...frameData },
            });
          } else {
            throw new Error("No database available");
          }
        } catch (fbError) {
          console.error("Firebase fallback error:", fbError);
          res.status(500).json({
            success: false,
            message: "Failed to create frame",
          });
        }
      }
    } catch (error) {
      console.error("Create frame error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create frame",
      });
    }
  }
);

/**
 * PUT /api/frames/:id
 * Update frame (Admin or frame owner) - PostgreSQL
 */
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    // Check if frame exists
    const checkResult = await pool.query(
      `SELECT * FROM frames WHERE id = $1`,
      [req.params.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Frame not found",
      });
    }

    const {
      name,
      description,
      category,
      maxCaptures,
      max_captures,
      slots,
      layout,
      canvasBackground,
      canvasWidth,
      canvasHeight,
      imagePath,
      image_path,
      is_active,
      is_premium,
      is_hidden,
      displayOrder,
      display_order,
    } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (category) {
      updates.push(`category = $${paramIndex++}`);
      values.push(category);
    }
    if (maxCaptures || max_captures) {
      updates.push(`max_captures = $${paramIndex++}`);
      values.push(parseInt(maxCaptures || max_captures));
    }
    if (slots) {
      updates.push(`slots = $${paramIndex++}`);
      values.push(typeof slots === "string" ? slots : JSON.stringify(slots));
    }
    if (layout) {
      updates.push(`layout = $${paramIndex++}`);
      values.push(typeof layout === "string" ? layout : JSON.stringify(layout));
    }
    if (canvasBackground) {
      updates.push(`canvas_background = $${paramIndex++}`);
      values.push(canvasBackground);
    }
    if (canvasWidth) {
      updates.push(`canvas_width = $${paramIndex++}`);
      values.push(canvasWidth);
    }
    if (canvasHeight) {
      updates.push(`canvas_height = $${paramIndex++}`);
      values.push(canvasHeight);
    }
    if (imagePath || image_path) {
      updates.push(`image_path = $${paramIndex++}`);
      values.push(imagePath || image_path);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    if (is_premium !== undefined) {
      updates.push(`is_premium = $${paramIndex++}`);
      values.push(is_premium);
    }
    if (is_hidden !== undefined) {
      updates.push(`is_hidden = $${paramIndex++}`);
      values.push(is_hidden);
    }
    if (displayOrder !== undefined || display_order !== undefined) {
      updates.push(`display_order = $${paramIndex++}`);
      values.push(parseInt(displayOrder ?? display_order));
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const query = `UPDATE frames SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`;
    await pool.query(query, values);

    res.json({
      success: true,
      message: "Frame updated successfully",
    });
  } catch (error) {
    console.error("Update frame error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update frame",
    });
  }
});

/**
 * DELETE /api/frames/:id
 * Delete frame (Admin only) - PostgreSQL
 */
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    // Check if frame exists and get image path
    const checkResult = await pool.query(
      `SELECT * FROM frames WHERE id = $1`,
      [req.params.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Frame not found",
      });
    }

    const frame = checkResult.rows[0];

    // Delete frame image from storage if exists
    if (frame.image_path) {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const imagePath = path.join(process.cwd(), "public", frame.image_path);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (fsError) {
        console.error("Error deleting frame image:", fsError);
      }
    }

    // Delete frame from database
    await pool.query(`DELETE FROM frames WHERE id = $1`, [req.params.id]);

    console.log(`✅ Frame deleted: ${frame.name} (${frame.id})`);

    res.json({
      success: true,
      message: "Frame deleted successfully",
    });
  } catch (error) {
    console.error("Delete frame error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete frame",
    });
  }
});

/**
 * POST /api/frames/:id/like
 * Like/unlike frame
 */
router.post("/:id/like", verifyToken, async (req, res) => {
  try {
    const db = getFirestore();
    const frameDoc = await db
      .collection("custom_frames")
      .doc(req.params.id)
      .get();

    if (!frameDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Frame not found",
      });
    }

    const frameData = frameDoc.data();

    // Toggle like
    await db
      .collection("custom_frames")
      .doc(req.params.id)
      .update({
        likes: (frameData.likes || 0) + 1,
      });

    // Track analytics
    await db.collection("analytics_events").add({
      userId: req.user.uid,
      eventType: "frame_like",
      frameId: req.params.id,
      frameName: frameData.name,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Frame liked",
      likes: (frameData.likes || 0) + 1,
    });
  } catch (error) {
    console.error("Like frame error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to like frame",
    });
  }
});

export default router;
