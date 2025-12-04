/**
 * Analytics Routes
 * Track pageviews, events, sessions, downloads
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { getClientInfo, getReferrerDomain } = require('../utils/clientInfo');

// ============================================
// TRACKING ENDPOINTS (Public/Optional Auth)
// ============================================

/**
 * Track page view
 * POST /api/analytics/track/pageview
 */
router.post('/track/pageview', optionalAuth, async (req, res) => {
  try {
    const { sessionId, pagePath, pageTitle, referrer, timeOnPage } = req.body;
    
    if (!sessionId || !pagePath) {
      return res.status(400).json({ error: 'sessionId and pagePath required' });
    }
    
    const clientInfo = getClientInfo(req);
    const userId = req.user?.userId || null;

    await db.query(`
      INSERT INTO page_views (
        session_id, user_id, page_path, page_title, referrer,
        device_type, browser, browser_version, os, os_version,
        screen_width, screen_height, country, city, ip_address, time_on_page
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `, [
      sessionId, userId, pagePath, pageTitle || null, referrer || null,
      clientInfo.deviceType, clientInfo.browser, clientInfo.browserVersion,
      clientInfo.os, clientInfo.osVersion, clientInfo.screenWidth,
      clientInfo.screenHeight, clientInfo.country, clientInfo.city,
      clientInfo.ip, timeOnPage || 0
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Track pageview error:', error);
    res.status(500).json({ error: 'Failed to track pageview' });
  }
});

/**
 * Track custom event
 * POST /api/analytics/track/event
 */
router.post('/track/event', optionalAuth, async (req, res) => {
  try {
    const { sessionId, eventName, eventCategory, eventData, pagePath } = req.body;
    
    if (!eventName) {
      return res.status(400).json({ error: 'eventName required' });
    }
    
    const userId = req.user?.userId || null;

    await db.query(`
      INSERT INTO user_events (session_id, user_id, event_name, event_category, event_data, page_path)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      sessionId || null, 
      userId, 
      eventName, 
      eventCategory || null, 
      JSON.stringify(eventData || {}), 
      pagePath || null
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

/**
 * Track session start/end
 * POST /api/analytics/track/session
 */
router.post('/track/session', optionalAuth, async (req, res) => {
  try {
    const { sessionId, action, entryPage, exitPage, utm_source, utm_medium, utm_campaign, referrer } = req.body;
    
    if (!sessionId || !action) {
      return res.status(400).json({ error: 'sessionId and action required' });
    }
    
    const clientInfo = getClientInfo(req);
    const userId = req.user?.userId || null;

    if (action === 'start') {
      await db.query(`
        INSERT INTO user_sessions (
          session_id, user_id, entry_page, utm_source, utm_medium, utm_campaign,
          referrer_domain, device_type, browser, os, country
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (session_id) DO NOTHING
      `, [
        sessionId, userId, entryPage || null, utm_source || null, 
        utm_medium || null, utm_campaign || null,
        getReferrerDomain(referrer),
        clientInfo.deviceType, clientInfo.browser, clientInfo.os, clientInfo.country
      ]);
    } else if (action === 'end') {
      await db.query(`
        UPDATE user_sessions 
        SET ended_at = NOW(),
            exit_page = $2,
            duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
            page_count = (SELECT COUNT(*) FROM page_views WHERE session_id = $1),
            is_bounce = (SELECT COUNT(*) FROM page_views WHERE session_id = $1) <= 1
        WHERE session_id = $1
      `, [sessionId, exitPage || null]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Track session error:', error);
    res.status(500).json({ error: 'Failed to track session' });
  }
});

/**
 * Track download
 * POST /api/analytics/track/download
 */
router.post('/track/download', authenticateToken, async (req, res) => {
  try {
    const { frameId, frameName, fileFormat, fileSizeKb, downloadSource, sessionId } = req.body;
    
    if (!frameId) {
      return res.status(400).json({ error: 'frameId required' });
    }
    
    // Get user's current plan
    const planResult = await db.query(`
      SELECT plan_id FROM user_subscriptions 
      WHERE user_id = $1 AND status = 'active' 
      ORDER BY created_at DESC LIMIT 1
    `, [req.user.userId]);
    
    const userPlan = planResult.rows[0]?.plan_id || 'free';

    await db.query(`
      INSERT INTO download_logs (user_id, session_id, frame_id, frame_name, file_format, file_size_kb, download_source, user_plan)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [req.user.userId, sessionId || null, frameId, frameName || null, fileFormat || null, fileSizeKb || null, downloadSource || null, userPlan]);

    // Update frame download count
    await db.query(`
      UPDATE frames SET download_count = download_count + 1 WHERE id = $1
    `, [frameId]);
    
    // Update user usage
    await db.query(`
      INSERT INTO user_usage (user_id, period_start, period_end, downloads_count)
      VALUES ($1, date_trunc('month', CURRENT_DATE)::DATE, (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE, 1)
      ON CONFLICT (user_id, period_start) 
      DO UPDATE SET downloads_count = user_usage.downloads_count + 1, updated_at = NOW()
    `, [req.user.userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Track download error:', error);
    res.status(500).json({ error: 'Failed to track download' });
  }
});

// ============================================
// DASHBOARD ENDPOINTS (Admin only)
// ============================================

/**
 * Get overview stats
 * GET /api/analytics/dashboard/overview
 */
router.get('/dashboard/overview', authenticateToken, async (req, res) => {
  try {
    // Check admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { period = '30' } = req.query;
    const days = parseInt(period) || 30;
    
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '${days} days') as new_users,
        (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE started_at >= NOW() - INTERVAL '${days} days' AND user_id IS NOT NULL) as active_users,
        (SELECT COUNT(*) FROM user_sessions WHERE started_at >= NOW() - INTERVAL '${days} days') as total_sessions,
        (SELECT COUNT(DISTINCT session_id) FROM page_views WHERE created_at >= NOW() - INTERVAL '${days} days') as unique_visitors,
        (SELECT COUNT(*) FROM page_views WHERE created_at >= NOW() - INTERVAL '${days} days') as total_page_views,
        (SELECT COALESCE(AVG(duration_seconds), 0)::INTEGER FROM user_sessions WHERE started_at >= NOW() - INTERVAL '${days} days' AND duration_seconds > 0) as avg_session_duration,
        (SELECT COALESCE(AVG(CASE WHEN is_bounce THEN 100 ELSE 0 END), 0)::DECIMAL(5,2) FROM user_sessions WHERE started_at >= NOW() - INTERVAL '${days} days') as bounce_rate,
        (SELECT COUNT(*) FROM download_logs WHERE created_at >= NOW() - INTERVAL '${days} days') as total_downloads,
        (SELECT COUNT(DISTINCT user_id) FROM download_logs WHERE created_at >= NOW() - INTERVAL '${days} days') as unique_downloaders,
        (SELECT COALESCE(SUM(amount), 0) FROM payment_transactions WHERE status = 'completed' AND paid_at >= NOW() - INTERVAL '${days} days') as total_revenue,
        (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active') as active_subscriptions
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

/**
 * Get user growth data
 * GET /api/analytics/dashboard/user-growth
 */
router.get('/dashboard/user-growth', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { period = '30' } = req.query;
    const days = parseInt(period) || 30;

    const result = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users,
        SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative_users
      FROM users
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('User growth error:', error);
    res.status(500).json({ error: 'Failed to get user growth' });
  }
});

/**
 * Get daily active users
 * GET /api/analytics/dashboard/dau
 */
router.get('/dashboard/dau', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { period = '30' } = req.query;
    const days = parseInt(period) || 30;

    const result = await db.query(`
      SELECT 
        DATE(started_at) as date,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as active_users,
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(DISTINCT session_id) FILTER (WHERE user_id IS NULL) as anonymous_sessions
      FROM user_sessions
      WHERE started_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(started_at)
      ORDER BY date
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('DAU error:', error);
    res.status(500).json({ error: 'Failed to get DAU' });
  }
});

/**
 * Get download analytics
 * GET /api/analytics/dashboard/downloads
 */
router.get('/dashboard/downloads', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { period = '30' } = req.query;
    const days = parseInt(period) || 30;

    // Daily downloads
    const dailyDownloads = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as downloads,
        COUNT(DISTINCT user_id) as unique_users
      FROM download_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // Top frames
    const topFrames = await db.query(`
      SELECT 
        frame_id,
        frame_name,
        COUNT(*) as download_count
      FROM download_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY frame_id, frame_name
      ORDER BY download_count DESC
      LIMIT 10
    `);

    // Downloads by plan
    const byPlan = await db.query(`
      SELECT 
        user_plan,
        COUNT(*) as download_count
      FROM download_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY user_plan
    `);

    res.json({
      daily: dailyDownloads.rows,
      topFrames: topFrames.rows,
      byPlan: byPlan.rows
    });
  } catch (error) {
    console.error('Download analytics error:', error);
    res.status(500).json({ error: 'Failed to get download analytics' });
  }
});

/**
 * Get retention cohort data
 * GET /api/analytics/dashboard/retention
 */
router.get('/dashboard/retention', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(`
      WITH cohorts AS (
        SELECT 
          DATE_TRUNC('week', created_at)::DATE as cohort_week,
          id as user_id
        FROM users
        WHERE created_at >= NOW() - INTERVAL '12 weeks'
      ),
      user_activity AS (
        SELECT 
          user_id,
          DATE(started_at) as activity_date
        FROM user_sessions
        WHERE user_id IS NOT NULL
        GROUP BY user_id, DATE(started_at)
      )
      SELECT 
        c.cohort_week,
        COUNT(DISTINCT c.user_id) as cohort_size,
        COUNT(DISTINCT CASE WHEN ua.activity_date >= c.cohort_week AND ua.activity_date < c.cohort_week + INTERVAL '1 week' THEN c.user_id END) as week_0,
        COUNT(DISTINCT CASE WHEN ua.activity_date >= c.cohort_week + INTERVAL '1 week' AND ua.activity_date < c.cohort_week + INTERVAL '2 weeks' THEN c.user_id END) as week_1,
        COUNT(DISTINCT CASE WHEN ua.activity_date >= c.cohort_week + INTERVAL '2 weeks' AND ua.activity_date < c.cohort_week + INTERVAL '3 weeks' THEN c.user_id END) as week_2,
        COUNT(DISTINCT CASE WHEN ua.activity_date >= c.cohort_week + INTERVAL '3 weeks' AND ua.activity_date < c.cohort_week + INTERVAL '4 weeks' THEN c.user_id END) as week_3,
        COUNT(DISTINCT CASE WHEN ua.activity_date >= c.cohort_week + INTERVAL '4 weeks' AND ua.activity_date < c.cohort_week + INTERVAL '5 weeks' THEN c.user_id END) as week_4
      FROM cohorts c
      LEFT JOIN user_activity ua ON c.user_id = ua.user_id
      GROUP BY c.cohort_week
      ORDER BY c.cohort_week
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Retention error:', error);
    res.status(500).json({ error: 'Failed to get retention data' });
  }
});

/**
 * Get traffic sources
 * GET /api/analytics/dashboard/traffic
 */
router.get('/dashboard/traffic', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { period = '30' } = req.query;
    const days = parseInt(period) || 30;

    const sources = await db.query(`
      SELECT 
        COALESCE(referrer_domain, 'Direct') as source,
        COUNT(*) as sessions,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as users,
        COALESCE(AVG(duration_seconds), 0)::INTEGER as avg_duration,
        COALESCE(AVG(CASE WHEN is_bounce THEN 100 ELSE 0 END), 0)::DECIMAL(5,2) as bounce_rate
      FROM user_sessions
      WHERE started_at >= NOW() - INTERVAL '${days} days'
      GROUP BY referrer_domain
      ORDER BY sessions DESC
      LIMIT 20
    `);

    const utmCampaigns = await db.query(`
      SELECT 
        utm_source,
        utm_medium,
        utm_campaign,
        COUNT(*) as sessions,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as users
      FROM user_sessions
      WHERE started_at >= NOW() - INTERVAL '${days} days'
        AND utm_source IS NOT NULL
      GROUP BY utm_source, utm_medium, utm_campaign
      ORDER BY sessions DESC
      LIMIT 20
    `);

    res.json({
      sources: sources.rows,
      campaigns: utmCampaigns.rows
    });
  } catch (error) {
    console.error('Traffic error:', error);
    res.status(500).json({ error: 'Failed to get traffic data' });
  }
});

/**
 * Get popular pages
 * GET /api/analytics/dashboard/pages
 */
router.get('/dashboard/pages', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { period = '30' } = req.query;
    const days = parseInt(period) || 30;

    const result = await db.query(`
      SELECT 
        page_path,
        COUNT(*) as views,
        COUNT(DISTINCT session_id) as unique_visitors,
        COALESCE(AVG(time_on_page), 0)::INTEGER as avg_time_on_page
      FROM page_views
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY page_path
      ORDER BY views DESC
      LIMIT 20
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Pages error:', error);
    res.status(500).json({ error: 'Failed to get page analytics' });
  }
});

/**
 * Get device breakdown
 * GET /api/analytics/dashboard/devices
 */
router.get('/dashboard/devices', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { period = '30' } = req.query;
    const days = parseInt(period) || 30;

    const devices = await db.query(`
      SELECT 
        device_type,
        COUNT(*) as sessions
      FROM user_sessions
      WHERE started_at >= NOW() - INTERVAL '${days} days'
        AND device_type IS NOT NULL
      GROUP BY device_type
    `);

    const browsers = await db.query(`
      SELECT 
        browser,
        COUNT(*) as sessions
      FROM user_sessions
      WHERE started_at >= NOW() - INTERVAL '${days} days'
        AND browser IS NOT NULL
      GROUP BY browser
      ORDER BY sessions DESC
      LIMIT 10
    `);

    const countries = await db.query(`
      SELECT 
        country,
        COUNT(*) as sessions,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as users
      FROM user_sessions
      WHERE started_at >= NOW() - INTERVAL '${days} days'
        AND country IS NOT NULL
      GROUP BY country
      ORDER BY sessions DESC
      LIMIT 20
    `);

    res.json({
      devices: devices.rows,
      browsers: browsers.rows,
      countries: countries.rows
    });
  } catch (error) {
    console.error('Devices error:', error);
    res.status(500).json({ error: 'Failed to get device analytics' });
  }
});

/**
 * Get real-time stats
 * GET /api/analytics/dashboard/realtime
 */
router.get('/dashboard/realtime', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM user_sessions WHERE started_at >= NOW() - INTERVAL '5 minutes' AND (ended_at IS NULL OR ended_at >= NOW() - INTERVAL '5 minutes')) as active_now,
        (SELECT COUNT(*) FROM page_views WHERE created_at >= NOW() - INTERVAL '1 hour') as views_last_hour,
        (SELECT COUNT(*) FROM download_logs WHERE created_at >= NOW() - INTERVAL '1 hour') as downloads_last_hour,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '24 hours') as signups_today
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Realtime error:', error);
    res.status(500).json({ error: 'Failed to get realtime stats' });
  }
});

module.exports = router;
