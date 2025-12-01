/**
 * VPS Image Storage Service
 * Upload gambar langsung ke VPS disk storage
 * 4TB bandwidth/bulan - GRATIS!
 */

const VPS_BASE_URL = 'http://72.61.210.203';
const API_ENDPOINT = `${VPS_BASE_URL}/api/static`;

// Cloudflare Pages Function proxy (untuk bypass CORS dan HTTPS)
const PAGES_PROXY_URL = '/vps/static';

/**
 * Upload image ke VPS storage
 * @param {File} file - Image file to upload
 * @param {string} name - Frame name (sanitized for filename)
 * @returns {Promise<{url: string, filename: string, error?: string}>}
 */
export async function uploadToVPS(file, name) {
  console.log('📤 [VPS Storage] Uploading image:', name);
  console.log('   File size:', Math.round(file.size / 1024), 'KB');
  console.log('   File type:', file.type);
  
  // Try direct VPS first (only works if CORS is configured)
  // Then fallback to Pages Function proxy
  const endpoints = [
    { url: PAGES_PROXY_URL + '/frames', name: 'Pages Function' },
    { url: API_ENDPOINT + '/frames', name: 'Direct VPS' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`   Trying ${endpoint.name}...`);
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('name', name || 'frame');
      formData.append('optimize', 'true');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch(endpoint.url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`   ⚠️ ${endpoint.name} returned ${response.status}:`, errorText);
        continue;
      }
      
      const data = await response.json();
      
      if (data.success && data.url) {
        console.log(`✅ [VPS Storage] Upload successful via ${endpoint.name}`);
        
        // Convert HTTP VPS URL to HTTPS proxy URL
        let finalUrl = data.url;
        if (finalUrl.includes('72.61.210.203')) {
          finalUrl = finalUrl.replace('http://72.61.210.203', 'https://fremio.id/proxy');
          console.log('   Converted to HTTPS proxy:', finalUrl);
        }
        
        console.log('   URL:', finalUrl);
        return {
          url: finalUrl,
          filename: data.filename,
          error: null,
        };
      } else {
        console.warn(`   ⚠️ ${endpoint.name} response missing URL:`, data);
      }
      
    } catch (error) {
      console.warn(`   ⚠️ ${endpoint.name} failed:`, error.message);
    }
  }
  
  return {
    url: null,
    filename: null,
    error: 'All upload endpoints failed',
  };
}

/**
 * Upload image via base64 (useful when file object not available)
 * @param {string} base64Data - Base64 encoded image data
 * @param {string} name - Frame name
 * @returns {Promise<{url: string, filename: string, error?: string}>}
 */
export async function uploadBase64ToVPS(base64Data, name) {
  console.log('📤 [VPS Storage] Uploading base64 image:', name);
  
  // Try direct VPS first, then Pages Function proxy
  const endpoints = [
    { url: PAGES_PROXY_URL + '/frames/upload-base64', name: 'Pages Function' },
    { url: API_ENDPOINT + '/frames/upload-base64', name: 'Direct VPS' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`   Trying ${endpoint.name}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64Data,
          name: name || 'frame',
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`   ⚠️ ${endpoint.name} returned ${response.status}:`, errorText);
        continue;
      }
      
      const data = await response.json();
      
      if (data.success && data.url) {
        console.log(`✅ [VPS Storage] Upload successful via ${endpoint.name}`);
        
        // Convert HTTP VPS URL to HTTPS proxy URL
        let finalUrl = data.url;
        if (finalUrl.includes('72.61.210.203')) {
          finalUrl = finalUrl.replace('http://72.61.210.203', 'https://fremio.id/proxy');
          console.log('   Converted to HTTPS proxy:', finalUrl);
        }
        
        console.log('   URL:', finalUrl);
        return {
          url: finalUrl,
          filename: data.filename,
          error: null,
        };
      }
      
    } catch (error) {
      console.warn(`   ⚠️ ${endpoint.name} failed:`, error.message);
    }
  }
  
  return {
    url: null,
    filename: null,
    error: 'All upload endpoints failed',
  };
}

/**
 * List all frames stored on VPS
 * @returns {Promise<Array<{filename: string, url: string}>>}
 */
export async function listVPSFrames() {
  console.log('📦 [VPS Storage] Listing frames...');
  
  const endpoints = [
    PAGES_PROXY_URL + '/frames',
    API_ENDPOINT + '/frames',
  ];
  
  for (const url of endpoints) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.images) {
          console.log(`✅ [VPS Storage] Got ${data.images.length} frames`);
          return data.images;
        }
      }
    } catch (error) {
      console.warn(`⚠️ [VPS Storage] Failed to list from ${url}:`, error.message);
    }
  }
  
  return [];
}

/**
 * Delete frame from VPS
 * @param {string} filename - Filename to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteFromVPS(filename) {
  console.log('🗑️ [VPS Storage] Deleting:', filename);
  
  const endpoints = [
    PAGES_PROXY_URL + '/frames/' + filename,
    API_ENDPOINT + '/frames/' + filename,
  ];
  
  for (const url of endpoints) {
    try {
      const response = await fetch(url, { method: 'DELETE' });
      if (response.ok) {
        console.log('✅ [VPS Storage] Deleted successfully');
        return { success: true };
      }
    } catch (error) {
      console.warn(`⚠️ [VPS Storage] Failed to delete from ${url}:`, error.message);
    }
  }
  
  return { success: false, error: 'Failed to delete from all endpoints' };
}

/**
 * Get VPS static URL for a filename
 * @param {string} filename - Filename
 * @returns {string} Full URL
 */
export function getVPSStaticUrl(filename) {
  // Use HTTPS proxy through Cloudflare Pages
  return `https://fremio.id/proxy/static/frames/${filename}`;
}

/**
 * Check if VPS storage is available
 * @returns {Promise<boolean>}
 */
export async function checkVPSHealth() {
  try {
    const response = await fetch(VPS_BASE_URL + '/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default {
  uploadToVPS,
  uploadBase64ToVPS,
  listVPSFrames,
  deleteFromVPS,
  getVPSStaticUrl,
  checkVPSHealth,
};
