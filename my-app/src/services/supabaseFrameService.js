/**
 * Supabase Frame Service
 * Handles custom frame storage - NOW USES VPS API AS PRIMARY
 */

import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { getStaticFrames } from '../data/staticFrames.js';

// VPS API base URL
const VPS_API_URL = 'http://72.61.210.203/api';

const FRAMES_TABLE = 'frames';
const FRAMES_BUCKET = 'frames';

/**
 * Compress image before upload - keep high quality for frame images
 */
const compressImage = (file, maxWidth = 1080, maxHeight = 1920, quality = 0.95) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Only resize if larger than max dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
          'image/png', // Use PNG to preserve transparency
          quality
        );
      };
      img.src = e.target.result;
    };
    
    // Handle both File and Blob
    if (file instanceof Blob) {
      reader.readAsDataURL(file);
    } else {
      reject(new Error('Invalid file type'));
    }
  });
};

/**
 * Upload image to Supabase Storage
 */
const uploadImageToStorage = async (file, fileName) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured');
  }

  console.log('🖼️ Compressing image...');
  const compressedBlob = await compressImage(file);
  console.log('✅ Compressed size:', compressedBlob.size, 'bytes');

  // Sanitize filename: remove special characters, replace spaces with underscores
  const sanitizedFileName = fileName
    .replace(/[""''„"«»]/g, '')  // Remove various quote characters
    .replace(/[–—]/g, '-')        // Replace en-dash/em-dash with hyphen
    .replace(/[^\w\s.-]/g, '')    // Remove any other special characters except word chars, spaces, dots, hyphens
    .replace(/\s+/g, '_')         // Replace spaces with underscores
    .replace(/_+/g, '_')          // Replace multiple underscores with single
    .replace(/^_|_$/g, '');       // Remove leading/trailing underscores
  
  const filePath = `custom/${Date.now()}_${sanitizedFileName}.png`;
  console.log('📁 Uploading to Supabase Storage:', filePath);

  const { data, error } = await supabase.storage
    .from(FRAMES_BUCKET)
    .upload(filePath, compressedBlob, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/png'
    });

  if (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(FRAMES_BUCKET)
    .getPublicUrl(data.path);

  console.log('✅ Uploaded! URL:', publicUrl);
  return { url: publicUrl, path: data.path };
};

/**
 * Helper: Promise with timeout
 */
const withTimeout = (promise, ms, errorMessage = 'Request timeout') => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

/**
 * Process frame data - map snake_case to camelCase
 * Note: layout and slots columns are excluded from query for performance
 * (they contain large Base64 data). Use fetchFrameWithFullData() if you need them.
 */
const processFrameData = (data) => {
  if (!data || !Array.isArray(data)) return [];
  
  return data.map(frame => ({
    ...frame,
    maxCaptures: frame.max_captures,
    imagePath: frame.image_url || frame.thumbnail_url,
    thumbnailUrl: frame.thumbnail_url,
    createdAt: frame.created_at,
    updatedAt: frame.updated_at,
    createdBy: frame.created_by,
    isActive: frame.is_active,
    // Default sort orders (layout column excluded for performance)
    sortOrder: 999,
    categorySortOrder: 999
  }));
};

// In-memory cache for frames
let framesCache = null;
let framesCacheTime = 0;
const CACHE_DURATION = 300000; // 5 minute cache
let isFetching = false;
let fetchPromise = null;

// Use localStorage for persistence across sessions
const STORAGE_CACHE_KEY = 'fremio_frames_cache_v3';
const STORAGE_CACHE_TIME_KEY = 'fremio_frames_cache_time_v3';

const loadCacheFromStorage = () => {
  try {
    const cached = localStorage.getItem(STORAGE_CACHE_KEY);
    const cachedTime = localStorage.getItem(STORAGE_CACHE_TIME_KEY);
    if (cached && cachedTime) {
      const time = parseInt(cachedTime, 10);
      // Accept cache up to 10 minutes old for instant loading
      if (Date.now() - time < 600000) {
        framesCache = JSON.parse(cached);
        framesCacheTime = time;
        console.log('📦 Loaded cache from localStorage:', framesCache.length, 'frames');
        return true;
      }
    }
  } catch (e) {
    console.warn('Failed to load cache from storage');
  }
  return false;
};

const saveCacheToStorage = (data) => {
  try {
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(STORAGE_CACHE_TIME_KEY, Date.now().toString());
  } catch (e) {
    console.warn('Failed to save cache to storage');
  }
};

// Background fetch function - OPTIMIZED: Only fetch required columns
// PERFORMANCE OPTIMIZATION:
// Excluded columns that contain large data:
// - 'design_data': Contains large Base64 images (~50KB+ per frame)
// - 'slots': Contains slot position data with embedded images
// - 'layout': Contains full layout JSON with embedded Base64 images (~40MB total!)
// Including these columns causes query to take ~50 seconds instead of ~1 second
const fetchFramesFromAPI = async (timeoutMs = 10000) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), timeoutMs);
  
  // Only select columns needed for list view - excludes large data columns
  const columns = [
    'id',
    'name',
    'description',
    'category',
    'image_url',
    'thumbnail_url',
    'is_active',
    'popularity',
    'created_by',
    'created_at',
    'updated_at',
    'storage_path',
    'max_captures'
  ].join(',');
  
  const response = await fetch(
    `${supabaseUrl}/rest/v1/frames?select=${columns}&order=created_at.desc`,
    {
      signal: controller.signal,
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  );
  
  clearTimeout(fetchTimeout);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return response.json();
};

