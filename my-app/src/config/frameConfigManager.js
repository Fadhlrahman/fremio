// Dynamic Frame Configuration Manager
// This file handles lazy loading of frame configurations for scalability

// Frame registry for available frames
export const FRAME_REGISTRY = [
  // FremioSeries frames
  'FremioSeries-blue-2',
  'FremioSeries-babyblue-3',
  'FremioSeries-black-3',
  'FremioSeries-blue-3',
  'FremioSeries-cream-3',
  'FremioSeries-green-3',
  'FremioSeries-maroon-3',
  'FremioSeries-orange-3',
  'FremioSeries-pink-3',
  'FremioSeries-purple-3',
  'FremioSeries-white-3',
  'FremioSeries-blue-4',
  // Legacy/Test frames
  'Testframe1',
  'Testframe2',
  'Testframe3'
];

// Map of available frame-config modules (Vite will include and HMR-update these)
const FRAME_MODULES = import.meta.glob('./frame-configs/*.js');

// Frame metadata for quick access without loading full config
export const FRAME_METADATA = {
  // FremioSeries Metadata
  'FremioSeries-blue-2': {
    id: 'FremioSeries-blue-2',
    name: 'FremioSeries Blue 2 Foto',
    maxCaptures: 2,
    description: '2 slot foto vertikal - Blue Frame',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-2/FremioSeries-blue-2.png',
    category: 'portrait'
  },
  'FremioSeries-babyblue-3': {
    id: 'FremioSeries-babyblue-3',
    name: 'FremioSeries Baby Blue 6 Foto',
    maxCaptures: 3,
    description: '3 foto x 2 = 6 slot photobooth klasik - Baby Blue Frame',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-babyblue-3.png',
    category: 'photobooth'
  },
  'FremioSeries-black-3': {
    id: 'FremioSeries-black-3',
    name: 'FremioSeries Black 6 Foto',
    maxCaptures: 3,
    description: '3 foto x 2 = 6 slot photobooth klasik - Black Frame',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-black-3.png',
    category: 'photobooth'
  },
  'FremioSeries-blue-3': {
    id: 'FremioSeries-blue-3',
    name: 'FremioSeries Blue 6 Foto',
    maxCaptures: 3,
    description: '3 foto x 2 = 6 slot photobooth klasik - Blue Frame',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-blue-3.png',
    category: 'photobooth'
  },
  'FremioSeries-cream-3': {
    id: 'FremioSeries-cream-3',
    name: 'FremioSeries Cream 6 Foto',
    maxCaptures: 3,
    description: '3 foto x 2 = 6 slot photobooth klasik - Cream Frame',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-cream-3.png',
    category: 'photobooth'
  },
  'FremioSeries-green-3': {
    id: 'FremioSeries-green-3',
    name: 'FremioSeries Green 6 Foto',
    maxCaptures: 3,
    description: '3 foto x 2 = 6 slot photobooth klasik - Green Frame',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-green-3.png',
    category: 'photobooth'
  },
  'FremioSeries-maroon-3': {
    id: 'FremioSeries-maroon-3',
    name: 'FremioSeries Maroon 6 Foto',
    maxCaptures: 3,
    description: '3 foto x 2 = 6 slot photobooth klasik - Maroon Frame',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-maroon-3.png',
    category: 'photobooth'
  },
  'FremioSeries-orange-3': {
    id: 'FremioSeries-orange-3',
    name: 'FremioSeries Orange 6 Foto',
    maxCaptures: 3,
    description: '3 foto x 2 = 6 slot photobooth klasik - Orange Frame',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-orange-3.png',
    category: 'photobooth'
  },
  'FremioSeries-pink-3': {
    id: 'FremioSeries-pink-3',
    name: 'FremioSeries Pink 6 Foto',
    maxCaptures: 3,
    description: '3 foto x 2 = 6 slot photobooth klasik - Pink Frame',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-pink-3.png',
    category: 'photobooth'
  },
  'FremioSeries-purple-3': {
    id: 'FremioSeries-purple-3',
    name: 'FremioSeries Purple 6 Foto',
    maxCaptures: 3,
    description: '3 foto x 2 = 6 slot photobooth klasik - Purple Frame',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-purple-3.png',
    category: 'photobooth'
  },
  'FremioSeries-white-3': {
    id: 'FremioSeries-white-3',
    name: 'FremioSeries White 6 Foto',
    maxCaptures: 3,
    description: '3 foto x 2 = 6 slot photobooth klasik - White Frame',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-white-3.png',
    category: 'photobooth'
  },
  'FremioSeries-blue-4': {
    id: 'FremioSeries-blue-4',
    name: 'FremioSeries Blue 4 Foto',
    maxCaptures: 4,
    description: '4 slot foto grid 2x2 - Blue Frame',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-4/FremioSeries-blue-4.png',
    category: 'grid'
  },
  // Legacy/Test frames metadata
  'Testframe1': {
    id: 'Testframe1',
    name: 'Frame 2 Foto',
    maxCaptures: 2,
    description: '2 slot foto vertikal',
    imagePath: '/src/assets/frames/Testframe1.png',
    category: 'portrait'
  },
  'Testframe2': {
    id: 'Testframe2',
    name: 'Frame 6 Foto (Photobooth Style)',
    maxCaptures: 3,
    description: '3 foto x 2 = 6 slot photobooth klasik',
    imagePath: '/src/assets/frames/Testframe2.png',
    category: 'photobooth'
  },
  'Testframe3': {
    id: 'Testframe3',
    name: 'Frame 4 Foto',
    maxCaptures: 4,
    description: '4 slot foto grid 2x2',
    imagePath: '/src/assets/frames/Testframe3.png',
    category: 'grid'
  }
};

