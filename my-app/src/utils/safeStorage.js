const isStorageAvailable = () => {
  if (typeof window === "undefined") return false;
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, "test");
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn("⚠️ LocalStorage unavailable:", error);
    return false;
  }
};

const storageAvailable = isStorageAvailable();

const withStorage = (operation) => {
  if (!storageAvailable) return null;
  try {
    return operation(window.localStorage);
  } catch (error) {
    console.warn("⚠️ LocalStorage operation failed:", error);
    return null;
  }
};

const safeStorage = {
  getItem(key, defaultValue = null) {
    const value = withStorage((storage) => storage.getItem(key));
    return value !== null && value !== undefined ? value : defaultValue;
  },
  setItem(key, value) {
    withStorage((storage) => storage.setItem(key, value));
  },
  removeItem(key) {
    withStorage((storage) => storage.removeItem(key));
  },
  getJSON(key, defaultValue = null) {
    const value = this.getItem(key);
    if (value === null) return defaultValue;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("⚠️ Failed to parse JSON from storage:", error);
      return defaultValue;
    }
  },
  setJSON(key, value) {
    try {
      const serialized = JSON.stringify(value);
      this.setItem(key, serialized);
    } catch (error) {
      console.warn("⚠️ Failed to serialize JSON to storage:", error);
    }
  },
  isAvailable() {
    return storageAvailable;
  },
};

export default safeStorage;
