/**
 * IndexedDB Storage Wrapper
 * Provides larger storage capacity (50MB+) compared to localStorage (5-10MB)
 * Used for storing large data like drafts with background photos
 */

const DB_NAME = 'fremio-storage';
const DB_VERSION = 2;
const STORE_DRAFTS = 'drafts';
const STORE_SUMMARIES = 'draft_summaries';

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

      // Drafts store
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        const draftsStore = db.createObjectStore(STORE_DRAFTS, { keyPath: 'id' });
        draftsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        draftsStore.createIndex('userId', 'userId', { unique: false });
        console.log('✅ IndexedDB drafts store created');
      } else {
        const transaction = event.target.transaction;
        const draftsStore = transaction.objectStore(STORE_DRAFTS);
        if (!draftsStore.indexNames.contains('userId')) {
          draftsStore.createIndex('userId', 'userId', { unique: false });
        }
        if (!draftsStore.indexNames.contains('updatedAt')) {
          draftsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      }

      // Summaries store (fast list rendering)
      if (!db.objectStoreNames.contains(STORE_SUMMARIES)) {
        const summariesStore = db.createObjectStore(STORE_SUMMARIES, {
          keyPath: 'id',
        });
        summariesStore.createIndex('userId', 'userId', { unique: false });
        summariesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        console.log('✅ IndexedDB draft summaries store created');
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
      const transaction = db.transaction([STORE_DRAFTS], 'readonly');
      const objectStore = transaction.objectStore(STORE_DRAFTS);
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
 * Get drafts for a specific user (avoids loading all drafts then filtering)
 */
export const getDraftsByUserId = async (userId) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_DRAFTS], 'readonly');
      const objectStore = transaction.objectStore(STORE_DRAFTS);

      if (!objectStore.indexNames.contains('userId')) {
        // Fallback for older schemas; caller may still filter.
        const requestAll = objectStore.getAll();
        requestAll.onsuccess = () => resolve((requestAll.result || []).filter((d) => d?.userId === userId));
        requestAll.onerror = () => reject(requestAll.error);
        return;
      }

      const index = objectStore.index('userId');
      const request = index.getAll(IDBKeyRange.only(userId));

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ IndexedDB: getDraftsByUserId failed:', error);
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
      const transaction = db.transaction([STORE_DRAFTS], 'readonly');
      const objectStore = transaction.objectStore(STORE_DRAFTS);
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
      const transaction = db.transaction([STORE_DRAFTS], 'readwrite');
      const objectStore = transaction.objectStore(STORE_DRAFTS);
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
      const transaction = db.transaction([STORE_DRAFTS], 'readwrite');
      const objectStore = transaction.objectStore(STORE_DRAFTS);
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
      const transaction = db.transaction([STORE_DRAFTS], 'readwrite');
      const objectStore = transaction.objectStore(STORE_DRAFTS);
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

/**
 * Save a lightweight summary for fast draft list rendering.
 */
export const saveDraftSummary = async (summary) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_SUMMARIES], 'readwrite');
      const objectStore = transaction.objectStore(STORE_SUMMARIES);
      const request = objectStore.put(summary);

      request.onsuccess = () => resolve(summary);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ IndexedDB: saveDraftSummary failed:', error);
    return null;
  }
};

export const saveDraftSummariesBulk = async (summaries) => {
  try {
    const list = Array.isArray(summaries) ? summaries.filter(Boolean) : [];
    if (list.length === 0) return true;

    const db = await initDB();
    return await new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(STORE_SUMMARIES)) {
        resolve(false);
        return;
      }

      const transaction = db.transaction([STORE_SUMMARIES], 'readwrite');
      const objectStore = transaction.objectStore(STORE_SUMMARIES);

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);

      for (const summary of list) {
        objectStore.put(summary);
      }
    });
  } catch (error) {
    console.error('❌ IndexedDB: saveDraftSummariesBulk failed:', error);
    return false;
  }
};

/**
 * Get draft summaries for a user.
 */
export const getDraftSummariesByUserId = async (userId) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(STORE_SUMMARIES)) {
        resolve([]);
        return;
      }

      const transaction = db.transaction([STORE_SUMMARIES], 'readonly');
      const objectStore = transaction.objectStore(STORE_SUMMARIES);
      const index = objectStore.index('userId');
      const request = index.getAll(IDBKeyRange.only(userId));

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ IndexedDB: getDraftSummariesByUserId failed:', error);
    return [];
  }
};

export const deleteDraftSummary = async (id) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(STORE_SUMMARIES)) {
        resolve(true);
        return;
      }

      const transaction = db.transaction([STORE_SUMMARIES], 'readwrite');
      const objectStore = transaction.objectStore(STORE_SUMMARIES);
      const request = objectStore.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ IndexedDB: deleteDraftSummary failed:', error);
    return false;
  }
};

export default {
  getAllDrafts,
  getDraftsByUserId,
  getDraft,
  saveDraft,
  saveDraftSummary,
  saveDraftSummariesBulk,
  getDraftSummariesByUserId,
  deleteDraftSummary,
  deleteDraft,
  clearAllDrafts,
  getStorageEstimate,
};
