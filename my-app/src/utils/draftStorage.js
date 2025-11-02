import safeStorage from "./safeStorage.js";

const STORAGE_KEY = "fremio-creator-drafts";

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const loadDrafts = () => {
  const drafts = safeStorage.getJSON(STORAGE_KEY, []);
  return ensureArray(drafts);
};

export const getDraftById = (id) => {
  const drafts = loadDrafts();
  return drafts.find((draft) => draft.id === id) || null;
};

const persistDrafts = (drafts) => {
  try {
    safeStorage.setJSON(STORAGE_KEY, drafts);
    const verification = safeStorage.getJSON(STORAGE_KEY);
    if (!Array.isArray(verification)) {
      throw new Error("Draft persistence verification failed");
    }
  } catch (error) {
    console.error("❌ Failed to persist drafts", error);
    throw error;
  }
};

export const deleteDraft = (id) => {
  const drafts = loadDrafts();
  const nextDrafts = drafts.filter((draft) => draft.id !== id);
  persistDrafts(nextDrafts);
  return nextDrafts;
};

export const clearDrafts = () => {
  safeStorage.removeItem(STORAGE_KEY);
};

export const saveDraft = (inputDraft) => {
  const drafts = loadDrafts();
  const nowIso = new Date().toISOString();

  const incoming = {
    ...inputDraft,
  };

  let savedDraft;

  if (incoming.id) {
    const index = drafts.findIndex((draft) => draft.id === incoming.id);
    if (index !== -1) {
      const existing = drafts[index];
      savedDraft = {
        ...existing,
        ...incoming,
        id: existing.id,
        title: incoming.title ?? existing.title ?? "Draft",
        createdAt: existing.createdAt ?? nowIso,
        updatedAt: nowIso,
      };
      drafts[index] = savedDraft;
    } else {
      savedDraft = {
        ...incoming,
        id: incoming.id,
        title: incoming.title ?? "Draft",
        createdAt: incoming.createdAt ?? nowIso,
        updatedAt: nowIso,
      };
      drafts.push(savedDraft);
    }
  } else {
    savedDraft = {
      ...incoming,
      id: generateId(),
      title: incoming.title ?? "Draft",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    drafts.push(savedDraft);
  }

  persistDrafts(drafts);
  return savedDraft;
};

export default {
  loadDrafts,
  getDraftById,
  saveDraft,
  deleteDraft,
  clearDrafts,
};
