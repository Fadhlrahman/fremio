import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../config/firebase";
import { COLLECTIONS, USER_ROLES } from "../config/firebaseCollections";

// LocalStorage key
const USERS_STORAGE_KEY = "fremio_all_users";

/**
 * User Management Service
 * For admin operations on user accounts
 */

/**
 * Get all users (admin only)
 * @returns {Promise<Array>} Array of users
 */
export async function getAllUsers() {
  try {
    if (!isFirebaseConfigured || !db) {
      // LocalStorage mode
      const users = getUsersFromLocalStorage();
      console.log(
        "📊 getAllUsers - LocalStorage mode:",
        users.length,
        "users found"
      );
      console.log("📊 Users data:", users);
      return users;
    }

    try {
      // Read from fremio_all_users collection (not COLLECTIONS.USERS)
      const q = query(
        collection(db, "fremio_all_users"),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log(
        "📊 getAllUsers - Firestore mode:",
        users.length,
        "users found"
      );
      return users;
    } catch (firebaseError) {
      // Fallback to LocalStorage if Firebase fails
      console.warn(
        "Firebase failed, using LocalStorage:",
        firebaseError.message
      );
      const users = getUsersFromLocalStorage();
      console.log(
        "📊 getAllUsers - LocalStorage fallback:",
        users.length,
        "users found"
      );
      return users;
    }
  } catch (error) {
    console.error("Error fetching all users:", error);
    return getUsersFromLocalStorage() || [];
  }
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User data or null
 */
export async function getUserById(userId) {
  try {
    if (!isFirebaseConfigured) {
      // LocalStorage mode
      const users = getUsersFromLocalStorage();
      const user = users.find((u) => u.id === userId || u.uid === userId);
      return user || null;
    }

    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    return {
      id: userSnap.id,
      ...userSnap.data(),
    };
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

/**
 * Update user role (admin only)
 * @param {string} userId - User ID
 * @param {string} newRole - New role (admin, kreator, user)
 * @param {string} adminId - Admin performing the action
 * @returns {Promise<Object>} { success, message }
 */
export async function updateUserRole(userId, newRole, adminId) {
  try {
    if (!Object.values(USER_ROLES).includes(newRole)) {
      return { success: false, message: "Invalid role" };
    }

    if (!isFirebaseConfigured) {
      // LocalStorage mode
      const users = getUsersFromLocalStorage();
      const index = users.findIndex((u) => u.id === userId);

      if (index === -1) {
        return { success: false, message: "User not found" };
      }

      users[index].role = newRole;
      users[index].isKreator = newRole === USER_ROLES.KREATOR;
      users[index].updatedAt = new Date().toISOString();
      users[index].lastModifiedBy = adminId;

      saveUsersToLocalStorage(users);
      return { success: true, message: `User role updated to ${newRole}` };
    }

    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, message: "User not found" };
    }

    await updateDoc(userRef, {
      role: newRole,
      isKreator: newRole === USER_ROLES.KREATOR,
      updatedAt: serverTimestamp(),
      lastModifiedBy: adminId,
    });

    return { success: true, message: `User role updated to ${newRole}` };
  } catch (error) {
    console.error("Error updating user role:", error);
    return {
      success: false,
      message: error.message || "Failed to update user role",
    };
  }
}

/**
 * Ban user (admin only)
 * @param {string} userId - User ID
 * @param {string} adminId - Admin performing the action
 * @param {string} reason - Ban reason
 * @returns {Promise<Object>} { success, message }
 */
export async function banUser(userId, adminId, reason = "") {
  try {
    if (!isFirebaseConfigured) {
      // LocalStorage mode
      const users = getUsersFromLocalStorage();
      const index = users.findIndex((u) => u.id === userId);

      if (index === -1) {
        return { success: false, message: "User not found" };
      }

      users[index].status = "banned";
      users[index].bannedAt = new Date().toISOString();
      users[index].bannedBy = adminId;
      users[index].banReason = reason;
      users[index].updatedAt = new Date().toISOString();

      saveUsersToLocalStorage(users);
      return { success: true, message: "User banned successfully" };
    }

    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, message: "User not found" };
    }

    await updateDoc(userRef, {
      status: "banned",
      banReason: reason,
      bannedAt: serverTimestamp(),
      bannedBy: adminId,
      updatedAt: serverTimestamp(),
    });

    return { success: true, message: "User banned successfully" };
  } catch (error) {
    console.error("Error banning user:", error);
    return {
      success: false,
      message: error.message || "Failed to ban user",
    };
  }
}

