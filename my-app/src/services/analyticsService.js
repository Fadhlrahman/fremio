/**
 * Analytics Service - VPS Version
 * Uses own VPS server for all analytics tracking
 * Complete analytics with session tracking, events, and performance metrics
 */

import { isVPSMode, VPS_API_URL } from '../config/backend';

// Constants
const LOCAL_EVENTS_KEY = "fremio_local_events";
const LOCAL_ACTIVITIES_KEY = "fremio_local_activities";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Session state
let sessionId = null;
let sessionStartTime = null;
let lastActivityTime = null;

// Event queue for batching
let eventQueue = [];
let flushTimeout = null;
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 seconds

/**
 * Get API URL based on config
 * VPS_API_URL already contains /api, so we return base URL without /api
 */
const getApiUrl = () => {
  const url = VPS_API_URL || 'http://localhost:3000/api';
  // Remove trailing /api if exists to avoid double /api/api
  return url.replace(/\/api\/?$/, '');
};

/**
 * Get auth token
 */
const getAuthToken = () => {
  return localStorage.getItem('token');
};

/**
 * Generate unique session ID
 */
const generateSessionId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get or create session ID with timeout check
 */
const getSessionId = () => {
  const now = Date.now();
  
  // Check if session expired
  if (sessionId && lastActivityTime) {
    const elapsed = now - lastActivityTime;
    if (elapsed > SESSION_TIMEOUT) {
      // End old session and start new one
      endSession();
      sessionId = null;
    }
  }
  
  // Create new session if needed
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStartTime = now;
    sessionStorage.setItem("fremio_session_id", sessionId);
    startSession();
  }
  
  lastActivityTime = now;
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
 * Send request to analytics API
 */
const sendAnalytics = async (endpoint, data) => {
  try {
    const apiUrl = getApiUrl();
    const token = getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${apiUrl}/api/analytics${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      keepalive: true // For page unload events
    });
    
    if (!response.ok) {
      console.warn('Analytics request failed:', response.status);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    // Silently fail - analytics should not affect user experience
    console.warn('Analytics error:', error.message);
    // Save to localStorage as fallback
    saveEventToLocalStorage(endpoint, data);
    return null;
  }
};

/**
 * Fetch analytics data (GET request)
 */
