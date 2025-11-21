import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../config/firebase";
import { COLLECTIONS } from "../config/firebaseCollections";

/**
 * Analytics Service
 * Track and analyze platform usage
 * Supports both Firebase and localStorage modes
 */

const FRAME_USAGE_KEY = "frame_usage";
const ACTIVITIES_KEY = "recent_activities";

/**
 * Get current user ID (localStorage helper)
 */
const getCurrentUserId = () => {
  const userStr = localStorage.getItem("currentUser");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.id || user.email || "anonymous";
    } catch (e) {
      console.error("Error parsing user:", e);
    }
  }

  let anonymousId = localStorage.getItem("anonymousUserId");
  if (!anonymousId) {
    anonymousId = `anon_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    localStorage.setItem("anonymousUserId", anonymousId);
  }
  return anonymousId;
};

/**
 * Get all frame usage data (localStorage)
 */
export const getAllFrameUsage = () => {
  try {
    const usage = JSON.parse(localStorage.getItem(FRAME_USAGE_KEY) || "[]");
    return usage;
  } catch (error) {
    console.error("Error getting frame usage:", error);
    return [];
  }
};

/**
 * Log activity to recent activities (localStorage)
 */
const logActivity = (type, frameId, frameName) => {
  try {
    const userId = getCurrentUserId();
    const activities = JSON.parse(localStorage.getItem(ACTIVITIES_KEY) || "[]");

    let userName = "Anonymous User";
    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        userName = user.name || user.email || "Anonymous User";
      } catch (e) {}
    }

    const activity = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      userId,
      userName,
      frameId,
      frameName: frameName || frameId,
      timestamp: new Date().toISOString(),
      time: getRelativeTime(new Date()),
    };

    activities.unshift(activity);
    const trimmedActivities = activities.slice(0, 100);
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(trimmedActivities));

    console.log(`📝 Logged activity: ${type} for frame ${frameId}`);
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

/**
 * Get relative time string
 */
const getRelativeTime = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
};

/**
 * Log an analytics event
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} { success, eventId, message }
 */
export async function logAnalyticsEvent(eventData) {
  try {
    const { eventType, userId, frameId, kreatorId, metadata } = eventData;

    const eventRef = await addDoc(collection(db, COLLECTIONS.analytics), {
      eventType,
      userId: userId || null,
      frameId: frameId || null,
      kreatorId: kreatorId || null,
      metadata: metadata || {},
      timestamp: serverTimestamp(),
    });

    return {
      success: true,
      eventId: eventRef.id,
      message: "Event logged",
    };
  } catch (error) {
    console.error("Error logging analytics event:", error);
    return {
      success: false,
      message: error.message || "Failed to log event",
    };
  }
}

/**
 * Track frame view
 * @param {string} frameId - Frame ID
 * @param {string} userId - User ID (optional)
 * @param {string} frameName - Frame name (optional)
 */
export async function trackFrameView(frameId, userId = null, frameName = null) {
  if (!isFirebaseConfigured) {
    // LocalStorage mode
    try {
      const currentUserId = userId || getCurrentUserId();
      const usage = getAllFrameUsage();

      let record = usage.find(
        (u) => u.frameId === frameId && u.userId === currentUserId
      );

      if (record) {
        record.views = (record.views || 0) + 1;
        record.lastViewedAt = new Date().toISOString();
      } else {
        record = {
          id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: currentUserId,
          frameId,
          frameName: frameName || frameId,
          views: 1,
          downloads: 0,
          likes: 0,
          createdAt: new Date().toISOString(),
          lastViewedAt: new Date().toISOString(),
        };
        usage.push(record);
      }

      localStorage.setItem(FRAME_USAGE_KEY, JSON.stringify(usage));
      logActivity("view", frameId, frameName);

      console.log(`📊 Tracked view for frame: ${frameId}`);
      return { success: true };
    } catch (error) {
      console.error("Error tracking frame view:", error);
      return { success: false, message: error.message };
    }
  }

  // Firebase mode
  return await logAnalyticsEvent({
    eventType: "frame_view",
    frameId,
    userId,
  });
}

/**
 * Track frame usage (when user creates moment with frame)
 * @param {string} frameId - Frame ID
 * @param {string} userId - User ID
 * @param {string} kreatorId - Kreator ID who created the frame
 */
export async function trackFrameUsage(frameId, userId, kreatorId) {
  return await logAnalyticsEvent({
    eventType: "frame_usage",
    frameId,
    userId,
    kreatorId,
  });
}

/**
 * Track frame like
 * @param {string} frameId - Frame ID
 * @param {string} userId - User ID
 * @param {string} kreatorId - Kreator ID
 * @param {string} frameName - Frame name (optional)
 */
export async function trackFrameLike(
  frameId,
  userId,
  kreatorId,
  frameName = null
) {
  if (!isFirebaseConfigured) {
    // LocalStorage mode
    try {
      const currentUserId = userId || getCurrentUserId();
      const usage = getAllFrameUsage();

      let record = usage.find(
        (u) => u.frameId === frameId && u.userId === currentUserId
      );

      if (record) {
        const isLiked = record.likes > 0;
        record.likes = isLiked ? 0 : 1;
        record.lastLikedAt = isLiked ? null : new Date().toISOString();
      } else {
        record = {
          id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: currentUserId,
          frameId,
          frameName: frameName || frameId,
          views: 0,
          downloads: 0,
          likes: 1,
          createdAt: new Date().toISOString(),
          lastLikedAt: new Date().toISOString(),
        };
        usage.push(record);
      }

      localStorage.setItem(FRAME_USAGE_KEY, JSON.stringify(usage));

      if (record.likes > 0) {
        logActivity("like", frameId, frameName);
      }

      console.log(
        `📊 Tracked like for frame: ${frameId} (${
          record.likes > 0 ? "liked" : "unliked"
        })`
      );
      return { success: true, liked: record.likes > 0 };
    } catch (error) {
      console.error("Error tracking frame like:", error);
      return { success: false, message: error.message };
    }
  }

  // Firebase mode
  return await logAnalyticsEvent({
    eventType: "frame_like",
    frameId,
    userId,
    kreatorId,
  });
}

/**
 * Track frame download
 * @param {string} frameId - Frame ID
 * @param {string} userId - User ID
 * @param {string} kreatorId - Kreator ID
 * @param {string} frameName - Frame name (optional)
 */
export async function trackFrameDownload(
  frameId,
  userId,
  kreatorId,
  frameName = null
) {
  if (!isFirebaseConfigured) {
    // LocalStorage mode
    try {
      const currentUserId = userId || getCurrentUserId();
      const usage = getAllFrameUsage();

      let record = usage.find(
        (u) => u.frameId === frameId && u.userId === currentUserId
      );

      if (record) {
        record.downloads = (record.downloads || 0) + 1;
        record.lastDownloadedAt = new Date().toISOString();
      } else {
        record = {
          id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: currentUserId,
          frameId,
          frameName: frameName || frameId,
          views: 0,
          downloads: 1,
          likes: 0,
          createdAt: new Date().toISOString(),
          lastDownloadedAt: new Date().toISOString(),
        };
        usage.push(record);
      }

      localStorage.setItem(FRAME_USAGE_KEY, JSON.stringify(usage));
      logActivity("download", frameId, frameName);

      console.log(`📊 Tracked download for frame: ${frameId}`);
      return { success: true };
    } catch (error) {
      console.error("Error tracking frame download:", error);
      return { success: false, message: error.message };
    }
  }

  // Firebase mode
  return await logAnalyticsEvent({
    eventType: "frame_download",
    frameId,
    userId,
    kreatorId,
  });
}

/**
 * Check if user has liked a frame
 * @param {string} frameId - Frame ID
 * @param {string} userId - User ID (optional)
 * @returns {boolean} True if liked
 */
export const hasUserLikedFrame = (frameId, userId = null) => {
  try {
    const currentUserId = userId || getCurrentUserId();
    const usage = getAllFrameUsage();
    const record = usage.find(
      (u) => u.frameId === frameId && u.userId === currentUserId
    );
    return record ? record.likes > 0 : false;
  } catch (error) {
    console.error("Error checking like status:", error);
    return false;
  }
};

/**
 * Get frame stats (localStorage)
 * @param {string} frameId - Frame ID
 * @returns {Object} Stats
 */
export const getFrameStats = (frameId) => {
  try {
    const usage = getAllFrameUsage();
    const frameRecords = usage.filter((u) => u.frameId === frameId);

    return {
      totalViews: frameRecords.reduce((sum, r) => sum + (r.views || 0), 0),
      totalDownloads: frameRecords.reduce(
        (sum, r) => sum + (r.downloads || 0),
        0
      ),
      totalLikes: frameRecords.reduce((sum, r) => sum + (r.likes || 0), 0),
      uniqueUsers: frameRecords.length,
    };
  } catch (error) {
    console.error("Error getting frame stats:", error);
    return { totalViews: 0, totalDownloads: 0, totalLikes: 0, uniqueUsers: 0 };
  }
};

/**
 * Get all recent activities
 */
export const getAllActivities = () => {
  try {
    const activities = JSON.parse(localStorage.getItem(ACTIVITIES_KEY) || "[]");
    return activities;
  } catch (error) {
    console.error("Error getting activities:", error);
    return [];
  }
};

/**
 * Get analytics for a specific frame
 * @param {string} frameId - Frame ID
 * @returns {Promise<Object>} Frame analytics
 */
export async function getFrameAnalytics(frameId) {
  try {
    const q = query(
      collection(db, COLLECTIONS.analytics),
      where("frameId", "==", frameId)
    );

    const querySnapshot = await getDocs(q);
    const events = querySnapshot.docs.map((doc) => doc.data());

    const analytics = {
      totalViews: events.filter((e) => e.eventType === "frame_view").length,
      totalUsage: events.filter((e) => e.eventType === "frame_usage").length,
      totalLikes: events.filter((e) => e.eventType === "frame_like").length,
      totalDownloads: events.filter((e) => e.eventType === "frame_download")
        .length,
    };

    return analytics;
  } catch (error) {
    console.error("Error fetching frame analytics:", error);
    return { totalViews: 0, totalUsage: 0, totalLikes: 0, totalDownloads: 0 };
  }
}

/**
 * Get analytics for a kreator
 * @param {string} kreatorId - Kreator ID
 * @returns {Promise<Object>} Kreator analytics
 */
export async function getKreatorAnalytics(kreatorId) {
  try {
    const q = query(
      collection(db, COLLECTIONS.analytics),
      where("kreatorId", "==", kreatorId)
    );

    const querySnapshot = await getDocs(q);
    const events = querySnapshot.docs.map((doc) => doc.data());

    const analytics = {
      totalViews: events.filter((e) => e.eventType === "frame_view").length,
      totalUsage: events.filter((e) => e.eventType === "frame_usage").length,
      totalLikes: events.filter((e) => e.eventType === "frame_like").length,
      totalDownloads: events.filter((e) => e.eventType === "frame_download")
        .length,
      uniqueUsers: new Set(events.map((e) => e.userId).filter(Boolean)).size,
    };

    return analytics;
  } catch (error) {
    console.error("Error fetching kreator analytics:", error);
    return {
      totalViews: 0,
      totalUsage: 0,
      totalLikes: 0,
      totalDownloads: 0,
      uniqueUsers: 0,
    };
  }
}

/**
 * Get platform-wide analytics (admin only)
 * @param {number} days - Days to look back (default 30)
 * @returns {Promise<Object>} Platform analytics
 */
export async function getPlatformAnalytics(days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const q = query(
      collection(db, COLLECTIONS.analytics),
      where("timestamp", ">=", Timestamp.fromDate(startDate)),
      orderBy("timestamp", "desc")
    );

    const querySnapshot = await getDocs(q);
    const events = querySnapshot.docs.map((doc) => doc.data());

    const analytics = {
      totalEvents: events.length,
      totalViews: events.filter((e) => e.eventType === "frame_view").length,
      totalUsage: events.filter((e) => e.eventType === "frame_usage").length,
      totalLikes: events.filter((e) => e.eventType === "frame_like").length,
      totalDownloads: events.filter((e) => e.eventType === "frame_download")
        .length,
      uniqueUsers: new Set(events.map((e) => e.userId).filter(Boolean)).size,
      uniqueFrames: new Set(events.map((e) => e.frameId).filter(Boolean)).size,
      uniqueKreators: new Set(events.map((e) => e.kreatorId).filter(Boolean))
        .size,
    };

    return analytics;
  } catch (error) {
    console.error("Error fetching platform analytics:", error);
    return {
      totalEvents: 0,
      totalViews: 0,
      totalUsage: 0,
      totalLikes: 0,
      totalDownloads: 0,
      uniqueUsers: 0,
      uniqueFrames: 0,
      uniqueKreators: 0,
    };
  }
}

/**
 * Get trending frames (most used in last 7 days)
 * @param {number} limitCount - Max frames to return
 * @returns {Promise<Array>} Array of frame IDs sorted by usage
 */
export async function getTrendingFrames(limitCount = 10) {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const q = query(
      collection(db, COLLECTIONS.analytics),
      where("eventType", "==", "frame_usage"),
      where("timestamp", ">=", Timestamp.fromDate(sevenDaysAgo))
    );

    const querySnapshot = await getDocs(q);
    const events = querySnapshot.docs.map((doc) => doc.data());

    // Count usage per frame
    const frameCounts = {};
    events.forEach((event) => {
      const frameId = event.frameId;
      frameCounts[frameId] = (frameCounts[frameId] || 0) + 1;
    });

    // Sort by count
    const sorted = Object.entries(frameCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limitCount)
      .map(([frameId, count]) => ({ frameId, usageCount: count }));

    return sorted;
  } catch (error) {
    console.error("Error fetching trending frames:", error);
    return [];
  }
}