/**
 * Unban user (admin only)
 * @param {string} userId - User ID
 * @param {string} adminId - Admin performing the action
 * @returns {Promise<Object>} { success, message }
 */
export async function unbanUser(userId, adminId) {
  try {
    if (!isFirebaseConfigured) {
      // LocalStorage mode
      const users = getUsersFromLocalStorage();
      const index = users.findIndex((u) => u.id === userId);

      if (index === -1) {
        return { success: false, message: "User not found" };
      }

      users[index].status = "active";
      users[index].unbannedAt = new Date().toISOString();
      users[index].unbannedBy = adminId;
      users[index].banReason = null;
      users[index].updatedAt = new Date().toISOString();

      saveUsersToLocalStorage(users);
      return { success: true, message: "User unbanned successfully" };
    }

    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, message: "User not found" };
    }

    await updateDoc(userRef, {
      status: "active",
      banReason: null,
      bannedAt: null,
      bannedBy: null,
      unbannedAt: serverTimestamp(),
      unbannedBy: adminId,
      updatedAt: serverTimestamp(),
    });

    return { success: true, message: "User unbanned successfully" };
  } catch (error) {
    console.error("Error unbanning user:", error);
    return {
      success: false,
      message: error.message || "Failed to unban user",
    };
  }
}

/**
 * Delete user (admin only)
 * @param {string} userId - User ID
 * @param {string} adminId - Admin performing the action
 * @returns {Promise<Object>} { success, message }
 */
export async function deleteUser(userId, adminId) {
  try {
    if (!isFirebaseConfigured) {
      // LocalStorage mode
      const users = getUsersFromLocalStorage();
      const user = users.find((u) => u.id === userId);

      if (!user) {
        return { success: false, message: "User not found" };
      }

      // Prevent deleting admins
      if (user.role === USER_ROLES.ADMIN) {
        return { success: false, message: "Cannot delete admin users" };
      }

      const filtered = users.filter((u) => u.id !== userId);
      saveUsersToLocalStorage(filtered);
      return { success: true, message: "User deleted successfully" };
    }

    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, message: "User not found" };
    }

    const userData = userSnap.data();

    // Prevent deleting admins
    if (userData.role === USER_ROLES.ADMIN) {
      return { success: false, message: "Cannot delete admin users" };
    }

    // TODO: Delete user's frames and applications in a transaction
    await deleteDoc(userRef);

    return { success: true, message: "User deleted successfully" };
  } catch (error) {
    console.error("Error deleting user:", error);
    return {
      success: false,
      message: error.message || "Failed to delete user",
    };
  }
}

/**
 * Get user statistics (admin only)
 * @returns {Promise<Object>} Statistics object
 */
export async function getUserStats() {
  try {
    const allUsers = await getAllUsers();

    const stats = {
      total: allUsers.length,
      admins: allUsers.filter((u) => u.role === USER_ROLES.ADMIN).length,
      kreators: allUsers.filter((u) => u.role === USER_ROLES.KREATOR).length,
      regular: allUsers.filter((u) => u.role === USER_ROLES.USER).length,
      active: allUsers.filter((u) => u.status === "active" || !u.status).length,
      banned: allUsers.filter((u) => u.status === "banned").length,
    };

    return stats;
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return {
      total: 0,
      admins: 0,
      kreators: 0,
      regular: 0,
      active: 0,
      banned: 0,
    };
  }
}

