import { supabase, isSupabaseConfigured } from "../config/supabase";

/**
 * Analytics Service - SUPABASE VERSION
 * Track and analyze platform usage using Supabase
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
 * Track user session for retention metrics - SUPABASE
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
  
  // Save to Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      // Check if session exists
      const { data: existing } = await supabase
        .from('fremio_sessions')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (!existing) {
        // New user
        await supabase.from('fremio_sessions').insert({
          user_id: userId,
          first_visit: today,
          last_visit: today,
          visit_days: [today],
          total_sessions: 1,
          has_downloaded: false,
        });
        console.log("📊 New user tracked in Supabase:", userId);
      } else {
        // Returning user
        const visitDays = existing.visit_days || [];
        if (!visitDays.includes(today)) {
          visitDays.push(today);
        }
        await supabase
          .from('fremio_sessions')
          .update({
            last_visit: today,
            visit_days: visitDays,
            total_sessions: existing.total_sessions + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
        console.log("📊 User session updated in Supabase:", userId);
      }
      
      // Update daily counter
      const { data: dailyExisting } = await supabase
        .from('fremio_daily_analytics')
        .select('*')
        .eq('date', today)
        .single();
      
      if (!dailyExisting) {
        await supabase.from('fremio_daily_analytics').insert({
          date: today,
          unique_users: [userId],
          total_visits: 1,
          downloads: 0,
          frame_views: 0,
        });
      } else {
        const uniqueUsers = dailyExisting.unique_users || [];
        if (!uniqueUsers.includes(userId)) {
          uniqueUsers.push(userId);
        }
        await supabase
          .from('fremio_daily_analytics')
          .update({
            unique_users: uniqueUsers,
            total_visits: dailyExisting.total_visits + 1,
          })
          .eq('date', today);
      }
    } catch (error) {
      console.error("Error tracking Supabase session:", error);
    }
  }
};

/**
 * Mark user as activated (first download) - SUPABASE
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
  
  // Update Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: existing } = await supabase
        .from('fremio_sessions')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (existing && !existing.has_downloaded) {
        await supabase
          .from('fremio_sessions')
          .update({
            has_downloaded: true,
            first_download_date: today,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      } else if (!existing) {
        await supabase.from('fremio_sessions').insert({
          user_id: userId,
          first_visit: today,
          last_visit: today,
          visit_days: [today],
          total_sessions: 1,
          has_downloaded: true,
          first_download_date: today,
        });
      }
      
      // Update daily downloads counter
      const { data: dailyExisting } = await supabase
        .from('fremio_daily_analytics')
        .select('*')
        .eq('date', today)
        .single();
      
      if (dailyExisting) {
        await supabase
          .from('fremio_daily_analytics')
          .update({ downloads: dailyExisting.downloads + 1 })
          .eq('date', today);
      } else {
        await supabase.from('fremio_daily_analytics').insert({
          date: today,
          unique_users: [userId],
          total_visits: 1,
          downloads: 1,
          frame_views: 0,
        });
      }
      
      console.log("🎉 Activation tracked in Supabase");
    } catch (error) {
      console.error("Error marking Supabase activation:", error);
    }
  }
};

/**
 * Track funnel event - SUPABASE
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
      stage,
      frameId,
      frameName,
      date: today,
      timestamp: new Date().toISOString(),
    });
    
    const trimmed = events.slice(-1000);
    localStorage.setItem(FUNNEL_EVENTS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Error tracking local funnel:", error);
  }
  
  // Save to Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('fremio_events').insert({
        user_id: userId,
        event_type: stage,
        event_data: { frameId, frameName, date: today },
      });
      
      // Update frame usage stats
      if (frameId && (stage === 'frame_select' || stage === 'downloaded')) {
        const { data: frameUsage } = await supabase
          .from('fremio_frame_usage')
          .select('*')
          .eq('frame_id', frameId)
          .single();
        
        if (frameUsage) {
          await supabase
            .from('fremio_frame_usage')
            .update({
              usage_count: stage === 'frame_select' ? frameUsage.usage_count + 1 : frameUsage.usage_count,
              download_count: stage === 'downloaded' ? frameUsage.download_count + 1 : frameUsage.download_count,
              last_used_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
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
      
      // Also update daily frame_views
      if (stage === 'frame_view') {
        const { data: dailyExisting } = await supabase
          .from('fremio_daily_analytics')
          .select('*')
          .eq('date', today)
          .single();
        
        if (dailyExisting) {
          await supabase
            .from('fremio_daily_analytics')
            .update({ frame_views: dailyExisting.frame_views + 1 })
            .eq('date', today);
        }
      }
      
      // Track funnel stage
      await supabase.from('fremio_funnel').insert({
        user_id: userId,
        stage: stage,
      });
      
      console.log(`📊 Funnel event tracked in Supabase: ${stage}`);
    } catch (error) {
      console.error("Error tracking Supabase funnel:", error);
    }
  }
};

/**
 * Get Lean Startup Metrics from SUPABASE
 */
