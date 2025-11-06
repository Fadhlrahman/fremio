import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS } from '../config/firebaseCollections';

/**
 * Analytics Service
 * Track and analyze platform usage
 */

/**
 * Log an analytics event
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} { success, eventId, message }
 */
export async function logAnalyticsEvent(eventData) {
  try {
    const {
      eventType,
      userId,
      frameId,
      kreatorId,
      metadata,
    } = eventData;

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
      message: 'Event logged',
    };
  } catch (error) {
    console.error('Error logging analytics event:', error);
    return {
      success: false,
      message: error.message || 'Failed to log event',
    };
  }
}

/**
 * Track frame view
 * @param {string} frameId - Frame ID
 * @param {string} userId - User ID (optional)
 */
export async function trackFrameView(frameId, userId = null) {
  return await logAnalyticsEvent({
    eventType: 'frame_view',
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
    eventType: 'frame_usage',
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
 */
export async function trackFrameLike(frameId, userId, kreatorId) {
  return await logAnalyticsEvent({
    eventType: 'frame_like',
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
 */
export async function trackFrameDownload(frameId, userId, kreatorId) {
  return await logAnalyticsEvent({
    eventType: 'frame_download',
    frameId,
    userId,
    kreatorId,
  });
}

/**
 * Get analytics for a specific frame
 * @param {string} frameId - Frame ID
 * @returns {Promise<Object>} Frame analytics
 */
export async function getFrameAnalytics(frameId) {
  try {
    const q = query(
      collection(db, COLLECTIONS.analytics),
      where('frameId', '==', frameId)
    );

    const querySnapshot = await getDocs(q);
    const events = querySnapshot.docs.map(doc => doc.data());

    const analytics = {
      totalViews: events.filter(e => e.eventType === 'frame_view').length,
      totalUsage: events.filter(e => e.eventType === 'frame_usage').length,
      totalLikes: events.filter(e => e.eventType === 'frame_like').length,
      totalDownloads: events.filter(e => e.eventType === 'frame_download').length,
    };

    return analytics;
  } catch (error) {
    console.error('Error fetching frame analytics:', error);
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
      where('kreatorId', '==', kreatorId)
    );

    const querySnapshot = await getDocs(q);
    const events = querySnapshot.docs.map(doc => doc.data());

    const analytics = {
      totalViews: events.filter(e => e.eventType === 'frame_view').length,
      totalUsage: events.filter(e => e.eventType === 'frame_usage').length,
      totalLikes: events.filter(e => e.eventType === 'frame_like').length,
      totalDownloads: events.filter(e => e.eventType === 'frame_download').length,
      uniqueUsers: new Set(events.map(e => e.userId).filter(Boolean)).size,
    };

    return analytics;
  } catch (error) {
    console.error('Error fetching kreator analytics:', error);
    return { totalViews: 0, totalUsage: 0, totalLikes: 0, totalDownloads: 0, uniqueUsers: 0 };
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
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const events = querySnapshot.docs.map(doc => doc.data());

    const analytics = {
      totalEvents: events.length,
      totalViews: events.filter(e => e.eventType === 'frame_view').length,
      totalUsage: events.filter(e => e.eventType === 'frame_usage').length,
      totalLikes: events.filter(e => e.eventType === 'frame_like').length,
      totalDownloads: events.filter(e => e.eventType === 'frame_download').length,
      uniqueUsers: new Set(events.map(e => e.userId).filter(Boolean)).size,
      uniqueFrames: new Set(events.map(e => e.frameId).filter(Boolean)).size,
      uniqueKreators: new Set(events.map(e => e.kreatorId).filter(Boolean)).size,
    };

    return analytics;
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
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
      where('eventType', '==', 'frame_usage'),
      where('timestamp', '>=', Timestamp.fromDate(sevenDaysAgo))
    );

    const querySnapshot = await getDocs(q);
    const events = querySnapshot.docs.map(doc => doc.data());

    // Count usage per frame
    const frameCounts = {};
    events.forEach(event => {
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
    console.error('Error fetching trending frames:', error);
    return [];
  }
}
