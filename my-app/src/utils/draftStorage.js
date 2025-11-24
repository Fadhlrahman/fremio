import safeStorage from "./safeStorage.js";
import indexedDBStorage from "./indexedDBStorage.js";
import {
  saveDraftToCloud,
  getDraftsFromCloud,
  deleteDraftFromCloud,
  syncLocalDraftsToCloud,
} from "../services/draftCloudService.js";

const STORAGE_KEY = "fremio-creator-drafts";
const USE_INDEXEDDB = true; // Enable IndexedDB for larger storage capacity
const USE_CLOUD_SYNC = true; // Enable Firestore cloud sync

const ensureArray = (value) => (Array.isArray(value) ? value : []);

// Get current user ID from localStorage
const getCurrentUserId = () => {
  try {
    const userStr = localStorage.getItem("fremio_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user?.email || user?.id || "guest";
    }
  } catch (error) {
    console.error("Failed to get current user:", error);
  }
  return "guest";
};

const generateId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const loadDrafts = async () => {
  const currentUserId = getCurrentUserId();

  // Try to load from cloud first if user is logged in
  if (USE_CLOUD_SYNC && currentUserId !== "guest") {
    try {
      console.log("☁️ Loading drafts from cloud for user:", currentUserId);
      const cloudDrafts = await getDraftsFromCloud(currentUserId);

      if (cloudDrafts.length > 0) {
        console.log(`✅ Loaded ${cloudDrafts.length} drafts from cloud`);

        // Also save to local storage for offline access
        if (USE_INDEXEDDB) {
          for (const draft of cloudDrafts) {
            await indexedDBStorage.saveDraft(draft);
          }
        } else {
          safeStorage.setJSON(STORAGE_KEY, cloudDrafts);
        }

        return cloudDrafts;
      }
    } catch (error) {
      console.warn("⚠️ Failed to load from cloud, using local storage:", error);
    }
  }

  if (USE_INDEXEDDB) {
    try {
      console.log("📦 Loading drafts from IndexedDB for user:", currentUserId);
      const allDrafts = await indexedDBStorage.getAllDrafts();
      // Filter drafts for current user only
      const userDrafts = ensureArray(allDrafts).filter(
        (draft) => draft.userId === currentUserId
      );
      console.log(
        `✅ Loaded ${userDrafts.length} drafts for user ${currentUserId}`
      );
      return userDrafts;
    } catch (error) {
      console.error(
        "❌ Failed to load from IndexedDB, falling back to localStorage:",
        error
      );
      // Fallback to localStorage
      const drafts = safeStorage.getJSON(STORAGE_KEY, []);
      const userDrafts = ensureArray(drafts).filter(
        (draft) => draft.userId === currentUserId
      );
      return userDrafts;
    }
  } else {
    const drafts = safeStorage.getJSON(STORAGE_KEY, []);
    const userDrafts = ensureArray(drafts).filter(
      (draft) => draft.userId === currentUserId
    );
    return userDrafts;
  }
};

export const getDraftById = async (id) => {
  const currentUserId = getCurrentUserId();

  if (USE_INDEXEDDB) {
    try {
      const draft = await indexedDBStorage.getDraft(id);
      // Verify draft belongs to current user
      if (draft && draft.userId === currentUserId) {
        return draft;
      }
      console.warn(`⚠️ Draft ${id} not found or belongs to different user`);
      return null;
    } catch (error) {
      console.error(
        "❌ Failed to get draft from IndexedDB, falling back to localStorage:",
        error
      );
      // Fallback to localStorage
      const drafts = safeStorage.getJSON(STORAGE_KEY, []);
      const draft = ensureArray(drafts).find((draft) => draft.id === id);
      // Verify draft belongs to current user
      if (draft && draft.userId === currentUserId) {
        return draft;
      }
      return null;
    }
  } else {
    const drafts = safeStorage.getJSON(STORAGE_KEY, []);
    const draft = ensureArray(drafts).find((draft) => draft.id === id);
    // Verify draft belongs to current user
    if (draft && draft.userId === currentUserId) {
      return draft;
    }
    return null;
  }
};

