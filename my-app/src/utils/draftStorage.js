import safeStorage from "./safeStorage.js";
import indexedDBStorage from "./indexedDBStorage.js";

const STORAGE_KEY = "fremio-creator-drafts";
const USE_INDEXEDDB = true; // Enable IndexedDB for larger storage capacity

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const loadDrafts = async () => {
  if (USE_INDEXEDDB) {
    try {
      console.log('📦 Loading drafts from IndexedDB...');
      const drafts = await indexedDBStorage.getAllDrafts();
      return ensureArray(drafts);
    } catch (error) {
      console.error('❌ Failed to load from IndexedDB, falling back to localStorage:', error);
      // Fallback to localStorage
      const drafts = safeStorage.getJSON(STORAGE_KEY, []);
      return ensureArray(drafts);
    }
  } else {
    const drafts = safeStorage.getJSON(STORAGE_KEY, []);
    return ensureArray(drafts);
  }
};

export const getDraftById = async (id) => {
  if (USE_INDEXEDDB) {
    try {
      const draft = await indexedDBStorage.getDraft(id);
      return draft;
    } catch (error) {
      console.error('❌ Failed to get draft from IndexedDB, falling back to localStorage:', error);
      // Fallback to localStorage
      const drafts = safeStorage.getJSON(STORAGE_KEY, []);
      return ensureArray(drafts).find((draft) => draft.id === id) || null;
    }
  } else {
    const drafts = safeStorage.getJSON(STORAGE_KEY, []);
    return ensureArray(drafts).find((draft) => draft.id === id) || null;
  }
};

const persistDraftsToLocalStorage = async (drafts) => {
  try {
    console.log('💾 [persistDrafts] Attempting to save to localStorage:', {
      count: drafts.length,
      ids: drafts.map((d) => d.id),
    });

    const success = safeStorage.setJSON(STORAGE_KEY, drafts);

    console.log('💾 [persistDrafts] setJSON result:', success);

    if (!success) {
      throw new Error("Failed to save drafts to localStorage (setJSON returned false)");
    }

    const verification = safeStorage.getJSON(STORAGE_KEY);

    console.log('✅ [persistDrafts] Verification result:', {
      isArray: Array.isArray(verification),
      count: verification?.length,
      ids: verification?.map((d) => d.id),
    });

    if (!Array.isArray(verification)) {
      throw new Error("Draft persistence verification failed - not an array");
    }

    if (verification.length !== drafts.length) {
      console.warn('⚠️ [persistDrafts] Draft count mismatch!', {
        expected: drafts.length,
        actual: verification.length,
      });
    }

    console.log('✅ [persistDrafts] Drafts successfully persisted and verified');
    return true;
  } catch (error) {
    console.error("❌ [persistDrafts] Failed to persist drafts", error);
    console.error("❌ [persistDrafts] Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    throw error;
  }
};

const buildSavedDraft = (incoming, nowIso, existing, id) => ({
  ...existing,
  ...incoming,
  id,
  title: incoming.title ?? existing?.title ?? "Draft",
  createdAt: existing?.createdAt ?? incoming.createdAt ?? nowIso,
  updatedAt: nowIso,
});

const saveDraftToIndexedDB = async (incoming, nowIso) => {
  const id = incoming.id ?? generateId();
  const normalizedIncoming = { ...incoming, id };
  const existing = incoming.id ? await indexedDBStorage.getDraft(incoming.id) : null;
  const savedDraft = buildSavedDraft(normalizedIncoming, nowIso, existing, id);

  console.log('💾 [saveDraft] Persisting single draft to IndexedDB:', {
    id: savedDraft.id,
    hasElements: Array.isArray(savedDraft.elements),
  });

  await indexedDBStorage.saveDraft(savedDraft);
  return savedDraft;
};

const saveDraftToLocalStorage = async (incoming, nowIso) => {
  const drafts = ensureArray(safeStorage.getJSON(STORAGE_KEY, []));
  const id = incoming.id ?? generateId();
  const index = drafts.findIndex((draft) => draft.id === id);
  const existing = index !== -1 ? drafts[index] : null;
  const savedDraft = buildSavedDraft({ ...incoming, id }, nowIso, existing, id);

  if (index !== -1) {
    drafts[index] = savedDraft;
  } else {
    drafts.push(savedDraft);
  }

  await persistDraftsToLocalStorage(drafts);
  return savedDraft;
};

export const deleteDraft = async (id) => {
  if (USE_INDEXEDDB) {
    try {
      await indexedDBStorage.deleteDraft(id);
      return await loadDrafts(); // Return updated list
    } catch (error) {
      console.error('❌ Failed to delete from IndexedDB:', error);
      // Fallback to localStorage
      const drafts = safeStorage.getJSON(STORAGE_KEY, []);
      const nextDrafts = ensureArray(drafts).filter((draft) => draft.id !== id);
      safeStorage.setJSON(STORAGE_KEY, nextDrafts);
      return nextDrafts;
    }
  } else {
    const drafts = safeStorage.getJSON(STORAGE_KEY, []);
    const nextDrafts = ensureArray(drafts).filter((draft) => draft.id !== id);
    safeStorage.setJSON(STORAGE_KEY, nextDrafts);
    return nextDrafts;
  }
};

export const clearDrafts = async () => {
  if (USE_INDEXEDDB) {
    try {
      await indexedDBStorage.clearAllDrafts();
    } catch (error) {
      console.error('❌ Failed to clear IndexedDB:', error);
    }
  }
  safeStorage.removeItem(STORAGE_KEY);
};

export const saveDraft = async (inputDraft) => {
  const nowIso = new Date().toISOString();
  const incoming = { ...inputDraft };

  if (USE_INDEXEDDB) {
    try {
      return await saveDraftToIndexedDB(incoming, nowIso);
    } catch (error) {
      console.error('❌ [saveDraft] Failed to save draft to IndexedDB, falling back to localStorage:', error);
    }
  }

  return saveDraftToLocalStorage(incoming, nowIso);
};

export default {
  loadDrafts,
  getDraftById,
  saveDraft,
  deleteDraft,
  clearDrafts,
};
