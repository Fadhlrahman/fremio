/**
 * Analytics Service - VPS Version
 * Uses own VPS server for all analytics tracking
 * Falls back to localStorage when VPS is unavailable
 */

import { trackEvent, trackSession, trackFrameUsage, getDashboardAnalytics } from './vpsApiService';

const LOCAL_EVENTS_KEY = "fremio_local_events";
const LOCAL_ACTIVITIES_KEY = "fremio_local_activities";

/**
 * Get or create session ID
 */
const getSessionId = () => {
  let sessionId = sessionStorage.getItem("fremio_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("fremio_session_id", sessionId);
  }
  return sessionId;
};

/**
 * Get current user ID
 */
const getCurrentUserId = () => {
  try {
    const userStr = localStorage.getItem("fremio_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.email || user.uid || user.id;
    }
  } catch (e) {
    // Ignore
  }
  
  let anonymousId = localStorage.getItem("fremio_visitor_id");
  if (!anonymousId) {
    anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("fremio_visitor_id", anonymousId);
  }
  return anonymousId;
};

/**
 * Initialize session tracking
 */
export const trackUserSession = async () => {
  try {
    const sessionId = getSessionId();
    await trackSession({ sessionId });
    console.log("✅ Session tracked:", sessionId);
  } catch (error) {
    console.warn("⚠️ Session tracking failed (non-blocking):", error);
  }
};

/**
 * Track funnel events (page views, actions, etc.)
 */
export const trackFunnelEvent = async (eventType, eventData = {}) => {
  try {
    await trackEvent(eventType, {
      ...eventData,
      userId: getCurrentUserId(),
      sessionId: getSessionId(),
    });
    console.log("✅ Event tracked:", eventType);
  } catch (error) {
    // Fallback to localStorage
    console.warn("⚠️ VPS event tracking failed, using localStorage:", error);
    saveEventToLocalStorage(eventType, eventData);
  }
};

/**
 * Save event to localStorage as fallback
 */
const saveEventToLocalStorage = (eventType, eventData = {}) => {
  try {
    const events = JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) || "[]");
    events.push({
      type: eventType,
      data: eventData,
      timestamp: new Date().toISOString(),
      userId: getCurrentUserId(),
    });
    
    // Keep only last 100 events in localStorage
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }
    
    localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    console.warn("Failed to save event to localStorage:", e);
  }
};

/**
 * Track frame usage
 */
export const trackFrameUsageEvent = async (frameId, frameName) => {
  try {
    await trackFrameUsage(frameId, frameName);
    console.log("✅ Frame usage tracked:", frameName);
  } catch (error) {
    console.warn("⚠️ Frame tracking failed (non-blocking):", error);
  }
};

/**
 * Log activity for admin dashboard
 */
export const logActivity = (userId, action, details = {}) => {
  try {
    const activities = JSON.parse(localStorage.getItem(LOCAL_ACTIVITIES_KEY) || "[]");
    activities.unshift({
      id: `act_${Date.now()}`,
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
    
    // Keep only last 100 activities
    if (activities.length > 100) {
      activities.pop();
    }
    
    localStorage.setItem(LOCAL_ACTIVITIES_KEY, JSON.stringify(activities));
  } catch (e) {
    console.warn("Failed to log activity:", e);
  }
};

/**
 * Get lean metrics for dashboard (from VPS)
 */
export const getLeanMetricsFromFirebase = async () => {
  try {
    const data = await getDashboardAnalytics(30);
    
    // Calculate metrics from VPS data
    const totals = data.totals || {};
    
    return {
      totalVisitors: parseInt(totals.total_visitors) || 0,
      uniqueVisitors: Math.round((parseInt(totals.total_visitors) || 0) * 0.7), // Estimate
      totalPhotosTaken: parseInt(totals.total_photos) || 0,
      totalDownloads: parseInt(totals.total_downloads) || 0,
      totalShares: parseInt(totals.total_shares) || 0,
      conversionRate: calculateConversionRate(totals),
      topFrames: (data.topFrames || []).slice(0, 5),
      dailyStats: data.daily || [],
    };
  } catch (error) {
    console.error("Failed to get metrics from VPS:", error);
    
    // Return data from localStorage as fallback
    return getLocalStorageMetrics();
  }
};

/**
 * Calculate conversion rate
 */
const calculateConversionRate = (totals) => {
  const visitors = parseInt(totals.total_visitors) || 0;
  const downloads = parseInt(totals.total_downloads) || 0;
  
  if (visitors === 0) return 0;
  return Math.round((downloads / visitors) * 100);
};

/**
 * Get metrics from localStorage as fallback
 */
const getLocalStorageMetrics = () => {
  try {
    const events = JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) || "[]");
    
    const pageViews = events.filter(e => e.type === "page_view").length;
    const photosTaken = events.filter(e => e.type === "photo_taken").length;
    const downloads = events.filter(e => e.type === "download").length;
    const shares = events.filter(e => e.type === "share").length;
    
    return {
      totalVisitors: pageViews,
      uniqueVisitors: Math.round(pageViews * 0.7),
      totalPhotosTaken: photosTaken,
      totalDownloads: downloads,
      totalShares: shares,
      conversionRate: pageViews > 0 ? Math.round((downloads / pageViews) * 100) : 0,
      topFrames: [],
      dailyStats: [],
    };
  } catch (e) {
    return {
      totalVisitors: 0,
      uniqueVisitors: 0,
      totalPhotosTaken: 0,
      totalDownloads: 0,
      totalShares: 0,
      conversionRate: 0,
      topFrames: [],
      dailyStats: [],
    };
  }
};

/**
 * Track page view
 */
export const trackPageView = (page) => {
  return trackFunnelEvent("page_view", { page });
};

/**
 * Track photo taken
 */
export const trackPhotoTaken = (frameId, frameName) => {
  return trackFunnelEvent("photo_taken", { frameId, frameName });
};

/**
 * Track download
 */
export const trackDownload = (frameId, frameName) => {
  return trackFunnelEvent("download", { frameId, frameName });
};

/**
 * Track share
 */
export const trackShare = (platform, frameId) => {
  return trackFunnelEvent("share", { platform, frameId });
};

/**
 * Get recent activities from localStorage
 */
export const getRecentActivities = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ACTIVITIES_KEY) || "[]").slice(0, 20);
  } catch (e) {
    return [];
  }
};

// Default export for backward compatibility
export default {
  trackUserSession,
  trackFunnelEvent,
  trackFrameUsageEvent,
  logActivity,
  getLeanMetricsFromFirebase,
  trackPageView,
  trackPhotoTaken,
  trackDownload,
  trackShare,
  getRecentActivities,
};
