/**
 * Frame Service - SIMPLIFIED VERSION
 * Single file untuk semua operasi frame
 * Langsung ke VPS API tanpa layer tambahan
 * Gambar di-upload ke ImageKit (FREE, HTTPS)
 */

import { uploadImageSimple } from './imagekitService.js';
import { getStaticFrames } from '../data/staticFrames.js';

// Multiple fallback URLs - try each one until success
// IMPORTANT: in dev, never fall back to production.
const API_URLS = import.meta.env.DEV
  ? [import.meta.env.VITE_API_URL || '/api']
  : [
      'https://api.fremio.id/api', // Primary VPS API (KVM 4)
      'https://fremio-api-proxy.array111103.workers.dev/api', // Fallback Cloudflare Worker
    ];

// Use local Pages Function for ImageKit uploads
const LOCAL_API = '/api';

// Helper untuk API calls with multiple fallbacks
async function apiCall(endpoint, options = {}) {
  const timestamp = Date.now();
  const method = options.method || 'GET';
  
  console.log(`📡 [FrameService] ${method} ${endpoint}`);
  
  let lastError = null;
  
  // Try each API URL in order
  for (let i = 0; i < API_URLS.length; i++) {
    const baseUrl = API_URLS[i];
    const url = `${baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${timestamp}`;
    
    try {
      console.log(`   Trying API ${i + 1}/${API_URLS.length}: ${baseUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ [FrameService] API ${i + 1} succeeded`);
      return data;
      
    } catch (error) {
      console.warn(`⚠️ [FrameService] API ${i + 1} failed: ${error.message}`);
      lastError = error;
      // Continue to next fallback
    }
  }
  
  // All APIs failed
  console.error(`❌ [FrameService] All ${API_URLS.length} APIs failed`);
  throw lastError || new Error('All API endpoints failed');
}

// LocalStorage key for ImageKit URL mapping
const IMAGEKIT_URL_MAP_KEY = 'fremio_imagekit_urls';

