/**
 * Camera Helper - Handle Camera Permissions Properly
 * Solves the "Site cannot request your permission" error
 */

/**
 * Check if camera is available
 */
export const isCameraAvailable = () => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

/**
 * Check if running in secure context (HTTPS or localhost)
 */
export const isSecureContext = () => {
  return window.isSecureContext || window.location.protocol === 'https:' || 
         window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1';
};

/**
 * Get camera permission status without requesting
 */
export const getCameraPermissionStatus = async () => {
  try {
    // Check if Permissions API is available
    if (!navigator.permissions) {
      return { status: 'prompt', supported: false };
    }

    const result = await navigator.permissions.query({ name: 'camera' });
    return { 
      status: result.state, // 'granted', 'denied', or 'prompt'
      supported: true 
    };
  } catch (error) {
    // Permissions API not fully supported
    return { status: 'unknown', supported: false, error: error.message };
  }
};

/**
 * Request camera permission properly
 * This function handles the permission request in a way that avoids the
 * "Site cannot request your permission" error
 */
export const requestCameraPermission = async (options = {}) => {
  try {
    // 1. Check if camera API is available
    if (!isCameraAvailable()) {
      return {
        granted: false,
        error: 'Camera API not available',
        message: 'Browser Anda tidak mendukung akses kamera'
      };
    }

    // 2. Check if running in secure context
    if (!isSecureContext()) {
      return {
        granted: false,
        error: 'Insecure context',
        message: 'Kamera hanya dapat diakses melalui HTTPS atau localhost'
      };
    }

    // 3. Check current permission status
    const permissionStatus = await getCameraPermissionStatus();
    
    if (permissionStatus.status === 'denied') {
      return {
        granted: false,
        error: 'Permission denied',
        message: 'Izin kamera ditolak. Silakan aktifkan di pengaturan browser:\n\n' +
                 '• Chrome: Klik ikon kunci → Izin situs → Kamera → Izinkan\n' +
                 '• Safari: Safari → Pengaturan → Situs Web → Kamera → Izinkan'
      };
    }

    // 4. Request camera access via getUserMedia
    // This is the proper way that doesn't trigger the "cannot request permission" error
    const constraints = {
      video: {
        facingMode: options.facingMode || 'user', // 'user' for front, 'environment' for back
        width: options.width || { ideal: 1920 },
        height: options.height || { ideal: 1080 }
      },
      audio: false
    };

    console.log('🎥 Requesting camera access with constraints:', constraints);
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Permission granted, stop the stream immediately if not needed
    if (!options.keepStream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    console.log('✅ Camera permission granted');
    
    return {
      granted: true,
      stream: options.keepStream ? stream : null,
      message: 'Kamera berhasil diakses'
    };
    
  } catch (error) {
    console.error('❌ Camera permission error:', error);
    
    // Handle specific error types
    let message = 'Tidak dapat mengakses kamera';
    
    if (error.name === 'NotAllowedError') {
      message = 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.';
    } else if (error.name === 'NotFoundError') {
      message = 'Kamera tidak ditemukan. Pastikan perangkat Anda memiliki kamera.';
    } else if (error.name === 'NotReadableError') {
      message = 'Kamera sedang digunakan oleh aplikasi lain. Silakan tutup aplikasi lain terlebih dahulu.';
    } else if (error.name === 'OverconstrainedError') {
      message = 'Pengaturan kamera tidak didukung. Mencoba dengan pengaturan default...';
    } else if (error.name === 'SecurityError') {
      message = 'Akses kamera diblokir karena alasan keamanan. Pastikan Anda menggunakan HTTPS.';
    } else if (error.name === 'TypeError') {
      message = 'Browser tidak mendukung akses kamera atau parameter tidak valid.';
    }
    
    return {
      granted: false,
      error: error.name,
      message,
      details: error.message
    };
  }
};

/**
 * Request camera with fallback to default constraints
 */
export const requestCameraWithFallback = async (options = {}) => {
  // Try with specified options first
  let result = await requestCameraPermission(options);
  
  // If failed due to constraints, try with minimal constraints
  if (!result.granted && result.error === 'OverconstrainedError') {
    console.log('🔄 Retrying with default constraints...');
    result = await requestCameraPermission({ 
      ...options, 
      width: undefined, 
      height: undefined 
    });
  }
  
  return result;
};

/**
 * Get available camera devices
 */
export const getCameraDevices = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return { success: false, devices: [], error: 'Device enumeration not supported' };
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(device => device.kind === 'videoinput');
    
    return {
      success: true,
      devices: cameras,
      count: cameras.length,
      hasFrontCamera: cameras.some(d => d.label.toLowerCase().includes('front')),
      hasBackCamera: cameras.some(d => d.label.toLowerCase().includes('back'))
    };
  } catch (error) {
    console.error('Error enumerating devices:', error);
    return { success: false, devices: [], error: error.message };
  }
};

