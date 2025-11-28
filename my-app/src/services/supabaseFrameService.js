/**
 * Supabase Frame Service
 * Handles custom frame storage using Supabase
 */

import { supabase, isSupabaseConfigured } from '../config/supabase.js';

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

  const filePath = `custom/${Date.now()}_${fileName.replace(/\s+/g, '_')}.png`;
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
 * Get all custom frames
 */
export const getAllCustomFrames = async () => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('⚠️ Supabase not configured, returning empty array');
    return [];
  }

  try {
    console.log('📊 Loading frames from Supabase...');
    
    // Simple query without timeout wrapper first
    const { data, error } = await supabase
      .from(FRAMES_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error loading frames:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', error.details);
      console.error('❌ Error hint:', error.hint);
      
      // If RLS error, suggest fix
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
        console.error('🔐 This looks like an RLS policy issue!');
        console.error('🔐 Go to Supabase Dashboard → Authentication → Policies');
        console.error('🔐 Add a policy to allow SELECT on frames table');
      }
      
      return [];
    }

    console.log('✅ Loaded', data?.length || 0, 'frames from Supabase');
    
    if (!data || data.length === 0) {
      console.warn('⚠️ No frames returned from Supabase');
      console.warn('⚠️ Data exists in table but query returns empty - likely RLS issue');
      console.warn('⚠️ Solution: Disable RLS or add SELECT policy for anon role');
      return [];
    }
    
    // Log first frame for debugging
    if (data[0]) {
      console.log('📋 First frame:', {
        id: data[0].id,
        name: data[0].name,
        category: data[0].category,
        has_image: !!data[0].image_url
      });
    }
    
    return data.map(frame => ({
      ...frame,
      // Map snake_case to camelCase for compatibility
      maxCaptures: frame.max_captures,
      imagePath: frame.image_url || frame.thumbnail_url,
      thumbnailUrl: frame.thumbnail_url,
      createdAt: frame.created_at,
      updatedAt: frame.updated_at,
      createdBy: frame.created_by,
      isActive: frame.is_active,
      // Read sort orders from layout JSON
      sortOrder: frame.layout?.sortOrder ?? 999,
      categorySortOrder: frame.layout?.categorySortOrder ?? 999
    }));
  } catch (error) {
    console.error('❌ Error:', error);
    return [];
  }
};

/**
 * Get single frame by ID
 */
export const getCustomFrameById = async (frameId) => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from(FRAMES_TABLE)
      .select('*')
      .eq('id', frameId)
      .single();

    if (error || !data) return null;

    return {
      ...data,
      maxCaptures: data.max_captures,
      imagePath: data.image_url || data.thumbnail_url,
      thumbnailUrl: data.thumbnail_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error getting frame:', error);
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
