/**
 * User-specific storage wrapper
 * Adds user ID prefix to storage keys to isolate data between users
 */

import safeStorage from "./safeStorage.js";

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

// Create user-specific key
const getUserKey = (key) => {
  const userId = getCurrentUserId();
  return `${userId}:${key}`;
};

// User-specific storage operations
export const userStorage = {
  getItem: (key) => {
    return safeStorage.getItem(getUserKey(key));
  },

  setItem: (key, value) => {
    return safeStorage.setItem(getUserKey(key), value);
  },

  removeItem: (key) => {
    return safeStorage.removeItem(getUserKey(key));
  },

  getJSON: (key, defaultValue) => {
    return safeStorage.getJSON(getUserKey(key), defaultValue);
  },

  setJSON: (key, value) => {
    return safeStorage.setJSON(getUserKey(key), value);
  },

  // Clear all data for current user
  clearUserData: () => {
    const userId = getCurrentUserId();
    const keysToRemove = [];

    // Find all keys belonging to current user
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${userId}:`)) {
        keysToRemove.push(key);
      }
    }

    // Remove all user-specific keys
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Failed to remove ${key}:`, error);
      }
    });

    console.log(`✅ Cleared ${keysToRemove.length} items for user ${userId}`);
  },
};

export default userStorage;
