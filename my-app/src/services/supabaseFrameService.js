/**
 * Supabase Frame Service
 * Handles custom frame storage using Supabase
 */

import { supabase, isSupabaseConfigured } from '../config/supabase.js';

const FRAMES_TABLE = 'frames';
const FRAMES_BUCKET = 'frames';

/**
 * Compress image before upload
 */
const compressImage = (file, maxWidth = 1080, maxHeight = 1920, quality = 0.8) => {
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
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
          'image/png',
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
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
 * Get all custom frames
 */
export const getAllCustomFrames = async () => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('⚠️ Supabase not configured, returning empty array');
    return [];
  }

  try {
    console.log('📊 Loading frames from Supabase...');
    const { data, error } = await supabase
      .from(FRAMES_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error loading frames:', error);
      return [];
    }

    console.log('✅ Loaded', data.length, 'frames');
    return data.map(frame => ({
      ...frame,
      // Map snake_case to camelCase for compatibility
      maxCaptures: frame.max_captures,
      imagePath: frame.image_url || frame.thumbnail_url,
      thumbnailUrl: frame.thumbnail_url,
      createdAt: frame.created_at,
      updatedAt: frame.updated_at,
      createdBy: frame.created_by,
      isActive: frame.is_active
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
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Handle max_captures conversion
    if (updates.maxCaptures) {
      updateData.max_captures = parseInt(updates.maxCaptures);
      delete updateData.maxCaptures;
    }

    // Upload new image if provided
    if (imageFile) {
      const result = await uploadImageToStorage(imageFile, updates.name || frameId);
      updateData.thumbnail_url = result.url;
      updateData.image_url = result.url;
      updateData.storage_path = result.path;
    }

    const { error } = await supabase
      .from(FRAMES_TABLE)
      .update(updateData)
      .eq('id', frameId);

    if (error) throw error;

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
    isCustom: true
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
  getStorageInfo
};