/**
 * Get all custom frames
 * Version: 12 - Uses static frames for instant loading, VPS API for custom frames
 */
export const getAllCustomFrames = async () => {
  const startTime = Date.now();
  console.log('🔄 getAllCustomFrames v12 - FAST MODE');
  
  // 1. Return fresh in-memory cache if available (less than 30 seconds old)
  if (framesCache && framesCache.length > 0 && (Date.now() - framesCacheTime) < 30000) {
    console.log('⚡ Returning fresh memory cache:', framesCache.length, 'frames');
    return framesCache;
  }
  
  // 2. Load from localStorage cache for instant display
  if (loadCacheFromStorage() && framesCache && framesCache.length > 0) {
    console.log('📦 Returning localStorage cache:', framesCache.length, 'frames');
    return framesCache;
  }
  
  // 3. Use static frames as primary source (instant, no network)
  const staticFrames = getStaticFrames();
  if (staticFrames && staticFrames.length > 0) {
    framesCache = staticFrames;
    framesCacheTime = Date.now();
    saveCacheToStorage(staticFrames);
    console.log(`✅ Using static frames: ${staticFrames.length} frames in ${Date.now() - startTime}ms`);
    return staticFrames;
  }
  
  // 4. Try VPS API as backup
  try {
    const response = await fetch(`${VPS_API_URL}/frames`, {
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      const processed = data.map(f => ({
        ...f,
        imagePath: f.imageUrl || f.image_url,
        maxCaptures: f.slots?.length || 1
      }));
      
      if (processed.length > 0) {
        framesCache = processed;
        framesCacheTime = Date.now();
        saveCacheToStorage(processed);
        console.log(`✅ VPS frames: ${processed.length} in ${Date.now() - startTime}ms`);
        return processed;
      }
    }
  } catch (e) {
    console.warn('VPS API failed:', e.message);
  }
  
  // 5. Empty fallback
  return [];
};

// Preload frames when module loads
loadCacheFromStorage();

// Function to clear cache (call after upload/delete)
export const clearFramesCache = () => {
  framesCache = null;
  framesCacheTime = 0;
  try {
    localStorage.removeItem(STORAGE_CACHE_KEY);
    localStorage.removeItem(STORAGE_CACHE_TIME_KEY);
    // Also clear frame slots cache
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('fremio_frame_slots_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {}
  console.log('🗑️ Frames cache cleared');
};

// Slots prefetch tracking
let slotsPrefetchInProgress = false;
let slotsPrefetchPromise = null;

/**
 * Prefetch slots for all frames in background
 * This makes frame selection instant
 */
export const prefetchAllFrameSlots = async (frameIds) => {
  if (!isSupabaseConfigured || !supabase) return;
  if (slotsPrefetchInProgress) return slotsPrefetchPromise;
  
  // Filter to only frames that don't have cached slots
  const uncachedIds = frameIds.filter(id => {
    try {
      const cached = localStorage.getItem(`fremio_frame_slots_${id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Valid if cached within 1 hour
        if (parsed?.slots && Date.now() - parsed.cachedAt < 3600000) {
          return false;
        }
      }
    } catch (e) {}
    return true;
  });
  
  if (uncachedIds.length === 0) {
    console.log('⚡ All frame slots already cached');
    return;
  }
  
  console.log(`🔄 Prefetching slots for ${uncachedIds.length} frames...`);
  slotsPrefetchInProgress = true;
  
  slotsPrefetchPromise = (async () => {
    try {
      // Fetch frames in small batches to avoid 500 error
      const BATCH_SIZE = 5;
      let successCount = 0;
      
      for (let i = 0; i < uncachedIds.length; i += BATCH_SIZE) {
        const batchIds = uncachedIds.slice(i, i + BATCH_SIZE);
        
        try {
          const { data, error } = await supabase
            .from(FRAMES_TABLE)
            .select('id, slots, layout, max_captures, image_url, thumbnail_url, name, description, category')
            .in('id', batchIds);
          
          if (error) {
            console.warn(`Batch ${i / BATCH_SIZE + 1} prefetch error:`, error.message);
            continue;
          }
          
          if (data && data.length > 0) {
            data.forEach(frame => {
              if (frame.slots) {
                try {
                  // Clean slots - remove embedded images to save space
                  const cleanSlots = frame.slots.map(slot => ({
                    id: slot.id,
                    left: slot.left,
                    top: slot.top,
                    width: slot.width,
                    height: slot.height,
                    zIndex: slot.zIndex,
                    photoIndex: slot.photoIndex,
                    aspectRatio: slot.aspectRatio
                    // Exclude: image, preview, data (large base64)
                  }));
                  
                  const cacheData = {
                    id: frame.id,
                    name: frame.name,
                    description: frame.description,
                    category: frame.category,
                    slots: cleanSlots,
                    maxCaptures: frame.max_captures,
                    imagePath: frame.image_url || frame.thumbnail_url,
                    image_url: frame.image_url,
                    thumbnailUrl: frame.thumbnail_url,
                    cachedAt: Date.now()
                  };
                  
                  // Check size before saving - max 50KB per frame
                  const cacheStr = JSON.stringify(cacheData);
                  if (cacheStr.length < 50000) {
                    localStorage.setItem(`fremio_frame_slots_${frame.id}`, cacheStr);
                    successCount++;
                  } else {
                    console.warn(`Frame ${frame.id} slots too large (${cacheStr.length} chars), skipping cache`);
                  }
                } catch (e) {
                  console.warn(`Failed to cache frame ${frame.id}:`, e.message);
                }
              }
            });
          }
        } catch (e) {
          console.warn(`Batch ${i / BATCH_SIZE + 1} failed:`, e.message);
        }
      }
      
      if (successCount > 0) {
        console.log(`✅ Prefetched slots for ${successCount} frames`);
      }
    } catch (e) {
      console.warn('Slots prefetch failed:', e);
    } finally {
      slotsPrefetchInProgress = false;
    }
  })();
  
  return slotsPrefetchPromise;
};

/**
 * Get single frame by ID - FAST VERSION using static frames
 */
export const getCustomFrameById = async (frameId) => {
  const SLOTS_CACHE_KEY = `fremio_frame_slots_${frameId}`;
  
  console.log('🔍 getCustomFrameById v2:', frameId);
  
  // Helper to try static frames (FASTEST)
  const tryStaticFrame = () => {
    try {
      const staticFrames = getStaticFrames();
      const frame = staticFrames.find(f => f.id === frameId);
      if (frame) {
        console.log('⚡ Found static frame:', frame.name);
        return frame;
      }
    } catch (e) {}
    return null;
  };
  
  // Helper to try localStorage cache
  const tryCachedFrame = () => {
    try {
      const cached = localStorage.getItem(SLOTS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.slots) {
          console.log('📦 Frame from cache:', frameId);
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  };

  // 1. Try static frames FIRST (instant, no network)
  const staticFrame = tryStaticFrame();
  if (staticFrame) {
    return staticFrame;
  }
  
  // 2. Try localStorage cache
  const cachedFrame = tryCachedFrame();
  if (cachedFrame) {
    return cachedFrame;
  }
  
  // 3. Try VPS API (faster than Supabase)
  try {
    const response = await fetch(`${VPS_API_URL}/frames/${frameId}`, {
      signal: AbortSignal.timeout(3000)
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data) {
        const result = {
          ...data,
          imagePath: data.imageUrl || data.image_url,
          maxCaptures: data.slots?.length || 1,
          cachedAt: Date.now()
        };
        
        // Cache for next time
        try {
          localStorage.setItem(SLOTS_CACHE_KEY, JSON.stringify(result));
        } catch (e) {}
        
        console.log('✅ Frame from VPS:', result.name);
        return result;
      }
    }
  } catch (e) {
    console.warn('VPS API failed for frame:', e.message);
  }
  
  // 4. Last resort - Supabase (slow)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const { data, error } = await supabase
      .from(FRAMES_TABLE)
      .select(`
        id,
        name,
        description,
        category,
        image_url,
        thumbnail_url,
        is_active,
        popularity,
        max_captures,
        slots,
        layout,
        created_at,
        updated_at
      `)
      .eq('id', frameId)
      .abortSignal(controller.signal)
      .single();
    
    clearTimeout(timeout);

    if (error || !data) {
      console.error('Error getting frame by ID:', error);
      return null;
    }

    const result = {
      ...data,
      maxCaptures: data.max_captures,
      imagePath: data.image_url || data.thumbnail_url,
      thumbnailUrl: data.thumbnail_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      cachedAt: Date.now()
    };
    
    // Cache to localStorage for next time
    try {
      localStorage.setItem(SLOTS_CACHE_KEY, JSON.stringify(result));
      console.log('💾 Frame slots cached:', frameId);
    } catch (e) {}

    return result;
  } catch (error) {
    console.error('Error getting frame:', error);
    
    // Try localStorage cache as fallback even if expired
    try {
      const cached = localStorage.getItem(SLOTS_CACHE_KEY);
      if (cached) {
        console.log('⚠️ Using expired cache as fallback:', frameId);
        return JSON.parse(cached);
      }
    } catch (e) {}
    
    // Try static frames as last fallback
    try {
      const staticFrames = getStaticFrames();
      const staticFrame = staticFrames.find(f => f.id === frameId);
      if (staticFrame) {
        console.log('📦 Using static frame as fallback:', frameId);
        return staticFrame;
      }
    } catch (e) {}
    
    return null;
  }
};

/**
 * Save new custom frame
 */
export const saveCustomFrame = async (frameData, imageFile) => {
  console.log('🔥 saveCustomFrame called (Supabase)');
  console.log('📊 isSupabaseConfigured:', isSupabaseConfigured);

  if (!isSupabaseConfigured || !supabase) {
    console.error('❌ Supabase not configured');
    return { 
      success: false, 
      message: 'Database tidak dikonfigurasi. Pastikan Supabase credentials sudah diset.' 
    };
  }

  try {
    console.log('💾 Saving frame:', frameData.name);

    if (!frameData.slots || frameData.slots.length === 0) {
      throw new Error('Frame harus memiliki minimal 1 slot foto.');
    }

    let imageUrl = '';
    let storagePath = '';

    // Upload image to storage
    if (imageFile) {
      try {
        const result = await uploadImageToStorage(imageFile, frameData.name);
        imageUrl = result.url;
        storagePath = result.path;
      } catch (uploadError) {
        console.error('❌ Image upload failed:', uploadError);
        throw new Error('Gagal upload gambar: ' + uploadError.message);
      }
    }

    // Prepare frame document
    const frameDoc = {
      name: frameData.name,
      description: frameData.description || '',
      category: frameData.category || 'custom',
      max_captures: parseInt(frameData.maxCaptures) || 3,
      slots: frameData.slots,
      layout: frameData.layout || {
        aspectRatio: '9:16',
        orientation: 'portrait',
        backgroundColor: '#ffffff'
      },
      thumbnail_url: imageUrl,
      image_url: imageUrl,
      storage_path: storagePath,
      is_active: true,
      popularity: 0
      // Note: created_by is UUID, will be set by auth if needed
    };

    console.log('📝 Inserting to Supabase...');
    const { data, error } = await supabase
      .from(FRAMES_TABLE)
      .insert(frameDoc)
      .select()
      .single();

    if (error) {
      console.error('❌ Insert error:', error);
      throw error;
    }

    console.log('✅ Frame saved with ID:', data.id);
    
    // Clear cache so new frame appears immediately
    clearFramesCache();
    
    return { success: true, frameId: data.id };

  } catch (error) {
    console.error('❌ Error saving frame:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Update existing frame
 */
export const updateCustomFrame = async (frameId, updates, imageFile = null) => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: 'Supabase tidak dikonfigurasi' };
  }

  try {
    // Only include fields that exist in the database schema
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Map allowed fields to database columns
    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.category) updateData.category = updates.category;
    if (updates.maxCaptures) updateData.max_captures = parseInt(updates.maxCaptures);
    if (updates.slots) updateData.slots = updates.slots;
    if (updates.layout) updateData.layout = updates.layout;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

    // Upload new image if provided
    if (imageFile) {
      const result = await uploadImageToStorage(imageFile, updates.name || frameId);
      updateData.thumbnail_url = result.url;
      updateData.image_url = result.url;
      updateData.storage_path = result.path;
    }

    console.log('📝 Updating frame in Supabase:', frameId, updateData);

    const { error } = await supabase
      .from(FRAMES_TABLE)
      .update(updateData)
      .eq('id', frameId);

    if (error) throw error;

    console.log('✅ Frame updated successfully');
    
    // Clear cache so changes appear immediately
    clearFramesCache();
    
    return { success: true };
  } catch (error) {
    console.error('Error updating frame:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Delete frame
 */
export const deleteCustomFrame = async (frameId) => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: 'Supabase tidak dikonfigurasi' };
  }

  try {
    // Get frame to delete storage file
    const frame = await getCustomFrameById(frameId);
    
    // Delete from storage if exists
    if (frame && frame.storage_path) {
      try {
        await supabase.storage
          .from(FRAMES_BUCKET)
          .remove([frame.storage_path]);
      } catch (e) {
        console.warn('Could not delete storage file:', e);
      }
    }

    // Delete from database
    const { error } = await supabase
      .from(FRAMES_TABLE)
      .delete()
      .eq('id', frameId);

    if (error) throw error;

    console.log('✅ Frame deleted:', frameId);
    
    // Clear cache so deleted frame disappears immediately
    clearFramesCache();
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting frame:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Increment frame stats
 */
export const incrementFrameStats = async (frameId, stat = 'popularity') => {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const frame = await getCustomFrameById(frameId);
    if (frame) {
      await supabase
        .from(FRAMES_TABLE)
        .update({ [stat]: (frame[stat] || 0) + 1 })
        .eq('id', frameId);
    }
  } catch (e) {
    console.error('Error incrementing stats:', e);
  }
};

/**
 * Get frame config for EditPhoto
 */
export const getCustomFrameConfig = async (frameId) => {
  const frame = await getCustomFrameById(frameId);
  if (!frame) return null;

  const W = 1080;
  const H = 1920;

  return {
    id: frame.id,
    name: frame.name,
    description: frame.description,
    maxCaptures: frame.maxCaptures || frame.max_captures,
    duplicatePhotos: frame.duplicatePhotos || false,
    imagePath: frame.imagePath || frame.image_url,
    frameImage: frame.imagePath || frame.image_url,
    thumbnailUrl: frame.thumbnailUrl || frame.thumbnail_url,
    slots: frame.slots,
    designer: {
      elements: (frame.slots || []).map((s, i) => ({
        id: s.id || 'photo_' + (i + 1),
        type: 'photo',
        x: s.left * W,
        y: s.top * H,
        width: s.width * W,
        height: s.height * H,
        zIndex: s.zIndex || 2,
        data: {
          photoIndex: s.photoIndex !== undefined ? s.photoIndex : i,
          image: null,
          aspectRatio: s.aspectRatio || '4:5'
        }
      }))
    },
    layout: frame.layout || {
      aspectRatio: '9:16',
      orientation: 'portrait',
      backgroundColor: '#ffffff'
    },
    category: frame.category,
    // IMPORTANT: Admin frames should NOT have isCustom: true
    // This allows the frameImage overlay to be displayed in EditPhoto
    // Only user-created frames (from Creator page) should have isCustom: true
    isCustom: frame.isCustom || false
  };
};

/**
 * Clear all custom frames
 */
export const clearAllCustomFrames = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false };
  }

  try {
    const frames = await getAllCustomFrames();
    for (const f of frames) {
      await deleteCustomFrame(f.id);
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
};

/**
 * Storage info
 */
export const getStorageInfo = () => ({
  totalMB: 'Cloud',
  framesMB: 'Cloud',
  availableMB: '1GB Free',
  isNearLimit: false,
  isFull: false,
  isSupabase: true
});

/**
 * Update frame sort order within category
 * Stores sort_order inside the layout JSON field
 */
export const updateFrameSortOrder = async (frameId, sortOrder) => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: 'Supabase tidak dikonfigurasi' };
  }

  try {
    // First get current layout
    const { data: frame, error: fetchError } = await supabase
      .from(FRAMES_TABLE)
      .select('layout')
      .eq('id', frameId)
      .single();

    if (fetchError) throw fetchError;

    // Update layout with sort_order
    const updatedLayout = {
      ...(frame?.layout || {}),
      sortOrder: sortOrder
    };

    const { error } = await supabase
      .from(FRAMES_TABLE)
      .update({ layout: updatedLayout, updated_at: new Date().toISOString() })
      .eq('id', frameId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating sort order:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Update category sort order
 * Stores category_sort_order inside the layout JSON field for all frames in category
 */
export const updateCategorySortOrder = async (category, sortOrder) => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: 'Supabase tidak dikonfigurasi' };
  }

  try {
    // Get all frames in this category
    const { data: frames, error: fetchError } = await supabase
      .from(FRAMES_TABLE)
      .select('id, layout, category')
      .like('category', `%${category}%`);

    if (fetchError) throw fetchError;

    // Update each frame's layout with categorySortOrder
    for (const frame of frames) {
      // Check if this frame's primary category matches
      const primaryCat = frame.category?.split(',')[0]?.trim();
      if (primaryCat === category) {
        const updatedLayout = {
          ...(frame?.layout || {}),
          categorySortOrder: sortOrder
        };

        const { error } = await supabase
          .from(FRAMES_TABLE)
          .update({ layout: updatedLayout, updated_at: new Date().toISOString() })
          .eq('id', frame.id);

        if (error) throw error;
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating category sort order:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Batch update sort orders for multiple frames
 * Stores in layout JSON field
 */
export const batchUpdateSortOrders = async (updates) => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: 'Supabase tidak dikonfigurasi' };
  }

  try {
    for (const { frameId, sortOrder } of updates) {
      // Get current layout
      const { data: frame, error: fetchError } = await supabase
        .from(FRAMES_TABLE)
        .select('layout')
        .eq('id', frameId)
        .single();

      if (fetchError) {
        console.warn('Could not fetch frame:', frameId, fetchError);
        continue;
      }

      // Update layout with sort_order
      const updatedLayout = {
        ...(frame?.layout || {}),
        sortOrder: sortOrder
      };

      const { error } = await supabase
        .from(FRAMES_TABLE)
        .update({ layout: updatedLayout, updated_at: new Date().toISOString() })
        .eq('id', frameId);
      
      if (error) {
        console.warn('Could not update frame:', frameId, error);
      }
    }
    return { success: true };
  } catch (error) {
    console.error('Error batch updating sort orders:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get all frames sorted by category and sort order from layout
 */
export const getAllFramesSorted = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from(FRAMES_TABLE)
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map and add sort orders from layout
    const frames = data.map(frame => ({
      ...frame,
      maxCaptures: frame.max_captures,
      imagePath: frame.image_url || frame.thumbnail_url,
      thumbnailUrl: frame.thumbnail_url,
      createdAt: frame.created_at,
      updatedAt: frame.updated_at,
      sortOrder: frame.layout?.sortOrder ?? 999,
      categorySortOrder: frame.layout?.categorySortOrder ?? 999
    }));

    // Sort by categorySortOrder then sortOrder
    frames.sort((a, b) => {
      if (a.categorySortOrder !== b.categorySortOrder) {
        return a.categorySortOrder - b.categorySortOrder;
      }
      return a.sortOrder - b.sortOrder;
    });

    return frames;
  } catch (error) {
    console.error('Error getting sorted frames:', error);
    return [];
  }
};

// Alias for backward compatibility
export const addCustomFrame = async (frameData) => saveCustomFrame(frameData, null);

export default {
  getAllCustomFrames,
  getCustomFrameById,
  saveCustomFrame,
  updateCustomFrame,
  deleteCustomFrame,
  incrementFrameStats,
  getCustomFrameConfig,
  addCustomFrame,
  clearAllCustomFrames,
  getStorageInfo,
  updateFrameSortOrder,
  updateCategorySortOrder,
  batchUpdateSortOrders,
  getAllFramesSorted
};
