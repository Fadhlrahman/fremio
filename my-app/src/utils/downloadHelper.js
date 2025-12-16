/**
 * Download Helper - Mobile-Friendly Download to Gallery
 * Handles direct download to gallery without confusing notifications
 */

import { trackDownload } from "../services/analyticsService";

/**
 * Show toast notification
 */
const showToast = (config) => {
  // Create a simple toast notification
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${config.type === 'success' ? '#10b981' : config.type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 10000;
    font-size: 14px;
    max-width: 90%;
    text-align: center;
  `;
  toast.textContent = config.message || config.title;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
};

/**
 * Detect device type
 */
const detectDevice = () => {
  const ua = navigator.userAgent;
  return {
    isMobile: /iPhone|iPad|iPod|Android/i.test(ua),
    isIOS: /iPhone|iPad|iPod/i.test(ua),
    isAndroid: /Android/i.test(ua),
    isSafari: /Safari/i.test(ua) && !/Chrome/i.test(ua),
    isChrome: /Chrome/i.test(ua)
  };
};

/**
 * Download blob as file with proper filename
 */
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Download to gallery (main function)
 * Handles mobile-specific download to ensure file goes directly to gallery
 * 
 * @param {Blob|string} source - Blob object or data URL
 * @param {string} filename - Filename for the downloaded file
 * @param {string} mimeType - MIME type (e.g., 'image/png', 'video/mp4')
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Result object with success status
 */
export const downloadToGallery = async (source, filename, mimeType = 'image/png', options = {}) => {
  try {
    const device = detectDevice();
    const { frameId, frameName } = options;
    
    // Convert data URL to blob if needed
    let blob = source;
    if (typeof source === 'string') {
      const response = await fetch(source);
      blob = await response.blob();
    }
    
    // Ensure blob has correct type
    if (blob.type !== mimeType) {
      blob = new Blob([blob], { type: mimeType });
    }
    
    console.log('📥 Starting download:', { filename, mimeType, device });
    
    // Strategy 1: Web Share API (Best for mobile - saves directly to gallery)
    if (device.isMobile && navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], filename, { type: mimeType });
        
        // Check if can share files
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Fremio - Save to Gallery',
            text: 'Simpan ke Galeri'
          });
          
          console.log('✅ Download via Web Share API');
          
          // Track download
          if (frameId) {
            await trackDownload(frameId, frameName, mimeType.split('/')[1], false, 'share');
          }
          
          // Show success message
          showToast({
            type: 'success',
            title: 'Berhasil!',
            message: 'File tersimpan di Galeri'
          });
          
          return { success: true, method: 'share' };
        }
      } catch (shareError) {
        // If user cancels share dialog, it's not really an error
        if (shareError.name === 'AbortError') {
          console.log('User cancelled share');
          return { success: false, cancelled: true };
        }
        console.log('Share API failed, trying fallback:', shareError.message);
      }
    }
    
    // Strategy 2: Direct download (Fallback for all devices)
    console.log('📥 Using direct download method');
    
    // For iOS Safari: Convert to data URL to avoid preview opening
    if (device.isIOS && device.isSafari) {
      try {
        // Convert blob to data URL for iOS to avoid preview tab
        const reader = new FileReader();
        const dataUrl = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        
        // Create download link with data URL
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        a.style.display = 'none';
        
        // Trigger download immediately in user gesture context
        document.body.appendChild(a);
        a.click();
        
        // Immediate cleanup to prevent preview
        setTimeout(() => {
          document.body.removeChild(a);
        }, 50);
        
        // Track download
        if (frameId) {
          await trackDownload(frameId, frameName, mimeType.split('/')[1], false, 'ios-download');
        }
        
        showToast({
          type: 'success',
          message: 'Foto berhasil disimpan ke Downloads!'
        });
        
        return { success: true, method: 'ios-download' };
      } catch (iosError) {
        console.log('iOS download failed, using fallback:', iosError);
        // Continue to fallback method
      }
    }
    
    // Strategy 3: Standard download link (Android Chrome, Desktop)
    downloadBlob(blob, filename);
    
    // Track download
    if (frameId) {
      await trackDownload(frameId, frameName, mimeType.split('/')[1], false, 'download');
    }
    
    // Show appropriate message based on device
    if (device.isAndroid) {
      showToast({
        type: 'success',
        message: 'File berhasil diunduh. Cek di Galeri atau folder Downloads.'
      });
    } else {
      showToast({
        type: 'success',
        message: 'File berhasil diunduh!'
      });
    }
    
    console.log('✅ Download completed via standard download');
    return { success: true, method: 'download' };
    
  } catch (error) {
    console.error('❌ Download error:', error);
    
    showToast({
      type: 'error',
      title: 'Download Gagal',
      message: error.message || 'Terjadi kesalahan saat mengunduh file'
    });
    
    return { success: false, error: error.message };
  }
};

/**
 * Download photo to gallery
 * Convenience wrapper for downloadToGallery with image defaults
 */
export const downloadPhotoToGallery = async (source, options = {}) => {
  const timestamp = Date.now();
  const filename = options.filename || `fremio-photo-${timestamp}.png`;
  const mimeType = options.mimeType || 'image/png';
  
  return downloadToGallery(source, filename, mimeType, options);
};

/**
 * Download video to gallery
 * Convenience wrapper for downloadToGallery with video defaults
 */
export const downloadVideoToGallery = async (source, options = {}) => {
  const timestamp = Date.now();
  const filename = options.filename || `fremio-video-${timestamp}.mp4`;
  const mimeType = options.mimeType || 'video/mp4';
  
  return downloadToGallery(source, filename, mimeType, options);
};

/**
 * Download multiple files (batch download)
 */
export const downloadMultipleToGallery = async (files) => {
  const results = [];
  
  for (const file of files) {
    const result = await downloadToGallery(
      file.source,
      file.filename,
      file.mimeType,
      file.options
    );
    results.push(result);
    
    // Add small delay between downloads to avoid browser blocking
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  return results;
};

export default {
  downloadToGallery,
  downloadPhotoToGallery,
  downloadVideoToGallery,
  downloadMultipleToGallery
};
