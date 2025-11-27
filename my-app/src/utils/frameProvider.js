// Frame data provider - utility untuk mengelola frame configurations
import {
  getFrameConfig,
  getFrameMetadata,
  isValidFrame,
  getAllFrames,
  preloadFrameConfigs,
} from "../config/frameConfigManager.js";
import { getCustomFrameConfig, getAllCustomFrames } from "../services/customFrameService.js";
import safeStorage from "./safeStorage.js";
import userStorage from "./userStorage.js";
import { sanitizeFrameConfigForStorage } from "./frameConfigSanitizer.js";

const CUSTOM_FRAME_PREFIX = "custom-";

// Helper to detect UUID format (Supabase uses UUIDs)
const isUUID = (str) => {
  if (typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const isCustomFrameId = (frameName) => {
  if (typeof frameName !== "string") return false;
  // Custom frame can be either:
  // 1. Starts with "custom-" prefix (legacy/localStorage)
  // 2. Is a UUID (Supabase)
  return frameName.startsWith(CUSTOM_FRAME_PREFIX) || isUUID(frameName);
};

export class FrameDataProvider {
  constructor() {
    this.currentFrame = null;
    this.currentConfig = null;
    this.isLoading = false;
  }

  // Set custom frame from admin upload
  async setCustomFrame(frameData) {
    console.log(`🎨 setCustomFrame called with:`, frameData);
    console.log(`📊 Frame data keys:`, Object.keys(frameData));

    if (!frameData || !frameData.id) {
      console.error("❌ Frame data is required to set custom frame.");
      return false;
    }

    this.isLoading = true;

    try {
      // Check if frameData already has slots (full frame object from Frames.jsx)
      let config;
      
      const hasSlots = frameData.slots && Array.isArray(frameData.slots) && frameData.slots.length > 0;
      const hasImage = frameData.imagePath || frameData.thumbnailUrl;
      
      console.log(`🔍 Frame data check:`);
      console.log(`  - Has slots: ${hasSlots} (${frameData.slots?.length || 0} slots)`);
      console.log(`  - Has image: ${hasImage}`);
      
      if (hasSlots && hasImage) {
        // Frame data is complete, use it directly!
        console.log("✅ Frame data is complete, building config directly from frameData");
        
        // Build config from frameData (don't rely on localStorage)
        config = {
          id: frameData.id,
          name: frameData.name,
          description: frameData.description || "",
          maxCaptures: frameData.maxCaptures || 3,
          duplicatePhotos: frameData.duplicatePhotos || false,
          imagePath: frameData.imagePath || frameData.thumbnailUrl,
          frameImage: frameData.imagePath || frameData.thumbnailUrl,
          thumbnailUrl: frameData.thumbnailUrl || frameData.imagePath,
          slots: frameData.slots,
          designer: frameData.designer || { 
            elements: frameData.slots?.map((slot, index) => ({
              id: slot.id || `photo_${index + 1}`,
              type: "photo",
              x: slot.left * 1080,
              y: slot.top * 1920,
              width: slot.width * 1080,
              height: slot.height * 1920,
              zIndex: slot.zIndex || 2,
              data: {
                photoIndex: slot.photoIndex !== undefined ? slot.photoIndex : index,
                image: null,
                aspectRatio: slot.aspectRatio || "4:5",
              },
            })) || []
          },
          layout: frameData.layout || {
            aspectRatio: "9:16",
            orientation: "portrait",
            backgroundColor: "#ffffff",
          },
          category: frameData.category || "custom",
          // IMPORTANT: Only set isCustom if frameData explicitly has it
          // Admin frames should NOT have isCustom: true (so frameImage overlay shows)
          // User-created custom frames (from Creator) have isCustom: true
          ...(frameData.isCustom !== undefined && { isCustom: frameData.isCustom }),
        };
        
        console.log("✅ Config built successfully from frameData");
        console.log("   isCustom:", config.isCustom, "(from frameData.isCustom:", frameData.isCustom, ")");
      } else {
        // Incomplete data, try to fetch from service
        console.log("📦 Incomplete data, trying to fetch from service");
        config = await getCustomFrameConfig(frameData.id);
        
        if (!config) {
          console.error(`❌ Frame "${frameData.id}" not found in service`);
          const allFrames = await getAllCustomFrames();
          console.error(`   Available frames:`, allFrames.map(f => f.id));
          throw new Error(`Custom frame config for "${frameData.id}" not found`);
        }
        
        console.log("✅ Config retrieved from service");
      }

      this.currentFrame = frameData.id;
      this.currentConfig = config;

      console.log(`✅ Custom frame "${frameData.id}" set successfully`);
      console.log("  - Max captures:", config.maxCaptures);
      console.log("  - Slots count:", config.slots?.length);
      console.log("  - Image path:", config.imagePath ? "✓" : "✗");
      console.log("  - Designer elements:", config.designer?.elements?.length || 0);

      this.persistFrameSelection(frameData.id, config);
      return true;
    } catch (error) {
      console.error(`❌ Error setting custom frame:`, error);
      console.error(`❌ Error stack:`, error.stack);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  // Set frame yang akan digunakan (now async)
  async setFrame(frameName, options = {}) {
    console.log(`🎯 setFrame called with: ${frameName}`);

    if (!frameName) {
      console.error("Frame name is required to set frame.");
      return false;
    }

    const providedConfig = options.config;
    const treatAsCustom =
      options.isCustom ??
      providedConfig?.isCustom ??
      isCustomFrameId(frameName);

    this.isLoading = true;

    try {
      let config = providedConfig || null;

      if (!config) {
        // Try built-in frames first
        if (isValidFrame(frameName)) {
          config = await getFrameConfig(frameName);
        }
        // Try custom frames from service
        else {
          // Check if it's a custom frame from admin upload
          const customConfig = await getCustomFrameConfig(frameName);
          if (customConfig) {
            config = customConfig;
            console.log(`✅ Found custom frame: ${frameName}`);
          } else {
            // Try cached frame config
            const cachedConfig = safeStorage.getJSON("frameConfig");
            if (cachedConfig?.id === frameName) {
              config = cachedConfig;
            }
          }

          if (!config) {
            if (treatAsCustom) {
              throw new Error(
                `Custom frame "${frameName}" tidak ditemukan di storage`
              );
            }
            console.error(
              `Frame "${frameName}" tidak valid atau tidak ditemukan`
            );
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
        console.log("  - Frame ID:", frameName);
        console.log("  - Config ID:", config.id);
        console.log("  - Max captures:", config.maxCaptures);
        console.log("  - Slots count:", config.slots?.length);
        console.log("  - Is custom:", config.isCustom);
      } else if (frameName === "Testframe3") {
        console.log(`🔍 ${frameName.toUpperCase()} SET FRAME DEBUG:`);
        console.log("  - isValidFrame result:", isValidFrame(frameName));
        console.log("  - getFrameConfig result:", this.currentConfig);
        console.log("  - maxCaptures:", this.currentConfig?.maxCaptures);
        console.log("  - slots count:", this.currentConfig?.slots?.length);
      }

      this.persistFrameSelection(frameName, config);

      const slotCount = Array.isArray(config?.slots) ? config.slots.length : 0;
      console.log(
        `✅ Frame "${frameName}" berhasil di-set dengan ${slotCount} slots`
      );
      return true;
    } catch (error) {
      console.error(`❌ Error setting frame "${frameName}":`, error);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  // Load frame dari localStorage (now async with IndexedDB fallback)
  async loadFrameFromStorage() {
    const storedFrame = safeStorage.getItem("selectedFrame");
    const storedConfig = safeStorage.getJSON("frameConfig");

    console.log("📁 Checking localStorage for frame data...");
    console.log("  - Stored frame ID:", storedFrame);
    console.log("  - Stored config exists:", !!storedConfig);
    console.log("  - Stored config ID:", storedConfig?.id);
    console.log("  - Is custom frame:", storedFrame?.startsWith("custom-"));

    // If we have a complete config in localStorage, use it
    if (storedConfig?.id && storedConfig?.designer?.elements) {
      try {
        const frameId = storedConfig.id;
        this.currentFrame = frameId;
        this.currentConfig = storedConfig;
        this.persistFrameSelection(frameId, storedConfig);
        console.log(`📁 Frame "${frameId}" loaded from cached config`);
        return true;
      } catch (error) {
        console.warn("⚠️ Cached config tidak valid, mencoba ulang...", error);
      }
    }

    // If custom frame but no config, try to load from IndexedDB draft
    if (isCustomFrameId(storedFrame)) {
      const activeDraftId = userStorage.getItem("activeDraftId");

      if (activeDraftId) {
        console.log(
          "🔄 Custom frame without config, loading from IndexedDB draft:",
          activeDraftId
        );

        try {
          const { default: draftStorage } = await import("./draftStorage.js");
          const draft = await draftStorage.getDraftById(activeDraftId);

          if (draft) {
            console.log(
              "✅ Draft found in IndexedDB, rebuilding frameConfig..."
            );

            const { buildFrameConfigFromDraft } = await import(
              "./draftHelpers.js"
            );
            const frameConfig = buildFrameConfigFromDraft(draft);

            this.currentFrame = frameConfig.id;
            this.currentConfig = frameConfig;
            this.persistFrameSelection(frameConfig.id, frameConfig);

            console.log("✅ Frame config rebuilt from IndexedDB draft:", {
              id: frameConfig.id,
              hasDesignerElements: !!frameConfig.designer?.elements,
              elementsCount: frameConfig.designer?.elements?.length,
            });

            return true;
          } else {
            console.warn("⚠️ Draft not found in IndexedDB:", activeDraftId);
          }
        } catch (error) {
          console.error("❌ Failed to load draft from IndexedDB:", error);
        }
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
            console.log(
              `📁 Custom frame "${storedFrame}" loaded from cached config`
            );
            return true;
          }
          console.warn(
            `⚠️ Custom frame "${storedFrame}" tidak memiliki konfigurasi tersimpan`
          );
        } else {
          console.warn(`⚠️ Stored frame "${storedFrame}" tidak valid lagi`);
        }
      } catch (error) {
        console.error("❌ Error loading frame from storage:", error);
      }
    }

    console.log("📁 No valid frame in storage, using default...");
    return await this.setFrame("Testframe1");
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
    console.log("🔢 getMaxCaptures called");
    console.log("📊 currentConfig:", this.currentConfig);
    console.log(
      "🔢 returning maxCaptures:",
      this.currentConfig ? this.currentConfig.maxCaptures : 0
    );
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
    console.log("🔍 canCaptureMore called");
    console.log("📊 currentConfig:", this.currentConfig);
    console.log("📸 currentSlotPhotos:", currentSlotPhotos);

    if (!this.currentConfig) {
      console.log("❌ No currentConfig, returning false");
      return false;
    }

    const filledSlots = currentSlotPhotos.filter(
      (photo) => photo !== null
    ).length;
    const maxCaptures = this.currentConfig.maxCaptures;
    const canCapture = filledSlots < maxCaptures;

    console.log(
      `📊 filledSlots: ${filledSlots}, maxCaptures: ${maxCaptures}, canCapture: ${canCapture}`
    );

    return canCapture;
  }

  // Mendapatkan index slot kosong berikutnya
  getNextEmptySlotIndex(currentSlotPhotos) {
    return currentSlotPhotos.findIndex((photo) => photo === null);
  }

  // Mendapatkan progress capture
  getCaptureProgress(currentSlotPhotos) {
    const filledSlots = currentSlotPhotos.filter(
      (photo) => photo !== null
    ).length;
    const maxCaptures = this.getMaxCaptures();

    return {
      current: filledSlots,
      max: maxCaptures,
      percentage: maxCaptures > 0 ? (filledSlots / maxCaptures) * 100 : 0,
      isComplete: filledSlots === maxCaptures,
    };
  }

  // Clear frame data
  clearFrame() {
    this.currentFrame = null;
    this.currentConfig = null;
    safeStorage.removeItem("selectedFrame");
    safeStorage.removeItem("frameConfig");
    userStorage.removeItem("activeDraftId");
    userStorage.removeItem("activeDraftSignature");
    console.log("🗑️ Frame data berhasil dihapus");
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
    console.log("🚀 Preloading frames for better performance...");
    return await preloadFrameConfigs(frameNames);
  }

  // Get frame image path with new structure
  getFrameImagePath() {
    return this.currentConfig ? this.currentConfig.imagePath : null;
  }

  persistFrameSelection(frameName, config) {
    try {
      const frameIdSaved = safeStorage.setItem("selectedFrame", frameName);

      // Add timestamp to detect stale frameConfig
      const configWithTimestamp = {
        ...config,
        __timestamp: Date.now(),
        __selectedAt: new Date().toISOString(),
      };

      // Check if it's a custom frame - either by isCustom flag OR prefix OR category
      const isCustomFrame = config.isCustom || 
                           frameName?.startsWith("custom-") || 
                           config.category === "custom";
      
      console.log("🔍 [persistFrameSelection] Checking frame type:");
      console.log("  - frameName:", frameName);
      console.log("  - config.isCustom:", config.isCustom);
      console.log("  - config.category:", config.category);
      console.log("  - isCustomFrame:", isCustomFrame);

      // For custom frames, try to save WITHOUT sanitizing first (to preserve all data)
      let configSaved = false;

      if (isCustomFrame) {
        console.log(
          "💾 [persistFrameSelection] Attempting to save FULL custom frame config..."
        );
        console.log(
          "  - Has designer.elements:",
          !!configWithTimestamp.designer?.elements
        );
        console.log(
          "  - Elements count:",
          configWithTimestamp.designer?.elements?.length
        );
        console.log("  - Has frameImage:", !!configWithTimestamp.frameImage);
        console.log("  - Has imagePath:", !!configWithTimestamp.imagePath);

        try {
          configSaved = safeStorage.setJSON("frameConfig", configWithTimestamp);
          if (configSaved) {
            console.log(
              "✅ [persistFrameSelection] Full custom frame config saved successfully"
            );
          }
        } catch (error) {
          console.warn(
            "⚠️ [persistFrameSelection] Full config too large for localStorage:",
            error.message
          );
          // Will try sanitized version below
        }
      }

      // If not saved yet (not custom OR custom but too large), try sanitized version
      if (!configSaved) {
        console.log(
          "💾 [persistFrameSelection] Saving sanitized frame config..."
        );
        const sanitizedConfig =
          sanitizeFrameConfigForStorage(configWithTimestamp);

        if (sanitizedConfig) {
          configSaved = safeStorage.setJSON("frameConfig", sanitizedConfig);
        }

        if (!configSaved && sanitizedConfig) {
          console.warn(
            "⚠️ Failed to store sanitized frame config, attempting fallback without image data"
          );
          const fallbackConfig = { ...sanitizedConfig };
          delete fallbackConfig.imagePath;
          delete fallbackConfig.frameImage;
          delete fallbackConfig.thumbnailUrl;
          configSaved = safeStorage.setJSON("frameConfig", fallbackConfig);
        }
        
        // Ultimate fallback - save minimal config
        if (!configSaved) {
          console.warn("⚠️ Saving minimal config as last resort...");
          const minimalConfig = {
            id: config.id,
            name: config.name,
            maxCaptures: config.maxCaptures,
            slots: config.slots,
            isCustom: true,
            __timestamp: Date.now(),
          };
          configSaved = safeStorage.setJSON("frameConfig", minimalConfig);
        }
      }

      if (!frameIdSaved) {
        throw new Error("Failed to save frame ID to localStorage");
      }
      
      // For custom frames, we can proceed even without full config in storage
      // because the frame data is also in custom_frames storage
      if (!configSaved && !isCustomFrame) {
        throw new Error("Failed to persist frame selection");
      }
      
      if (!configSaved) {
        console.warn("⚠️ Config not fully saved, but proceeding since frame is in custom_frames storage");
      }

      // Save timestamp for validation
      safeStorage.setItem(
        "frameConfigTimestamp",
        String(configWithTimestamp.__timestamp)
      );

      if (config?.metadata?.draftId) {
        userStorage.setItem("activeDraftId", config.metadata.draftId);
      } else {
        userStorage.removeItem("activeDraftId");
      }

      if (config?.metadata?.signature) {
        userStorage.setItem("activeDraftSignature", config.metadata.signature);
      } else {
        userStorage.removeItem("activeDraftSignature");
      }

      console.log(
        "✅ Frame selection persisted with timestamp:",
        configWithTimestamp.__timestamp
      );
    } catch (error) {
      console.error("❌ Error persisting frame selection:", error);
      throw error; // Re-throw so setFrame can catch it
    }
  }

  // Legacy compatibility method
  getFrameConfigSync(frameName) {
    console.warn(
      "⚠️ getFrameConfigSync is deprecated. Use async methods instead."
    );
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
      orientation: this.currentConfig.layout.orientation,
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
      isEmpty: slotPhotos[index] === null,
    }));
  }
}

// Export singleton instance
export const frameProvider = new FrameDataProvider();

// Export default
export default frameProvider;
