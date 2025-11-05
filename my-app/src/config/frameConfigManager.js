// Dynamic Frame Configuration Manager
// This file handles lazy loading of frame configurations for scalability

// Import all frame images using Vite's glob import
const frameImages = import.meta.glob('../assets/frames/**/*.png', { eager: true, import: 'default' });

// Helper function to resolve frame image path to actual URL
const resolveFrameImage = (imagePath) => {
  if (!imagePath) return null;
  
  // Convert /src/assets/... to ../assets/...
  const normalizedPath = imagePath.replace('/src/', '../');
  
  // Find matching image in glob imports
  const matchingImage = frameImages[normalizedPath];
  
  if (matchingImage) {
    return matchingImage;
  }
  
  console.warn(`⚠️ Frame image not found: ${imagePath}`);
  return null;
};

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
  'SalPriadi',
  'InspiredBy-7Des',
  'InspiredBy-AbbeyRoad',
  'InspiredBy-LagipulaHidupAkanBerakhir',
  'InspiredBy-MembangunDanMenghancurkan',
  'InspiredBy-MenariDenganBayangan',
  'InspiredBy-PSILOVEYOU',
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
  'SalPriadi': {
    id: 'SalPriadi',
    name: 'Sal Priadi 6 Foto',
    maxCaptures: 3,
    description: 'Frame kolaborasi Sal Priadi dengan layout photobooth 3 x 2.',
    imagePath: '/src/assets/frames/InspiredBy/Sal Priadi.png',
    category: 'photobooth'
  },
  'InspiredBy-7Des': {
    id: 'InspiredBy-7Des',
    name: 'Inspired By 7 Des',
    maxCaptures: 4,
    description: 'Frame Inspired By dengan layout photobooth 4 x 2 (8 slot).',
    imagePath: '/src/assets/frames/InspiredBy/7 Des.png',
    category: 'photobooth'
  },
  'InspiredBy-AbbeyRoad': {
    id: 'InspiredBy-AbbeyRoad',
    name: 'Inspired By Abbey Road',
    maxCaptures: 3,
    description: 'Frame Inspired By dengan layout photobooth 3 x 2.',
    imagePath: '/src/assets/frames/InspiredBy/Abbey Road.png',
    category: 'photobooth'
  },
  'InspiredBy-LagipulaHidupAkanBerakhir': {
    id: 'InspiredBy-LagipulaHidupAkanBerakhir',
    name: 'Inspired By Lagipula Hidup Akan Berakhir',
    maxCaptures: 3,
    description: 'Frame Inspired By dengan layout photobooth 3 x 2.',
    imagePath: '/src/assets/frames/InspiredBy/Lagipula Hidup Akan Berakhir.png',
    category: 'photobooth'
  },
  'InspiredBy-MembangunDanMenghancurkan': {
    id: 'InspiredBy-MembangunDanMenghancurkan',
    name: 'Inspired By Membangun & Menghancurkan',
    maxCaptures: 3,
    description: 'Frame Inspired By dengan layout photobooth 3 x 2.',
    imagePath: '/src/assets/frames/InspiredBy/Membangun & Menghancurkan.png',
    category: 'photobooth'
  },
  'InspiredBy-MenariDenganBayangan': {
    id: 'InspiredBy-MenariDenganBayangan',
    name: 'Inspired By Menari dengan Bayangan',
    maxCaptures: 3,
    description: 'Frame Inspired By dengan layout photobooth 3 x 2.',
    imagePath: '/src/assets/frames/InspiredBy/Menari dengan Bayangan.png',
    category: 'photobooth'
  },
  'InspiredBy-PSILOVEYOU': {
    id: 'InspiredBy-PSILOVEYOU',
    name: 'Inspired By PS. I LOVE YOU',
    maxCaptures: 3,
    description: 'Frame Inspired By dengan layout photobooth 3 x 2.',
    imagePath: '/src/assets/frames/InspiredBy/PS. I LOVE YOU.png',
    category: 'photobooth'
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
 * Convert legacy slots format to designer.elements format
 * @param {Array} slots - Array of slot objects with relative coordinates
 * @param {Object} layout - Layout configuration with canvas dimensions
 * @returns {Array} Array of photo elements in designer format
 */
const convertSlotsToDesignerElements = (slots, layout) => {
  if (!Array.isArray(slots) || slots.length === 0) {
    return [];
  }

  // Default canvas dimensions (9:16 portrait)
  const canvasWidth = layout?.canvasWidth || 1080;
  const canvasHeight = layout?.canvasHeight || 1920;

  return slots.map((slot, index) => {
    // Convert relative coordinates (0-1) to absolute pixels
    const x = Math.round(slot.left * canvasWidth);
    const y = Math.round(slot.top * canvasHeight);
    const width = Math.round(slot.width * canvasWidth);
    const height = Math.round(slot.height * canvasHeight);

    return {
      id: slot.id || `photo-slot-${index}`,
      type: 'photo',
      x,
      y,
      width,
      height,
      rotation: 0,
      zIndex: slot.zIndex || 100,
      isLocked: false,
      data: {
        fill: '#d1e3f0',
        borderRadius: 24,
        stroke: null,
        strokeWidth: 0,
        label: `Foto ${slot.photoIndex + 1}`,
        photoIndex: slot.photoIndex !== undefined ? slot.photoIndex : index
      }
    };
  });
};

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
    
    // Resolve frame image path to actual URL
    if (config && config.imagePath) {
      const resolvedImageUrl = resolveFrameImage(config.imagePath);
      if (resolvedImageUrl) {
        config.frameImage = resolvedImageUrl; // Add resolved URL
      }
    }
    
    // Convert legacy slots to designer.elements if needed
    if (config && config.slots && !config.designer?.elements) {
      const canvasWidth = config.layout?.canvasWidth || 1080;
      const canvasHeight = config.layout?.canvasHeight || 1920;
      const canvasBackground = config.layout?.backgroundColor || '#ffffff';
      const aspectRatio = config.layout?.aspectRatio || '9:16';
      
      const photoElements = convertSlotsToDesignerElements(config.slots, config.layout);
      
      config.designer = {
        elements: photoElements,
        canvasBackground,
        canvasWidth,
        canvasHeight,
        aspectRatio
      };
      
      console.log(`✅ Converted ${photoElements.length} slots to designer elements for ${frameName}`);
    }
    
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