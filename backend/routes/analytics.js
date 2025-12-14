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

/**
 * POST /api/analytics/track/session
 * Track session start/end
 */
router.post("/track/session", optionalAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const { sessionId, action, referrer, landingPage, duration } = req.body;

    const sessionData = {
      sessionId: sessionId || null,
      action: action || 'unknown',
      referrer: referrer || null,
      landingPage: landingPage || null,
      duration: duration || null,
      userId: req.user ? req.user.uid : null,
      deviceType: req.headers["user-agent"]?.includes("Mobile") ? "mobile" : "desktop",
      browser: req.headers["user-agent"] || "unknown",
      ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || null,
      timestamp: new Date().toISOString(),
    };

    await db.collection("analytics_sessions").add(sessionData);

    res.json({
      success: true,
      message: "Session tracked successfully",
    });
  } catch (error) {
    console.error("Track session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track session",
    });
  }
});

/**
 * POST /api/analytics/track/event
 * Track generic events
 */
router.post("/track/event", optionalAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const { eventName, eventCategory, eventData, sessionId, pageUrl, pageTitle, timestamp } = req.body;

    const event = {
      eventName: eventName || 'unknown',
      eventCategory: eventCategory || 'general',
      eventData: eventData || {},
      sessionId: sessionId || null,
      pageUrl: pageUrl || null,
      pageTitle: pageTitle || null,
      userId: req.user ? req.user.uid : null,
      deviceType: req.headers["user-agent"]?.includes("Mobile") ? "mobile" : "desktop",
      browser: req.headers["user-agent"] || "unknown",
      ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || null,
      timestamp: timestamp || new Date().toISOString(),
      serverTimestamp: new Date().toISOString(),
    };

    await db.collection("analytics_events").add(event);

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
});

/**
 * POST /api/analytics/track/download
 * Track download events
 */
router.post("/track/download", optionalAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const { frameId, frameName, format, hasWatermark, sessionId } = req.body;

    const downloadData = {
      frameId: frameId || null,
      frameName: frameName || null,
      format: format || 'png',
      hasWatermark: hasWatermark || false,
      sessionId: sessionId || null,
      userId: req.user ? req.user.uid : null,
      deviceType: req.headers["user-agent"]?.includes("Mobile") ? "mobile" : "desktop",
      browser: req.headers["user-agent"] || "unknown",
      ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || null,
      timestamp: new Date().toISOString(),
    };

    await db.collection("analytics_downloads").add(downloadData);

    // Update frame download count if frameId exists
    if (frameId) {
      try {
        const frameDoc = await db.collection("custom_frames").doc(frameId).get();
        if (frameDoc.exists) {
          await db.collection("custom_frames").doc(frameId).update({
            downloads: (frameDoc.data().downloads || 0) + 1
          });
        }
      } catch (e) {
        console.warn("Failed to update frame download count:", e.message);
      }
    }

    res.json({
      success: true,
      message: "Download tracked successfully",
    });
  } catch (error) {
    console.error("Track download error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track download",
    });
  }
});

/**
 * POST /api/analytics/track/pageview
 * Track page views
 */
router.post("/track/pageview", optionalAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const { pageUrl, pageTitle, sessionId, referrer } = req.body;

    const pageviewData = {
      pageUrl: pageUrl || null,
      pageTitle: pageTitle || null,
      sessionId: sessionId || null,
      referrer: referrer || null,
      userId: req.user ? req.user.uid : null,
      deviceType: req.headers["user-agent"]?.includes("Mobile") ? "mobile" : "desktop",
      browser: req.headers["user-agent"] || "unknown",
      ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || null,
      timestamp: new Date().toISOString(),
    };

    await db.collection("analytics_pageviews").add(pageviewData);

    res.json({
      success: true,
      message: "Pageview tracked successfully",
    });
  } catch (error) {
    console.error("Track pageview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track pageview",
    });
  }
});

/**
 * POST /api/analytics/track/performance
 * Track performance metrics
 */
router.post("/track/performance", optionalAuth, async (req, res) => {
  try {
    const db = getFirestore();
    const { metric, value, sessionId, pageUrl } = req.body;

    const perfData = {
      metric: metric || 'unknown',
      value: value || 0,
      sessionId: sessionId || null,
      pageUrl: pageUrl || null,
      userId: req.user ? req.user.uid : null,
      deviceType: req.headers["user-agent"]?.includes("Mobile") ? "mobile" : "desktop",
      timestamp: new Date().toISOString(),
    };

    await db.collection("analytics_performance").add(perfData);

    res.json({
      success: true,
      message: "Performance metric tracked successfully",
    });
  } catch (error) {
    console.error("Track performance error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track performance",
    });
  }
});

// ==================== DASHBOARD ENDPOINTS ====================

/**
 * Helper function to get date range
 */
const getDateRange = (days) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
};

/**
 * GET /api/analytics/dashboard/overview
 * Get dashboard overview stats
 */
