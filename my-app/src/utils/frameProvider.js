// Frame data provider - utility untuk mengelola frame configurations
import { FRAME_CONFIGS, getFrameConfig, isValidFrame } from '../config/frameConfigs.js';

export class FrameDataProvider {
  constructor() {
    this.currentFrame = null;
    this.currentConfig = null;
  }

  // Set frame yang akan digunakan
  setFrame(frameName) {
    console.log(`🎯 setFrame called with: ${frameName}`);
    
    if (!isValidFrame(frameName)) {
      console.error(`Frame "${frameName}" tidak valid atau tidak ditemukan`);
      return false;
    }

    this.currentFrame = frameName;
    this.currentConfig = getFrameConfig(frameName);
    
    // Special logging for Testframe3 and Testframe4
    if (frameName === 'Testframe3' || frameName === 'Testframe4') {
      console.log(`🔍 ${frameName.toUpperCase()} SET FRAME DEBUG:`);
      console.log('  - isValidFrame result:', isValidFrame(frameName));
      console.log('  - getFrameConfig result:', this.currentConfig);
      console.log('  - maxCaptures:', this.currentConfig?.maxCaptures);
      console.log('  - slots count:', this.currentConfig?.slots?.length);
    }
    
    // Simpan ke localStorage untuk persistence
    localStorage.setItem('selectedFrame', frameName);
    localStorage.setItem('frameConfig', JSON.stringify(this.currentConfig));
    
    console.log(`✅ Frame "${frameName}" berhasil di-set dengan ${this.currentConfig.maxCaptures} slots`);
    return true;
  }

  // Load frame dari localStorage
  loadFrameFromStorage() {
    const storedFrame = localStorage.getItem('selectedFrame');
    const storedConfig = localStorage.getItem('frameConfig');
    const storedSlots = localStorage.getItem('frameSlots');

    console.log('📁 Checking localStorage for frame data...');
    console.log('Stored frame:', storedFrame);
    console.log('Stored config:', storedConfig);
    console.log('Stored slots:', storedSlots);

    // Try new format first (frameConfig)
    if (storedFrame && storedConfig) {
      try {
        this.currentFrame = storedFrame;
        this.currentConfig = JSON.parse(storedConfig);
        
        // Validasi ulang untuk memastikan config masih valid
        if (!isValidFrame(storedFrame)) {
          throw new Error('Stored frame tidak valid');
        }
        
        console.log(`📁 Frame "${storedFrame}" berhasil dimuat dari frameConfig`);
        return true;
      } catch (error) {
        console.error('Error loading frame dari frameConfig:', error);
      }
    }

    // Fallback: Try old format (selectedFrame + frameSlots)
    if (storedFrame && storedSlots) {
      try {
        // Map old frame names to new format
        let frameName = storedFrame;
        if (storedFrame.includes('Testframe1')) frameName = 'Testframe1';
        else if (storedFrame.includes('Testframe2')) frameName = 'Testframe2';  
        else if (storedFrame.includes('Testframe3')) frameName = 'Testframe3';
        
        if (isValidFrame(frameName)) {
          this.currentFrame = frameName;
          this.currentConfig = getFrameConfig(frameName);
          
          // Update localStorage with new format
          localStorage.setItem('selectedFrame', frameName);
          localStorage.setItem('frameConfig', JSON.stringify(this.currentConfig));
          
          console.log(`📁 Frame "${frameName}" berhasil dimuat dari legacy format dan diupdate`);
          return true;
        }
      } catch (error) {
        console.error('Error loading frame dari legacy format:', error);
      }
    }
    
    console.log('⚠️ No valid frame found in localStorage');
    this.clearFrame();
    return false;
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
    localStorage.removeItem('selectedFrame');
    localStorage.removeItem('frameConfig');
    console.log('🗑️ Frame data berhasil dihapus');
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