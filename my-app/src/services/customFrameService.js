// Service untuk mengelola custom frames yang diupload oleh admin
import { isFirebaseConfigured } from "../config/firebase";

const STORAGE_KEY = "custom_frames";

/**
 * Get all custom frames (semua frame langsung approved oleh admin)
 */
export const getAllCustomFrames = () => {
  try {
    const frames = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return frames;
  } catch (error) {
    console.error("Error getting custom frames:", error);
    return [];
  }
};

/**
 * Get custom frame by ID
 */
export const getCustomFrameById = (frameId) => {
  try {
    const frames = getAllCustomFrames();
    return frames.find((frame) => frame.id === frameId);
  } catch (error) {
    console.error("Error getting custom frame:", error);
    return null;
  }
};

/**
 * Save new custom frame (langsung tersedia untuk user)
 */
export const saveCustomFrame = async (frameData, imageFile) => {
  try {
    const frames = getAllCustomFrames();

    // Check if frame ID already exists
    if (frames.some((f) => f.id === frameData.id)) {
      throw new Error("Frame ID sudah digunakan");
    }

    // Convert image to base64 for localStorage
    const imageBase64 = await fileToBase64(imageFile);

    const newFrame = {
      ...frameData,
      imagePath: imageBase64,
      thumbnailUrl: imageBase64,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 0,
      uses: 0,
      likes: 0,
      category: frameData.category || "custom",
    };

    frames.push(newFrame);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(frames));

    return { success: true, frameId: newFrame.id };
  } catch (error) {
    console.error("Error saving custom frame:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Update custom frame
 */
export const updateCustomFrame = async (frameId, updates, imageFile = null) => {
  try {
    const frames = getAllCustomFrames();
    const index = frames.findIndex((f) => f.id === frameId);

    if (index === -1) {
      throw new Error("Frame tidak ditemukan");
    }

    let imageBase64 = frames[index].imagePath;

    if (imageFile) {
      imageBase64 = await fileToBase64(imageFile);
    }

    frames[index] = {
      ...frames[index],
      ...updates,
      imagePath: imageBase64,
      thumbnailUrl: imageBase64,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(frames));

    return { success: true };
  } catch (error) {
    console.error("Error updating custom frame:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Delete custom frame
 */
export const deleteCustomFrame = (frameId) => {
  try {
    const frames = getAllCustomFrames();
    const filtered = frames.filter((f) => f.id !== frameId);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    return { success: true };
  } catch (error) {
    console.error("Error deleting custom frame:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Increment frame usage stats
 */
export const incrementFrameStats = (frameId, stat = "uses") => {
  try {
    const frames = getAllCustomFrames();
    const index = frames.findIndex((f) => f.id === frameId);

    if (index === -1) return;

    frames[index][stat] = (frames[index][stat] || 0) + 1;
    frames[index].updatedAt = new Date().toISOString();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(frames));
  } catch (error) {
    console.error("Error updating frame stats:", error);
  }
};

/**
 * Convert file to base64
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Get custom frame config compatible with frameProvider
 */
export const getCustomFrameConfig = (frameId) => {
  const frame = getCustomFrameById(frameId);

  if (!frame) return null;

  // Canvas size (standard for frames)
  const CANVAS_WIDTH = 1080;
  const CANVAS_HEIGHT = 1920;

  // Build designer.elements from slots for EditPhoto compatibility
  // Convert percentage/ratio (0-1) to pixel values
  const designerElements =
    frame.slots?.map((slot, index) => ({
      id: slot.id || `photo_${index + 1}`,
      type: "photo",
      x: slot.left * CANVAS_WIDTH, // Convert ratio to pixels
      y: slot.top * CANVAS_HEIGHT, // Convert ratio to pixels
      width: slot.width * CANVAS_WIDTH, // Convert ratio to pixels
      height: slot.height * CANVAS_HEIGHT, // Convert ratio to pixels
      zIndex: slot.zIndex || 2,
      data: {
        photoIndex: slot.photoIndex !== undefined ? slot.photoIndex : index,
        image: null,
        aspectRatio: slot.aspectRatio || "4:5",
      },
    })) || [];

  return {
    id: frame.id,
    name: frame.name,
    description: frame.description,
    maxCaptures: frame.maxCaptures,
    duplicatePhotos: frame.duplicatePhotos || false,
    imagePath: frame.imagePath,
    frameImage: frame.imagePath, // Add frameImage for EditPhoto compatibility
    thumbnailUrl: frame.imagePath, // Add thumbnailUrl for frame list
    slots: frame.slots,
    designer: {
      elements: designerElements,
    },
    layout: frame.layout || {
      aspectRatio: "9:16",
      orientation: "portrait",
      backgroundColor: "#ffffff",
    },
    category: frame.category,
    isCustom: true,
  };
};

/**
 * Add custom frame directly (untuk testing/development)
 */
export const addCustomFrame = (frameData) => {
  try {
    const frames = getAllCustomFrames();

    // Check if frame ID already exists
    if (frames.some((f) => f.id === frameData.id)) {
      console.warn(`Frame ${frameData.id} sudah ada, akan di-update`);
      const filtered = frames.filter((f) => f.id !== frameData.id);
      filtered.push(frameData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } else {
      frames.push(frameData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(frames));
    }

    return { success: true, frameId: frameData.id };
  } catch (error) {
    console.error("Error adding custom frame:", error);
    return { success: false, message: error.message };
  }
};

export default {
  getAllCustomFrames,
  getCustomFrameById,
  saveCustomFrame,
  updateCustomFrame,
  deleteCustomFrame,
  incrementFrameStats,
  getCustomFrameConfig,
  addCustomFrame,
};
