// IndexedDB Storage untuk frames - bisa simpan hingga ratusan MB
const DB_NAME = 'fremio_frames_db';
const DB_VERSION = 1;
const STORE_NAME = 'custom_frames';

let dbInstance = null;

/**
 * Open IndexedDB connection
 */
const openDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('✅ IndexedDB opened successfully');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create frames store if not exists
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('category', 'category', { unique: false });
        console.log('✅ IndexedDB store created');
      }
    };
  });
};

/**
 * Get all frames from IndexedDB
 */
export const getAllFramesFromDB = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        console.log('📦 Retrieved', request.result.length, 'frames from IndexedDB');
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('Failed to get frames:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('getAllFramesFromDB error:', error);
    return [];
  }
};

/**
 * Get single frame by ID
 */
export const getFrameByIdFromDB = async (frameId) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(frameId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('Failed to get frame:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('getFrameByIdFromDB error:', error);
    return null;
  }
};

/**
 * Save frame to IndexedDB
 */
export const saveFrameToDB = async (frame) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(frame);

      request.onsuccess = () => {
        console.log('✅ Frame saved to IndexedDB:', frame.id);
        resolve({ success: true, frameId: frame.id });
      };

      request.onerror = () => {
        console.error('Failed to save frame:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('saveFrameToDB error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Delete frame from IndexedDB
 */
export const deleteFrameFromDB = async (frameId) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(frameId);

      request.onsuccess = () => {
        console.log('✅ Frame deleted from IndexedDB:', frameId);
        resolve({ success: true });
      };

      request.onerror = () => {
        console.error('Failed to delete frame:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('deleteFrameFromDB error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Clear all frames from IndexedDB
 */
export const clearAllFramesFromDB = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('✅ All frames cleared from IndexedDB');
        resolve({ success: true });
      };

      request.onerror = () => {
        console.error('Failed to clear frames:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('clearAllFramesFromDB error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get storage usage estimate
 */
export const getStorageEstimate = async () => {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usedMB = (estimate.usage / 1024 / 1024).toFixed(2);
      const quotaMB = (estimate.quota / 1024 / 1024).toFixed(2);
      const percentUsed = ((estimate.usage / estimate.quota) * 100).toFixed(1);
      
      return {
        usedMB,
        quotaMB,
        percentUsed,
        availableMB: (quotaMB - usedMB).toFixed(2)
      };
    }
    return { usedMB: '?', quotaMB: '?', percentUsed: '?', availableMB: '?' };
  } catch (error) {
    console.error('getStorageEstimate error:', error);
    return { usedMB: '?', quotaMB: '?', percentUsed: '?', availableMB: '?' };
  }
};

/**
 * Migrate frames from localStorage to IndexedDB
 */
export const migrateFromLocalStorage = async () => {
  try {
    const localFrames = JSON.parse(localStorage.getItem('custom_frames') || '[]');
    
    if (localFrames.length === 0) {
      console.log('ℹ️ No frames to migrate from localStorage');
      return { migrated: 0 };
    }

    console.log(`🔄 Migrating ${localFrames.length} frames from localStorage to IndexedDB...`);
    
    let migrated = 0;
    for (const frame of localFrames) {
      await saveFrameToDB(frame);
      migrated++;
    }

    // Clear localStorage after successful migration
    localStorage.removeItem('custom_frames');
    console.log(`✅ Migration complete! ${migrated} frames moved to IndexedDB`);
    
    return { migrated };
  } catch (error) {
    console.error('Migration error:', error);
    return { migrated: 0, error: error.message };
  }
};

export default {
  getAllFramesFromDB,
  getFrameByIdFromDB,
  saveFrameToDB,
  deleteFrameFromDB,
  clearAllFramesFromDB,
  getStorageEstimate,
  migrateFromLocalStorage
};