export const getLeanMetricsFromFirebase = async () => {
  // Keep function name for backward compatibility, but use Supabase
  if (!isSupabaseConfigured || !supabase) {
    console.log("Supabase not configured, falling back to localStorage");
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
    
    console.log("📊 Fetching analytics from Supabase...");
    
    // Fetch all sessions
    const { data: sessionsArray, error: sessionsError } = await supabase
      .from('fremio_sessions')
      .select('*');
    
    if (sessionsError) throw sessionsError;
    
    const sessions = {};
    (sessionsArray || []).forEach(s => {
      sessions[s.user_id] = {
        ...s,
        firstVisit: s.first_visit,
        lastVisit: s.last_visit,
        visitDays: s.visit_days || [],
        totalSessions: s.total_sessions,
        hasDownloaded: s.has_downloaded,
        firstDownloadDate: s.first_download_date,
      };
    });
    console.log("📊 Sessions count:", Object.keys(sessions).length);
    
    // Fetch funnel events for last 7 days
    const { data: eventsArray } = await supabase
      .from('fremio_events')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    const funnelEvents = (eventsArray || []).map(e => ({
      userId: e.user_id,
      stage: e.event_type,
      frameId: e.event_data?.frameId,
      frameName: e.event_data?.frameName,
      date: e.event_data?.date || e.created_at?.split('T')[0],
    }));
    console.log("📊 Events (last 7 days):", funnelEvents.length);
    
    // Fetch daily stats for total downloads
    const { data: dailyStats } = await supabase
      .from('fremio_daily_analytics')
      .select('*');
    
    let totalDownloads = 0;
    (dailyStats || []).forEach(d => {
      totalDownloads += d.downloads || 0;
    });
    console.log("📊 Total downloads:", totalDownloads);
    
    // Fetch top frames
    const { data: frameUsageData } = await supabase
      .from('fremio_frame_usage')
      .select('*')
      .order('download_count', { ascending: false })
      .limit(10);
    
    const topFrames = (frameUsageData || []).map(f => ({
      id: f.frame_id,
      name: f.frame_name || f.frame_id,
      views: f.usage_count || 0,
      downloads: f.download_count || 0,
      score: (f.usage_count || 0) + (f.download_count || 0) * 2,
    }));
    console.log("📊 Top frames:", topFrames.length);
    
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
    
    console.log("📊 Supabase metrics loaded:", { totalUsers, activatedUsers, totalDownloads });
    
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
      topFrames,
      source: 'supabase',
    };
  } catch (error) {
    console.error("Error getting Supabase metrics:", error);
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
    
    const conversionRates = {
      viewToSelect: funnelStages.frameView > 0 ? Math.round((funnelStages.frameSelect / funnelStages.frameView) * 100) : 0,
      selectToCapture: funnelStages.frameSelect > 0 ? Math.round((funnelStages.photoTaken / funnelStages.frameSelect) * 100) : 0,
      captureToDownload: funnelStages.photoTaken > 0 ? Math.round((funnelStages.downloaded / funnelStages.photoTaken) * 100) : 0,
      overallConversion: funnelStages.visit > 0 ? Math.round((funnelStages.downloaded / funnelStages.visit) * 100) : 0,
    };
    
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
    const totalDownloads = frameUsage.reduce((sum, u) => sum + (u.downloads || 0), 0);
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
    
    // Top frames from localStorage
    const sortedFrames = [...frameUsage].sort((a, b) => 
      ((b.views || 0) + (b.downloads || 0) * 2) - ((a.views || 0) + (a.downloads || 0) * 2)
    ).slice(0, 10);
    
    const topFrames = sortedFrames.map(f => ({
      id: f.frameId,
      name: f.frameName || f.frameId,
      views: f.views || 0,
      downloads: f.downloads || 0,
      score: (f.views || 0) + (f.downloads || 0) * 2,
    }));
    
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
      topFrames,
      source: 'localStorage',
    };
  } catch (error) {
    console.error("Error getting localStorage metrics:", error);
    return getDefaultMetrics();
  }
};

