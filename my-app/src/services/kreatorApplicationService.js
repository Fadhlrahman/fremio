import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS, APPLICATION_STATUS, USER_ROLES } from '../config/firebaseCollections';
import { updateUserRole } from '../utils/roleHelpers';

/**
 * Submit kreator application
 * @param {Object} applicationData - Application data
 * @returns {Promise<Object>} { success, applicationId, message }
 */
export async function submitKreatorApplication(applicationData) {
  try {
    const { userId, displayName, email, portfolio, motivation, experience } = applicationData;

    // Check if user already has a pending or approved application
    const existingApp = await getUserApplication(userId);
    if (existingApp) {
      if (existingApp.status === APPLICATION_STATUS.pending) {
        return { 
          success: false, 
          message: 'You already have a pending application' 
        };
      }
      if (existingApp.status === APPLICATION_STATUS.approved) {
        return { 
          success: false, 
          message: 'You are already a kreator' 
        };
      }
    }

    // Create application document
    const applicationRef = await addDoc(collection(db, COLLECTIONS.kreatorApplications), {
      userId,
      displayName,
      email,
      portfolio,
      motivation,
      experience,
      status: APPLICATION_STATUS.pending,
      submittedAt: serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
    });

    return {
      success: true,
      applicationId: applicationRef.id,
      message: 'Application submitted successfully',
    };
  } catch (error) {
    console.error('Error submitting application:', error);
    return {
      success: false,
      message: error.message || 'Failed to submit application',
    };
  }
}

/**
 * Get user's kreator application
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Application data or null
 */
export async function getUserApplication(userId) {
  try {
    const q = query(
      collection(db, COLLECTIONS.kreatorApplications),
      where('userId', '==', userId),
      orderBy('submittedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user application:', error);
    return null;
  }
}

/**
 * Get all pending applications (admin only)
 * @returns {Promise<Array>} Array of applications
 */
export async function getPendingApplications() {
  try {
    const q = query(
      collection(db, COLLECTIONS.kreatorApplications),
      where('status', '==', APPLICATION_STATUS.pending),
      orderBy('submittedAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching pending applications:', error);
    return [];
  }
}

/**
 * Get all applications with optional status filter (admin only)
 * @param {string} statusFilter - Optional status to filter by
 * @returns {Promise<Array>} Array of applications
 */
export async function getAllApplications(statusFilter = null) {
  try {
    let q;
    
    if (statusFilter) {
      q = query(
        collection(db, COLLECTIONS.kreatorApplications),
        where('status', '==', statusFilter),
        orderBy('submittedAt', 'desc')
      );
    } else {
      q = query(
        collection(db, COLLECTIONS.kreatorApplications),
        orderBy('submittedAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching applications:', error);
    return [];
  }
}

/**
 * Approve kreator application (admin only)
 * @param {string} applicationId - Application ID
 * @param {string} adminId - Admin user ID
 * @returns {Promise<Object>} { success, message }
 */
export async function approveApplication(applicationId, adminId) {
  try {
    const appRef = doc(db, COLLECTIONS.kreatorApplications, applicationId);
    const appSnap = await getDoc(appRef);

    if (!appSnap.exists()) {
      return { success: false, message: 'Application not found' };
    }

    const appData = appSnap.data();

    // Update application status
    await updateDoc(appRef, {
      status: APPLICATION_STATUS.approved,
      reviewedAt: serverTimestamp(),
      reviewedBy: adminId,
    });

    // Promote user to kreator role
    await updateUserRole(appData.userId, USER_ROLES.kreator, adminId);

    return {
      success: true,
      message: 'Application approved and user promoted to kreator',
    };
  } catch (error) {
    console.error('Error approving application:', error);
    return {
      success: false,
      message: error.message || 'Failed to approve application',
    };
  }
}

/**
 * Reject kreator application (admin only)
 * @param {string} applicationId - Application ID
 * @param {string} adminId - Admin user ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} { success, message }
 */
export async function rejectApplication(applicationId, adminId, reason) {
  try {
    const appRef = doc(db, COLLECTIONS.kreatorApplications, applicationId);
    const appSnap = await getDoc(appRef);

    if (!appSnap.exists()) {
      return { success: false, message: 'Application not found' };
    }

    // Update application status
    await updateDoc(appRef, {
      status: APPLICATION_STATUS.rejected,
      reviewedAt: serverTimestamp(),
      reviewedBy: adminId,
      rejectionReason: reason,
    });

    return {
      success: true,
      message: 'Application rejected',
    };
  } catch (error) {
    console.error('Error rejecting application:', error);
    return {
      success: false,
      message: error.message || 'Failed to reject application',
    };
  }
}

/**
 * Get application statistics (admin only)
 * @returns {Promise<Object>} Statistics object
 */
export async function getApplicationStats() {
  try {
    const allApps = await getAllApplications();
    
    const stats = {
      total: allApps.length,
      pending: allApps.filter(app => app.status === APPLICATION_STATUS.pending).length,
      approved: allApps.filter(app => app.status === APPLICATION_STATUS.approved).length,
      rejected: allApps.filter(app => app.status === APPLICATION_STATUS.rejected).length,
    };

    return stats;
  } catch (error) {
    console.error('Error fetching application stats:', error);
    return { total: 0, pending: 0, approved: 0, rejected: 0 };
  }
}
