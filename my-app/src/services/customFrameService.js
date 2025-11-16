// Service untuk mengelola custom frames yang diupload oleh admin
import { isFirebaseConfigured } from "../config/firebase";

const STORAGE_KEY = "custom_frames";

/**
 * Get all custom frames (approved only untuk user, semua untuk admin)
 */
export const getAllCustomFrames = (includeAll = false) => {
  try {
    const frames = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    if (includeAll) {
      return frames; // Return all untuk admin
    }

    // Return only approved untuk user
    return frames.filter((frame) => frame.status === "APPROVED");
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
    const frames = getAllCustomFrames(true);
    return frames.find((frame) => frame.id === frameId);
  } catch (error) {
    console.error("Error getting custom frame:", error);
    return null;
  }
};

/**
 * Save new custom frame
 */
export const saveCustomFrame = async (frameData, imageFile) => {
  try {
    const frames = getAllCustomFrames(true);

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
      status: "APPROVED", // Auto approve untuk admin upload
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
    const frames = getAllCustomFrames(true);
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
    const frames = getAllCustomFrames(true);
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
    const frames = getAllCustomFrames(true);
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

  return {
    id: frame.id,
    name: frame.name,
    description: frame.description,
    maxCaptures: frame.maxCaptures,
    duplicatePhotos: frame.duplicatePhotos || false,
    imagePath: frame.imagePath,
    slots: frame.slots,
    layout: frame.layout || {
      aspectRatio: "9:16",
      orientation: "portrait",
      backgroundColor: "#ffffff",
    },
    category: frame.category,
    isCustom: true,
  };
};

export default {
  getAllCustomFrames,
  getCustomFrameById,
  saveCustomFrame,
  updateCustomFrame,
  deleteCustomFrame,
  incrementFrameStats,
  getCustomFrameConfig,
};
