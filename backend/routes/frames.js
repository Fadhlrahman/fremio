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

const router = express.Router();

/**
 * GET /api/frames
 * Get all public frames with pagination and filtering
 */
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be >= 1"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be 1-100"),
    query("category").optional().isString(),
    query("status")
      .optional()
      .isIn(["draft", "pending", "approved", "rejected"]),
    query("featured").optional().isBoolean(),
  ],
  validate,
  optionalAuth,
  async (req, res) => {
    try {
      const db = getFirestore();
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const category = req.query.category;
      const status = req.query.status || "approved";
      const featured = req.query.featured;

      let query = db.collection("custom_frames");

      // Apply filters
      query = query.where("status", "==", status);

      if (category) {
        query = query.where("category", "==", category);
      }

      if (featured === "true") {
        query = query.where("isFeatured", "==", true);
      }

      // Sort by creation date
      query = query.orderBy("createdAt", "desc");

      // Pagination
      const offset = (page - 1) * limit;
      if (offset > 0) {
        const snapshot = await query.limit(offset).get();
        if (!snapshot.empty) {
          const lastDoc = snapshot.docs[snapshot.docs.length - 1];
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.limit(limit).get();

      const frames = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get total count
      const countSnapshot = await db
        .collection("custom_frames")
        .where("status", "==", status)
        .count()
        .get();

      res.json({
        success: true,
        frames,
        pagination: {
          page,
          limit,
          total: countSnapshot.data().count,
          totalPages: Math.ceil(countSnapshot.data().count / limit),
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
 * Get single frame by ID
 */
router.get("/:id", optionalAuth, async (req, res) => {
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

    // Increment view count
    await db
      .collection("custom_frames")
      .doc(req.params.id)
      .update({
        views: (frameData.views || 0) + 1,
      });

    // Track analytics
    if (req.user) {
      await db.collection("analytics_events").add({
        userId: req.user.uid,
        eventType: "frame_view",
        frameId: req.params.id,
        frameName: frameData.name,
        sessionId: req.headers["x-session-id"] || null,
        deviceType: req.headers["user-agent"]?.includes("Mobile")
          ? "mobile"
          : "desktop",
        browser: req.headers["user-agent"] || "unknown",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      frame: {
        id: frameDoc.id,
        ...frameData,
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
 * POST /api/frames
 * Create new frame (Admin/Kreator only)
 */
router.post(
  "/",
  verifyToken,
  requireKreator,
  uploadImage,
  handleUploadError,
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("category")
      .isIn(["custom", "fremio-series", "inspired-by", "seasonal"])
      .withMessage("Invalid category"),
    body("maxCaptures")
      .isInt({ min: 1, max: 10 })
      .withMessage("maxCaptures must be 1-10"),
    body("slots")
      .isArray({ min: 1 })
      .withMessage("At least one slot is required"),
  ],
  validate,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Frame image is required",
        });
      }

      const db = getFirestore();
      const {
        name,
        description,
        category,
        maxCaptures,
        duplicatePhotos,
        slots,
        layout,
        tags,
      } = req.body;

      // Parse JSON fields
      const parsedSlots = typeof slots === "string" ? JSON.parse(slots) : slots;
      const parsedLayout = layout
        ? typeof layout === "string"
          ? JSON.parse(layout)
          : layout
        : null;
      const parsedTags = tags
        ? typeof tags === "string"
          ? JSON.parse(tags)
          : tags
        : [];

      // Upload frame image with thumbnail
      const basePath = `frames/${Date.now()}`;
      const { imageUrl, thumbnailUrl } =
        await storageService.uploadImageWithThumbnail(
          req.file.buffer,
          basePath
        );

      // Get user data
      const userDoc = await db.collection("users").doc(req.user.uid).get();
      const userData = userDoc.data();

      // Create frame document
      const frameData = {
        name,
        description: description || "",
        category,
        imagePath: imageUrl,
        thumbnailUrl,
        maxCaptures: parseInt(maxCaptures),
        duplicatePhotos: duplicatePhotos === "true",
        slots: parsedSlots,
        layout: parsedLayout || {
          aspectRatio: "9:16",
          orientation: "portrait",
          backgroundColor: "#ffffff",
        },
        createdBy: req.user.uid,
        creatorName: userData.name || "Unknown",
        status: req.userRole === "admin" ? "approved" : "pending",
        views: 0,
        uses: 0,
        downloads: 0,
        likes: 0,
        isPublic: true,
        isFeatured: false,
        tags: parsedTags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const frameRef = await db.collection("custom_frames").add(frameData);

      // Update user stats
      await db
        .collection("users")
        .doc(req.user.uid)
        .update({
          totalFramesCreated: (userData.totalFramesCreated || 0) + 1,
        });

      res.status(201).json({
        success: true,
        message: "Frame created successfully",
        frameId: frameRef.id,
        frame: {
          id: frameRef.id,
          ...frameData,
        },
      });
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
 * Update frame (Admin or frame owner)
 */
router.put("/:id", verifyToken, requireKreator, async (req, res) => {
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

    // Check permission
    if (req.userRole !== "admin" && frameData.createdBy !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this frame",
      });
    }

    const updates = {
      updatedAt: new Date().toISOString(),
    };

    const {
      name,
      description,
      category,
      maxCaptures,
      slots,
      layout,
      tags,
      isFeatured,
      status,
    } = req.body;

    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category) updates.category = category;
    if (maxCaptures) updates.maxCaptures = parseInt(maxCaptures);
    if (slots)
      updates.slots = typeof slots === "string" ? JSON.parse(slots) : slots;
    if (layout)
      updates.layout = typeof layout === "string" ? JSON.parse(layout) : layout;
    if (tags) updates.tags = typeof tags === "string" ? JSON.parse(tags) : tags;

    // Only admin can update these fields
    if (req.userRole === "admin") {
      if (isFeatured !== undefined) updates.isFeatured = isFeatured;
      if (status) updates.status = status;
    }

    await db.collection("custom_frames").doc(req.params.id).update(updates);

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
 * Delete frame (Admin only)
 */
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
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

    // Delete frame images from storage
    if (frameData.imagePath) {
      await storageService.deleteFileByUrl(frameData.imagePath);
    }
    if (frameData.thumbnailUrl) {
      await storageService.deleteFileByUrl(frameData.thumbnailUrl);
    }

    // Delete frame document
    await db.collection("custom_frames").doc(req.params.id).delete();

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
