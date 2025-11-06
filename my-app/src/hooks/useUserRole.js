import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS, USER_ROLES } from '../config/firebaseCollections';

/**
 * Custom hook to get and monitor user role
 * @param {string} userId - Firebase Auth user ID
 * @returns {Object} { role, isAdmin, isKreator, isUser, loading, error }
 */
export function useUserRole(userId) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const userRef = doc(db, COLLECTIONS.users, userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setRole(userData.role || USER_ROLES.user);
        } else {
          // User document doesn't exist yet, default to user role
          setRole(USER_ROLES.user);
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        setError(err.message);
        setRole(USER_ROLES.user); // Fallback to user role
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [userId]);

  return {
    role,
    isAdmin: role === USER_ROLES.admin,
    isKreator: role === USER_ROLES.kreator,
    isUser: role === USER_ROLES.user,
    loading,
    error,
  };
}

/**
 * Hook to check if current user is admin
 * @param {string} userId - Firebase Auth user ID
 * @returns {Object} { isAdmin, loading }
 */
export function useIsAdmin(userId) {
  const { isAdmin, loading } = useUserRole(userId);
  return { isAdmin, loading };
}

/**
 * Hook to check if current user is kreator
 * @param {string} userId - Firebase Auth user ID
 * @returns {Object} { isKreator, loading }
 */
export function useIsKreator(userId) {
  const { isKreator, loading } = useUserRole(userId);
  return { isKreator, loading };
}

/**
 * Hook to check if current user has kreator or admin role
 * @param {string} userId - Firebase Auth user ID
 * @returns {Object} { canCreateFrames, loading }
 */
export function useCanCreateFrames(userId) {
  const { isAdmin, isKreator, loading } = useUserRole(userId);
  return { 
    canCreateFrames: isAdmin || isKreator, 
    loading 
  };
}
