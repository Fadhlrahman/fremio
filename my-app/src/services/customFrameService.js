// Frame Service - Smart routing between Supabase (preferred) and Firebase
// Automatically uses Supabase if configured, falls back to Firebase

import { isSupabaseConfigured } from "../config/supabase";
import * as supabaseFrameService from "./supabaseFrameService.js";

// Dynamic import Firebase only if needed
let db, storage, isFirebaseConfigured;
let collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp;
let ref, uploadBytes, getDownloadURL, deleteObject;

const initFirebase = async () => {
  try {
    const firebaseConfig = await import("../config/firebase");
    db = firebaseConfig.db;
    storage = firebaseConfig.storage;
    isFirebaseConfigured = firebaseConfig.isFirebaseConfigured;
    
    const firestore = await import("firebase/firestore");
    collection = firestore.collection;
    doc = firestore.doc;
    getDocs = firestore.getDocs;
    getDoc = firestore.getDoc;
    addDoc = firestore.addDoc;
    updateDoc = firestore.updateDoc;
    deleteDoc = firestore.deleteDoc;
    query = firestore.query;
    orderBy = firestore.orderBy;
    serverTimestamp = firestore.serverTimestamp;
    
    const storageImport = await import("firebase/storage");
    ref = storageImport.ref;
    uploadBytes = storageImport.uploadBytes;
    getDownloadURL = storageImport.getDownloadURL;
    deleteObject = storageImport.deleteObject;
    
    return true;
  } catch (e) {
    console.log('Firebase not available');
    isFirebaseConfigured = false;
    return false;
  }
};

// Initialize Firebase only if Supabase is not configured
if (!isSupabaseConfigured) {
  initFirebase();
}

console.log('🔧 CustomFrameService: Using', isSupabaseConfigured ? 'Supabase' : 'Firebase');

const COLLECTION_NAME = "custom_frames";

// Helper: Convert file to base64 with compression
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        // Compress to smaller size for Firestore (max 1MB document)
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 540;  // Half of 1080
        const MAX_HEIGHT = 960; // Half of 1920
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = width * ratio;
          height = height * ratio;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG for smaller size
        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        resolve(base64);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

