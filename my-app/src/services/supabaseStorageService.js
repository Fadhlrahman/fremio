/**
 * Supabase Storage Service
 * Handles file uploads to Supabase Storage or Cloudflare R2
 */

import { supabase, isSupabaseConfigured } from '../config/supabase.js';

// Storage bucket names
export const BUCKETS = {
  FRAMES: 'frames',
  MOMENTS: 'moments',
  AVATARS: 'avatars',
  THUMBNAILS: 'thumbnails'
};

// Cloudflare R2 configuration (optional)
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || null;

/**
 * Ensure bucket exists (create if not)
 */
async function ensureBucketExists(bucketName) {
  try {
    // Try to get bucket info
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.warn('⚠️ Could not list buckets:', error.message);
      return true; // Continue anyway, bucket might exist
    }
    
    const bucketExists = buckets?.some(b => b.name === bucketName);
    
    if (!bucketExists) {
      console.log(`📦 Creating bucket: ${bucketName}`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      });
      
      if (createError && !createError.message.includes('already exists')) {
        console.warn('⚠️ Could not create bucket:', createError.message);
      }
    }
    
    return true;
  } catch (e) {
    console.warn('⚠️ Bucket check failed:', e.message);
    return true; // Continue anyway
  }
}

/**
 * Upload file to storage
 * @param {string} bucket - Bucket name
 * @param {string} path - File path in bucket
 * @param {File|Blob} file - File to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} { url, error }
 */
export async function uploadFile(bucket, path, file, options = {}) {
  try {
    if (!isSupabaseConfigured) {
      // LocalStorage mode - convert to base64
      return uploadToLocalStorage(bucket, path, file);
    }

    // Ensure bucket exists
    await ensureBucketExists(bucket);

    console.log(`📤 Uploading to Supabase: ${bucket}/${path} (${Math.round(file.size/1024)}KB)`);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: options.cacheControl || '3600',
        upsert: options.upsert !== undefined ? options.upsert : true, // Default upsert true
        contentType: options.contentType || file.type
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      return { url: null, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    console.log('✅ Uploaded to Supabase:', publicUrl);
    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Upload error:', error);
    return { url: null, error: error.message };
  }
}

/**
 * Upload image with compression
 * @param {string} bucket - Bucket name
 * @param {string} path - File path
 * @param {File|Blob} file - Image file
 * @param {Object} options - Compression options
 * @returns {Promise<Object>} { url, error }
 */
export async function uploadImage(bucket, path, file, options = {}) {
  try {
    // Compress image if needed
    const compressedFile = options.compress 
      ? await compressImage(file, options.maxWidth || 1920, options.quality || 0.8)
      : file;

    return uploadFile(bucket, path, compressedFile, {
      contentType: 'image/jpeg',
      ...options
    });
  } catch (error) {
    console.error('Upload image error:', error);
    return { url: null, error: error.message };
  }
}

/**
 * Upload video
 * @param {string} bucket - Bucket name
 * @param {string} path - File path
 * @param {File|Blob} file - Video file
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} { url, error }
 */
export async function uploadVideo(bucket, path, file, onProgress = null) {
  try {
    if (!isSupabaseConfigured) {
      return { url: null, error: 'Video upload requires cloud configuration' };
    }

    // For large files, we might need chunked upload
    // Supabase handles this automatically for files under 50MB
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'video/mp4'
      });

    if (error) {
      return { url: null, error: error.message };
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Upload video error:', error);
    return { url: null, error: error.message };
  }
}

/**
 * Delete file from storage
 * @param {string} bucket - Bucket name
 * @param {string} path - File path
 * @returns {Promise<Object>} { success, error }
 */
