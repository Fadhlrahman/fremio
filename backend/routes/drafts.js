import express from "express";
import { body, query } from "express-validator";
import { getFirestore } from "../config/firebase.js";
import { verifyToken } from "../middleware/auth.js";
import validate from "../middleware/validator.js";
import storageService from "../services/storageService.js";

const router = express.Router();

/**
 * GET /api/drafts
 * Get all drafts for current user
 */
router.get(
  "/",
  verifyToken,
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  async (req, res) => {
    try {
      const db = getFirestore();
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      let query = db
        .collection("drafts")
        .where("userId", "==", req.user.uid)
        .orderBy("updatedAt", "desc");

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

      const drafts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get total count
      const countSnapshot = await db
        .collection("drafts")
        .where("userId", "==", req.user.uid)
        .count()
        .get();

      res.json({
        success: true,
        drafts,
        pagination: {
          page,
          limit,
          total: countSnapshot.data().count,
          totalPages: Math.ceil(countSnapshot.data().count / limit),
        },
      });
    } catch (error) {
      console.error("Get drafts error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get drafts",
      });
    }
  }
);

/**
 * GET /api/drafts/:id
 * Get single draft
 */
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const db = getFirestore();
    const draftDoc = await db.collection("drafts").doc(req.params.id).get();

    if (!draftDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Draft not found",
      });
    }

    const draftData = draftDoc.data();

    // Check ownership
    if (draftData.userId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({
      success: true,
      draft: {
        id: draftDoc.id,
        ...draftData,
      },
    });
  } catch (error) {
    console.error("Get draft error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get draft",
    });
  }
});

/**
 * POST /api/drafts
 * Create new draft
 */
router.post(
  "/",
  verifyToken,
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("canvasBackground").optional().isString(),
    body("elements").isArray().withMessage("Elements must be an array"),
  ],
  validate,
  async (req, res) => {
    try {
      const db = getFirestore();
      const {
        title,
        canvasBackground,
        canvasWidth,
        canvasHeight,
        elements,
        exportConfig,
      } = req.body;

      const draftData = {
        userId: req.user.uid,
        title,
        canvasBackground: canvasBackground || "#ffffff",
        canvasWidth: canvasWidth || 1080,
        canvasHeight: canvasHeight || 1920,
        elements: elements || [],
        capturedPhotos: [],
        capturedVideos: [],
        exportConfig: exportConfig || {
          format: "png",
          quality: 0.9,
          includeWatermark: false,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const draftRef = await db.collection("drafts").add(draftData);

      res.status(201).json({
        success: true,
        message: "Draft created successfully",
        draftId: draftRef.id,
        draft: {
          id: draftRef.id,
          ...draftData,
        },
      });
    } catch (error) {
      console.error("Create draft error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create draft",
      });
    }
  }
);

/**
 * PUT /api/drafts/:id
 * Update draft
 */
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const db = getFirestore();
    const draftDoc = await db.collection("drafts").doc(req.params.id).get();

    if (!draftDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Draft not found",
      });
    }

    const draftData = draftDoc.data();

    // Check ownership
    if (draftData.userId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const updates = {
      updatedAt: new Date().toISOString(),
    };

    const {
      title,
      canvasBackground,
      elements,
      capturedPhotos,
      capturedVideos,
      exportConfig,
    } = req.body;

    if (title) updates.title = title;
    if (canvasBackground) updates.canvasBackground = canvasBackground;
    if (elements) updates.elements = elements;
    if (capturedPhotos) updates.capturedPhotos = capturedPhotos;
    if (capturedVideos) updates.capturedVideos = capturedVideos;
    if (exportConfig) updates.exportConfig = exportConfig;
    if (capturedPhotos || capturedVideos) {
      updates.lastCapturedAt = new Date().toISOString();
    }

    await db.collection("drafts").doc(req.params.id).update(updates);

    res.json({
      success: true,
      message: "Draft updated successfully",
    });
  } catch (error) {
    console.error("Update draft error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update draft",
    });
  }
});

/**
 * DELETE /api/drafts/:id
 * Delete draft
 */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const db = getFirestore();
    const draftDoc = await db.collection("drafts").doc(req.params.id).get();

    if (!draftDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Draft not found",
      });
    }

    const draftData = draftDoc.data();

    // Check ownership
    if (draftData.userId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Delete associated files from storage
    if (draftData.capturedPhotos && draftData.capturedPhotos.length > 0) {
      for (const photoUrl of draftData.capturedPhotos) {
        await storageService.deleteFileByUrl(photoUrl);
      }
    }

    if (draftData.capturedVideos && draftData.capturedVideos.length > 0) {
      for (const video of draftData.capturedVideos) {
        if (video.videoUrl)
          await storageService.deleteFileByUrl(video.videoUrl);
        if (video.thumbnailUrl)
          await storageService.deleteFileByUrl(video.thumbnailUrl);
      }
    }

    // Delete draft document
    await db.collection("drafts").doc(req.params.id).delete();

    res.json({
      success: true,
      message: "Draft deleted successfully",
    });
  } catch (error) {
    console.error("Delete draft error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete draft",
    });
  }
});

export default router;
