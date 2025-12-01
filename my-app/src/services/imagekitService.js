/**
 * ImageKit Service
 * Handles image uploads to ImageKit.io (FREE - no credit card required)
 * https://imagekit.io - 20GB bandwidth + 20GB storage FREE
 */

// ImageKit Configuration
const IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/y6rewkryo';
const IMAGEKIT_PRIVATE_KEY = 'private_WTPKE+2mrcdMDTyP4g6iOVZ9C8s=';

/**
 * Upload image to ImageKit using Private Key auth
 * @param {File|Blob} file - Image file to upload
 * @param {string} fileName - Desired file name
 * @param {string} folder - Folder path in ImageKit
 * @returns {Promise<{url: string, error: string|null}>}
 */
export async function uploadImageSimple(file, fileName, folder = 'frames') {
  try {
    console.log('📤 [ImageKit] Starting upload...');
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const safeName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
    const uniqueName = `${timestamp}_${randomStr}_${safeName}.jpg`;
    
    // Convert to base64 if it's a Blob
    let base64Data;
    if (file instanceof Blob) {
      base64Data = await blobToBase64(file);
    } else {
      base64Data = file;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('file', base64Data);
    formData.append('fileName', uniqueName);
    formData.append('folder', `/${folder}`);
    formData.append('useUniqueFileName', 'false');
    
    console.log('📤 [ImageKit] Sending to ImageKit API...');
    
    // Upload using Basic Auth with private key
    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(IMAGEKIT_PRIVATE_KEY + ':')
      },
      body: formData
    });
    
    const responseText = await response.text();
    console.log('📤 [ImageKit] Response status:', response.status);
    
    if (!response.ok) {
      console.error('❌ [ImageKit] Upload failed:', response.status, responseText);
      return { url: null, error: `ImageKit error ${response.status}: ${responseText}` };
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ [ImageKit] Invalid JSON response:', responseText);
      return { url: null, error: 'Invalid response from ImageKit' };
    }
    
    console.log('✅ [ImageKit] Upload success:', data.url);
    
    return { 
      url: data.url, 
      fileId: data.fileId,
      error: null 
    };
  } catch (error) {
    console.error('❌ [ImageKit] Exception:', error);
    return { url: null, error: error.message };
  }
}

/**
 * Convert Blob/File to base64 string
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Get public URL for an image
 */
export function getImageKitUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${IMAGEKIT_URL_ENDPOINT}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Generate optimized URL with transformations
 */
export function getOptimizedUrl(url, options = {}) {
  if (!url || !url.includes('imagekit.io')) return url;
  
  const { width, height, quality = 80 } = options;
  const transforms = [];
  
  if (width) transforms.push(`w-${width}`);
  if (height) transforms.push(`h-${height}`);
  transforms.push(`q-${quality}`);
  
  // Insert transforms into URL
  const urlParts = url.split('/');
  const fileIndex = urlParts.findIndex(p => p.includes('.'));
  if (fileIndex > 0) {
    urlParts.splice(fileIndex, 0, `tr:${transforms.join(',')}`);
  }
  
  return urlParts.join('/');
}

// Alias for backward compatibility
export const uploadToImageKit = uploadImageSimple;

export default {
  uploadToImageKit: uploadImageSimple,
  uploadImageSimple,
  getImageKitUrl,
  getOptimizedUrl,
  IMAGEKIT_URL_ENDPOINT
};
