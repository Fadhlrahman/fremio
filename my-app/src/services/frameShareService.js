/**
 * Frame Share Service
 * Simple URL-based frame sharing - no cloud storage needed!
 * 
 * How it works:
 * 1. Compress frame data to minimal JSON
 * 2. Encode to URL-safe base64
 * 3. Put in URL query parameter
 * 4. Friend opens URL, data is decoded and used directly
 */

// URL-safe base64 encode (replace + with -, / with _, remove =)
const base64UrlEncode = (str) => {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// URL-safe base64 decode
const base64UrlDecode = (str) => {
  // Add back padding
  let padded = str.replace(/-/g, '+').replace(/_/g, '/');
  while (padded.length % 4) {
    padded += '=';
  }
  return atob(padded);
};

// Compress frame data for URL sharing
export const compressFrameData = (draft) => {
  if (!draft) return null;
  
  // Filter elements - only include photo slots and text
  // Skip upload elements (they are usually large frame images)
  const shareableElements = draft.elements?.filter(el => {
    // Include photo slots (where user takes pictures)
    if (el.type === 'photo') return true;
    // Include text elements
    if (el.type === 'text') return true;
    // Include background type
    if (el.type === 'background') return true;
    // Skip upload elements - they contain large base64 images
    return false;
  }) || [];
  
  // Create minimal data structure
  const minimal = {
    t: draft.title || "Shared",
    a: draft.aspectRatio || "9:16",
    b: draft.canvasBackground || "#f7f1ed",
    e: shareableElements.map(el => {
      const base = {
        tp: el.type?.substring(0, 2), // 'ph' for photo, 'te' for text, 'ba' for background
        x: Math.round(el.x || 0),
        y: Math.round(el.y || 0),
        w: Math.round(el.width || 100),
        h: Math.round(el.height || 100),
        z: el.zIndex || 1
      };
      
      // Add specific data based on type
      if (el.type === 'photo') {
        base.d = { ar: el.data?.aspectRatio };
      } else if (el.type === 'text' && el.data) {
        base.d = {
          txt: el.data.text,
          fs: el.data.fontSize,
          fc: el.data.fontColor,
          ff: el.data.fontFamily
        };
      }
      
      return base;
    })
  };
  
  try {
    const json = JSON.stringify(minimal);
    // Use URL-safe base64 encoding
    const encoded = base64UrlEncode(unescape(encodeURIComponent(json)));
    return encoded;
  } catch (err) {
    console.error("Error compressing frame data:", err);
    return null;
  }
};

// Decompress frame data from URL
export const decompressFrameData = (encoded) => {
  if (!encoded) return null;
  
  try {
    // Use URL-safe base64 decoding
    const json = decodeURIComponent(escape(base64UrlDecode(encoded)));
    const minimal = JSON.parse(json);
    
    // Reconstruct full frame data
    const frame = {
      id: `shared-${Date.now()}`,
      title: minimal.t,
      aspectRatio: minimal.a,
      canvasBackground: minimal.b,
      elements: minimal.e?.map((el, idx) => {
        const typeMap = { 'ph': 'photo', 'te': 'text', 'ba': 'background' };
        const fullType = typeMap[el.tp] || el.tp;
        
        // Skip unknown types
        if (!typeMap[el.tp]) {
          console.warn('Unknown element type:', el.tp);
          return null;
        }
        
        const element = {
          id: `el-${idx}`,
          type: fullType,
          x: el.x,
          y: el.y,
          width: el.w,
          height: el.h,
          zIndex: el.z
        };
        
        // Reconstruct data based on type
        if (fullType === 'photo' && el.d) {
          element.data = { aspectRatio: el.d.ar };
        } else if (fullType === 'text' && el.d) {
          element.data = {
            text: el.d.txt,
            fontSize: el.d.fs,
            fontColor: el.d.fc,
            fontFamily: el.d.ff
          };
        }
        
        return element;
      }).filter(Boolean) || []  // Remove null elements
    };
    
    return frame;
  } catch (err) {
    console.error("Error decompressing frame data:", err);
    return null;
  }
};

// Generate shareable link with embedded frame data
export const generateShareLink = (draft) => {
  const encoded = compressFrameData(draft);
  if (!encoded) return null;
  
  const baseUrl = window.location.origin;
  
  // Use 'd' parameter for data (shorter than 'data')
  return `${baseUrl}/take-moment?d=${encoded}`;
};

// Check if URL has shared frame data
export const hasSharedFrameData = () => {
  const params = new URLSearchParams(window.location.search);
  return params.has('d');
};

// Get shared frame data from current URL
export const getSharedFrameFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('d');
  
  if (!encoded) return null;
  
  return decompressFrameData(encoded);
};