const persistDraftsToLocalStorage = async (drafts) => {
  try {
    console.log("💾 [persistDrafts] Attempting to save to localStorage:", {
      count: drafts.length,
      ids: drafts.map((d) => d.id),
    });

    const success = safeStorage.setJSON(STORAGE_KEY, drafts);

    console.log("💾 [persistDrafts] setJSON result:", success);

    if (!success) {
      throw new Error(
        "Failed to save drafts to localStorage (setJSON returned false)"
      );
    }

    const verification = safeStorage.getJSON(STORAGE_KEY);

    console.log("✅ [persistDrafts] Verification result:", {
      isArray: Array.isArray(verification),
      count: verification?.length,
      ids: verification?.map((d) => d.id),
    });

    if (!Array.isArray(verification)) {
      throw new Error("Draft persistence verification failed - not an array");
    }

    if (verification.length !== drafts.length) {
      console.warn("⚠️ [persistDrafts] Draft count mismatch!", {
        expected: drafts.length,
        actual: verification.length,
      });
    }

    console.log(
      "✅ [persistDrafts] Drafts successfully persisted and verified"
    );
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

const buildSavedDraft = (incoming, nowIso, existing, id) => {
  const currentUserId = getCurrentUserId();

  return {
    ...existing,
    ...incoming,
    id,
    userId: incoming.userId ?? existing?.userId ?? currentUserId, // Always set userId
    title: incoming.title ?? existing?.title ?? "Draft",
    createdAt: existing?.createdAt ?? incoming.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
};

const saveDraftToIndexedDB = async (incoming, nowIso) => {
  const id = incoming.id ?? generateId();
  const normalizedIncoming = { ...incoming, id };
  const existing = incoming.id
    ? await indexedDBStorage.getDraft(incoming.id)
    : null;
  const savedDraft = buildSavedDraft(normalizedIncoming, nowIso, existing, id);

  console.log("💾 [saveDraft] Persisting single draft to IndexedDB:", {
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
  const currentUserId = getCurrentUserId();

  if (USE_INDEXEDDB) {
    try {
      // Verify draft belongs to current user before deleting
      const draft = await indexedDBStorage.getDraft(id);
      if (draft && draft.userId === currentUserId) {
        await indexedDBStorage.deleteDraft(id);
        console.log(
          `✅ Deleted draft ${id} from IndexedDB for user ${currentUserId}`
        );
      } else {
        console.warn(
          `⚠️ Cannot delete draft ${id} - belongs to different user`
        );
      }

      // Delete from cloud if enabled
      if (USE_CLOUD_SYNC && currentUserId !== "guest") {
        try {
          console.log("☁️ Deleting draft from cloud:", id);
          await deleteDraftFromCloud(currentUserId, id);
          console.log("✅ Deleted from cloud:", id);
        } catch (cloudError) {
          console.error(
            "⚠️ Failed to delete from cloud (local delete succeeded):",
            cloudError
          );
        }
      }

      return await loadDrafts(); // Return updated list for current user
    } catch (error) {
      console.error("❌ Failed to delete from IndexedDB:", error);
      // Fallback to localStorage
      const drafts = safeStorage.getJSON(STORAGE_KEY, []);
      const nextDrafts = ensureArray(drafts).filter(
        (draft) => draft.id !== id || draft.userId !== currentUserId
      );
      safeStorage.setJSON(STORAGE_KEY, nextDrafts);

      // Delete from cloud if enabled
      if (USE_CLOUD_SYNC && currentUserId !== "guest") {
        try {
          await deleteDraftFromCloud(currentUserId, id);
        } catch (cloudError) {
          console.error("⚠️ Failed to delete from cloud:", cloudError);
        }
      }

      return nextDrafts.filter((draft) => draft.userId === currentUserId);
    }
  } else {
    const drafts = safeStorage.getJSON(STORAGE_KEY, []);
    const nextDrafts = ensureArray(drafts).filter(
      (draft) => draft.id !== id || draft.userId !== currentUserId
    );
    safeStorage.setJSON(STORAGE_KEY, nextDrafts);

    // Delete from cloud if enabled
    if (USE_CLOUD_SYNC && currentUserId !== "guest") {
      try {
        console.log("☁️ Deleting draft from cloud:", id);
        await deleteDraftFromCloud(currentUserId, id);
        console.log("✅ Deleted from cloud:", id);
      } catch (cloudError) {
        console.error(
          "⚠️ Failed to delete from cloud (local delete succeeded):",
          cloudError
        );
      }
    }

    return nextDrafts.filter((draft) => draft.userId === currentUserId);
  }
};

export const clearDrafts = async () => {
  if (USE_INDEXEDDB) {
    try {
      await indexedDBStorage.clearAllDrafts();
    } catch (error) {
      console.error("❌ Failed to clear IndexedDB:", error);
    }
  }
  safeStorage.removeItem(STORAGE_KEY);
};

export const saveDraft = async (inputDraft) => {
  const nowIso = new Date().toISOString();
  const incoming = { ...inputDraft };
  const currentUserId = getCurrentUserId();

  let savedDraft;

  if (USE_INDEXEDDB) {
    try {
      savedDraft = await saveDraftToIndexedDB(incoming, nowIso);
    } catch (error) {
      console.error(
        "❌ [saveDraft] Failed to save draft to IndexedDB, falling back to localStorage:",
        error
      );
      savedDraft = await saveDraftToLocalStorage(incoming, nowIso);
    }
  } else {
    savedDraft = await saveDraftToLocalStorage(incoming, nowIso);
  }

  // Save to cloud if enabled and user is logged in
  if (USE_CLOUD_SYNC && currentUserId !== "guest") {
    try {
      console.log("☁️ Syncing draft to cloud:", savedDraft.id);
      await saveDraftToCloud(currentUserId, savedDraft);
      console.log("✅ Synced to cloud:", savedDraft.id);
    } catch (cloudError) {
      console.error(
        "⚠️ Failed to sync to cloud (local save succeeded):",
        cloudError
      );
      // Don't throw - local save succeeded
    }
  }

  return savedDraft;
};

export default {
  loadDrafts,
  getDraftById,
  saveDraft,
  deleteDraft,
  clearDrafts,
};