// Cache for loaded frame configurations
const frameConfigCache = new Map();

/**
 * Dynamically load frame configuration
 * @param {string} frameName - Name of the frame to load
 * @returns {Promise<Object>} Frame configuration object
 */
export const getFrameConfig = async (frameName) => {
  // Check cache first
  if (frameConfigCache.has(frameName)) {
    console.log(`📦 Loading ${frameName} from cache`);
    return frameConfigCache.get(frameName);
  }

  // Check if frame exists in registry
  if (!FRAME_REGISTRY.includes(frameName)) {
    console.warn(`⚠️ Frame ${frameName} not found in registry`);
    return null;
  }

  try {
    console.log(`📥 Loading ${frameName} configuration...`);
    const modulePath = `./frame-configs/${frameName}.js`;
    const loader = FRAME_MODULES[modulePath];
    if (!loader) {
      console.error(`❌ No module loader found for ${modulePath}`);
      return null;
    }
    // Dynamic import via Vite glob (HMR-aware)
    const configModule = await loader();
    const config = configModule.frameConfig || configModule.default;
    
    // Cache the loaded configuration
    frameConfigCache.set(frameName, config);
    
    console.log(`✅ ${frameName} configuration loaded successfully`);
    return config;
  } catch (error) {
    console.error(`❌ Failed to load ${frameName} configuration:`, error);
    return null;
  }
};

/**
 * Get frame metadata without loading full configuration
 * @param {string} frameName - Name of the frame
 * @returns {Object} Frame metadata
 */
export const getFrameMetadata = (frameName) => {
  return FRAME_METADATA[frameName] || null;
};

/**
 * Get all available frames metadata
 * @returns {Array} Array of frame metadata objects
 */
export const getAllFrames = () => {
  return FRAME_REGISTRY.map(frameName => FRAME_METADATA[frameName]);
};

/**
 * Check if frame is valid/exists
 * @param {string} frameName - Name of the frame to validate
 * @returns {boolean} True if frame exists
 */
export const isValidFrame = (frameName) => {
  return FRAME_REGISTRY.includes(frameName);
};

/**
 * Clear frame configuration cache
 */
export const clearFrameCache = () => {
  frameConfigCache.clear();
  console.log('🗑️ Frame configuration cache cleared');
};

/**
 * Clear a specific frame configuration from cache
 * @param {string} frameName
 */
export const clearFrameCacheFor = (frameName) => {
  if (frameConfigCache.has(frameName)) {
    frameConfigCache.delete(frameName);
    console.log(`🧹 Cleared cache for frame: ${frameName}`);
  }
};

/**
 * Force-reload a frame configuration from disk (bypass cache)
 * Useful when editing ./frame-configs/*.js and wanting instant preview updates.
 * @param {string} frameName
 * @returns {Promise<Object|null>} fresh frame config
 */
export const reloadFrameConfig = async (frameName) => {
  try {
    clearFrameCacheFor(frameName);
    const modulePath = `./frame-configs/${frameName}.js`;
    const loader = FRAME_MODULES[modulePath];
    if (!loader) {
      console.error(`❌ No module loader found for ${modulePath}`);
      return null;
    }
    // Ask Vite to (re)load the module; in dev, HMR supplies latest code
    const mod = await loader();
    const config = mod.frameConfig || mod.default;
    if (config) {
      frameConfigCache.set(frameName, config);
      console.log(`♻️ Reloaded frame config for ${frameName}`);
      return config;
    }
  } catch (err) {
    console.error(`❌ Failed to reload frame config for ${frameName}:`, err);
  }
  return null;
};

/**
 * Get frames by category
 * @param {string} category - Category to filter by
 * @returns {Array} Array of frame metadata for the category
 */
export const getFramesByCategory = (category) => {
  return FRAME_REGISTRY
    .map(frameName => FRAME_METADATA[frameName])
    .filter(metadata => metadata.category === category);
};

/**
 * Preload frame configurations (for performance optimization)
 * @param {Array} frameNames - Array of frame names to preload
 */
export const preloadFrameConfigs = async (frameNames = FRAME_REGISTRY) => {
  console.log('🚀 Preloading frame configurations...');
  
  const promises = frameNames.map(frameName => getFrameConfig(frameName));
  
  try {
    await Promise.all(promises);
    console.log('✅ All frame configurations preloaded');
  } catch (error) {
    console.error('❌ Error preloading frame configurations:', error);
  }
};

// Legacy compatibility - synchronous version (deprecated)
export const getFrameConfigSync = (frameName) => {
  console.warn('⚠️ getFrameConfigSync is deprecated. Use getFrameConfig(frameName) instead.');
  
  // Return cached version if available
  if (frameConfigCache.has(frameName)) {
    return frameConfigCache.get(frameName);
  }
  
  // Return metadata as fallback
  return FRAME_METADATA[frameName] || null;
};