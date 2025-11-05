/**
 * IndexedDB Storage Wrapper
 * Provides larger storage capacity (50MB+) compared to localStorage (5-10MB)
 * Used for storing large data like drafts with background photos
 */

const DB_NAME = 'fremio-storage';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

let dbInstance = null;

/**
 * Initialize IndexedDB connection
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('❌ IndexedDB failed to open:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('✅ IndexedDB initialized successfully');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        console.log('✅ IndexedDB object store created');
      }
    };
  });
};

/**
 * Get all drafts from IndexedDB
 */
export const getAllDrafts = async () => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        const drafts = request.result || [];
        console.log('📦 IndexedDB: Loaded drafts:', drafts.length);
        resolve(drafts);
      };

      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to get drafts:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ IndexedDB: getAllDrafts failed:', error);
    return [];
  }
};

/**
 * Get a single draft by ID
 */
export const getDraft = async (id) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.get(id);

      request.onsuccess = () => {
        const draft = request.result || null;
        console.log('📦 IndexedDB: Get draft:', id, draft ? 'found' : 'not found');
        resolve(draft);
      };

      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to get draft:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ IndexedDB: getDraft failed:', error);
    return null;
  }
};

/**
 * Save a draft to IndexedDB
 */
export const saveDraft = async (draft) => {
  try {
    const db = await initDB();
    
    // Calculate draft size
    const draftString = JSON.stringify(draft);
    const sizeKB = Math.round(draftString.length / 1024);
    const sizeMB = (draftString.length / 1024 / 1024).toFixed(2);
    
    console.log('💾 IndexedDB: Saving draft:', {
      id: draft.id,
      sizeKB: sizeKB + ' KB',
      sizeMB: sizeMB + ' MB',
      hasBackground: !!draft.elements?.find(el => el.type === 'background-photo'),
    });

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.put(draft);

      request.onsuccess = () => {
        console.log('✅ IndexedDB: Draft saved successfully:', draft.id);
        resolve(draft);
      };

      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to save draft:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ IndexedDB: saveDraft failed:', error);
    throw error;
  }
};

/**
 * Delete a draft from IndexedDB
 */
export const deleteDraft = async (id) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        console.log('✅ IndexedDB: Draft deleted:', id);
        resolve(true);
      };

      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to delete draft:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ IndexedDB: deleteDraft failed:', error);
    return false;
  }
};

/**
 * Clear all drafts from IndexedDB
 */
export const clearAllDrafts = async () => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.clear();

      request.onsuccess = () => {
        console.log('✅ IndexedDB: All drafts cleared');
        resolve(true);
      };

      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to clear drafts:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ IndexedDB: clearAllDrafts failed:', error);
    return false;
  }
};

/**
 * Get storage usage estimate
 */
export const getStorageEstimate = async () => {
  try {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { usage: 0, quota: 0, percentage: 0 };
    }

    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? Math.round((usage / quota) * 100) : 0;

    console.log('📊 IndexedDB Storage:', {
      usageMB: (usage / 1024 / 1024).toFixed(2) + ' MB',
      quotaMB: (quota / 1024 / 1024).toFixed(2) + ' MB',
      percentage: percentage + '%',
    });

    return { usage, quota, percentage };
  } catch (error) {
    console.error('❌ Failed to get storage estimate:', error);
    return { usage: 0, quota: 0, percentage: 0 };
  }
};

export default {
  getAllDrafts,
  getDraft,
  saveDraft,
  deleteDraft,
  clearAllDrafts,
  getStorageEstimate,
};
