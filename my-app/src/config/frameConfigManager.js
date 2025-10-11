// Dynamic Frame Configuration Manager
// This file handles lazy loading of frame configurations for scalability

// Frame registry for available frames
export const FRAME_REGISTRY = [
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
  'FremioSeries-blue-4'
  // Add new frames here as needed
];

// Frame metadata for quick access without loading full config
export const FRAME_METADATA = {
  'FremioSeries-blue-2': {
    id: 'FremioSeries-blue-2',
    name: 'FremioSeries Blue 2',
    maxCaptures: 4,
    description: '4 slot foto dengan frame biru FremioSeries',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-2/FremioSeries-blue-2.png',
    category: 'FremioSeries',
    color: 'blue',
    series: 'FremioSeries-2'
  },
  'FremioSeries-babyblue-3': {
    id: 'FremioSeries-babyblue-3',
    name: 'FremioSeries Baby Blue 3',
    maxCaptures: 6,
    description: '6 slot foto dengan frame baby blue FremioSeries',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-babyblue-3.png',
    category: 'FremioSeries',
    color: 'babyblue',
    series: 'FremioSeries-3'
  },
  'FremioSeries-black-3': {
    id: 'FremioSeries-black-3',
    name: 'FremioSeries Black 3',
    maxCaptures: 6,
    description: '6 slot foto dengan frame hitam FremioSeries',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-black-3.png',
    category: 'FremioSeries',
    color: 'black',
    series: 'FremioSeries-3'
  },
  'FremioSeries-blue-3': {
    id: 'FremioSeries-blue-3',
    name: 'FremioSeries Blue 3',
    maxCaptures: 6,
    description: '6 slot foto dengan frame biru FremioSeries',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-blue-3.png',
    category: 'FremioSeries',
    color: 'blue',
    series: 'FremioSeries-3'
  },
  'FremioSeries-cream-3': {
    id: 'FremioSeries-cream-3',
    name: 'FremioSeries Cream 3',
    maxCaptures: 6,
    description: '6 slot foto dengan frame cream FremioSeries',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-cream-3.png',
    category: 'FremioSeries',
    color: 'cream',
    series: 'FremioSeries-3'
  },
  'FremioSeries-green-3': {
    id: 'FremioSeries-green-3',
    name: 'FremioSeries Green 3',
    maxCaptures: 6,
    description: '6 slot foto dengan frame hijau FremioSeries',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-green-3.png',
    category: 'FremioSeries',
    color: 'green',
    series: 'FremioSeries-3'
  },
  'FremioSeries-maroon-3': {
    id: 'FremioSeries-maroon-3',
    name: 'FremioSeries Maroon 3',
    maxCaptures: 6,
    description: '6 slot foto dengan frame maroon FremioSeries',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-maroon-3.png',
    category: 'FremioSeries',
    color: 'maroon',
    series: 'FremioSeries-3'
  },
  'FremioSeries-orange-3': {
    id: 'FremioSeries-orange-3',
    name: 'FremioSeries Orange 3',
    maxCaptures: 6,
    description: '6 slot foto dengan frame orange FremioSeries',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-orange-3.png',
    category: 'FremioSeries',
    color: 'orange',
    series: 'FremioSeries-3'
  },
  'FremioSeries-pink-3': {
    id: 'FremioSeries-pink-3',
    name: 'FremioSeries Pink 3',
    maxCaptures: 6,
    description: '6 slot foto dengan frame pink FremioSeries',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-pink-3.png',
    category: 'FremioSeries',
    color: 'pink',
    series: 'FremioSeries-3'
  },
  'FremioSeries-purple-3': {
    id: 'FremioSeries-purple-3',
    name: 'FremioSeries Purple 3',
    maxCaptures: 6,
    description: '6 slot foto dengan frame ungu FremioSeries',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-purple-3.png',
    category: 'FremioSeries',
    color: 'purple',
    series: 'FremioSeries-3'
  },
  'FremioSeries-white-3': {
    id: 'FremioSeries-white-3',
    name: 'FremioSeries White 3',
    maxCaptures: 6,
    description: '6 slot foto dengan frame putih FremioSeries',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-white-3.png',
    category: 'FremioSeries',
    color: 'white',
    series: 'FremioSeries-3'
  },
  'FremioSeries-blue-4': {
    id: 'FremioSeries-blue-4',
    name: 'FremioSeries Blue 4',
    maxCaptures: 8,
    description: '8 slot foto dengan frame biru FremioSeries',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-4/FremioSeries-blue-4.png',
    category: 'FremioSeries',
    color: 'blue',
    series: 'FremioSeries-4'
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