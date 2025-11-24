import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase.js";

/**
 * Cloud Draft Service - Sync drafts to Firestore
 */

/**
 * Save draft to Firestore
 * @param {string} userId - User ID
 * @param {object} draft - Draft object
 * @returns {Promise<boolean>}
 */
export const saveDraftToCloud = async (userId, draft) => {
  try {
    if (!userId || !draft?.id) {
      console.error("❌ Invalid userId or draft");
      return false;
    }

    const draftRef = doc(db, `users/${userId}/drafts/${draft.id}`);

    await setDoc(
      draftRef,
      {
        ...draft,
        syncedAt: serverTimestamp(),
        userId,
      },
      { merge: true }
    );

    console.log("✅ Draft saved to cloud:", draft.id);
    return true;
  } catch (error) {
    console.error("❌ Error saving draft to cloud:", error);
    return false;
  }
};

/**
 * Get all drafts from Firestore
 * @param {string} userId - User ID
 * @returns {Promise<Array>}
 */
export const getDraftsFromCloud = async (userId) => {
  try {
    if (!userId) {
      console.error("❌ Invalid userId");
      return [];
    }

    const draftsRef = collection(db, `users/${userId}/drafts`);
    const q = query(draftsRef, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);

    const drafts = snapshot.docs.map((doc) => ({
      ...doc.data(),
      // Convert Firestore timestamps to ISO strings
      createdAt:
        doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt:
        doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
      syncedAt:
        doc.data().syncedAt?.toDate?.()?.toISOString() || doc.data().syncedAt,
    }));

    console.log(`✅ Loaded ${drafts.length} drafts from cloud`);
    return drafts;
  } catch (error) {
    console.error("❌ Error getting drafts from cloud:", error);
    return [];
  }
};

/**
 * Get single draft from Firestore
 * @param {string} userId - User ID
 * @param {string} draftId - Draft ID
 * @returns {Promise<object|null>}
 */
export const getDraftFromCloud = async (userId, draftId) => {
  try {
    if (!userId || !draftId) {
      console.error("❌ Invalid userId or draftId");
      return null;
    }

    const draftRef = doc(db, `users/${userId}/drafts/${draftId}`);
    const snapshot = await getDoc(draftRef);

    if (!snapshot.exists()) {
      console.log("⚠️ Draft not found in cloud:", draftId);
      return null;
    }

    const draft = {
      ...snapshot.data(),
      createdAt:
        snapshot.data().createdAt?.toDate?.()?.toISOString() ||
        snapshot.data().createdAt,
      updatedAt:
        snapshot.data().updatedAt?.toDate?.()?.toISOString() ||
        snapshot.data().updatedAt,
      syncedAt:
        snapshot.data().syncedAt?.toDate?.()?.toISOString() ||
        snapshot.data().syncedAt,
    };

    console.log("✅ Draft loaded from cloud:", draftId);
    return draft;
  } catch (error) {
    console.error("❌ Error getting draft from cloud:", error);
    return null;
  }
};

/**
 * Delete draft from Firestore
 * @param {string} userId - User ID
 * @param {string} draftId - Draft ID
 * @returns {Promise<boolean>}
 */
export const deleteDraftFromCloud = async (userId, draftId) => {
  try {
    if (!userId || !draftId) {
      console.error("❌ Invalid userId or draftId");
      return false;
    }

    const draftRef = doc(db, `users/${userId}/drafts/${draftId}`);
    await deleteDoc(draftRef);

    console.log("✅ Draft deleted from cloud:", draftId);
    return true;
  } catch (error) {
    console.error("❌ Error deleting draft from cloud:", error);
    return false;
  }
};

/**
 * Sync local drafts to cloud
 * @param {string} userId - User ID
 * @param {Array} localDrafts - Local drafts array
 * @returns {Promise<boolean>}
 */
export const syncLocalDraftsToCloud = async (userId, localDrafts) => {
  try {
    if (!userId || !Array.isArray(localDrafts)) {
      console.error("❌ Invalid userId or localDrafts");
      return false;
    }

    console.log(`🔄 Syncing ${localDrafts.length} local drafts to cloud...`);

    const promises = localDrafts.map((draft) =>
      saveDraftToCloud(userId, draft)
    );

    await Promise.all(promises);

    console.log("✅ All local drafts synced to cloud");
    return true;
  } catch (error) {
    console.error("❌ Error syncing local drafts to cloud:", error);
    return false;
  }
};

/**
 * Sync cloud drafts to local storage
 * @param {string} userId - User ID
 * @param {Function} saveToLocalStorage - Function to save to localStorage
 * @returns {Promise<Array>}
 */
export const syncCloudDraftsToLocal = async (userId, saveToLocalStorage) => {
  try {
    if (!userId || typeof saveToLocalStorage !== "function") {
      console.error("❌ Invalid userId or saveToLocalStorage function");
      return [];
    }

    const cloudDrafts = await getDraftsFromCloud(userId);

    if (cloudDrafts.length > 0) {
      console.log(`🔄 Syncing ${cloudDrafts.length} cloud drafts to local...`);

      // Save each draft to localStorage
      cloudDrafts.forEach((draft) => {
        saveToLocalStorage(draft);
      });

      console.log("✅ All cloud drafts synced to local");
    }

    return cloudDrafts;
  } catch (error) {
    console.error("❌ Error syncing cloud drafts to local:", error);
    return [];
  }
};