router.get("/dashboard/overview", verifyToken, requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const days = parseInt(req.query.days) || 30;
    const { startDate, endDate } = getDateRange(days);

    // Get basic counts
    const [usersSnapshot, framesSnapshot, sessionsSnapshot, downloadsSnapshot] = await Promise.all([
      db.collection("users").count().get(),
      db.collection("custom_frames").count().get(),
      db.collection("analytics_sessions").where("timestamp", ">=", startDate).count().get(),
      db.collection("analytics_downloads").where("timestamp", ">=", startDate).count().get(),
    ]);

    // Get events in date range
    const eventsSnapshot = await db.collection("analytics_events")
      .where("timestamp", ">=", startDate)
      .limit(1000)
      .get();
    
    const events = eventsSnapshot.docs.map(doc => doc.data());
    
    // Calculate unique users from events
    const uniqueUserIds = new Set(events.filter(e => e.userId).map(e => e.userId));
    
    // Get photos taken count
    const photosTaken = events.filter(e => 
      e.eventName === 'photo_taken' || e.eventCategory === 'photo'
    ).length;

    // Get shares count
    const shares = events.filter(e => 
      e.eventName === 'share' || e.eventCategory === 'social'
    ).length;

    // Get top frames
    const topFramesSnapshot = await db.collection("custom_frames")
      .orderBy("downloads", "desc")
      .limit(10)
      .get();

    const topFrames = topFramesSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      downloads: doc.data().downloads || 0,
      views: doc.data().views || 0,
    }));

    res.json({
      success: true,
      totalUsers: usersSnapshot.data().count,
      totalFrames: framesSnapshot.data().count,
      totalSessions: sessionsSnapshot.data().count,
      downloads: downloadsSnapshot.data().count,
      uniqueUsers: uniqueUserIds.size,
      photosTaken,
      shares,
      conversionRate: sessionsSnapshot.data().count > 0 
        ? ((downloadsSnapshot.data().count / sessionsSnapshot.data().count) * 100).toFixed(2)
        : 0,
      topFrames,
    });
  } catch (error) {
    console.error("Dashboard overview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard overview",
    });
  }
});

/**
 * GET /api/analytics/dashboard/user-growth
 * Get user growth over time
 */
router.get("/dashboard/user-growth", verifyToken, requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const days = parseInt(req.query.days) || 30;
    const { startDate } = getDateRange(days);

    const usersSnapshot = await db.collection("users")
      .where("createdAt", ">=", startDate)
      .orderBy("createdAt", "asc")
      .get();

    // Group by date
    const growth = {};
    usersSnapshot.docs.forEach(doc => {
      const date = doc.data().createdAt?.split('T')[0] || new Date().toISOString().split('T')[0];
      growth[date] = (growth[date] || 0) + 1;
    });

    res.json({
      success: true,
      data: Object.entries(growth).map(([date, count]) => ({ date, newUsers: count })),
      total: usersSnapshot.size,
    });
  } catch (error) {
    console.error("User growth error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user growth data",
    });
  }
});

/**
 * GET /api/analytics/dashboard/dau
 * Get daily active users
 */
router.get("/dashboard/dau", verifyToken, requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const days = parseInt(req.query.days) || 30;
    const { startDate } = getDateRange(days);

    const sessionsSnapshot = await db.collection("analytics_sessions")
      .where("timestamp", ">=", startDate)
      .where("action", "==", "start")
      .get();

    // Group by date and count unique users
    const dauMap = {};
    sessionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const date = data.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0];
      if (!dauMap[date]) {
        dauMap[date] = new Set();
      }
      dauMap[date].add(data.userId || data.sessionId);
    });

    res.json({
      success: true,
      data: Object.entries(dauMap).map(([date, users]) => ({ 
        date, 
        activeUsers: users.size 
      })).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (error) {
    console.error("DAU error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get DAU data",
    });
  }
});

/**
 * GET /api/analytics/dashboard/downloads
 * Get download analytics
 */
router.get("/dashboard/downloads", verifyToken, requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const days = parseInt(req.query.days) || 30;
    const { startDate } = getDateRange(days);

    const downloadsSnapshot = await db.collection("analytics_downloads")
      .where("timestamp", ">=", startDate)
      .get();

    // Group by date
    const downloadsByDate = {};
    const downloadsByFrame = {};
    
    downloadsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const date = data.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0];
      downloadsByDate[date] = (downloadsByDate[date] || 0) + 1;
      
      if (data.frameName) {
        downloadsByFrame[data.frameName] = (downloadsByFrame[data.frameName] || 0) + 1;
      }
    });

    res.json({
      success: true,
      total: downloadsSnapshot.size,
      byDate: Object.entries(downloadsByDate)
        .map(([date, count]) => ({ date, downloads: count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topFrames: Object.entries(downloadsByFrame)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, downloads]) => ({ name, downloads })),
    });
  } catch (error) {
    console.error("Downloads analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get download analytics",
    });
  }
});

