import express from "express";
import { body } from "express-validator";
import { getFirestore } from "../config/firebase.js";
import { verifyToken, requireAdmin, optionalAuth } from "../middleware/auth.js";
import validate from "../middleware/validator.js";

const router = express.Router();

/**
 * POST /api/analytics/track
 * Track analytics event
 */
router.post(
  "/track",
  optionalAuth,
  [
    body("eventType")
      .isIn([
        "frame_view",
        "frame_use",
        "photo_download",
        "video_download",
        "frame_like",
      ])
      .withMessage("Invalid event type"),
    body("frameId").optional().isString(),
    body("frameName").optional().isString(),
    body("draftId").optional().isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const db = getFirestore();
      const { eventType, frameId, frameName, draftId } = req.body;

      const eventData = {
        userId: req.user ? req.user.uid : null,
        eventType,
        frameId: frameId || null,
        frameName: frameName || null,
        draftId: draftId || null,
        sessionId: req.headers["x-session-id"] || null,
        deviceType: req.headers["user-agent"]?.includes("Mobile")
          ? "mobile"
          : "desktop",
        browser: req.headers["user-agent"] || "unknown",
        timestamp: new Date().toISOString(),
      };

      await db.collection("analytics_events").add(eventData);

      // Update frame stats if applicable
      if (
        frameId &&
        ["frame_use", "photo_download", "video_download"].includes(eventType)
      ) {
        const frameDoc = await db
          .collection("custom_frames")
          .doc(frameId)
          .get();

        if (frameDoc.exists) {
          const updates = {};

          if (eventType === "frame_use") {
            updates.uses = (frameDoc.data().uses || 0) + 1;
          } else if (
            eventType === "photo_download" ||
            eventType === "video_download"
          ) {
            updates.downloads = (frameDoc.data().downloads || 0) + 1;
          }

          await db.collection("custom_frames").doc(frameId).update(updates);
        }
      }

      // Update user stats
      if (
        req.user &&
        (eventType === "photo_download" || eventType === "video_download")
      ) {
        const userDoc = await db.collection("users").doc(req.user.uid).get();

        if (userDoc.exists) {
          const updates = {};

          if (eventType === "photo_download") {
            updates.totalPhotosDownloaded =
              (userDoc.data().totalPhotosDownloaded || 0) + 1;
          } else if (eventType === "video_download") {
            updates.totalVideosDownloaded =
              (userDoc.data().totalVideosDownloaded || 0) + 1;
          }

          await db.collection("users").doc(req.user.uid).update(updates);
        }
      }

      res.json({
        success: true,
        message: "Event tracked successfully",
      });
    } catch (error) {
      console.error("Track event error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to track event",
      });
    }
  }
);

/**
 * GET /api/analytics/frame/:frameId
 * Get frame analytics (Admin only)
 */
router.get("/frame/:frameId", verifyToken, requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const frameId = req.params.frameId;

    // Get frame stats
    const frameDoc = await db.collection("custom_frames").doc(frameId).get();

    if (!frameDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Frame not found",
      });
    }

    const frameData = frameDoc.data();

    // Get analytics events
    const eventsSnapshot = await db
      .collection("analytics_events")
      .where("frameId", "==", frameId)
      .orderBy("timestamp", "desc")
      .limit(100)
      .get();

    const events = eventsSnapshot.docs.map((doc) => doc.data());

    // Calculate stats
    const stats = {
      totalViews: frameData.views || 0,
      totalUses: frameData.uses || 0,
      totalDownloads: frameData.downloads || 0,
      totalLikes: frameData.likes || 0,
      eventsByType: {},
      deviceBreakdown: { mobile: 0, desktop: 0 },
      recentEvents: events.slice(0, 20),
    };

    events.forEach((event) => {
      // Count by event type
      stats.eventsByType[event.eventType] =
        (stats.eventsByType[event.eventType] || 0) + 1;

      // Count by device
      if (event.deviceType === "mobile") {
        stats.deviceBreakdown.mobile++;
      } else {
        stats.deviceBreakdown.desktop++;
      }
    });

    res.json({
      success: true,
      frameId,
      frameName: frameData.name,
      stats,
    });
  } catch (error) {
    console.error("Get frame analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get frame analytics",
    });
  }
});

/**
 * GET /api/analytics/overview
 * Get platform overview analytics (Admin only)
 */
router.get("/overview", verifyToken, requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();

    // Get totals
    const [usersCount, framesCount, draftsCount, eventsCount] =
      await Promise.all([
        db.collection("users").count().get(),
        db.collection("custom_frames").count().get(),
        db.collection("drafts").count().get(),
        db.collection("analytics_events").count().get(),
      ]);

    // Get top frames by views
    const topFramesSnapshot = await db
      .collection("custom_frames")
      .where("status", "==", "approved")
      .orderBy("views", "desc")
      .limit(10)
      .get();

    const topFrames = topFramesSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      views: doc.data().views || 0,
      uses: doc.data().uses || 0,
      downloads: doc.data().downloads || 0,
      likes: doc.data().likes || 0,
    }));

    res.json({
      success: true,
      overview: {
        totalUsers: usersCount.data().count,
        totalFrames: framesCount.data().count,
        totalDrafts: draftsCount.data().count,
        totalEvents: eventsCount.data().count,
        topFrames,
      },
    });
  } catch (error) {
    console.error("Get overview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get analytics overview",
    });
  }
});

export default router;
