/**
 * Video Memory Manager
 * 
 * Solves memory issues when recording 6 videos by:
 * 1. Storing blobs outside React state (prevents re-renders holding memory)
 * 2. Converting to dataUrl only when needed (lazy conversion)
 * 3. Sequential conversion to avoid memory spikes
 * 4. Aggressive cleanup after conversion
 */

// External storage for video blobs (outside React lifecycle)
const videoBlobs = new Map();

/**
 * Store video blob in memory manager (not React state)
 * Returns previewUrl for display
 */
export const storeVideoBlob = (id, blob) => {
  if (!id || !blob) {
    console.warn("⚠️ storeVideoBlob: Invalid id or blob");
    return null;
  }
  
  // Cleanup old blob if exists
  const old = videoBlobs.get(id);
  if (old?.previewUrl?.startsWith('blob:')) {
    try { 
      URL.revokeObjectURL(old.previewUrl); 
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  
  // Create preview URL for display
  const previewUrl = URL.createObjectURL(blob);
  
  // Store blob externally
  videoBlobs.set(id, { 
    blob, 
    previewUrl, 
    storedAt: Date.now(),
    sizeBytes: blob.size,
  });
  
  const memUsage = getMemoryUsage();
  console.log(`💾 Stored video: ${id.slice(-8)} (${(blob.size / 1024).toFixed(1)}KB) | Total: ${memUsage.count} videos, ${memUsage.totalMB}MB`);
  
  return previewUrl;
};

/**
 * Get video blob by ID
 */
export const getVideoBlob = (id) => {
  return videoBlobs.get(id)?.blob || null;
};

/**
 * Get preview URL for video
 */
export const getVideoPreviewUrl = (id) => {
  return videoBlobs.get(id)?.previewUrl || null;
};

/**
 * Check if video blob exists
 */
export const hasVideoBlob = (id) => {
  return videoBlobs.has(id) && videoBlobs.get(id)?.blob instanceof Blob;
};

/**
 * Convert a single blob to dataUrl
 */
export const convertBlobToDataUrl = (blob) => {
  return new Promise((resolve, reject) => {
    if (!blob || !(blob instanceof Blob)) {
      reject(new Error('Invalid blob provided'));
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader returned null'));
      }
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(blob);
  });
};

/**
 * Convert all videos to dataUrl format (sequential to avoid memory spike)
 * This is the key function that prevents lag!
 * 
 * @param {Array} entries - Array of video entries
 * @param {Function} onProgress - Progress callback (current, total, id)
 * @returns {Promise<Array>} - Converted entries with dataUrl
 */
export const convertAllVideosToDataUrl = async (entries, onProgress) => {
  if (!Array.isArray(entries)) {
    console.warn("⚠️ convertAllVideosToDataUrl: Invalid entries");
    return [];
  }
  
  const results = [];
  const totalCount = entries.length;
  
  console.log(`🔄 Starting sequential conversion of ${totalCount} videos...`);
  
  for (let i = 0; i < totalCount; i++) {
    const entry = entries[i];
    
    // Report progress
    if (onProgress) {
      onProgress(i + 1, totalCount, entry?.id);
    }
    
    // Handle null entries
    if (!entry) {
      results.push(null);
      continue;
    }
    
    // Already has dataUrl - just cleanup blob reference
    if (entry.dataUrl && typeof entry.dataUrl === 'string' && entry.dataUrl.startsWith('data:')) {
      console.log(`✅ Video ${i + 1}: Already converted`);
      results.push({ 
        ...entry, 
        blob: null, 
        previewUrl: null 
      });
      continue;
    }
    
    // Get blob from entry or from memory manager
    const blob = entry.blob instanceof Blob ? entry.blob : getVideoBlob(entry.id);
    
    if (!blob) {
      console.warn(`⚠️ Video ${i + 1}: No blob found for ${entry.id?.slice(-8)}`);
      results.push(entry);
      continue;
    }
    
    try {
      console.log(`🔄 Converting video ${i + 1}/${totalCount} (${(blob.size / 1024).toFixed(1)}KB)...`);
      
      // Convert blob to dataUrl
      const dataUrl = await convertBlobToDataUrl(blob);
      
      // Cleanup preview URL if exists
      if (entry.previewUrl && entry.previewUrl.startsWith('blob:')) {
        try { 
          URL.revokeObjectURL(entry.previewUrl); 
        } catch (e) {
          // Ignore
        }
      }
      
      // Cleanup blob from memory manager
      cleanupVideoBlob(entry.id);
      
      // Add converted entry
      results.push({
        ...entry,
        dataUrl: dataUrl,
        blob: null, // Free memory
        previewUrl: null, // No longer needed
      });
      
      console.log(`✅ Video ${i + 1} converted: ${(dataUrl.length / 1024).toFixed(0)}KB dataUrl`);
      
      // CRITICAL: Give browser time for garbage collection between conversions
      // This is what prevents the memory spike and lag!
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err) {
      console.error(`❌ Video ${i + 1} conversion failed:`, err);
      results.push(entry);
    }
  }
  
  console.log(`✅ Conversion complete: ${results.filter(r => r?.dataUrl).length}/${totalCount} videos converted`);
  
  return results;
};

/**
 * Cleanup a specific video blob from memory
 */
export const cleanupVideoBlob = (id) => {
  if (!id || !videoBlobs.has(id)) return;
  
  const entry = videoBlobs.get(id);
  
  // Revoke blob URL
  if (entry?.previewUrl && entry.previewUrl.startsWith('blob:')) {
    try { 
      URL.revokeObjectURL(entry.previewUrl); 
    } catch (e) {
      // Ignore
    }
  }
  
  // Remove from map
  videoBlobs.delete(id);
  
  console.log(`🧹 Cleaned up video: ${id.slice(-8)}`);
};

/**
 * Cleanup all video blobs from memory
 */
export const cleanupAllVideoBlobs = () => {
  let count = 0;
  
  videoBlobs.forEach((entry, id) => {
    if (entry?.previewUrl && entry.previewUrl.startsWith('blob:')) {
      try { 
        URL.revokeObjectURL(entry.previewUrl); 
      } catch (e) {
        // Ignore
      }
    }
    count++;
  });
  
  videoBlobs.clear();
  
  console.log(`🧹 Cleaned up all ${count} video blobs`);
};

/**
 * Get current memory usage estimate
 */
export const getMemoryUsage = () => {
  let totalSize = 0;
  
  videoBlobs.forEach((entry) => {
    if (entry?.sizeBytes) {
      totalSize += entry.sizeBytes;
    } else if (entry?.blob) {
      totalSize += entry.blob.size;
    }
  });
  
  return {
    count: videoBlobs.size,
    totalBytes: totalSize,
    totalKB: (totalSize / 1024).toFixed(1),
    totalMB: (totalSize / 1024 / 1024).toFixed(2),
  };
};

/**
 * Debug: List all stored videos
 */
export const listStoredVideos = () => {
  const videos = [];
  videoBlobs.forEach((entry, id) => {
    videos.push({
      id: id.slice(-8),
      sizeKB: entry.sizeBytes ? (entry.sizeBytes / 1024).toFixed(1) : 'unknown',
      hasBlob: entry.blob instanceof Blob,
      hasPreviewUrl: !!entry.previewUrl,
      storedAt: entry.storedAt,
    });
  });
  console.table(videos);
  return videos;
};

export default {
  storeVideoBlob,
  getVideoBlob,
  getVideoPreviewUrl,
  hasVideoBlob,
  convertBlobToDataUrl,
  convertAllVideosToDataUrl,
  cleanupVideoBlob,
  cleanupAllVideoBlobs,
  getMemoryUsage,
  listStoredVideos,
};
