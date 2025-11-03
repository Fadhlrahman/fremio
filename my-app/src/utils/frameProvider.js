// Frame data provider - utility untuk mengelola frame configurations
import { 
  getFrameConfig, 
  getFrameMetadata, 
  isValidFrame, 
  getAllFrames,
  preloadFrameConfigs
} from '../config/frameConfigManager.js';
import safeStorage from './safeStorage.js';
import { sanitizeFrameConfigForStorage } from './frameConfigSanitizer.js';

const CUSTOM_FRAME_PREFIX = 'custom-';

const isCustomFrameId = (frameName) =>
  typeof frameName === 'string' && frameName.startsWith(CUSTOM_FRAME_PREFIX);

export class FrameDataProvider {
  constructor() {
    this.currentFrame = null;
    this.currentConfig = null;
    this.isLoading = false;
  }

  // Set frame yang akan digunakan (now async)
  async setFrame(frameName, options = {}) {
    console.log(`🎯 setFrame called with: ${frameName}`);

    if (!frameName) {
      console.error('Frame name is required to set frame.');
      return false;
    }

  const providedConfig = options.config;
  const treatAsCustom = options.isCustom ?? providedConfig?.isCustom ?? isCustomFrameId(frameName);

    this.isLoading = true;

    try {
      let config = providedConfig || null;

      if (!config) {
        if (isValidFrame(frameName)) {
          config = await getFrameConfig(frameName);
        } else {
          const cachedConfig = safeStorage.getJSON('frameConfig');
          if (cachedConfig?.id === frameName) {
            config = cachedConfig;
          }

          if (!config) {
            if (treatAsCustom) {
              throw new Error(`Custom frame "${frameName}" tidak ditemukan di storage`);
            }
            console.error(`Frame "${frameName}" tidak valid atau tidak ditemukan`);
            return false;
          }
        }
      }

      if (!config) {
        throw new Error(`Frame configuration for "${frameName}" is missing`);
      }

      this.currentFrame = frameName;
      this.currentConfig = config;

      // Logging for debugging
      if (treatAsCustom) {
        console.log(`🔍 CUSTOM FRAME SET DEBUG:`);
        console.log('  - Frame ID:', frameName);
        console.log('  - Config ID:', config.id);
        console.log('  - Max captures:', config.maxCaptures);
        console.log('  - Slots count:', config.slots?.length);
        console.log('  - Is custom:', config.isCustom);
      } else if (frameName === 'Testframe3') {
        console.log(`🔍 ${frameName.toUpperCase()} SET FRAME DEBUG:`);
        console.log('  - isValidFrame result:', isValidFrame(frameName));
        console.log('  - getFrameConfig result:', this.currentConfig);
        console.log('  - maxCaptures:', this.currentConfig?.maxCaptures);
        console.log('  - slots count:', this.currentConfig?.slots?.length);
      }

      this.persistFrameSelection(frameName, config);

      const slotCount = Array.isArray(config?.slots) ? config.slots.length : 0;
      console.log(`✅ Frame "${frameName}" berhasil di-set dengan ${slotCount} slots`);
      return true;
    } catch (error) {
      console.error(`❌ Error setting frame "${frameName}":`, error);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  // Load frame dari localStorage (now async)
  async loadFrameFromStorage() {
    const storedFrame = safeStorage.getItem('selectedFrame');
    const storedConfig = safeStorage.getJSON('frameConfig');

    console.log('📁 Checking localStorage for frame data...');
    console.log('  - Stored frame ID:', storedFrame);
    console.log('  - Stored config exists:', !!storedConfig);
    console.log('  - Stored config ID:', storedConfig?.id);
    console.log('  - Is custom frame:', storedFrame?.startsWith('custom-'));

    if (storedConfig?.id) {
      try {
        const frameId = storedConfig.id;
        this.currentFrame = frameId;
        this.currentConfig = storedConfig;
        this.persistFrameSelection(frameId, storedConfig);
        console.log(`📁 Frame "${frameId}" loaded from cached config`);
        return true;
      } catch (error) {
        console.warn('⚠️ Cached config tidak valid, mencoba ulang lewat manager...', error);
      }
    }

    if (storedFrame) {
      try {
        if (isValidFrame(storedFrame)) {
          const success = await this.setFrame(storedFrame);
          if (success) {
            console.log(`📁 Frame "${storedFrame}" reloaded successfully`);
            return true;
          }
        } else if (isCustomFrameId(storedFrame)) {
          // For custom frames, try to use the cached config if available
          if (storedConfig?.id === storedFrame) {
            this.currentFrame = storedFrame;
            this.currentConfig = storedConfig;
            console.log(`📁 Custom frame "${storedFrame}" loaded from cached config`);
            return true;
          }
          console.warn(`⚠️ Custom frame "${storedFrame}" tidak memiliki konfigurasi tersimpan`);
        } else {
          console.warn(`⚠️ Stored frame "${storedFrame}" tidak valid lagi`);
        }
      } catch (error) {
        console.error('❌ Error loading frame from storage:', error);
      }
    }

    console.log('📁 No valid frame in storage, using default...');
    return await this.setFrame('Testframe1');
  }

  // Mendapatkan konfigurasi frame saat ini
  getCurrentConfig() {
    return this.currentConfig;
  }

  // Mendapatkan nama frame saat ini
  getCurrentFrameName() {
    return this.currentFrame;
  }

  // Mendapatkan maksimal capture untuk frame saat ini
  getMaxCaptures() {
    console.log('🔢 getMaxCaptures called');
    console.log('📊 currentConfig:', this.currentConfig);
    console.log('🔢 returning maxCaptures:', this.currentConfig ? this.currentConfig.maxCaptures : 0);
    return this.currentConfig ? this.currentConfig.maxCaptures : 0;
  }

  // Mendapatkan slots untuk frame saat ini
  getSlots() {
    return this.currentConfig ? this.currentConfig.slots : [];
  }

  // Mendapatkan path image untuk frame saat ini
  getFrameImagePath() {
    return this.currentConfig ? this.currentConfig.imagePath : null;
  }

  // Membuat array kosong untuk slot photos
  createEmptySlotPhotos() {
    const maxCaptures = this.getMaxCaptures();
    return new Array(maxCaptures).fill(null);
  }

  // Validasi apakah masih bisa capture foto
  canCaptureMore(currentSlotPhotos) {
    console.log('🔍 canCaptureMore called');
    console.log('📊 currentConfig:', this.currentConfig);
    console.log('📸 currentSlotPhotos:', currentSlotPhotos);
    
    if (!this.currentConfig) {
      console.log('❌ No currentConfig, returning false');
      return false;
    }
    
    const filledSlots = currentSlotPhotos.filter(photo => photo !== null).length;
    const maxCaptures = this.currentConfig.maxCaptures;
    const canCapture = filledSlots < maxCaptures;
    
    console.log(`📊 filledSlots: ${filledSlots}, maxCaptures: ${maxCaptures}, canCapture: ${canCapture}`);
    
    return canCapture;
  }

  // Mendapatkan index slot kosong berikutnya
  getNextEmptySlotIndex(currentSlotPhotos) {
    return currentSlotPhotos.findIndex(photo => photo === null);
  }

  // Mendapatkan progress capture
  getCaptureProgress(currentSlotPhotos) {
    const filledSlots = currentSlotPhotos.filter(photo => photo !== null).length;
    const maxCaptures = this.getMaxCaptures();
    
    return {
      current: filledSlots,
      max: maxCaptures,
      percentage: maxCaptures > 0 ? (filledSlots / maxCaptures) * 100 : 0,
      isComplete: filledSlots === maxCaptures
    };
  }

  // Clear frame data
  clearFrame() {
    this.currentFrame = null;
    this.currentConfig = null;
    safeStorage.removeItem('selectedFrame');
    safeStorage.removeItem('frameConfig');
    safeStorage.removeItem('activeDraftId');
    safeStorage.removeItem('activeDraftSignature');
    console.log('🗑️ Frame data berhasil dihapus');
  }

  // Get all available frames metadata
  async getAllFrames() {
    return getAllFrames();
  }

  // Get frame metadata without loading full config
  getFrameMetadata(frameName) {
    return getFrameMetadata(frameName);
  }

  // Check if currently loading
  isFrameLoading() {
    return this.isLoading;
  }

  // Preload frame configurations for better performance
  async preloadFrames(frameNames) {
    console.log('🚀 Preloading frames for better performance...');
    return await preloadFrameConfigs(frameNames);
  }

  // Get frame image path with new structure
  getFrameImagePath() {
    return this.currentConfig ? this.currentConfig.imagePath : null;
  }

  persistFrameSelection(frameName, config) {
    try {
      const frameIdSaved = safeStorage.setItem('selectedFrame', frameName);

      const sanitizedConfig = sanitizeFrameConfigForStorage(config);
      let configSaved = false;

      if (sanitizedConfig) {
        configSaved = safeStorage.setJSON('frameConfig', sanitizedConfig);
      }

      if (!configSaved && sanitizedConfig) {
        console.warn('⚠️ Failed to store sanitized frame config, attempting fallback without image data');
        const fallbackConfig = { ...sanitizedConfig };
        delete fallbackConfig.imagePath;
        configSaved = safeStorage.setJSON('frameConfig', fallbackConfig);
      }

      if (!frameIdSaved || !configSaved) {
        throw new Error('Failed to persist frame selection');
      }

      if (config?.metadata?.draftId) {
        safeStorage.setItem('activeDraftId', config.metadata.draftId);
      } else {
        safeStorage.removeItem('activeDraftId');
      }

      if (config?.metadata?.signature) {
        safeStorage.setItem('activeDraftSignature', config.metadata.signature);
      } else {
        safeStorage.removeItem('activeDraftSignature');
      }
    } catch (error) {
      console.error('❌ Error persisting frame selection:', error);
      throw error; // Re-throw so setFrame can catch it
    }
  }

  // Legacy compatibility method
  getFrameConfigSync(frameName) {
    console.warn('⚠️ getFrameConfigSync is deprecated. Use async methods instead.');
    return getFrameMetadata(frameName);
  }

  // Mendapatkan informasi frame untuk UI
  getFrameInfo() {
    if (!this.currentConfig) return null;
    
    return {
      name: this.currentConfig.name,
      description: this.currentConfig.description,
      maxCaptures: this.currentConfig.maxCaptures,
      slotsCount: this.currentConfig.slots.length,
      aspectRatio: this.currentConfig.layout.aspectRatio,
      orientation: this.currentConfig.layout.orientation
    };
  }

  // Generate preview slots untuk UI
  generatePreviewSlots(slotPhotos) {
    const slots = this.getSlots();
    
    return slots.map((slot, index) => ({
      ...slot,
      index,
      hasPhoto: slotPhotos[index] !== null,
      photo: slotPhotos[index],
      isEmpty: slotPhotos[index] === null
    }));
  }
}

// Export singleton instance
export const frameProvider = new FrameDataProvider();

// Export default
export default frameProvider;