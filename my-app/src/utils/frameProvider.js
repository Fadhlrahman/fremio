// Frame data provider - utility untuk mengelola frame configurations
import { 
  getFrameConfig, 
  getFrameMetadata, 
  isValidFrame, 
  getAllFrames,
  preloadFrameConfigs
} from '../config/frameConfigManager.js';
import safeStorage from './safeStorage.js';

export class FrameDataProvider {
  constructor() {
    this.currentFrame = null;
    this.currentConfig = null;
    this.isLoading = false;
  }

  // Set frame yang akan digunakan (now async)
  async setFrame(frameName) {
    console.log(`🎯 setFrame called with: ${frameName}`);
    
    if (!isValidFrame(frameName)) {
      console.error(`Frame "${frameName}" tidak valid atau tidak ditemukan`);
      return false;
    }

    this.isLoading = true;
    
    try {
      // Load frame configuration dynamically
      this.currentConfig = await getFrameConfig(frameName);
      
      if (!this.currentConfig) {
        console.error(`Failed to load configuration for frame "${frameName}"`);
        this.isLoading = false;
        return false;
      }

      this.currentFrame = frameName;
      
      // Special logging for debugging
      if (frameName === 'Testframe3') {
        console.log(`🔍 ${frameName.toUpperCase()} SET FRAME DEBUG:`);
        console.log('  - isValidFrame result:', isValidFrame(frameName));
        console.log('  - getFrameConfig result:', this.currentConfig);
        console.log('  - maxCaptures:', this.currentConfig?.maxCaptures);
        console.log('  - slots count:', this.currentConfig?.slots?.length);
      }
      
      // Simpan ke localStorage untuk persistence
      safeStorage.setItem('selectedFrame', frameName);
      safeStorage.setJSON('frameConfig', this.currentConfig);
      
      console.log(`✅ Frame "${frameName}" berhasil di-set dengan ${this.currentConfig.maxCaptures} slots`);
      this.isLoading = false;
      return true;
    } catch (error) {
      console.error(`❌ Error setting frame "${frameName}":`, error);
      this.isLoading = false;
      return false;
    }
  }

  // Load frame dari localStorage (now async)
  async loadFrameFromStorage() {
    const storedFrame = safeStorage.getItem('selectedFrame');
    const storedConfig = safeStorage.getJSON('frameConfig');

    console.log('📁 Checking localStorage for frame data...');
    console.log('Stored frame:', storedFrame);
    console.log('Stored config:', storedConfig ? 'Found' : 'Not found');

    // Try loading from stored frame name
    if (storedFrame) {
      try {
        // Validate frame exists
        if (!isValidFrame(storedFrame)) {
          console.warn(`⚠️ Stored frame "${storedFrame}" is no longer valid`);
          return false;
        }

        // Try to use stored config first
        if (storedConfig) {
          try {
            this.currentFrame = storedFrame;
            this.currentConfig = storedConfig;
            console.log(`📁 Frame "${storedFrame}" loaded from cached config`);
            return true;
          } catch (error) {
            console.warn('⚠️ Cached config is corrupted, reloading...');
          }
        }

        // Reload configuration dynamically
        console.log(`🔄 Reloading frame "${storedFrame}" configuration...`);
        const success = await this.setFrame(storedFrame);
        
        if (success) {
          console.log(`📁 Frame "${storedFrame}" reloaded successfully`);
          return true;
        }
        
      } catch (error) {
        console.error('❌ Error loading frame from storage:', error);
      }
    }

    // No valid frame found, use default
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