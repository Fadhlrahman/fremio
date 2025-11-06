import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS, USER_ROLES } from '../config/firebaseCollections';

/**
 * Get user role from Firestore
 * @param {string} userId - Firebase Auth user ID
 * @returns {Promise<string>} User role
 */
export async function getUserRole(userId) {
  try {
    const userRef = doc(db, COLLECTIONS.users, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data().role || USER_ROLES.user;
    }
    
    return USER_ROLES.user; // Default role
  } catch (error) {
    console.error('Error getting user role:', error);
    return USER_ROLES.user;
  }
}

/**
 * Check if user is admin
 * @param {string} userId - Firebase Auth user ID
 * @returns {Promise<boolean>}
 */
export async function isAdmin(userId) {
  const role = await getUserRole(userId);
  return role === USER_ROLES.admin;
}

/**
 * Check if user is kreator
 * @param {string} userId - Firebase Auth user ID
 * @returns {Promise<boolean>}
 */
export async function isKreator(userId) {
  const role = await getUserRole(userId);
  return role === USER_ROLES.kreator;
}

/**
 * Check if user can create frames (admin or kreator)
 * @param {string} userId - Firebase Auth user ID
 * @returns {Promise<boolean>}
 */
export async function canCreateFrames(userId) {
  const role = await getUserRole(userId);
  return role === USER_ROLES.admin || role === USER_ROLES.kreator;
}

/**
 * Update user role (admin only)
 * @param {string} userId - User ID to update
 * @param {string} newRole - New role to assign
 * @param {string} adminId - Admin user ID performing the action
 * @returns {Promise<boolean>} Success status
 */
export async function updateUserRole(userId, newRole, adminId) {
  try {
    // Verify admin permissions
    const isAdminUser = await isAdmin(adminId);
    if (!isAdminUser) {
      throw new Error('Only admins can change user roles');
    }

    // Validate new role
    if (!Object.values(USER_ROLES).includes(newRole)) {
      throw new Error('Invalid role specified');
    }

    const userRef = doc(db, COLLECTIONS.users, userId);
    await updateDoc(userRef, {
      role: newRole,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

/**
 * Promote user to kreator
 * @param {string} userId - User ID to promote
 * @param {string} adminId - Admin user ID performing the action
 * @returns {Promise<boolean>}
 */
export async function promoteToKreator(userId, adminId) {
  return await updateUserRole(userId, USER_ROLES.kreator, adminId);
}

/**
 * Demote kreator to user
 * @param {string} userId - User ID to demote
 * @param {string} adminId - Admin user ID performing the action
 * @returns {Promise<boolean>}
 */
export async function demoteToUser(userId, adminId) {
  return await updateUserRole(userId, USER_ROLES.user, adminId);
}

/**
 * Initialize user profile on first login/registration
 * @param {string} userId - Firebase Auth user ID
 * @param {Object} userData - Additional user data (name, email, etc.)
 * @returns {Promise<void>}
 */
export async function initializeUserProfile(userId, userData = {}) {
  try {
    const userRef = doc(db, COLLECTIONS.users, userId);
    const userSnap = await getDoc(userRef);

    // Only create if doesn't exist
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: userId,
        role: USER_ROLES.user,
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log('User profile initialized with role: user');
    }
  } catch (error) {
    console.error('Error initializing user profile:', error);
    throw error;
  }
}

/**
 * Get role display name
 * @param {string} role - Role constant
 * @returns {string} Human-readable role name
 */
export function getRoleDisplayName(role) {
  const roleNames = {
    [USER_ROLES.admin]: 'Administrator',
    [USER_ROLES.kreator]: 'Kreator',
    [USER_ROLES.user]: 'User',
  };
  return roleNames[role] || 'Unknown';
}

/**
 * Get role badge color
 * @param {string} role - Role constant
 * @returns {string} Tailwind color classes
 */
export function getRoleBadgeColor(role) {
  const colors = {
    [USER_ROLES.admin]: 'bg-red-100 text-red-800 border-red-200',
    [USER_ROLES.kreator]: 'bg-purple-100 text-purple-800 border-purple-200',
    [USER_ROLES.user]: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
}
