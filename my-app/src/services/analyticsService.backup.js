import { supabase, isSupabaseConfigured } from "../config/supabase";

/**
 * Analytics Service - ROBUST VERSION with localStorage fallback
 * Works even when Supabase is unavailable/over quota
 */

const USER_SESSIONS_KEY = "fremio_local_sessions";
const FUNNEL_EVENTS_KEY = "fremio_local_events";
const FRAME_USAGE_KEY = "fremio_local_frame_usage";
const ACTIVITIES_KEY = "fremio_local_activities";

// Track if Supabase is available
let supabaseAvailable = isSupabaseConfigured;
let lastSupabaseCheck = 0;
const SUPABASE_CHECK_INTERVAL = 60000; // Check every 60 seconds

/**
 * Check if Supabase is currently working
 */
const checkSupabaseAvailable = async () => {
  if (!isSupabaseConfigured || !supabase) return false;
  
  // Don't check too frequently
  const now = Date.now();
  if (now - lastSupabaseCheck < SUPABASE_CHECK_INTERVAL) {
    return supabaseAvailable;
  }
  lastSupabaseCheck = now;
  
  try {
    // Quick health check with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const { error } = await supabase
      .from('fremio_sessions')
      .select('id')
      .limit(1);
    
    clearTimeout(timeoutId);
    
    if (error) {
      console.warn('⚠️ Supabase unavailable:', error.message);
      supabaseAvailable = false;
      return false;
    }
    
    supabaseAvailable = true;
    return true;
  } catch (e) {
    console.warn('⚠️ Supabase connection failed:', e.message);
    supabaseAvailable = false;
    return false;
  }
};

/**
 * Get current user ID
 */
const getCurrentUserId = () => {
  // Try logged in user first
  try {
    const userStr = localStorage.getItem("fremio_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.email || user.uid || user.id;
    }
  } catch (e) {
    // Ignore
  }

  // Generate/get anonymous ID
  let anonymousId = localStorage.getItem("fremio_visitor_id");
  if (!anonymousId) {
    anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("fremio_visitor_id", anonymousId);
  }
  return anonymousId;
};

/**
 * Track user session - localStorage first, Supabase in background
 */
export const trackUserSession = async () => {
  const userId = getCurrentUserId();
  const today = new Date().toISOString().split("T")[0];
  
  // Always save to localStorage first (reliable, fast)
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
      if (!sessions[userId].visitDays?.includes(today)) {
        sessions[userId].visitDays = sessions[userId].visitDays || [];
        sessions[userId].visitDays.push(today);
      }
      sessions[userId].totalSessions = (sessions[userId].totalSessions || 0) + 1;
    }
    
    localStorage.setItem(USER_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.warn("localStorage session tracking failed:", error);
  }
  
  // Try Supabase in background (non-blocking)
  if (supabaseAvailable) {
    saveSessionToSupabase(userId, today).catch(err => {
      console.warn("Supabase session save failed:", err.message);
      supabaseAvailable = false;
    });
  }
};

