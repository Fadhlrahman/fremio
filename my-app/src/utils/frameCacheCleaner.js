import safeStorage from './safeStorage.js';

/**
 * Clear frame cache and related data from localStorage
 * Use this when:
 * - User finishes using a frame (after download)
 * - User selects a new frame
 * - User navigates away from frame workflow
 */
export const clearFrameCache = (options = {}) => {
  const {
    keepDraftId = false, // Keep activeDraftId for draft workflow
    keepPhotos = false,  // Keep captured photos
    clearAll = false     // Clear everything including drafts
  } = options;

  console.log('🗑️ Clearing frame cache with options:', options);

  // Always clear these
  const itemsToRemove = [
    'frameConfig',
    'frameConfigTimestamp',
    'selectedFrame',
  ];

  // Conditionally clear photos
  if (!keepPhotos || clearAll) {
    itemsToRemove.push('capturedPhotos', 'capturedVideos');
  }

  // Conditionally clear draft info
  if (!keepDraftId || clearAll) {
    itemsToRemove.push('activeDraftId', 'activeDraftSignature');
  }

  // Remove items
  itemsToRemove.forEach(item => {
    safeStorage.removeItem(item);
  });

  console.log('✅ Frame cache cleared:', itemsToRemove);
};

/**
 * Clear all frame and draft related data
 * Use this for complete reset
 */
export const clearAllFrameData = () => {
  clearFrameCache({ clearAll: true });
  console.log('✅ All frame data cleared');
};

/**
 * Check if there's stale frame cache (older than specified time)
 * @param {number} maxAgeMs - Maximum age in milliseconds (default: 24 hours)
 * @returns {boolean} true if cache is stale
 */
export const isFrameCacheStale = (maxAgeMs = 24 * 60 * 60 * 1000) => {
  const timestamp = safeStorage.getItem('frameConfigTimestamp');
  if (!timestamp) return false;

  const age = Date.now() - parseInt(timestamp);
  return age > maxAgeMs;
};

/**
 * Clear stale frame cache automatically
 * Returns true if cache was cleared
 */
export const clearStaleFrameCache = () => {
  if (isFrameCacheStale()) {
    console.log('⚠️ Frame cache is stale, clearing...');
    clearFrameCache({ clearAll: true });
    return true;
  }
  return false;
};

export default {
  clearFrameCache,
  clearAllFrameData,
  isFrameCacheStale,
  clearStaleFrameCache
};
