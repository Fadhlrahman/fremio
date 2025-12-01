/**
 * VPS API Service
 * Connects to Fremio's own VPS server (Hostinger)
 * Uses Cloudflare Worker proxy for HTTPS
 */

// Use Cloudflare Worker proxy for HTTPS
const API_BASE_URL = 'https://fremio-api-proxy.array111103.workers.dev/api';

// Helper function for API calls with error handling
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

// ===== USER OPERATIONS =====
export async function saveUserToVPS(user) {
  try {
    const result = await apiCall('/users', {
      method: 'POST',
      body: JSON.stringify({
        firebase_uid: user.uid,
        email: user.email,
        display_name: user.displayName,
        photo_url: user.photoURL,
      }),
    });
    console.log('✅ User saved to VPS:', result);
    return result;
  } catch (error) {
    console.warn('⚠️ Failed to save user to VPS:', error);
    // Non-blocking - don't throw
    return null;
  }
}

export async function getAllUsers() {
  try {
    const users = await apiCall('/users');
    return users.map(user => ({
      id: user.id,
      firebase_uid: user.firebase_uid,
      email: user.email,
      displayName: user.display_name,
      photoURL: user.photo_url,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
      loginCount: user.login_count,
    }));
  } catch (error) {
    console.error('Failed to get users:', error);
    return [];
  }
}

export async function getUserStats() {
  try {
    return await apiCall('/users/stats');
  } catch (error) {
    console.error('Failed to get user stats:', error);
    return { total: 0, today: 0 };
  }
}

// ===== FRAME OPERATIONS =====
export async function getAllFrames() {
  try {
    const frames = await apiCall('/frames');
    return frames.map(frame => ({
      id: frame.id,
      name: frame.name,
      category: frame.category,
      imageUrl: frame.image_url,
      thumbnailUrl: frame.thumbnail_url,
      slots: frame.slots,
      usageCount: frame.usage_count,
      createdAt: frame.created_at,
    }));
  } catch (error) {
    console.error('Failed to get frames:', error);
    return [];
  }
}

export async function getFrameById(id) {
  try {
    const frame = await apiCall(`/frames/${id}`);
    return {
      id: frame.id,
      name: frame.name,
      category: frame.category,
      imageUrl: frame.image_url,
      thumbnailUrl: frame.thumbnail_url,
      slots: frame.slots,
      usageCount: frame.usage_count,
    };
  } catch (error) {
    console.error('Failed to get frame:', error);
    return null;
  }
}

export async function createFrame(frameData) {
  try {
    return await apiCall('/frames', {
      method: 'POST',
      body: JSON.stringify({
        name: frameData.name,
        category: frameData.category || 'custom',
        image_url: frameData.imageUrl,
        thumbnail_url: frameData.thumbnailUrl,
        slots: frameData.slots || [],
      }),
    });
  } catch (error) {
    console.error('Failed to create frame:', error);
    throw error;
  }
}

export async function updateFrame(id, frameData) {
  try {
    return await apiCall(`/frames/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: frameData.name,
        category: frameData.category,
        image_url: frameData.imageUrl,
        thumbnail_url: frameData.thumbnailUrl,
        slots: frameData.slots,
        is_active: frameData.isActive,
      }),
    });
  } catch (error) {
    console.error('Failed to update frame:', error);
    throw error;
  }
}

export async function deleteFrame(id) {
  try {
    return await apiCall(`/frames/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Failed to delete frame:', error);
    throw error;
  }
}

// Upload frame with base64 image
export async function uploadFrameWithImage(frameData, imageBase64) {
  try {
    const result = await apiCall('/frames/base64', {
      method: 'POST',
      body: JSON.stringify({
        name: frameData.name,
        description: frameData.description || '',
        category: frameData.category || 'Lainnya',
        max_captures: frameData.maxCaptures || 4,
        slots: frameData.slots || [],
        image: imageBase64,
      }),
    });
    console.log('✅ Frame uploaded to VPS:', result.id);
    return result;
  } catch (error) {
    console.error('Failed to upload frame:', error);
    throw error;
  }
}

// Increment frame view count
export async function incrementFrameView(frameId) {
  try {
    await apiCall(`/frames/${frameId}/view`, { method: 'POST' });
  } catch (error) {
    // Non-blocking
    console.warn('Failed to increment frame view:', error);
  }
}

// ===== ANALYTICS OPERATIONS =====
export async function trackSession(sessionData) {
  try {
    await apiCall('/analytics/session', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionData.sessionId,
        user_agent: navigator.userAgent,
        referrer: document.referrer,
        device_type: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      }),
    });
  } catch (error) {
    // Non-blocking
    console.warn('Failed to track session:', error);
  }
}

export async function trackEvent(eventType, eventData = {}, page = '') {
  try {
    const sessionId = localStorage.getItem('fremio_session_id') || 
      `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!localStorage.getItem('fremio_session_id')) {
      localStorage.setItem('fremio_session_id', sessionId);
    }
    
    await apiCall('/analytics/event', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        event_type: eventType,
        event_data: eventData,
        page: page || window.location.pathname,
      }),
    });
  } catch (error) {
    // Non-blocking
    console.warn('Failed to track event:', error);
  }
}

export async function trackFrameUsage(frameId, frameName) {
  try {
    await apiCall('/analytics/frame-usage', {
      method: 'POST',
      body: JSON.stringify({
        frame_id: frameId,
        frame_name: frameName,
      }),
    });
  } catch (error) {
    // Non-blocking
    console.warn('Failed to track frame usage:', error);
  }
}

export async function getDashboardAnalytics(days = 7) {
  try {
    return await apiCall(`/analytics/dashboard?days=${days}`);
  } catch (error) {
    console.error('Failed to get dashboard analytics:', error);
    return {
      daily: [],
      totals: { total_visitors: 0, total_photos: 0, total_downloads: 0, total_shares: 0 },
      topFrames: [],
    };
  }
}

// ===== CONVENIENCE EXPORTS =====
export const vpsApi = {
  // Users
  saveUser: saveUserToVPS,
  getUsers: getAllUsers,
  getUserStats,
  
  // Frames
  getFrames: getAllFrames,
  getFrame: getFrameById,
  createFrame,
  updateFrame,
  deleteFrame,
  uploadFrameWithImage,
  incrementFrameView,
  
  // Analytics
  trackSession,
  trackEvent,
  trackFrameUsage,
  getDashboard: getDashboardAnalytics,
};

export default vpsApi;