export async function deleteFile(bucket, path) {
  try {
    if (!isSupabaseConfigured) {
      return deleteFromLocalStorage(bucket, path);
    }

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Delete error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get public URL for a file
 * @param {string} bucket - Bucket name
 * @param {string} path - File path
 * @returns {string|null} Public URL
 */
export function getPublicUrl(bucket, path) {
  if (!isSupabaseConfigured) {
    return getFromLocalStorage(bucket, path);
  }

  // If using Cloudflare R2, construct R2 URL
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${bucket}/${path}`;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return publicUrl;
}

/**
 * Get signed URL for private files
 * @param {string} bucket - Bucket name
 * @param {string} path - File path
 * @param {number} expiresIn - Expiry time in seconds
 * @returns {Promise<Object>} { url, error }
 */
export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  try {
    if (!isSupabaseConfigured) {
      const url = getFromLocalStorage(bucket, path);
      return { url, error: null };
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      return { url: null, error: error.message };
    }

    return { url: data.signedUrl, error: null };
  } catch (error) {
    console.error('Get signed URL error:', error);
    return { url: null, error: error.message };
  }
}

/**
 * List files in a bucket/folder
 * @param {string} bucket - Bucket name
 * @param {string} folder - Folder path
 * @returns {Promise<Array>} List of files
 */
export async function listFiles(bucket, folder = '') {
  try {
    if (!isSupabaseConfigured) {
      return listFromLocalStorage(bucket, folder);
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('List files error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('List files error:', error);
    return [];
  }
}

/**
 * Generate unique file path
 * @param {string} folder - Folder name
 * @param {string} fileName - Original file name
 * @returns {string} Unique file path
 */
export function generateFilePath(folder, fileName) {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = fileName.split('.').pop();
  return `${folder}/${timestamp}_${randomStr}.${extension}`;
}

/**
 * Compress image
 * @param {File|Blob} file - Image file
 * @param {number} maxWidth - Maximum width
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<Blob>} Compressed image blob
 */
async function compressImage(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        quality
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// LocalStorage helper functions
const STORAGE_PREFIX = 'fremio_storage_';

function getStorageKey(bucket, path) {
  return `${STORAGE_PREFIX}${bucket}_${path.replace(/\//g, '_')}`;
}

async function uploadToLocalStorage(bucket, path, file) {
  try {
    const reader = new FileReader();
    
    return new Promise((resolve) => {
      reader.onload = () => {
        const key = getStorageKey(bucket, path);
        const data = {
          url: reader.result,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString()
        };
        
        try {
          localStorage.setItem(key, JSON.stringify(data));
          resolve({ url: reader.result, error: null });
        } catch (e) {
          // LocalStorage full - try to clean up
          console.warn('LocalStorage full, cleaning up old files...');
          cleanupLocalStorage();
          try {
            localStorage.setItem(key, JSON.stringify(data));
            resolve({ url: reader.result, error: null });
          } catch {
            resolve({ url: null, error: 'Storage full' });
          }
        }
      };
      
      reader.onerror = () => {
        resolve({ url: null, error: 'Failed to read file' });
      };
      
      reader.readAsDataURL(file);
    });
  } catch (error) {
    return { url: null, error: error.message };
  }
}

function deleteFromLocalStorage(bucket, path) {
  const key = getStorageKey(bucket, path);
  localStorage.removeItem(key);
  return { success: true, error: null };
}

function getFromLocalStorage(bucket, path) {
  const key = getStorageKey(bucket, path);
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      return data.url;
    } catch {
      return stored;
    }
  }
  return null;
}

function listFromLocalStorage(bucket, folder) {
  const prefix = `${STORAGE_PREFIX}${bucket}_${folder.replace(/\//g, '_')}`;
  const files = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(prefix)) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        files.push({
          name: data.name,
          path: key.replace(STORAGE_PREFIX, '').replace(/_/g, '/'),
          created_at: data.uploadedAt
        });
      } catch {
        // Skip invalid entries
      }
    }
  }
  
  return files;
}

function cleanupLocalStorage() {
  const storageKeys = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(STORAGE_PREFIX)) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        storageKeys.push({
          key,
          uploadedAt: new Date(data.uploadedAt).getTime()
        });
      } catch {
        // Remove invalid entries
        localStorage.removeItem(key);
      }
    }
  }
  
  // Sort by upload date and remove oldest 50%
  storageKeys.sort((a, b) => a.uploadedAt - b.uploadedAt);
  const toRemove = Math.floor(storageKeys.length / 2);
  
  for (let i = 0; i < toRemove; i++) {
    localStorage.removeItem(storageKeys[i].key);
  }
  
  console.log(`Cleaned up ${toRemove} old files from localStorage`);
}

export default {
  BUCKETS,
  uploadFile,
  uploadImage,
  uploadVideo,
  deleteFile,
  getPublicUrl,
  getSignedUrl,
  listFiles,
  generateFilePath
};