/**
 * Default metrics when no data available
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
  source: 'default',
});

/**
 * Track frame usage - Simplified
 */
export const trackFrameUsage = async (frameId, frameName) => {
  // Just call trackFunnelEvent with frame_select
  await trackFunnelEvent('frame_select', frameId, frameName);
};

/**
 * Track download - Simplified
 */
export const trackDownload = async (frameId, frameName) => {
  await markUserActivated();
  await trackFunnelEvent('downloaded', frameId, frameName);
  console.log(`📊 Download tracked for frame: ${frameName || frameId}`);
};

/**
 * Track page visit
 */
export const trackPageVisit = async (page) => {
  await trackUserSession();
  await trackFunnelEvent('visit', null, page);
};

/**
 * Get recent activities (localStorage only for now)
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
 * Add activity to log
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
    console.error("Error adding activity:", error);
  }
};

/**
 * Get registered users count from Supabase
 */
export const getRegisteredUsersCount = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return 0;
  }
  
  try {
    const { count, error } = await supabase
      .from('fremio_users')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Error getting registered users count:", error);
    return 0;
  }
};

/**
 * Get all registered users from Supabase
 */
export const getRegisteredUsers = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('fremio_users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error getting registered users:", error);
    return [];
  }
};

/**
 * Calculate registration rate
 */
export const getRegistrationRate = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return 0;
  }
  
  try {
    // Get total visitors from sessions
    const { count: visitorCount } = await supabase
      .from('fremio_sessions')
      .select('*', { count: 'exact', head: true });
    
    // Get registered users
    const { count: userCount } = await supabase
      .from('fremio_users')
      .select('*', { count: 'exact', head: true });
    
    if (!visitorCount || visitorCount === 0) return 0;
    return Math.round((userCount / visitorCount) * 100);
  } catch (error) {
    console.error("Error calculating registration rate:", error);
    return 0;
  }
};

/**
 * Track frame view - alias for compatibility
 */
export const trackFrameView = async (frameId, frameName) => {
  await trackFunnelEvent('frame_view', frameId, frameName);
};

/**
 * Track frame download - alias for compatibility
 */
export const trackFrameDownload = async (frameId, frameName) => {
  await trackDownload(frameId, frameName);
};

export default {
  trackUserSession,
  markUserActivated,
  trackFunnelEvent,
  getLeanMetrics,
  getLeanMetricsFromFirebase,
  trackFrameUsage,
  trackDownload,
  trackPageVisit,
  getRecentActivities,
  addActivity,
  getRegisteredUsersCount,
  getRegisteredUsers,
  getRegistrationRate,
  trackFrameView,
  trackFrameDownload,
};