const fetchAnalytics = async (endpoint, params = {}) => {
  try {
    const apiUrl = getApiUrl();
    const token = getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const queryString = new URLSearchParams(params).toString();
    const url = `${apiUrl}/api/analytics${endpoint}${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Analytics fetch failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Analytics fetch error:', error.message);
    throw error;
  }
};

/**
 * Save event to localStorage as fallback
 */
const saveEventToLocalStorage = (endpoint, data) => {
  try {
    const events = JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) || "[]");
    events.push({
      endpoint,
      data,
      timestamp: new Date().toISOString(),
      synced: false
    });
    
    // Keep only last 200 events in localStorage
    if (events.length > 200) {
      events.splice(0, events.length - 200);
    }
    
    localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    console.warn("Failed to save event to localStorage:", e);
  }
};

/**
 * Start new session
 */
const startSession = async () => {
  await sendAnalytics('/track/session', {
    sessionId,
    action: 'start',
    referrer: document.referrer,
    landingPage: window.location.pathname
  });
};

/**
 * End session
 */
const endSession = async () => {
  if (!sessionId || !sessionStartTime) return;
  
  const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
  
  await sendAnalytics('/track/session', {
    sessionId,
    action: 'end',
    duration
  });
};

/**
 * Schedule flush of event queue
 */
const scheduleFlush = () => {
  if (flushTimeout) return;
  
  flushTimeout = setTimeout(() => {
    flushEvents();
  }, FLUSH_INTERVAL);
};

/**
 * Flush event queue
 */
const flushEvents = async () => {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  
  if (eventQueue.length === 0) return;
  
  const events = [...eventQueue];
  eventQueue = [];
  
  // Send events one by one
  for (const event of events) {
    await sendAnalytics('/track/event', event);
  }
};

// ==================== PUBLIC API ====================

/**
 * Initialize analytics
 */
export const initAnalytics = () => {
  // Get or start session
  getSessionId();
  
  // Track initial page view
  trackPageView(window.location.pathname, document.title);
  
  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEvents();
    }
  });
  
  // Handle before unload
  window.addEventListener('beforeunload', () => {
    flushEvents();
    endSession();
  });
  
  // Handle popstate (browser back/forward)
  window.addEventListener('popstate', () => {
    trackPageView(window.location.pathname, document.title);
  });
  
  // Track web vitals
  trackWebVitals();
  
  console.log("📊 Analytics initialized");
};

/**
 * Track web vitals (Core Web Vitals)
 */
const trackWebVitals = () => {
  if (!('PerformanceObserver' in window)) return;
  
  try {
    // LCP
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      trackPerformance('LCP', Math.round(lastEntry.startTime));
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    
    // FID
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        trackPerformance('FID', Math.round(entry.processingStart - entry.startTime));
      });
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
    
    // CLS
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
    
    window.addEventListener('beforeunload', () => {
      trackPerformance('CLS', Math.round(clsValue * 1000) / 1000, 'score');
    });
  } catch (e) {
    // Performance observer not fully supported
  }
  
  // Page load time
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0];
    if (perfData) {
      trackPerformance('pageLoad', Math.round(perfData.loadEventEnd - perfData.startTime));
      trackPerformance('TTFB', Math.round(perfData.responseStart - perfData.requestStart));
    }
  });
};

/**
 * Track user session (backward compatibility)
 */
export const trackUserSession = async () => {
  getSessionId(); // This will start session if not exists
  console.log("✅ Session tracked:", sessionId);
};

/**
 * Track page view
 */
export const trackPageView = async (pagePath = window.location.pathname, pageTitle = document.title) => {
  const sid = getSessionId();
  
  await sendAnalytics('/track/pageview', {
    sessionId: sid,
    pagePath,
    pageTitle,
    referrer: document.referrer
  });
};

/**
 * Track custom event (queued)
 */
export const trackEvent = async (eventName, eventCategory = 'general', eventData = {}) => {
  const sid = getSessionId();
  
  eventQueue.push({
    sessionId: sid,
    eventName,
    eventCategory,
    eventData
  });
  
  if (eventQueue.length >= BATCH_SIZE) {
    flushEvents();
  } else {
    scheduleFlush();
  }
};

/**
 * Track event immediately (bypass queue)
 */
export const trackEventImmediate = async (eventName, eventCategory = 'general', eventData = {}) => {
  const sid = getSessionId();
  
  await sendAnalytics('/track/event', {
    sessionId: sid,
    eventName,
    eventCategory,
    eventData
  });
};

/**
 * Track funnel event (backward compatibility)
 */
export const trackFunnelEvent = async (eventType, eventData = {}) => {
  await trackEvent(eventType, 'funnel', {
    ...eventData,
    userId: getCurrentUserId()
  });
};

/**
 * Track download
 */
export const trackDownload = async (frameId, frameName, format = 'png', hasWatermark = false) => {
  const sid = getSessionId();
  
  await sendAnalytics('/track/download', {
    sessionId: sid,
    frameId,
    frameName,
    format,
    hasWatermark
  });
};

/**
 * Track frame download (alias)
 */
export const trackFrameDownload = trackDownload;

/**
 * Track frame usage
 */
export const trackFrameUsageEvent = async (frameId, frameName, action = 'view') => {
  await trackEvent(`frame_${action}`, 'frame', {
    frameId,
    frameName
  });
};

/**
 * Track frame view
 */
export const trackFrameView = (frameId, frameName) => {
  return trackFrameUsageEvent(frameId, frameName, 'view');
};

/**
 * Track photo taken
 */
export const trackPhotoTaken = (frameId, frameName) => {
  return trackEvent('photo_taken', 'conversion', { frameId, frameName });
};

/**
 * Track share
 */
export const trackShare = (platform, frameId) => {
  return trackEvent('share', 'social', { platform, frameId });
};

/**
 * Track user action
 */
export const trackUserAction = async (action, details = {}) => {
  await trackEvent(action, 'user_action', details);
};

/**
 * Track error
 */
export const trackError = async (errorType, errorMessage, errorStack = null) => {
  await trackEventImmediate('error', 'error', {
    errorType,
    errorMessage,
    errorStack,
    url: window.location.href
  });
};

/**
 * Track performance metric
 */
export const trackPerformance = async (metricName, value, unit = 'ms') => {
  await trackEvent('performance', 'performance', {
    metricName,
    value,
    unit
  });
};

/**
 * Track search
 */
export const trackSearch = async (query, resultsCount, category = null) => {
  await trackEvent('search', 'search', {
    query,
    resultsCount,
    category
  });
};

/**
 * Track button click
 */
export const trackClick = async (buttonName, location, additionalData = {}) => {
  await trackEvent('click', 'interaction', {
    buttonName,
    location,
    ...additionalData
  });
};

/**
 * Track form submission
 */
export const trackFormSubmit = async (formName, success, errorMessage = null) => {
  await trackEvent('form_submit', 'form', {
    formName,
    success,
    errorMessage
  });
};

/**
 * Track conversion event
 */
export const trackConversion = async (conversionType, value = null, details = {}) => {
  await trackEventImmediate('conversion', 'conversion', {
    conversionType,
    value,
    ...details
  });
};

/**
 * Track subscription event
 */
export const trackSubscription = async (action, planType, details = {}) => {
  await trackEventImmediate('subscription', 'subscription', {
    action,
    planType,
    ...details
  });
};

/**
 * Track affiliate event
 */
export const trackAffiliate = async (action, referralCode, details = {}) => {
  await trackEventImmediate('affiliate', 'affiliate', {
    action,
    referralCode,
    ...details
  });
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
    
    if (activities.length > 100) {
      activities.pop();
    }
    
    localStorage.setItem(LOCAL_ACTIVITIES_KEY, JSON.stringify(activities));
  } catch (e) {
    console.warn("Failed to log activity:", e);
  }
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

// ==================== DASHBOARD API ====================

/**
 * Get dashboard overview
 */
export const getDashboardOverview = async (days = 30) => {
  return await fetchAnalytics('/dashboard/overview', { days });
};

/**
 * Get user growth data
 */
export const getUserGrowth = async (days = 30) => {
  return await fetchAnalytics('/dashboard/user-growth', { days });
};

/**
 * Get daily active users
 */
export const getDAU = async (days = 30) => {
  return await fetchAnalytics('/dashboard/dau', { days });
};

/**
 * Get download analytics
 */
export const getDownloadAnalytics = async (days = 30) => {
  return await fetchAnalytics('/dashboard/downloads', { days });
};

/**
 * Get retention data
 */
export const getRetention = async (weeks = 12) => {
  return await fetchAnalytics('/dashboard/retention', { weeks });
};

/**
 * Get traffic sources
 */
export const getTrafficSources = async (days = 30) => {
  return await fetchAnalytics('/dashboard/traffic', { days });
};

/**
 * Get revenue analytics
 */
export const getRevenueAnalytics = async (days = 30) => {
  return await fetchAnalytics('/dashboard/revenue', { days });
};

/**
 * Get top pages
 */
export const getTopPages = async (days = 30, limit = 20) => {
  return await fetchAnalytics('/dashboard/pages', { days, limit });
};

/**
 * Get device stats
 */
export const getDeviceStats = async (days = 30) => {
  return await fetchAnalytics('/dashboard/devices', { days });
};

/**
 * Get realtime stats
 */
export const getRealtimeStats = async () => {
  return await fetchAnalytics('/dashboard/realtime');
};

/**
 * Get lean metrics for dashboard (backward compatibility)
 */
export const getLeanMetricsFromFirebase = async () => {
  try {
    const overview = await getDashboardOverview(30);
    
    return {
      totalVisitors: overview.totalSessions || 0,
      uniqueVisitors: overview.uniqueUsers || 0,
      totalPhotosTaken: overview.photosTaken || 0,
      totalDownloads: overview.downloads || 0,
      totalShares: overview.shares || 0,
      conversionRate: overview.conversionRate || 0,
      topFrames: overview.topFrames || [],
      dailyStats: overview.dailyStats || [],
    };
  } catch (error) {
    console.error("Failed to get metrics from VPS:", error);
    return getLocalStorageMetrics();
  }
};

/**
 * Get metrics from localStorage as fallback
 */
const getLocalStorageMetrics = () => {
  try {
    const events = JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) || "[]");
    
    const pageViews = events.filter(e => e.data?.eventName === "page_view" || e.endpoint?.includes('pageview')).length;
    const photosTaken = events.filter(e => e.data?.eventName === "photo_taken").length;
    const downloads = events.filter(e => e.endpoint?.includes('download')).length;
    const shares = events.filter(e => e.data?.eventName === "share").length;
    
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
 * Get lean metrics (alias)
 */
export const getLeanMetrics = getLeanMetricsFromFirebase;

// Export analytics object
const analytics = {
  init: initAnalytics,
  trackUserSession,
  trackPageView,
  trackEvent,
  trackEventImmediate,
  trackFunnelEvent,
  trackDownload,
  trackFrameDownload,
  trackFrameUsageEvent,
  trackFrameView,
  trackPhotoTaken,
  trackShare,
  trackUserAction,
  trackError,
  trackPerformance,
  trackSearch,
  trackClick,
  trackFormSubmit,
  trackConversion,
  trackSubscription,
  trackAffiliate,
  logActivity,
  getRecentActivities,
  getLeanMetrics,
  getLeanMetricsFromFirebase,
  getDashboardOverview,
  getUserGrowth,
  getDAU,
  getDownloadAnalytics,
  getRetention,
  getTrafficSources,
  getRevenueAnalytics,
  getTopPages,
  getDeviceStats,
  getRealtimeStats,
  flush: flushEvents,
  endSession
};

export default analytics;