/**
 * Switch camera (front/back)
 */
export const switchCamera = async (currentFacingMode) => {
  const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
  
  return await requestCameraPermission({
    facingMode: newFacingMode,
    keepStream: true
  });
};

/**
 * Test camera access (for diagnostics)
 */
export const testCameraAccess = async () => {
  const results = {
    timestamp: new Date().toISOString(),
    secure: isSecureContext(),
    apiAvailable: isCameraAvailable(),
    permissionStatus: null,
    accessTest: null,
    devices: null
  };
  
  // Test 1: Check permission status
  results.permissionStatus = await getCameraPermissionStatus();
  
  // Test 2: Try to access camera
  results.accessTest = await requestCameraPermission({ keepStream: false });
  
  // Test 3: List available devices (only works if permission granted)
  if (results.accessTest.granted) {
    results.devices = await getCameraDevices();
  }
  
  return results;
};

/**
 * Show camera permission instructions based on browser
 */
export const getCameraPermissionInstructions = () => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let instructions = '';
  
  if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) {
    browser = 'Chrome';
    instructions = 
      '1. Klik ikon kunci (🔒) di sebelah kiri URL\n' +
      '2. Pilih "Izin situs" atau "Site settings"\n' +
      '3. Cari "Kamera" dan ubah ke "Izinkan"\n' +
      '4. Refresh halaman';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Safari';
    instructions = 
      '1. Buka Safari → Pengaturan untuk Situs Web ini\n' +
      '2. Cari "Kamera"\n' +
      '3. Pilih "Izinkan"\n' +
      '4. Refresh halaman';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Firefox';
    instructions = 
      '1. Klik ikon kunci (🔒) di sebelah kiri URL\n' +
      '2. Klik tanda ✕ di sebelah "Diblokir secara sementara"\n' +
      '3. Izinkan akses kamera\n' +
      '4. Refresh halaman';
  } else if (/Edge/i.test(ua)) {
    browser = 'Edge';
    instructions = 
      '1. Klik ikon kunci (🔒) di sebelah kiri URL\n' +
      '2. Pilih "Izin untuk situs ini"\n' +
      '3. Ubah Kamera ke "Izinkan"\n' +
      '4. Refresh halaman';
  }
  
  return { browser, instructions };
};

/**
 * LocalStorage keys for permission tracking
 */
const PERMISSION_STORAGE_KEY = 'fremio_camera_permission_asked';
const PERMISSION_GRANTED_KEY = 'fremio_camera_permission_granted';

/**
 * Check if we've asked for permission before
 */
export const hasAskedPermissionBefore = () => {
  return localStorage.getItem(PERMISSION_STORAGE_KEY) === 'true';
};

/**
 * Mark that we've asked for permission
 */
export const markPermissionAsked = () => {
  localStorage.setItem(PERMISSION_STORAGE_KEY, 'true');
  localStorage.setItem(PERMISSION_GRANTED_KEY + '_time', Date.now().toString());
};

/**
 * Check if permission was previously granted
 */
export const wasPermissionGranted = () => {
  return localStorage.getItem(PERMISSION_GRANTED_KEY) === 'true';
};

/**
 * Mark permission as granted
 */
export const markPermissionGranted = () => {
  localStorage.setItem(PERMISSION_GRANTED_KEY, 'true');
  localStorage.setItem(PERMISSION_GRANTED_KEY + '_time', Date.now().toString());
};

/**
 * Mark permission as denied
 */
export const markPermissionDenied = () => {
  localStorage.setItem(PERMISSION_GRANTED_KEY, 'false');
  localStorage.setItem(PERMISSION_GRANTED_KEY + '_time', Date.now().toString());
};

/**
 * Clear permission storage (for testing/reset)
 */
export const clearPermissionStorage = () => {
  localStorage.removeItem(PERMISSION_STORAGE_KEY);
  localStorage.removeItem(PERMISSION_GRANTED_KEY);
  localStorage.removeItem(PERMISSION_GRANTED_KEY + '_time');
};

/**
 * Request camera permission dengan auto-save preference
 */
export const requestCameraPermissionWithSave = async (options = {}) => {
  markPermissionAsked();
  const result = await requestCameraWithFallback(options);
  
  if (result.granted) {
    markPermissionGranted();
  } else {
    markPermissionDenied();
  }
  
  return result;
};

export default {
  isCameraAvailable,
  isSecureContext,
  getCameraPermissionStatus,
  requestCameraPermission,
  requestCameraWithFallback,
  getCameraDevices,
  switchCamera,
  testCameraAccess,
  getCameraPermissionInstructions,
  hasAskedPermissionBefore,
  markPermissionAsked,
  wasPermissionGranted,
  markPermissionGranted,
  markPermissionDenied,
  clearPermissionStorage,
  requestCameraPermissionWithSave
};