/**
 * GET /api/analytics/dashboard/retention
 * Get user retention data
 */
router.get("/dashboard/retention", verifyToken, requireAdmin, async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks) || 12;
    
    // Simplified retention - just return placeholder for now
    const retentionData = [];
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      retentionData.unshift({
        week: i + 1,
        date: weekStart.toISOString().split('T')[0],
        retentionRate: Math.max(100 - (i * 5), 10) // Placeholder
      });
    }

    res.json({
      success: true,
      data: retentionData,
    });
  } catch (error) {
    console.error("Retention error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get retention data",
    });
  }
});

/**
 * GET /api/analytics/dashboard/traffic
 * Get traffic sources
 */
router.get("/dashboard/traffic", verifyToken, requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const days = parseInt(req.query.days) || 30;
    const { startDate } = getDateRange(days);

    const sessionsSnapshot = await db.collection("analytics_sessions")
      .where("timestamp", ">=", startDate)
      .where("action", "==", "start")
      .limit(1000)
      .get();

    const sources = {};
    sessionsSnapshot.docs.forEach(doc => {
      const referrer = doc.data().referrer || 'direct';
      let source = 'Direct';
      
      if (referrer.includes('google')) source = 'Google';
      else if (referrer.includes('facebook') || referrer.includes('fb.')) source = 'Facebook';
      else if (referrer.includes('instagram')) source = 'Instagram';
      else if (referrer.includes('twitter') || referrer.includes('t.co')) source = 'Twitter';
      else if (referrer.includes('tiktok')) source = 'TikTok';
      else if (referrer && referrer !== 'direct') source = 'Other';
      
      sources[source] = (sources[source] || 0) + 1;
    });

    res.json({
      success: true,
      data: Object.entries(sources)
        .map(([source, visits]) => ({ source, visits }))
        .sort((a, b) => b.visits - a.visits),
    });
  } catch (error) {
    console.error("Traffic sources error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get traffic sources",
    });
  }
});

/**
 * GET /api/analytics/dashboard/revenue
 * Get revenue analytics (placeholder)
 */
router.get("/dashboard/revenue", verifyToken, requireAdmin, async (req, res) => {
  try {
    res.json({
      success: true,
      totalRevenue: 0,
      data: [],
      message: "Revenue tracking not yet implemented",
    });
  } catch (error) {
    console.error("Revenue error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get revenue data",
    });
  }
});

/**
 * GET /api/analytics/dashboard/pages
 * Get top pages
 */
router.get("/dashboard/pages", verifyToken, requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const days = parseInt(req.query.days) || 30;
    const limit = parseInt(req.query.limit) || 20;
    const { startDate } = getDateRange(days);

    const pageviewsSnapshot = await db.collection("analytics_pageviews")
      .where("timestamp", ">=", startDate)
      .limit(5000)
      .get();

    const pages = {};
    pageviewsSnapshot.docs.forEach(doc => {
      const url = doc.data().pageUrl || '/';
      pages[url] = (pages[url] || 0) + 1;
    });

    res.json({
      success: true,
      data: Object.entries(pages)
        .map(([url, views]) => ({ url, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, limit),
    });
  } catch (error) {
    console.error("Top pages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get top pages",
    });
  }
});

/**
 * GET /api/analytics/dashboard/devices
 * Get device statistics
 */
router.get("/dashboard/devices", verifyToken, requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const days = parseInt(req.query.days) || 30;
    const { startDate } = getDateRange(days);

    const sessionsSnapshot = await db.collection("analytics_sessions")
      .where("timestamp", ">=", startDate)
      .limit(5000)
      .get();

    const devices = { mobile: 0, desktop: 0, tablet: 0 };
    sessionsSnapshot.docs.forEach(doc => {
      const deviceType = doc.data().deviceType || 'desktop';
      if (deviceType === 'mobile') devices.mobile++;
      else if (deviceType === 'tablet') devices.tablet++;
      else devices.desktop++;
    });

    res.json({
      success: true,
      data: Object.entries(devices)
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count),
    });
  } catch (error) {
    console.error("Device stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get device stats",
    });
  }
});

/**
 * GET /api/analytics/dashboard/realtime
 * Get realtime stats (active users in last 5 minutes)
 */
router.get("/dashboard/realtime", verifyToken, requireAdmin, async (req, res) => {
  try {
    const db = getFirestore();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const recentSessionsSnapshot = await db.collection("analytics_sessions")
      .where("timestamp", ">=", fiveMinutesAgo)
      .get();

    const activeUsers = new Set();
    recentSessionsSnapshot.docs.forEach(doc => {
      activeUsers.add(doc.data().sessionId || doc.data().userId);
    });

    res.json({
      success: true,
      activeUsers: activeUsers.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Realtime stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get realtime stats",
    });
  }
});

export default router;
