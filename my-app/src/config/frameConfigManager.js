// Dynamic Frame Configuration Manager
// This file handles lazy loading of frame configurations for scalability

// Frame registry for available frames
export const FRAME_REGISTRY = [
  'Testframe1',
  'Testframe2', 
  'Testframe3'
  // Add new frames here as needed
];

// Frame metadata for quick access without loading full config
export const FRAME_METADATA = {
  Testframe1: {
    id: 'Testframe1',
    name: 'Frame 2 Foto',
    maxCaptures: 2,
    description: '2 slot foto vertikal',
    imagePath: '/src/assets/frames/Testframe1.png',
    category: 'portrait'
  },
  Testframe2: {
    id: 'Testframe2', 
    name: 'Frame 6 Foto (Photobooth Style)',
    maxCaptures: 3,
    description: '3 foto x 2 = 6 slot photobooth klasik',
    imagePath: '/src/assets/frames/Testframe2.png',
    category: 'photobooth'
  },
  Testframe3: {
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
    
    // Dynamic import of frame configuration
    const configModule = await import(`./frame-configs/${frameName}.js`);
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