// Helper: Compress image before upload
const compressImage = (file, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1080;
        const MAX_HEIGHT = 1920;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = width * ratio;
          height = height * ratio;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Compress failed"))),
          "image/png",
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

// Get all custom frames - Use Supabase first, fallback to Firebase
export const getAllCustomFrames = async () => {
  // Prefer Supabase
  if (isSupabaseConfigured) {
    console.log("📊 Using Supabase for getAllCustomFrames");
    return supabaseFrameService.getAllCustomFrames();
  }
  
  // Fallback to Firebase
  if (!isFirebaseConfigured || !db) {
    console.warn("No database configured");
    return [];
  }
  try {
    console.log("Loading frames from Firebase...");
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const frames = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log("Loaded", frames.length, "frames from Firebase");
    return frames;
  } catch (error) {
    console.error("Error loading frames:", error);
    return [];
  }
};

// Get single frame by ID - Use Supabase first
export const getCustomFrameById = async (frameId) => {
  // Prefer Supabase
  if (isSupabaseConfigured) {
    return supabaseFrameService.getCustomFrameById(frameId);
  }
  
  // Fallback to Firebase
  if (!isFirebaseConfigured || !db) return null;
  try {
    const docSnap = await getDoc(doc(db, COLLECTION_NAME, frameId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error("Error getting frame:", error);
    return null;
  }
};

// Save new custom frame - Use Supabase first
export const saveCustomFrame = async (frameData, imageFile) => {
  console.log("🔥 saveCustomFrame called");
  console.log("📊 isSupabaseConfigured:", isSupabaseConfigured);
  console.log("📊 isFirebaseConfigured:", isFirebaseConfigured);
  
  // Prefer Supabase
  if (isSupabaseConfigured) {
    console.log("� Using Supabase to save frame...");
    return supabaseFrameService.saveCustomFrame(frameData, imageFile);
  }
  
  // Fallback to Firebase
  if (!isFirebaseConfigured || !db) {
    console.error("❌ No database configured");
    return { success: false, message: "Database tidak dikonfigurasi. Pastikan Supabase atau Firebase sudah disetup." };
  }
  
  try {
    console.log("💾 Saving frame to Firebase...", frameData.name);

    if (!frameData.slots || frameData.slots.length === 0) {
      throw new Error("Frame harus memiliki minimal 1 slot foto.");
    }

    let imageUrl = "";
    
    // Try Firebase Storage first, fallback to base64 in Firestore
    if (storage && imageFile) {
      try {
        console.log("🖼️ Compressing image...");
        const blob = await compressImage(imageFile);
        console.log("✅ Image compressed, size:", blob.size, "bytes");
        
        const fileName = "frames/" + Date.now() + "_" + frameData.name.replace(/\s+/g, "_") + ".png";
        console.log("📁 Uploading to Firebase Storage:", fileName);
        
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, blob);
        imageUrl = await getDownloadURL(storageRef);
        console.log("✅ Uploaded to Firebase Storage!");
      } catch (storageError) {
        console.warn("⚠️ Firebase Storage failed, using base64 fallback:", storageError.message);
        // Fallback: Convert image to base64 and store in Firestore
        imageUrl = await fileToBase64(imageFile);
        console.log("✅ Converted to base64, length:", imageUrl.length);
      }
    } else if (imageFile) {
      // No storage available, use base64
      console.log("� No Firebase Storage, using base64...");
      imageUrl = await fileToBase64(imageFile);
    }

    // Create frame document
    const frameDoc = {
      name: frameData.name,
      description: frameData.description || "",
      category: frameData.category || "custom",
      maxCaptures: parseInt(frameData.maxCaptures) || 3,
      duplicatePhotos: frameData.duplicatePhotos || false,
      slots: frameData.slots,
      layout: frameData.layout || {
        aspectRatio: "9:16",
        orientation: "portrait",
        backgroundColor: "#ffffff",
      },
      imagePath: imageUrl,
      thumbnailUrl: imageUrl,
      createdBy: frameData.createdBy || "admin",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      views: 0,
      uses: 0,
      likes: 0,
    };

    console.log("📝 Saving to Firestore...");
    const docRef = await addDoc(collection(db, COLLECTION_NAME), frameDoc);
    console.log("✅ Frame saved with ID:", docRef.id);
    return { success: true, frameId: docRef.id };
  } catch (error) {
    console.error("❌ Error saving frame:", error);
    return { success: false, message: error.message };
  }
};

// Update existing frame - Use Supabase first
export const updateCustomFrame = async (frameId, updates, imageFile = null) => {
  // Prefer Supabase
  if (isSupabaseConfigured) {
    return supabaseFrameService.updateCustomFrame(frameId, updates, imageFile);
  }
  
  // Fallback to Firebase
  if (!isFirebaseConfigured || !db) {
    return { success: false, message: "Database tidak dikonfigurasi" };
  }
  try {
    const updateData = { ...updates, updatedAt: serverTimestamp() };

    if (imageFile && storage) {
      const blob = await compressImage(imageFile);
      const fileName = "frames/" + Date.now() + "_" + frameId + ".png";
      await uploadBytes(ref(storage, fileName), blob);
      updateData.imagePath = await getDownloadURL(ref(storage, fileName));
      updateData.thumbnailUrl = updateData.imagePath;
      updateData.storagePath = fileName;
    }

    await updateDoc(doc(db, COLLECTION_NAME, frameId), updateData);
    return { success: true };
  } catch (error) {
    console.error("Error updating frame:", error);
    return { success: false, message: error.message };
  }
};

// Delete frame - Use Supabase first
export const deleteCustomFrame = async (frameId) => {
  // Prefer Supabase
  if (isSupabaseConfigured) {
    return supabaseFrameService.deleteCustomFrame(frameId);
  }
  
  // Fallback to Firebase
  if (!isFirebaseConfigured || !db) {
    return { success: false, message: "Database tidak dikonfigurasi" };
  }
  try {
    // Get frame to delete storage file
    const frame = await getCustomFrameById(frameId);
    if (frame && frame.storagePath && storage) {
      try {
        await deleteObject(ref(storage, frame.storagePath));
      } catch (e) {
        console.warn("Could not delete storage file:", e);
      }
    }

    await deleteDoc(doc(db, COLLECTION_NAME, frameId));
    console.log("Frame deleted:", frameId);
    return { success: true };
  } catch (error) {
    console.error("Error deleting frame:", error);
    return { success: false, message: error.message };
  }
};

// Increment frame stats - Use Supabase first
export const incrementFrameStats = async (frameId, stat = "uses") => {
  // Prefer Supabase
  if (isSupabaseConfigured) {
    return supabaseFrameService.incrementFrameStats(frameId, stat);
  }
  
  // Fallback to Firebase
  if (!isFirebaseConfigured || !db) return;
  try {
    const frame = await getCustomFrameById(frameId);
    if (frame) {
      await updateDoc(doc(db, COLLECTION_NAME, frameId), {
        [stat]: (frame[stat] || 0) + 1,
      });
    }
  } catch (e) {
    console.error("Error incrementing stats:", e);
  }
};

// Get frame config for EditPhoto - Use Supabase first
export const getCustomFrameConfig = async (frameId) => {
  // Prefer Supabase
  if (isSupabaseConfigured) {
    return supabaseFrameService.getCustomFrameConfig(frameId);
  }
  
  // Fallback to Firebase
  const frame = await getCustomFrameById(frameId);
  if (!frame) return null;

  const W = 1080;
  const H = 1920;

  return {
    id: frame.id,
    name: frame.name,
    description: frame.description,
    maxCaptures: frame.maxCaptures,
    duplicatePhotos: frame.duplicatePhotos || false,
    imagePath: frame.imagePath,
    frameImage: frame.imagePath,
    thumbnailUrl: frame.thumbnailUrl,
    slots: frame.slots,
    designer: {
      elements: (frame.slots || []).map((s, i) => ({
        id: s.id || "photo_" + (i + 1),
        type: "photo",
        x: s.left * W,
        y: s.top * H,
        width: s.width * W,
        height: s.height * H,
        zIndex: s.zIndex || 2,
        data: {
          photoIndex: s.photoIndex !== undefined ? s.photoIndex : i,
          image: null,
          aspectRatio: s.aspectRatio || "4:5",
        },
      })),
    },
    layout: frame.layout || {
      aspectRatio: "9:16",
      orientation: "portrait",
      backgroundColor: "#ffffff",
    },
    category: frame.category,
    // IMPORTANT: Admin frames should NOT have isCustom: true
    // This allows the frameImage overlay to be displayed in EditPhoto
    // Only user-created frames (from Creator page) should have isCustom: true
    isCustom: frame.isCustom || false,
  };
};

// Clear all custom frames - Use Supabase first
export const clearAllCustomFrames = async () => {
  // Prefer Supabase
  if (isSupabaseConfigured) {
    return supabaseFrameService.clearAllCustomFrames();
  }
  
  // Fallback to Firebase
  if (!isFirebaseConfigured || !db) {
    return { success: false };
  }
  try {
    const frames = await getAllCustomFrames();
    for (const f of frames) {
      await deleteCustomFrame(f.id);
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
};

// Storage info (for compatibility)
export const getStorageInfo = () => {
  if (isSupabaseConfigured) {
    return supabaseFrameService.getStorageInfo();
  }
  return {
    totalMB: "Cloud",
    framesMB: "Cloud",
    availableMB: "Unlimited",
    isNearLimit: false,
    isFull: false,
    isFirebase: true,
  };
};

// Alias for backward compatibility
export const addCustomFrame = async (frameData) => saveCustomFrame(frameData, null);

export default {
  getAllCustomFrames,
  getCustomFrameById,
  saveCustomFrame,
  updateCustomFrame,
  deleteCustomFrame,
  incrementFrameStats,
  getCustomFrameConfig,
  addCustomFrame,
  clearAllCustomFrames,
  getStorageInfo,
};
