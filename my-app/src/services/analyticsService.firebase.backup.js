import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  setDoc,
  doc,
  getDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../config/firebase";
import { COLLECTIONS } from "../config/firebaseCollections";

/**
 * Analytics Service
 * Track and analyze platform usage
 * NOW USES FIREBASE for centralized data collection!
 * 
 * LEAN STARTUP METRICS:
 * 1. Conversion Funnel - Track user journey stages
 * 2. Retention Rate - Track returning users
 * 3. Activation Rate - Track first download
 * 4. Growth Rate - Week over week growth
 * 5. Downloads per User - Engagement metric
 * 6. Top Frames - Content performance
 */

const FRAME_USAGE_KEY = "frame_usage";
const ACTIVITIES_KEY = "recent_activities";
const USER_SESSIONS_KEY = "user_sessions";
const FUNNEL_EVENTS_KEY = "funnel_events";

// Firebase collections for analytics
const ANALYTICS_SESSIONS = "analytics_sessions";
const ANALYTICS_EVENTS = "analytics_events";
const ANALYTICS_DAILY = "analytics_daily";

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
 * Track user session for retention metrics - NOW SAVES TO FIREBASE
 */
export const trackUserSession = async () => {
  const userId = getCurrentUserId();
  const today = new Date().toISOString().split("T")[0];
  
  // Always track locally first
  try {
    const sessions = JSON.parse(localStorage.getItem(USER_SESSIONS_KEY) || "{}");
    
    if (!sessions[userId]) {
      sessions[userId] = {
        firstVisit: today,
        lastVisit: today,
        visitDays: [today],
        totalSessions: 1,
        hasDownloaded: false,
        firstDownloadDate: null,
      };
    } else {
      sessions[userId].lastVisit = today;
      if (!sessions[userId].visitDays.includes(today)) {
        sessions[userId].visitDays.push(today);
      }
      sessions[userId].totalSessions += 1;
    }
    
    localStorage.setItem(USER_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error("Error tracking local session:", error);
  }
  
  // Also save to Firebase for centralized tracking
  if (isFirebaseConfigured && db) {
    try {
      const sessionRef = doc(db, ANALYTICS_SESSIONS, userId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        // New user
        await setDoc(sessionRef, {
          userId,
          firstVisit: today,
          lastVisit: today,
          visitDays: [today],
          totalSessions: 1,
          hasDownloaded: false,
          firstDownloadDate: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log("📊 New user tracked in Firebase:", userId);
      } else {
        // Returning user
        const data = sessionDoc.data();
        const visitDays = data.visitDays || [];
        if (!visitDays.includes(today)) {
          visitDays.push(today);
        }
        await updateDoc(sessionRef, {
          lastVisit: today,
          visitDays,
          totalSessions: increment(1),
          updatedAt: serverTimestamp(),
        });
        console.log("📊 User session updated in Firebase:", userId);
      }
      
      // Also update daily counter
      const dailyRef = doc(db, ANALYTICS_DAILY, today);
      const dailyDoc = await getDoc(dailyRef);
      
      if (!dailyDoc.exists()) {
        await setDoc(dailyRef, {
          date: today,
          uniqueUsers: [userId],
          totalVisits: 1,
          downloads: 0,
          frameViews: 0,
          createdAt: serverTimestamp(),
        });
      } else {
        const dailyData = dailyDoc.data();
        const uniqueUsers = dailyData.uniqueUsers || [];
        if (!uniqueUsers.includes(userId)) {
          uniqueUsers.push(userId);
        }
        await updateDoc(dailyRef, {
          uniqueUsers,
          totalVisits: increment(1),
        });
      }
    } catch (error) {
      console.error("Error tracking Firebase session:", error);
    }
  }
};

/**
 * Mark user as activated (first download) - NOW SAVES TO FIREBASE
 */
export const markUserActivated = async () => {
  const userId = getCurrentUserId();
  const today = new Date().toISOString().split("T")[0];
  
  // Track locally
  try {
    const sessions = JSON.parse(localStorage.getItem(USER_SESSIONS_KEY) || "{}");
    
    if (sessions[userId] && !sessions[userId].hasDownloaded) {
      sessions[userId].hasDownloaded = true;
      sessions[userId].firstDownloadDate = today;
      localStorage.setItem(USER_SESSIONS_KEY, JSON.stringify(sessions));
      console.log("🎉 User activated (first download):", userId);
    }
  } catch (error) {
    console.error("Error marking local activation:", error);
  }
  
  // Also update Firebase
  if (isFirebaseConfigured && db) {
    try {
      const sessionRef = doc(db, ANALYTICS_SESSIONS, userId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (sessionDoc.exists()) {
        const data = sessionDoc.data();
        if (!data.hasDownloaded) {
          await updateDoc(sessionRef, {
            hasDownloaded: true,
            firstDownloadDate: today,
            updatedAt: serverTimestamp(),
          });
        }
      } else {
        // Create session if not exists
        await setDoc(sessionRef, {
          userId,
          firstVisit: today,
          lastVisit: today,
          visitDays: [today],
          totalSessions: 1,
          hasDownloaded: true,
          firstDownloadDate: today,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log("📊 Created new session with download for:", userId);
      }
      
      // Update daily downloads counter - ALWAYS increment
      const dailyRef = doc(db, ANALYTICS_DAILY, today);
      const dailyDoc = await getDoc(dailyRef);
      
      if (dailyDoc.exists()) {
        await updateDoc(dailyRef, {
          downloads: increment(1),
        });
      } else {
        await setDoc(dailyRef, {
          date: today,
          uniqueUsers: [userId],
          totalVisits: 1,
          downloads: 1,
          frameViews: 0,
          createdAt: serverTimestamp(),
        });
      }
      
      console.log("🎉 Activation tracked in Firebase");
    } catch (error) {
      console.error("Error marking Firebase activation:", error);
    }
  }
};

/**
 * Track funnel event - NOW SAVES TO FIREBASE
 */
export const trackFunnelEvent = async (stage, frameId = null, frameName = null) => {
  const userId = getCurrentUserId();
  const today = new Date().toISOString().split("T")[0];
  
  // Track locally
  try {
    const events = JSON.parse(localStorage.getItem(FUNNEL_EVENTS_KEY) || "[]");
    
    events.push({
      id: `funnel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      stage, // 'visit', 'frame_view', 'frame_select', 'photo_taken', 'downloaded'
      frameId,
      frameName,
      date: today,
      timestamp: new Date().toISOString(),
    });
    
    // Keep last 1000 events
    const trimmed = events.slice(-1000);
    localStorage.setItem(FUNNEL_EVENTS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Error tracking local funnel:", error);
  }
  
  // Also save to Firebase
  if (isFirebaseConfigured && db) {
    try {
      await addDoc(collection(db, ANALYTICS_EVENTS), {
        userId,
        stage,
        frameId,
        frameName,
        date: today,
        timestamp: serverTimestamp(),
      });
      
      // Update daily counters based on stage
      const dailyRef = doc(db, ANALYTICS_DAILY, today);
      
      if (stage === 'frame_view') {
        try {
          await updateDoc(dailyRef, {
            frameViews: increment(1),
          });
        } catch (e) {
          // Daily doc might not exist, create it
          await setDoc(dailyRef, {
            date: today,
            uniqueUsers: [userId],
            totalVisits: 0,
            downloads: 0,
            frameViews: 1,
            createdAt: serverTimestamp(),
          }, { merge: true });
        }
      }
      
      // Also track downloads in daily counter
      if (stage === 'downloaded') {
        try {
          await updateDoc(dailyRef, {
            downloads: increment(1),
          });
        } catch (e) {
          // Daily doc might not exist, create it
          await setDoc(dailyRef, {
            date: today,
            uniqueUsers: [userId],
            totalVisits: 0,
            downloads: 1,
            frameViews: 0,
            createdAt: serverTimestamp(),
          }, { merge: true });
        }
        console.log("📊 Daily download counter incremented");
      }
      
      console.log(`📊 Funnel event tracked in Firebase: ${stage}`);
    } catch (error) {
      console.error("Error tracking Firebase funnel:", error);
    }
  }
};

/**
 * Get Lean Startup Metrics from FIREBASE (centralized data)
 */
export const getLeanMetricsFromFirebase = async () => {
  if (!isFirebaseConfigured || !db) {
    console.log("Firebase not configured, falling back to localStorage");
    return getLeanMetrics();
  }
  
  try {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const last7Days = [];
    const last30Days = [];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split("T")[0]);
    }
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      last30Days.push(d.toISOString().split("T")[0]);
    }
    
    console.log("📊 Fetching analytics for dates:", last7Days);
    
    // Fetch all sessions from Firebase
    const sessionsSnapshot = await getDocs(collection(db, ANALYTICS_SESSIONS));
    const sessions = {};
    sessionsSnapshot.forEach(doc => {
      sessions[doc.id] = doc.data();
    });
    console.log("📊 Sessions count:", Object.keys(sessions).length);
    
    // Fetch ALL funnel events (not filtered, to debug)
    const allEventsSnapshot = await getDocs(collection(db, ANALYTICS_EVENTS));
    const allEvents = [];
    allEventsSnapshot.forEach(doc => {
      allEvents.push(doc.data());
    });
    console.log("📊 All events count:", allEvents.length);
    
    // Filter events for last 7 days
    const funnelEvents = allEvents.filter(e => last7Days.includes(e.date));
    console.log("📊 Filtered events (last 7 days):", funnelEvents.length);
    
    // Debug: show event stages
    const stageCounts = {};
    funnelEvents.forEach(e => {
      stageCounts[e.stage] = (stageCounts[e.stage] || 0) + 1;
    });
    console.log("📊 Event stages:", stageCounts);
    
    // Fetch daily stats
    const dailySnapshot = await getDocs(collection(db, ANALYTICS_DAILY));
    let totalDownloads = 0;
    dailySnapshot.forEach(doc => {
      const data = doc.data();
      totalDownloads += data.downloads || 0;
    });
    console.log("📊 Total downloads from daily:", totalDownloads);
    
    const allUsers = Object.keys(sessions);
    const totalUsers = allUsers.length;
    
    // 1. CONVERSION FUNNEL
    const funnelStages = {
      visit: new Set(funnelEvents.filter(e => e.stage === 'visit').map(e => e.userId)).size,
      frameView: new Set(funnelEvents.filter(e => e.stage === 'frame_view').map(e => e.userId)).size,
      frameSelect: new Set(funnelEvents.filter(e => e.stage === 'frame_select').map(e => e.userId)).size,
      photoTaken: new Set(funnelEvents.filter(e => e.stage === 'photo_taken').map(e => e.userId)).size,
      downloaded: new Set(funnelEvents.filter(e => e.stage === 'downloaded').map(e => e.userId)).size,
    };
    
    // Conversion rates
    const conversionRates = {
      viewToSelect: funnelStages.frameView > 0 ? Math.round((funnelStages.frameSelect / funnelStages.frameView) * 100) : 0,
      selectToCapture: funnelStages.frameSelect > 0 ? Math.round((funnelStages.photoTaken / funnelStages.frameSelect) * 100) : 0,
      captureToDownload: funnelStages.photoTaken > 0 ? Math.round((funnelStages.downloaded / funnelStages.photoTaken) * 100) : 0,
      overallConversion: funnelStages.visit > 0 ? Math.round((funnelStages.downloaded / funnelStages.visit) * 100) : 0,
    };
    
    // TOP PERFORMING FRAMES - Calculate from frame_select and downloaded events
    const frameStats = {};
    funnelEvents.forEach(event => {
      if (event.frameId && event.frameId !== 'unknown' && (event.stage === 'frame_select' || event.stage === 'downloaded')) {
        if (!frameStats[event.frameId]) {
          frameStats[event.frameId] = {
            id: event.frameId,
            name: event.frameName || event.frameId,
            views: 0,
            downloads: 0,
            uniqueUsers: new Set(),
          };
        }
        if (event.stage === 'frame_select') {
          frameStats[event.frameId].views += 1;
        }
        if (event.stage === 'downloaded') {
          frameStats[event.frameId].downloads += 1;
        }
        frameStats[event.frameId].uniqueUsers.add(event.userId);
      }
    });
    
    // Convert to array and sort by views + downloads
    const topFrames = Object.values(frameStats)
      .map(f => ({
        ...f,
        uniqueUsers: f.uniqueUsers.size,
        score: f.views + (f.downloads * 2), // Downloads weighted more
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10 frames
    
    console.log("📊 Top frames calculated:", topFrames);
    
    // 2. RETENTION RATE
    const day7Retention = allUsers.filter(userId => {
      const user = sessions[userId];
      if (!user.visitDays || user.visitDays.length < 2) return false;
      const firstVisit = new Date(user.firstVisit);
      const hasReturn = user.visitDays.some(day => {
        const visitDate = new Date(day);
        const diffDays = Math.floor((visitDate - firstVisit) / (1000 * 60 * 60 * 24));
        return diffDays >= 1 && diffDays <= 7;
      });
      return hasReturn;
    }).length;
    
    const retentionRate = totalUsers > 0 ? Math.round((day7Retention / totalUsers) * 100) : 0;
    
    // 3. ACTIVATION RATE
    const activatedUsers = allUsers.filter(userId => sessions[userId].hasDownloaded).length;
    const activationRate = totalUsers > 0 ? Math.round((activatedUsers / totalUsers) * 100) : 0;
    
    // 4. GROWTH RATE
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 14);
    
    const thisWeekUsers = allUsers.filter(userId => {
      const firstVisit = new Date(sessions[userId].firstVisit);
      return firstVisit >= thisWeekStart;
    }).length;
    
    const lastWeekUsers = allUsers.filter(userId => {
      const firstVisit = new Date(sessions[userId].firstVisit);
      return firstVisit >= lastWeekStart && firstVisit < thisWeekStart;
    }).length;
    
    const userGrowthRate = lastWeekUsers > 0 
      ? Math.round(((thisWeekUsers - lastWeekUsers) / lastWeekUsers) * 100) 
      : thisWeekUsers > 0 ? 100 : 0;
    
    // 5. DOWNLOADS PER USER
    const downloadsPerUser = totalUsers > 0 ? (totalDownloads / totalUsers).toFixed(1) : 0;
    
    // 6. ACTIVE USERS
    const dailyActiveUsers = allUsers.filter(userId => 
      sessions[userId].visitDays?.includes(todayStr)
    ).length;
    
    const weeklyActiveUsers = allUsers.filter(userId => 
      sessions[userId].visitDays?.some(day => last7Days.includes(day))
    ).length;
    
    const monthlyActiveUsers = allUsers.filter(userId => 
      sessions[userId].visitDays?.some(day => last30Days.includes(day))
    ).length;
    
    const returningUsers = allUsers.filter(userId => {
      const user = sessions[userId];
      return user.visitDays && user.visitDays.length > 1;
    }).length;
    
    console.log("📊 Firebase metrics loaded:", { totalUsers, activatedUsers, totalDownloads, topFrames: topFrames.length });
    
    return {
      totalUsers,
      activatedUsers,
      totalDownloads,
      funnel: funnelStages,
      conversionRates,
      retentionRate,
      returningUsers,
      activationRate,
      userGrowthRate,
      newUsersThisWeek: thisWeekUsers,
      newUsersLastWeek: lastWeekUsers,
      downloadsPerUser: parseFloat(downloadsPerUser),
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      topFrames, // Add top performing frames
      source: 'firebase', // Indicator that data came from Firebase
    };
  } catch (error) {
    console.error("Error getting Firebase metrics:", error);
    // Fallback to localStorage
    return getLeanMetrics();
  }
};

/**
 * Get Lean Startup Metrics (localStorage fallback)
 */
export const getLeanMetrics = () => {
  try {
    const sessions = JSON.parse(localStorage.getItem(USER_SESSIONS_KEY) || "{}");
    const funnelEvents = JSON.parse(localStorage.getItem(FUNNEL_EVENTS_KEY) || "[]");
    const frameUsage = JSON.parse(localStorage.getItem(FRAME_USAGE_KEY) || "[]");
    
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const last7Days = [];
    const last30Days = [];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split("T")[0]);
    }
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      last30Days.push(d.toISOString().split("T")[0]);
    }
    
    const allUsers = Object.keys(sessions);
    const totalUsers = allUsers.length;
    
    // 1. CONVERSION FUNNEL
    const last7DaysEvents = funnelEvents.filter(e => last7Days.includes(e.date));
    const funnelStages = {
      visit: new Set(last7DaysEvents.filter(e => e.stage === 'visit').map(e => e.userId)).size,
      frameView: new Set(last7DaysEvents.filter(e => e.stage === 'frame_view').map(e => e.userId)).size,
      frameSelect: new Set(last7DaysEvents.filter(e => e.stage === 'frame_select').map(e => e.userId)).size,
      photoTaken: new Set(last7DaysEvents.filter(e => e.stage === 'photo_taken').map(e => e.userId)).size,
      downloaded: new Set(last7DaysEvents.filter(e => e.stage === 'downloaded').map(e => e.userId)).size,
    };
    
    // Conversion rates
    const conversionRates = {
      viewToSelect: funnelStages.frameView > 0 ? Math.round((funnelStages.frameSelect / funnelStages.frameView) * 100) : 0,
      selectToCapture: funnelStages.frameSelect > 0 ? Math.round((funnelStages.photoTaken / funnelStages.frameSelect) * 100) : 0,
      captureToDownload: funnelStages.photoTaken > 0 ? Math.round((funnelStages.downloaded / funnelStages.photoTaken) * 100) : 0,
      overallConversion: funnelStages.visit > 0 ? Math.round((funnelStages.downloaded / funnelStages.visit) * 100) : 0,
    };
    
    // 2. RETENTION RATE
    const usersWithMultipleVisits = allUsers.filter(userId => {
      const user = sessions[userId];
      return user.visitDays && user.visitDays.length > 1;
    }).length;
    
    const day7Retention = allUsers.filter(userId => {
      const user = sessions[userId];
      if (!user.visitDays || user.visitDays.length < 2) return false;
      const firstVisit = new Date(user.firstVisit);
      const hasReturn = user.visitDays.some(day => {
        const visitDate = new Date(day);
        const diffDays = Math.floor((visitDate - firstVisit) / (1000 * 60 * 60 * 24));
        return diffDays >= 1 && diffDays <= 7;
      });
      return hasReturn;
    }).length;
    
    const retentionRate = totalUsers > 0 ? Math.round((day7Retention / totalUsers) * 100) : 0;
    
    // 3. ACTIVATION RATE
    const activatedUsers = allUsers.filter(userId => sessions[userId].hasDownloaded).length;
    const activationRate = totalUsers > 0 ? Math.round((activatedUsers / totalUsers) * 100) : 0;
    
    // 4. GROWTH RATE (Week over Week)
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 14);
    
    const thisWeekUsers = allUsers.filter(userId => {
      const firstVisit = new Date(sessions[userId].firstVisit);
      return firstVisit >= thisWeekStart;
    }).length;
    
    const lastWeekUsers = allUsers.filter(userId => {
      const firstVisit = new Date(sessions[userId].firstVisit);
      return firstVisit >= lastWeekStart && firstVisit < thisWeekStart;
    }).length;
    
    const userGrowthRate = lastWeekUsers > 0 
      ? Math.round(((thisWeekUsers - lastWeekUsers) / lastWeekUsers) * 100) 
      : thisWeekUsers > 0 ? 100 : 0;
    
    // 5. DOWNLOADS PER USER
    const totalDownloads = frameUsage.reduce((sum, u) => sum + (u.downloads || 0), 0);
    const downloadsPerUser = totalUsers > 0 ? (totalDownloads / totalUsers).toFixed(1) : 0;
    
    // 6. DAILY/WEEKLY/MONTHLY ACTIVE USERS
    const dailyActiveUsers = allUsers.filter(userId => 
      sessions[userId].visitDays?.includes(todayStr)
    ).length;
    
    const weeklyActiveUsers = allUsers.filter(userId => 
      sessions[userId].visitDays?.some(day => last7Days.includes(day))
    ).length;
    
    const monthlyActiveUsers = allUsers.filter(userId => 
      sessions[userId].visitDays?.some(day => last30Days.includes(day))
    ).length;
    
    return {
      // Overview
      totalUsers,
      activatedUsers,
      totalDownloads,
      
      // Funnel
      funnel: funnelStages,
      conversionRates,
      
      // Retention
      retentionRate,
      returningUsers: usersWithMultipleVisits,
      
      // Activation
      activationRate,
      
      // Growth
      userGrowthRate,
      newUsersThisWeek: thisWeekUsers,
      newUsersLastWeek: lastWeekUsers,
      
      // Engagement
      downloadsPerUser: parseFloat(downloadsPerUser),
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
    };
  } catch (error) {
    console.error("Error getting lean metrics:", error);
    return {
      totalUsers: 0,
      activatedUsers: 0,
      totalDownloads: 0,
      funnel: { visit: 0, frameView: 0, frameSelect: 0, photoTaken: 0, downloaded: 0 },
      conversionRates: { viewToSelect: 0, selectToCapture: 0, captureToDownload: 0, overallConversion: 0 },
      retentionRate: 0,
      returningUsers: 0,
      activationRate: 0,
      userGrowthRate: 0,
      newUsersThisWeek: 0,
      newUsersLastWeek: 0,
      downloadsPerUser: 0,
      dailyActiveUsers: 0,
      weeklyActiveUsers: 0,
      monthlyActiveUsers: 0,
    };
  }
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
  // Note: frame_view is now tracked in Frames.jsx when user opens the page
  // This function tracks individual frame clicks/views
  
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
  // Always track funnel event and mark user activated, regardless of mode
  try {
    await markUserActivated();
    await trackFunnelEvent("downloaded", frameId, frameName);
    console.log(`📊 Tracked download funnel for frame: ${frameId}`);
  } catch (funnelError) {
    console.error("Error tracking download funnel:", funnelError);
  }
  
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
