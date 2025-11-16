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
import { db } from "../config/firebase";
import { COLLECTIONS, USER_ROLES } from "../config/firebaseCollections";

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
    const q = query(
      collection(db, COLLECTIONS.USERS),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User data or null
 */
export async function getUserById(userId) {
  try {
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