// Background Supabase save
const saveSessionToSupabase = async (userId, today) => {
  if (!isSupabaseConfigured || !supabase) return;
  
  try {
    const { data: existing } = await supabase
      .from('fremio_sessions')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (!existing) {
      await supabase.from('fremio_sessions').insert({
        user_id: userId,
        first_visit: today,
        last_visit: today,
        visit_days: [today],
        total_sessions: 1,
        has_downloaded: false,
      });
    } else {
      const visitDays = existing.visit_days || [];
      if (!visitDays.includes(today)) visitDays.push(today);
      
      await supabase
        .from('fremio_sessions')
        .update({
          last_visit: today,
          visit_days: visitDays,
          total_sessions: (existing.total_sessions || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }
  } catch (e) {
    throw e;
  }
};

/**
 * Mark user as activated (first download)
 */
export const markUserActivated = async () => {
  const userId = getCurrentUserId();
  const today = new Date().toISOString().split("T")[0];
  
  // Update localStorage
  try {
    const sessions = JSON.parse(localStorage.getItem(USER_SESSIONS_KEY) || "{}");
    if (sessions[userId] && !sessions[userId].hasDownloaded) {
      sessions[userId].hasDownloaded = true;
      sessions[userId].firstDownloadDate = today;
      localStorage.setItem(USER_SESSIONS_KEY, JSON.stringify(sessions));
    }
  } catch (error) {
    console.warn("localStorage activation tracking failed:", error);
  }
  
  // Try Supabase in background
  if (supabaseAvailable) {
    try {
      await supabase
        .from('fremio_sessions')
        .update({
          has_downloaded: true,
          first_download_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } catch (e) {
      console.warn("Supabase activation save failed:", e.message);
      supabaseAvailable = false;
    }
  }
};

/**
 * Track funnel event - localStorage first
 */
export const trackFunnelEvent = async (stage, frameId = null, frameName = null) => {
  const userId = getCurrentUserId();
  const today = new Date().toISOString().split("T")[0];
  
  // Save to localStorage first
  try {
    const events = JSON.parse(localStorage.getItem(FUNNEL_EVENTS_KEY) || "[]");
    
    events.push({
      userId,
      stage,
      frameId,
      frameName,
      date: today,
      timestamp: new Date().toISOString(),
    });
    
    // Keep last 500 events to avoid quota issues
    const trimmed = events.slice(-500);
    localStorage.setItem(FUNNEL_EVENTS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn("localStorage funnel tracking failed:", error);
  }
  
  // Try Supabase in background (non-blocking)
  if (supabaseAvailable) {
    saveFunnelToSupabase(stage, frameId, frameName, userId, today).catch(err => {
      console.warn("Supabase funnel save failed:", err.message);
      supabaseAvailable = false;
    });
  }
};

// Background Supabase funnel save
const saveFunnelToSupabase = async (stage, frameId, frameName, userId, today) => {
  if (!isSupabaseConfigured || !supabase) return;
  
  try {
    // Save event
    await supabase.from('fremio_funnel').insert({
      user_id: userId,
      stage: stage,
    });
    
    // Update frame usage if applicable
    if (frameId && (stage === 'frame_select' || stage === 'downloaded')) {
      const { data: frame } = await supabase
        .from('fremio_frame_usage')
        .select('*')
        .eq('frame_id', frameId)
        .single();
      
      if (frame) {
        await supabase
          .from('fremio_frame_usage')
          .update({
            usage_count: stage === 'frame_select' ? (frame.usage_count || 0) + 1 : frame.usage_count,
            download_count: stage === 'downloaded' ? (frame.download_count || 0) + 1 : frame.download_count,
            last_used_at: new Date().toISOString(),
          })
          .eq('frame_id', frameId);
      } else {
        await supabase.from('fremio_frame_usage').insert({
          frame_id: frameId,
          frame_name: frameName,
          usage_count: stage === 'frame_select' ? 1 : 0,
          download_count: stage === 'downloaded' ? 1 : 0,
          last_used_at: new Date().toISOString(),
        });
      }
    }
  } catch (e) {
    throw e;
  }
};

/**
 * Track frame usage - wrapper
 */
export const trackFrameUsage = async (frameId, frameName) => {
  await trackFunnelEvent('frame_select', frameId, frameName);
};

/**
 * Track download - wrapper
 */
export const trackDownload = async (frameId, frameName) => {
  await markUserActivated();
  await trackFunnelEvent('downloaded', frameId, frameName);
};

/**
 * Track frame view - wrapper
 */
export const trackFrameView = async (frameId, frameName) => {
  await trackFunnelEvent('frame_view', frameId, frameName);
};

/**
 * Track frame download - wrapper
 */
export const trackFrameDownload = async (frameId, frameName) => {
  await trackDownload(frameId, frameName);
};

/**
 * Track page visit
 */
export const trackPageVisit = async (page) => {
  await trackUserSession();
  await trackFunnelEvent('visit', null, page);
};

/**
 * Get metrics - uses localStorage, supplements with Supabase if available
 */
export const getLeanMetricsFromFirebase = async () => {
  // Get from localStorage first (always available)
  const localMetrics = getLocalMetrics();
  
  // Try to get Supabase data if available
  if (await checkSupabaseAvailable()) {
    try {
      const supabaseMetrics = await getSupabaseMetrics();
      // Merge metrics, preferring Supabase data when available
      return {
        ...localMetrics,
        ...supabaseMetrics,
        source: 'supabase',
      };
    } catch (e) {
      console.warn("Supabase metrics fetch failed, using localStorage:", e.message);
      supabaseAvailable = false;
    }
  }
  
  return {
    ...localMetrics,
    source: 'localStorage',
  };
};

/**
 * Get metrics from localStorage
 */
const getLocalMetrics = () => {
  try {
    const sessions = JSON.parse(localStorage.getItem(USER_SESSIONS_KEY) || "{}");
    const events = JSON.parse(localStorage.getItem(FUNNEL_EVENTS_KEY) || "[]");
    
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
    
    // Funnel from events
    const recentEvents = events.filter(e => last7Days.includes(e.date));
    const funnelStages = {
      visit: new Set(recentEvents.filter(e => e.stage === 'visit').map(e => e.userId)).size,
      frameView: new Set(recentEvents.filter(e => e.stage === 'frame_view').map(e => e.userId)).size,
      frameSelect: new Set(recentEvents.filter(e => e.stage === 'frame_select').map(e => e.userId)).size,
      photoTaken: new Set(recentEvents.filter(e => e.stage === 'photo_taken').map(e => e.userId)).size,
      downloaded: new Set(recentEvents.filter(e => e.stage === 'downloaded').map(e => e.userId)).size,
    };
    
    // Conversion rates
    const conversionRates = {
      viewToSelect: funnelStages.frameView > 0 ? Math.round((funnelStages.frameSelect / funnelStages.frameView) * 100) : 0,
      selectToCapture: funnelStages.frameSelect > 0 ? Math.round((funnelStages.photoTaken / funnelStages.frameSelect) * 100) : 0,
      captureToDownload: funnelStages.photoTaken > 0 ? Math.round((funnelStages.downloaded / funnelStages.photoTaken) * 100) : 0,
      overallConversion: funnelStages.visit > 0 ? Math.round((funnelStages.downloaded / funnelStages.visit) * 100) : 0,
    };
    
    // Activation
    const activatedUsers = allUsers.filter(userId => sessions[userId]?.hasDownloaded).length;
    const activationRate = totalUsers > 0 ? Math.round((activatedUsers / totalUsers) * 100) : 0;
    
    // Downloads
    const totalDownloads = events.filter(e => e.stage === 'downloaded').length;
    const downloadsPerUser = totalUsers > 0 ? (totalDownloads / totalUsers).toFixed(1) : 0;
    
    // Active users
    const dailyActiveUsers = allUsers.filter(userId => 
      sessions[userId]?.visitDays?.includes(todayStr)
    ).length;
    
    const weeklyActiveUsers = allUsers.filter(userId => 
      sessions[userId]?.visitDays?.some(day => last7Days.includes(day))
    ).length;
    
    const monthlyActiveUsers = allUsers.filter(userId => 
      sessions[userId]?.visitDays?.some(day => last30Days.includes(day))
    ).length;
    
    // Top frames from events
    const frameStats = {};
    recentEvents.forEach(e => {
      if (e.frameId && (e.stage === 'frame_select' || e.stage === 'downloaded')) {
        if (!frameStats[e.frameId]) {
          frameStats[e.frameId] = {
            id: e.frameId,
            name: e.frameName || e.frameId,
            views: 0,
            downloads: 0,
          };
        }
        if (e.stage === 'frame_select') frameStats[e.frameId].views++;
        if (e.stage === 'downloaded') frameStats[e.frameId].downloads++;
      }
    });
    
    const topFrames = Object.values(frameStats)
      .map(f => ({ ...f, score: f.views + f.downloads * 2 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    return {
      totalUsers,
      activatedUsers,
      totalDownloads,
      funnel: funnelStages,
      conversionRates,
      retentionRate: 0,
      returningUsers: allUsers.filter(id => sessions[id]?.visitDays?.length > 1).length,
      activationRate,
      userGrowthRate: 100,
      newUsersThisWeek: allUsers.filter(id => last7Days.includes(sessions[id]?.firstVisit)).length,
      newUsersLastWeek: 0,
      downloadsPerUser: parseFloat(downloadsPerUser),
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      topFrames,
    };
  } catch (error) {
    console.error("Error getting local metrics:", error);
    return getDefaultMetrics();
  }
};

/**
 * Get metrics from Supabase
 */
const getSupabaseMetrics = async () => {
  if (!isSupabaseConfigured || !supabase) return {};
  
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const last7Days = [];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split("T")[0]);
  }
  
  // Fetch sessions
  const { data: sessions } = await supabase.from('fremio_sessions').select('*');
  
  // Fetch frame usage
  const { data: frameUsage } = await supabase
    .from('fremio_frame_usage')
    .select('*')
    .order('download_count', { ascending: false })
    .limit(10);
  
  if (!sessions) return {};
  
  const totalUsers = sessions.length;
  const activatedUsers = sessions.filter(s => s.has_downloaded).length;
  
  const topFrames = (frameUsage || []).map(f => ({
    id: f.frame_id,
    name: f.frame_name || f.frame_id,
    views: f.usage_count || 0,
    downloads: f.download_count || 0,
    score: (f.usage_count || 0) + (f.download_count || 0) * 2,
  }));
  
  return {
    totalUsers,
    activatedUsers,
    topFrames,
  };
};

/**
 * Default metrics when nothing available
 */
const getDefaultMetrics = () => ({
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
  topFrames: [],
});

// Alias for backward compatibility
export const getLeanMetrics = getLeanMetricsFromFirebase;

/**
 * Get recent activities
 */
export const getRecentActivities = () => {
  try {
    const activities = JSON.parse(localStorage.getItem(ACTIVITIES_KEY) || "[]");
    return activities.slice(-20).reverse();
  } catch {
    return [];
  }
};

/**
 * Add activity
 */
export const addActivity = (type, description, metadata = {}) => {
  try {
    const activities = JSON.parse(localStorage.getItem(ACTIVITIES_KEY) || "[]");
    activities.push({
      id: `act_${Date.now()}`,
      type,
      description,
      metadata,
      timestamp: new Date().toISOString(),
    });
    const trimmed = activities.slice(-100);
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn("Error adding activity:", error);
  }
};

/**
 * Get registered users count
 */
export const getRegisteredUsersCount = async () => {
  if (supabaseAvailable) {
    try {
      const { count } = await supabase
        .from('fremio_users')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    } catch (e) {
      supabaseAvailable = false;
    }
  }
  return 0;
};

/**
 * Get registered users
 */
export const getRegisteredUsers = async () => {
  if (supabaseAvailable) {
    try {
      const { data } = await supabase
        .from('fremio_users')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    } catch (e) {
      supabaseAvailable = false;
    }
  }
  return [];
};

/**
 * Get registration rate
 */
export const getRegistrationRate = async () => {
  if (supabaseAvailable) {
    try {
      const { count: visitorCount } = await supabase
        .from('fremio_sessions')
        .select('*', { count: 'exact', head: true });
      
      const { count: userCount } = await supabase
        .from('fremio_users')
        .select('*', { count: 'exact', head: true });
      
      if (!visitorCount || visitorCount === 0) return 0;
      return Math.round((userCount / visitorCount) * 100);
    } catch (e) {
      supabaseAvailable = false;
    }
  }
  return 0;
};

export default {
  trackUserSession,
  markUserActivated,
  trackFunnelEvent,
  getLeanMetrics,
  getLeanMetricsFromFirebase,
  trackFrameUsage,
  trackDownload,
  trackFrameView,
  trackFrameDownload,
  trackPageVisit,
  getRecentActivities,
  addActivity,
  getRegisteredUsersCount,
  getRegisteredUsers,
  getRegistrationRate,
};