// Get ImageKit URL mapping from localStorage
function getImageKitUrlMap() {
  try {
    const stored = localStorage.getItem(IMAGEKIT_URL_MAP_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// =====================================================
// LAYOUT STORAGE - VPS tidak menyimpan layout, jadi kita simpan di localStorage
// =====================================================
const FRAME_LAYOUT_MAP_KEY = 'fremio_frame_layout_map';

// Get layout map from localStorage
function getFrameLayoutMap() {
  try {
    const stored = localStorage.getItem(FRAME_LAYOUT_MAP_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.warn('⚠️ [FrameService] Failed to get layout map:', e);
    return {};
  }
}

// Save frame layout to localStorage
function saveFrameLayout(frameId, layout, canvasBackground) {
  try {
    const map = getFrameLayoutMap();
    map[frameId] = { 
      layout: layout || null,
      canvasBackground: canvasBackground || '#f7f1ed',
      savedAt: Date.now()
    };
    localStorage.setItem(FRAME_LAYOUT_MAP_KEY, JSON.stringify(map));
    console.log('💾 [FrameService] Saved layout for frame:', frameId, 'elements:', layout?.elements?.length || 0);
  } catch (e) {
    console.warn('⚠️ [FrameService] Failed to save layout:', e);
  }
}

// Get frame layout from localStorage
function getFrameLayout(frameId) {
  const map = getFrameLayoutMap();
  return map[frameId] || null;
}

// Save ImageKit URL mapping to localStorage
function saveImageKitUrl(frameId, imagekitUrl) {
  try {
    const map = getImageKitUrlMap();
    map[frameId] = imagekitUrl;
    localStorage.setItem(IMAGEKIT_URL_MAP_KEY, JSON.stringify(map));
    console.log('💾 [FrameService] Saved ImageKit URL for frame:', frameId);
  } catch (e) {
    console.warn('⚠️ [FrameService] Failed to save ImageKit URL:', e);
  }
}

// Get ImageKit URL for a frame (if available)
function getImageKitUrl(frameId) {
  const map = getImageKitUrlMap();
  return map[frameId] || null;
}

// Helper: Get the best image URL for a frame
// Prioritizes: ImageKit URL > Supabase URL > VPS proxy URL
function getBestImageUrl(frameId, originalUrl) {
  if (!originalUrl) return null;
  
  // Check if we have an ImageKit URL stored for this frame
  const imagekitUrl = getImageKitUrl(frameId);
  if (imagekitUrl) {
    console.log('🔄 [FrameService] Using stored ImageKit URL for frame:', frameId);
    return imagekitUrl;
  }
  
  // If URL is already from ImageKit, use it directly
  if (originalUrl.includes('imagekit.io')) {
    return originalUrl;
  }
  
  // If URL is from Supabase, use it directly (HTTPS)
  if (originalUrl.includes('supabase.co')) {
    return originalUrl;
  }
  
  // If URL is from VPS (72.61.210.203), proxy through Cloudflare Pages Function
  if (originalUrl.includes('72.61.210.203')) {
    const match = originalUrl.match(/72\.61\.210\.203(\/.*)/);
    if (match) {
      return `https://fremio.id/proxy${match[1]}`;
    }
  }
  
  // For other URLs, just ensure HTTPS
  if (originalUrl.startsWith('http://')) {
    return originalUrl.replace('http://', 'https://');
  }
  
  return originalUrl;
}

// Legacy function - kept for compatibility
function proxyImageUrl(url) {
  if (!url) return url;
  
  // If URL is already HTTPS and not VPS, return as-is
  if (url.includes('imagekit.io') || url.includes('supabase.co')) {
    return url;
  }
  
  // If URL is from VPS (72.61.210.203), proxy through Cloudflare Pages Function
  if (url.includes('72.61.210.203')) {
    const match = url.match(/72\.61\.210\.203(\/.*)/);
    if (match) {
      return `https://fremio.id/proxy${match[1]}`;
    }
  }
  
  // For other URLs, just ensure HTTPS
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  
  return url;
}

// ==================== FRAME OPERATIONS ====================

// LocalStorage cache key for emergency fallback
const FRAMES_CACHE_KEY = 'fremio_frames_cache';

// Static backup file URL (updated manually when VPS is accessible)
const STATIC_BACKUP_URL = '/data/frames-backup.json';

// Get cached frames from localStorage
function getCachedFrames() {
  try {
    const cached = localStorage.getItem(FRAMES_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (data.frames && Array.isArray(data.frames)) {
        console.log(`📦 [FrameService] Using cached frames (${data.frames.length} frames)`);
        return data.frames;
      }
    }
  } catch (e) {
    console.warn('⚠️ [FrameService] Failed to get cached frames:', e);
  }
  return null;
}

// Fetch from static backup file
async function fetchStaticBackup() {
  try {
    console.log('📦 [FrameService] Trying static backup file...');
    const response = await fetch(`${STATIC_BACKUP_URL}?_t=${Date.now()}`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        console.log(`✅ [FrameService] Got ${data.length} frames from static backup`);
        return data;
      }
    }
  } catch (e) {
    console.warn('⚠️ [FrameService] Failed to fetch static backup:', e);
  }
  return null;
}

// Save frames to localStorage cache
function cacheFrames(frames) {
  try {
    localStorage.setItem(FRAMES_CACHE_KEY, JSON.stringify({
      frames: frames,
      timestamp: Date.now(),
      source: 'api'
    }));
    console.log(`💾 [FrameService] Cached ${frames.length} frames to localStorage`);
  } catch (e) {
    console.warn('⚠️ [FrameService] Failed to cache frames:', e);
  }
}

// 6 Frame IDs yang diizinkan untuk ditampilkan
const ALLOWED_FRAME_IDS = [
  '7f5fe81b-4342-4049-ae6c-18e7b926cca8', // Cherish Pink Elegance
  'd3254c20-0d9b-4dc2-91ee-ea9a96fdb6f7', // Blue Picnic Vibes
  '02097dcc-5d75-468b-8d18-f11cc657b14b', // Our Love Memory
  '3f9bbc23-bc3a-43a2-805f-d81146096a50', // YIPIE
  'b33cf2aa-6ee8-4a85-b1a4-880cdc2c6a9a', // Snap Your Joy
  '8a9875dd-5960-4bec-9475-1071a5eb8af4', // Pixel Fun Adventure
];

// TEMPORARY: Force use static frames only (bypass API and cache)
const USE_STATIC_FRAMES_ONLY = true;

/**
 * Get all frames
 */
export async function getAllFrames() {
  console.log('📦 [FrameService] Getting all frames...');
  
  // TEMPORARY: Langsung return static frames, skip API dan cache
  if (USE_STATIC_FRAMES_ONLY) {
    console.log('🎯 [FrameService] Using STATIC FRAMES ONLY mode');
    // Langsung pakai getStaticFrames() dari staticFrames.js (6 frames)
    const staticData = getStaticFrames();
    console.log(`✅ [FrameService] Returning ${staticData.length} static frames`);
    return staticData.map(f => ({
      id: f.id,
      name: f.name,
      description: f.description || '',
      category: f.category,
      image_url: f.image_url || f.imagePath,
      thumbnail_url: f.thumbnail_url || f.image_url,
      imagePath: f.image_url || f.imagePath,
      thumbnailUrl: f.thumbnail_url || f.image_url,
      maxCaptures: f.maxCaptures || 4,
      max_captures: f.maxCaptures || 4,
      slots: f.slots || [],
      is_active: true,
      sort_order: f.sort_order || 0,
    }));
  }
  
  // Helper to map frames to consistent format
  const mapFrames = (data) => {
    // Filter hanya frame yang diizinkan
    const filtered = data.filter(f => ALLOWED_FRAME_IDS.includes(f.id));
    console.log(`🔍 [FrameService] Filtered ${filtered.length} of ${data.length} frames`);
    return filtered.map(f => {
      const imageUrl = getBestImageUrl(f.id, f.image_url);
      return {
        id: f.id,
        name: f.name,
        description: f.description || '',
        category: f.category,
        image_url: imageUrl,
        thumbnail_url: imageUrl,
        imagePath: imageUrl,
        thumbnailUrl: imageUrl,
        maxCaptures: f.max_captures || 4,
        max_captures: f.max_captures || 4,
        slots: f.slots || [],
        is_active: f.is_active,
        sort_order: f.sort_order,
        created_at: f.created_at,
        updated_at: f.updated_at,
      };
    });
  };
  
  try {
    const data = await apiCall('/frames');
    console.log(`✅ [FrameService] Got ${data.length} frames from API`);
    
    // Cache successful result
    cacheFrames(data);
    
    return mapFrames(data);
    
  } catch (error) {
    console.error('❌ [FrameService] API failed, checking fallbacks...');
    
    // Fallback 1: Try localStorage cache
    const cached = getCachedFrames();
    if (cached && cached.length > 0) {
      console.log(`🔄 [FrameService] Using ${cached.length} cached frames from localStorage`);
      return mapFrames(cached);
    }
    
    // Fallback 2: Try static backup file
    const staticData = await fetchStaticBackup();
    if (staticData && staticData.length > 0) {
      console.log(`🔄 [FrameService] Using ${staticData.length} frames from static backup`);
      // Cache for next time
      cacheFrames(staticData);
      return mapFrames(staticData);
    }
    
    // No fallbacks available
    console.error('❌ [FrameService] All fallbacks failed');
    throw error;
  }
}

/**
 * Get frame by ID - with localStorage/static fallback
 */
export async function getFrameById(id) {
  console.log(`📦 [FrameService] Getting frame: ${id}`);
  
  // Helper to format frame data
  const formatFrame = (f) => {
    const imageUrl = getBestImageUrl(f.id, f.image_url);
    const storedLayoutData = getFrameLayout(f.id);
    
    return {
      id: f.id,
      name: f.name,
      description: f.description || '',
      category: f.category,
      image_url: imageUrl,
      imagePath: imageUrl,
      thumbnailUrl: imageUrl,
      maxCaptures: f.max_captures || 4,
      max_captures: f.max_captures || 4,
      slots: f.slots || [],
      is_active: f.is_active,
      sort_order: f.sort_order,
      layout: storedLayoutData?.layout || null,
      canvasBackground: storedLayoutData?.canvasBackground || '#f7f1ed',
    };
  };
  
  try {
    const f = await apiCall(`/frames/${id}`);
    console.log('✅ [FrameService] Frame loaded from API:', f.name);
    return formatFrame(f);
    
  } catch (error) {
    console.warn(`⚠️ [FrameService] API failed for frame ${id}, checking cache...`);
    
    // Fallback 1: Try to find in localStorage cache
    const cached = getCachedFrames();
    if (cached && cached.length > 0) {
      const frame = cached.find(f => f.id === id);
      if (frame) {
        console.log(`🔄 [FrameService] Found frame ${id} in localStorage cache`);
        return formatFrame(frame);
      }
    }
    
    // Fallback 2: Try static backup file
    const staticData = await fetchStaticBackup();
    if (staticData && staticData.length > 0) {
      const frame = staticData.find(f => f.id === id);
      if (frame) {
        console.log(`🔄 [FrameService] Found frame ${id} in static backup`);
        // Cache for next time
        cacheFrames(staticData);
        return formatFrame(frame);
      }
    }
    
    // Frame not found in any fallback
    console.error(`❌ [FrameService] Frame ${id} not found in any source`);
    throw error;
  }
}

/**
 * Create new frame
 * Upload gambar ke VPS disk storage (4TB bandwidth!) atau ImageKit sebagai fallback
 */
export async function createFrame(frameData, imageFile) {
  console.log('📦 [FrameService] Creating frame:', frameData.name);
  
  let imageUrl = null;
  
  // Upload image to VPS disk storage (preferred) or ImageKit (fallback)
  if (imageFile) {
    const safeName = frameData.name.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Try VPS storage first (FREE 4TB bandwidth!)
    console.log('📤 [FrameService] Uploading to VPS disk storage...');
    const { uploadToVPS } = await import('./vpsStorageService.js');
    const vpsResult = await uploadToVPS(imageFile, safeName);
    
    if (vpsResult.url && !vpsResult.error) {
      imageUrl = vpsResult.url;
      console.log('✅ [FrameService] Image uploaded to VPS:', imageUrl);
    } else {
      // Fallback to ImageKit if VPS fails
      console.log('⚠️ [FrameService] VPS upload failed, trying ImageKit...');
      const uploadResult = await uploadImageSimple(imageFile, safeName, 'frames');
      
      if (uploadResult.error) {
        console.error('❌ [FrameService] ImageKit upload failed:', uploadResult.error);
        throw new Error('Gagal upload gambar: ' + uploadResult.error);
      }
      
      imageUrl = uploadResult.url;
      console.log('✅ [FrameService] Image uploaded to ImageKit:', imageUrl);
    }
  }
  
  // 🔄 STRATEGY: Create frame di VPS TANPA base64 image (bypass 502 error)
  // Hanya kirim metadata, ImageKit URL disimpan di localStorage
  console.log('📡 [FrameService] Creating frame directly to VPS (no base64)...');
  
  const vpsPayload = {
    name: frameData.name,
    description: frameData.description || '',
    category: frameData.category || 'Fremio Series',
    max_captures: frameData.maxCaptures || frameData.max_captures || 1,
    slots: frameData.slots || [],
    // VPS doesn't store these, but we send anyway
    image_url: imageUrl,
  };
  
  try {
    // Try direct VPS endpoint (no image)
    const data = await apiCall('/frames', {
      method: 'POST',
      body: JSON.stringify(vpsPayload),
    });
    
    console.log('✅ [FrameService] Frame created:', data.id);
    
    // 🔑 Save ImageKit URL to localStorage mapping
    if (imageUrl && data.id) {
      saveImageKitUrl(data.id, imageUrl);
      console.log('💾 [FrameService] Saved ImageKit URL mapping for frame:', data.id);
    }
    
    // 🔑 Save layout to localStorage (VPS doesn't store this)
    if (data.id && frameData.layout) {
      saveFrameLayout(data.id, frameData.layout, frameData.canvasBackground);
    }
    
    return { success: true, frameId: data.id, frame: data };
    
  } catch (vpsError) {
    console.error('❌ [FrameService] VPS create failed:', vpsError.message);
    
    // Fallback: Generate local ID and save to localStorage only
    console.log('⚠️ [FrameService] Using localStorage-only fallback...');
    
    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save to localStorage
    if (imageUrl) {
      saveImageKitUrl(localId, imageUrl);
    }
    if (frameData.layout) {
      saveFrameLayout(localId, frameData.layout, frameData.canvasBackground);
    }
    
    // Save frame metadata to localStorage
    const localFrames = JSON.parse(localStorage.getItem('fremio_local_frames') || '[]');
    localFrames.push({
      id: localId,
      name: frameData.name,
      description: frameData.description || '',
      category: frameData.category || 'Fremio Series',
      max_captures: frameData.maxCaptures || frameData.max_captures || 1,
      slots: frameData.slots || [],
      image_url: imageUrl,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem('fremio_local_frames', JSON.stringify(localFrames));
    
    console.log('✅ [FrameService] Frame saved to localStorage:', localId);
    
    return { 
      success: true, 
      frameId: localId, 
      frame: { id: localId, name: frameData.name, image_url: imageUrl },
      isLocal: true 
    };
  }
}

/**
 * Update frame
 * Upload gambar baru ke VPS disk storage atau ImageKit sebagai fallback
 */
export async function updateFrame(id, frameData, imageFile = null) {
  console.log(`📦 [FrameService] Updating frame: ${id}`);
  console.log('📦 [FrameService] Update data:', {
    name: frameData.name,
    description: frameData.description,
    category: frameData.category,
    max_captures: frameData.max_captures || frameData.maxCaptures,
    slots: `[${(frameData.slots || []).length} slots]`,
    hasNewImage: !!imageFile
  });
  
  // Prepare update payload
  const payload = {
    name: frameData.name,
    description: frameData.description || '',
    category: frameData.category || 'Fremio Series',
    max_captures: frameData.max_captures || frameData.maxCaptures || 1,
    slots: Array.isArray(frameData.slots) ? frameData.slots : [],
    // Include layout for elements (upload, text, shape)
    layout: frameData.layout || null,
    canvas_background: frameData.canvasBackground || '#f7f1ed',
  };
  
  // If new image provided, upload to VPS or ImageKit
  if (imageFile) {
    const safeName = frameData.name.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Try VPS storage first
    console.log('📤 [FrameService] Uploading new image to VPS...');
    const { uploadToVPS } = await import('./vpsStorageService.js');
    const vpsResult = await uploadToVPS(imageFile, safeName);
    
    let newImageUrl;
    if (vpsResult.url && !vpsResult.error) {
      newImageUrl = vpsResult.url;
      console.log('✅ [FrameService] New image uploaded to VPS:', newImageUrl);
    } else {
      // Fallback to ImageKit
      console.log('⚠️ [FrameService] VPS upload failed, trying ImageKit...');
      const uploadResult = await uploadImageSimple(imageFile, safeName, 'frames');
      
      if (uploadResult.error) {
        console.error('❌ [FrameService] ImageKit upload failed:', uploadResult.error);
        throw new Error('Gagal upload gambar: ' + uploadResult.error);
      }
      
      newImageUrl = uploadResult.url;
      console.log('✅ [FrameService] New image uploaded to ImageKit:', newImageUrl);
    }
    
    payload.image_url = newImageUrl;
    
    // 🔄 Update frame directly to VPS (no base64)
    console.log('📡 [FrameService] Updating frame directly to VPS...');
    try {
      const data = await apiCall(`/frames/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      
      console.log('✅ [FrameService] Frame updated successfully!');
      
      // 🔑 Save ImageKit URL to localStorage mapping
      saveImageKitUrl(id, newImageUrl);
      console.log('💾 [FrameService] Saved ImageKit URL mapping for frame:', id);
      
      // 🔑 Save layout to localStorage (VPS doesn't store this)
      if (frameData.layout) {
        saveFrameLayout(id, frameData.layout, frameData.canvasBackground);
      }
      
      return { success: true, frame: data };
      
    } catch (vpsError) {
      console.error('❌ [FrameService] VPS update failed:', vpsError.message);
      
      // Still save to localStorage even if VPS fails
      saveImageKitUrl(id, newImageUrl);
      if (frameData.layout) {
        saveFrameLayout(id, frameData.layout, frameData.canvasBackground);
      }
      
      console.log('✅ [FrameService] Saved to localStorage despite VPS error');
      return { success: true, frame: { id, ...frameData, image_url: newImageUrl }, isLocalOnly: true };
    }
  }
  
  // No new image, just update metadata via VPS
  const data = await apiCall(`/frames/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  
  console.log('✅ [FrameService] Frame updated successfully!');
  console.log('✅ [FrameService] Updated frame:', data.name);
  
  // 🔑 Save layout to localStorage (VPS doesn't store this)
  if (frameData.layout) {
    saveFrameLayout(id, frameData.layout, frameData.canvasBackground);
  }
  
  return { success: true, frame: data };
}

/**
 * Delete frame
 */
export async function deleteFrame(id) {
  console.log(`📦 [FrameService] Deleting frame: ${id}`);
  
  await apiCall(`/frames/${id}`, {
    method: 'DELETE',
  });
  
  console.log('✅ [FrameService] Frame deleted');
  return { success: true };
}

/**
 * Increment frame stats (views, uses)
 */
export async function incrementFrameStat(id, stat = 'uses') {
  try {
    await apiCall(`/frames/${id}/${stat}`, {
      method: 'POST',
    });
    return { success: true };
  } catch (e) {
    console.warn(`⚠️ [FrameService] Failed to increment ${stat}:`, e.message);
    return { success: false };
  }
}

/**
 * Batch update sort orders
 */
export async function batchUpdateSortOrders(updates) {
  console.log(`📦 [FrameService] Batch updating ${updates.length} sort orders...`);
  
  const data = await apiCall('/frames/batch-sort', {
    method: 'PUT',
    body: JSON.stringify({ updates }),
  });
  
  console.log('✅ [FrameService] Sort orders updated');
  return { success: true, data };
}

/**
 * Update category sort order
 */
export async function updateCategorySortOrder(category, sortOrder) {
  console.log(`📦 [FrameService] Updating category sort order: ${category} = ${sortOrder}`);
  
  const data = await apiCall('/frames/category-sort', {
    method: 'PUT',
    body: JSON.stringify({ category, sort_order: sortOrder }),
  });
  
  return { success: true, data };
}

/**
 * Get frame config for EditPhoto page
 */
export async function getFrameConfig(frameId) {
  const frame = await getFrameById(frameId);
  if (!frame) return null;

  const W = 1080;
  const H = 1920;

  return {
    id: frame.id,
    name: frame.name,
    description: frame.description,
    maxCaptures: frame.maxCaptures,
    duplicatePhotos: frame.duplicatePhotos || false,
    imagePath: frame.imagePath,
    frameImage: frame.imagePath,
    thumbnailUrl: frame.thumbnailUrl,
    slots: frame.slots,
    designer: {
      elements: (frame.slots || []).map((s, i) => ({
        id: s.id || "photo_" + (i + 1),
        type: "photo",
        x: s.left * W,
        y: s.top * H,
        width: s.width * W,
        height: s.height * H,
        zIndex: s.zIndex || 2,
        data: {
          photoIndex: s.photoIndex !== undefined ? s.photoIndex : i,
          image: null,
          aspectRatio: s.aspectRatio || "4:5",
        },
      })),
    },
    layout: frame.layout || {
      aspectRatio: "9:16",
      orientation: "portrait",
      backgroundColor: "#ffffff",
    },
    category: frame.category,
    isCustom: frame.isCustom || false,
  };
}

/**
 * Prefetch all frame slots (for instant frame selection)
 */
export async function prefetchAllFrameSlots() {
  try {
    const frames = await getAllFrames();
    console.log(`✅ [FrameService] Prefetched ${frames.length} frames`);
    return frames;
  } catch (e) {
    console.warn('⚠️ [FrameService] Prefetch failed:', e.message);
    return [];
  }
}

// ==================== HELPERS ====================

/**
 * Compress image to reduce file size
 * Target: < 500KB untuk menghindari 413 error
 */
async function compressImage(file, maxSizeKB = 500) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Keep original dimensions for frame quality
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.drawImage(img, 0, 0);
      
      // Start with quality 0.8, reduce if needed
      let quality = 0.8;
      let result = canvas.toDataURL('image/jpeg', quality);
      
      // Reduce quality until under max size
      while (result.length > maxSizeKB * 1024 * 1.37 && quality > 0.3) {
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
        console.log(`🔄 [FrameService] Compressing... quality=${quality.toFixed(1)}, size=${Math.round(result.length / 1024 / 1.37)}KB`);
      }
      
      // If still too large, also reduce dimensions
      if (result.length > maxSizeKB * 1024 * 1.37 && img.width > 1080) {
        const scale = 1080 / img.width;
        canvas.width = 1080;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        result = canvas.toDataURL('image/jpeg', 0.7);
        console.log(`🔄 [FrameService] Resized to 1080px, size=${Math.round(result.length / 1024 / 1.37)}KB`);
      }
      
      console.log(`✅ [FrameService] Final compressed size: ${Math.round(result.length / 1024 / 1.37)}KB`);
      
      // Convert base64 to Blob, then to File
      fetch(result)
        .then(res => res.blob())
        .then(blob => {
          const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
          resolve(compressedFile);
        })
        .catch(reject);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };
    
    img.src = url;
  });
}

/**
 * Convert File to base64 string (with compression)
 */
async function fileToBase64(file) {
  // Check if file needs compression (> 400KB)
  if (file.size > 400 * 1024) {
    console.log(`📦 [FrameService] Image size: ${Math.round(file.size / 1024)}KB, compressing...`);
    const compressedFile = await compressImage(file, 400);
    console.log(`✅ [FrameService] Compressed from ${Math.round(file.size / 1024)}KB to ${Math.round(compressedFile.size / 1024)}KB`);
    file = compressedFile;
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get storage info (legacy, returns dummy data)
 */
export function getStorageInfo() {
  return {
    totalMB: "Cloud",
    framesMB: "Cloud", 
    availableMB: "Unlimited",
    isNearLimit: false,
    isFull: false,
  };
}

// ==================== LEGACY EXPORTS ====================
// Backward compatibility untuk kode lama

export const getAllCustomFrames = getAllFrames;
export const getCustomFrameById = getFrameById;
export const saveCustomFrame = createFrame;
export const addCustomFrame = createFrame; // Alias for saveCustomFrame
export const updateCustomFrame = async (id, updates, imageFile) => {
  return updateFrame(id, updates, imageFile);
};
export const deleteCustomFrame = deleteFrame;
export const incrementFrameStats = incrementFrameStat;
export const getCustomFrameConfig = getFrameConfig;
export const clearFramesCache = () => {
  console.log('🗑️ [FrameService] clearFramesCache called (always fresh data)');
};

export default {
  getAllFrames,
  getFrameById,
  createFrame,
  updateFrame,
  deleteFrame,
  incrementFrameStat,
  batchUpdateSortOrders,
  updateCategorySortOrder,
  getFrameConfig,
  prefetchAllFrameSlots,
  getStorageInfo,
  // Legacy
  getAllCustomFrames: getAllFrames,
  getCustomFrameById: getFrameById,
  saveCustomFrame: createFrame,
  updateCustomFrame: updateFrame,
  deleteCustomFrame: deleteFrame,
  incrementFrameStats: incrementFrameStat,
  getCustomFrameConfig: getFrameConfig,
  clearFramesCache: () => {},
};
