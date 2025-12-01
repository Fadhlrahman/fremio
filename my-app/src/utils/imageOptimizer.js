/**
 * Image Optimizer using wsrv.nl CDN
 * 
 * Benefits:
 * - Automatic WebP conversion (30-50% smaller files)
 * - On-the-fly resizing
 * - Global CDN caching
 * - Free to use
 * 
 * @see https://images.weserv.nl/
 */

const WSRV_BASE = 'https://wsrv.nl/';

// Helper: Convert VPS URLs to Cloudflare Pages proxy URLs
const proxyVpsUrl = (url) => {
  if (!url) return url;
  
  // If URL is from VPS (72.61.210.203), proxy through Cloudflare Pages Function
  if (url.includes('72.61.210.203')) {
    const match = url.match(/72\.61\.210\.203(\/.*)/);
    if (match) {
      // Use Pages Function proxy at /proxy/...
      return `https://fremio.id/proxy${match[1]}`;
    }
  }
  
  // Ensure HTTPS for other URLs
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  
  return url;
};

/**
 * Optimize image URL using wsrv.nl CDN
 * 
 * @param {string} imageUrl - Original image URL
 * @param {Object} options - Optimization options
 * @param {number} [options.width] - Target width
 * @param {number} [options.height] - Target height
 * @param {number} [options.quality=80] - Quality 1-100
 * @param {string} [options.format='webp'] - Output format (webp, jpg, png)
 * @param {string} [options.fit='cover'] - Fit mode (cover, contain, fill, inside, outside)
 * @returns {string} Optimized image URL
 */
export const optimizeImage = (imageUrl, options = {}) => {
  // Return empty string for falsy input
  if (!imageUrl) return '';
  
  // Skip if already a data URL (base64)
  if (imageUrl.startsWith('data:')) return imageUrl;
  
  // Skip if not a valid URL
  if (!imageUrl.startsWith('http')) return imageUrl;
  
  // Skip if already optimized via wsrv
  if (imageUrl.includes('wsrv.nl')) return imageUrl;
  
  // For VPS URLs, use Cloudflare proxy directly (wsrv.nl can't fetch from our proxy)
  if (imageUrl.includes('72.61.210.203')) {
    return proxyVpsUrl(imageUrl);
  }
  
  // Proxy VPS URLs through Cloudflare first
  const proxiedUrl = proxyVpsUrl(imageUrl);
  
  const {
    width,
    height,
    quality = 80,
    format = 'webp',
    fit = 'cover',
    blur,           // Blur amount (0.3-1000)
    sharpen,        // Sharpen amount
    brightness,     // Brightness adjustment
    contrast,       // Contrast adjustment
  } = options;
  
  const params = new URLSearchParams();
  params.append('url', proxiedUrl);
  
  // Dimensions
  if (width) params.append('w', width);
  if (height) params.append('h', height);
  
  // Quality & Format
  if (quality) params.append('q', quality);
  if (format) params.append('output', format);
  
  // Fit mode
  if (fit && (width || height)) params.append('fit', fit);
  
  // Don't upscale small images
  params.append('n', '-1');
  
  // Optional adjustments
  if (blur) params.append('blur', blur);
  if (sharpen) params.append('sharp', sharpen);
  if (brightness) params.append('mod', brightness);
  if (contrast) params.append('con', contrast);
  
  return `${WSRV_BASE}?${params.toString()}`;
};

/**
 * Get original image URL (bypass CDN)
 * Useful for downloading full quality images
 */
export const getOriginalUrl = (imageUrl) => {
  if (!imageUrl) return '';
  
  // If it's a wsrv URL, extract original
  if (imageUrl.includes('wsrv.nl')) {
    try {
      const url = new URL(imageUrl);
      return url.searchParams.get('url') || imageUrl;
    } catch {
      return imageUrl;
    }
  }
  
  return imageUrl;
};

/**
 * Presets for common use cases in Fremio
 */
export const imagePresets = {
  /**
   * Tiny thumbnail for lists (50KB target)
   * Use in: AdminFrames grid, frame selection
   */
  thumbnail: (url) => optimizeImage(url, { 
    width: 200, 
    height: 300, 
    quality: 70,
    format: 'webp'
  }),
  
  /**
   * Medium preview (100KB target)
   * Use in: Frame detail modal, preview cards
   */
  preview: (url) => optimizeImage(url, { 
    width: 400, 
    height: 600, 
    quality: 80,
    format: 'webp'
  }),
  
  /**
   * Card image for Frames page
   * Use in: Frames.jsx grid cards
   */
  card: (url) => optimizeImage(url, { 
    width: 300, 
    height: 450, 
    quality: 75,
    format: 'webp',
    fit: 'contain'
  }),
  
  /**
   * Full quality for editing (500KB target)
   * Use in: EditPhoto canvas overlay
   */
  full: (url) => optimizeImage(url, { 
    width: 1080, 
    height: 1920, 
    quality: 90,
    format: 'webp'
  }),
  
  /**
   * High quality for download
   * Use in: Final download (keep PNG for transparency)
   */
  download: (url) => optimizeImage(url, { 
    width: 1080, 
    height: 1920, 
    quality: 95,
    format: 'png'
  }),
  
  /**
   * Profile photo / avatar
   */
  avatar: (url) => optimizeImage(url, { 
    width: 100, 
    height: 100, 
    quality: 80,
    format: 'webp',
    fit: 'cover'
  }),
  
  /**
   * Blurred placeholder for lazy loading
   */
  placeholder: (url) => optimizeImage(url, { 
    width: 20, 
    height: 30, 
    quality: 30,
    format: 'webp',
    blur: 5
  }),
};

/**
 * React hook helper - generates srcset for responsive images
 * 
 * @example
 * const { src, srcSet } = getResponsiveImage(imageUrl);
 * <img src={src} srcSet={srcSet} />
 */
export const getResponsiveImage = (imageUrl) => {
  if (!imageUrl || imageUrl.startsWith('data:')) {
    return { src: imageUrl, srcSet: '' };
  }
  
  const sizes = [200, 400, 600, 800, 1080];
  
  const srcSet = sizes
    .map(w => `${optimizeImage(imageUrl, { width: w, quality: 80 })} ${w}w`)
    .join(', ');
  
  return {
    src: optimizeImage(imageUrl, { width: 400, quality: 80 }),
    srcSet,
  };
};

/**
 * Preload critical images
 * Call this early to start loading important images
 */
export const preloadImage = (imageUrl, preset = 'preview') => {
  if (!imageUrl || typeof window === 'undefined') return;
  
  const optimizedUrl = imagePresets[preset] 
    ? imagePresets[preset](imageUrl)
    : optimizeImage(imageUrl);
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = optimizedUrl;
  document.head.appendChild(link);
};

export default {
  optimizeImage,
  getOriginalUrl,
  imagePresets,
  getResponsiveImage,
  preloadImage,
};