/**
 * Search users by query (admin only)
 * @param {string} searchQuery - Search string
 * @returns {Promise<Array>} Filtered users
 */
export async function searchUsers(searchQuery) {
  try {
    const allUsers = await getAllUsers();

    if (!searchQuery || !searchQuery.trim()) {
      return allUsers;
    }

    const query = searchQuery.toLowerCase();

    return allUsers.filter(
      (user) =>
        user.displayName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phoneNumber?.toLowerCase().includes(query)
    );
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
}

/**
 * Get users by role (admin only)
 * @param {string} role - User role
 * @returns {Promise<Array>} Filtered users
 */
export async function getUsersByRole(role) {
  try {
    if (!isFirebaseConfigured) {
      const users = getUsersFromLocalStorage();
      return users.filter((u) => u.role === role);
    }

    const q = query(
      collection(db, COLLECTIONS.USERS),
      where("role", "==", role),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching users by role:", error);
    return [];
  }
}

/**
 * Get users by status (admin only)
 * @param {string} status - User status (active, banned)
 * @returns {Promise<Array>} Filtered users
 */
export async function getUsersByStatus(status) {
  try {
    if (!isFirebaseConfigured) {
      const users = getUsersFromLocalStorage();
      return users.filter((u) => u.status === status);
    }

    const q = query(
      collection(db, COLLECTIONS.USERS),
      where("status", "==", status),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching users by status:", error);
    return [];
  }
}

// Helper Functions for LocalStorage

/**
 * Get users from localStorage
 */
function getUsersFromLocalStorage() {
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    console.log("🔍 getUsersFromLocalStorage - Key:", USERS_STORAGE_KEY);
    console.log("🔍 Raw localStorage data:", stored);

    if (stored) {
      const parsed = JSON.parse(stored);
      console.log("✅ Parsed users:", parsed);
      return parsed;
    }

    // If no users found, try to initialize with current user
    const currentUser = localStorage.getItem("fremio_user");
    console.log("🔍 Checking fremio_user:", currentUser);

    if (currentUser) {
      const userData = JSON.parse(currentUser);
      const initialUser = {
        id: userData.uid || `user_${Date.now()}`,
        email: userData.email,
        name: userData.displayName || userData.email?.split("@")[0] || "",
        phone: "",
        role: USER_ROLES.ADMIN, // First user is admin
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log("🆕 Initializing with current user:", initialUser);
      saveUsersToLocalStorage([initialUser]);
      return [initialUser];
    }

    console.log("⚠️ No users found in localStorage");
    return [];
  } catch (error) {
    console.error("Error reading users from localStorage:", error);
    return [];
  }
}

/**
 * Save users to localStorage
 */
function saveUsersToLocalStorage(users) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error("Error saving users to localStorage:", error);
  }
}

/**
 * Save user to storage (for registration)
 */
export function saveUserToStorage(userData) {
  try {
    console.log("💾 saveUserToStorage called with:", userData);
    const users = getUsersFromLocalStorage();

    // Check if user already exists
    const existingIndex = users.findIndex(
      (u) => u.email === userData.email || u.id === userData.id
    );

    const userToSave = {
      id: userData.id || userData.uid || `user_${Date.now()}`,
      email: userData.email,
      name: userData.name || userData.displayName || "",
      phone: userData.phone || "",
      role: userData.role || USER_ROLES.USER,
      status: userData.status || "active",
      createdAt: userData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      // Update existing user
      console.log("🔄 Updating existing user at index:", existingIndex);
      users[existingIndex] = { ...users[existingIndex], ...userToSave };
    } else {
      // Add new user
      console.log("➕ Adding new user");
      users.push(userToSave);
    }

    console.log("💾 Saving users to localStorage:", users);
    saveUsersToLocalStorage(users);
    return userToSave;
  } catch (error) {
    console.error("Error saving user:", error);
    return null;
  }
}
