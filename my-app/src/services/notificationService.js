import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS } from '../config/firebaseCollections';

/**
 * Notification Service
 * Manages user notifications for application and frame status changes
 */

/**
 * Create a notification
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} { success, notificationId, message }
 */
export async function createNotification(notificationData) {
  try {
    const { userId, title, message, type, relatedId } = notificationData;

    const notificationRef = await addDoc(collection(db, COLLECTIONS.notifications), {
      userId,
      title,
      message,
      type,
      relatedId: relatedId || null,
      isRead: false,
      createdAt: serverTimestamp(),
    });

    return {
      success: true,
      notificationId: notificationRef.id,
      message: 'Notification created',
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    return {
      success: false,
      message: error.message || 'Failed to create notification',
    };
  }
}

/**
 * Get user notifications
 * @param {string} userId - User ID
 * @param {number} limitCount - Max notifications to fetch
 * @returns {Promise<Array>} Array of notifications
 */
export async function getUserNotifications(userId, limitCount = 50) {
  try {
    const q = query(
      collection(db, COLLECTIONS.notifications),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Get unread notifications count
 * @param {string} userId - User ID
 * @returns {Promise<number>} Unread count
 */
export async function getUnreadCount(userId) {
  try {
    const q = query(
      collection(db, COLLECTIONS.notifications),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} { success, message }
 */
export async function markAsRead(notificationId) {
  try {
    const notificationRef = doc(db, COLLECTIONS.notifications, notificationId);
    await updateDoc(notificationRef, {
      isRead: true,
    });

    return { success: true, message: 'Notification marked as read' };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return {
      success: false,
      message: error.message || 'Failed to mark as read',
    };
  }
}

/**
 * Mark all user notifications as read
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { success, message }
 */
export async function markAllAsRead(userId) {
  try {
    const q = query(
      collection(db, COLLECTIONS.notifications),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );

    const querySnapshot = await getDocs(q);

    const updatePromises = querySnapshot.docs.map(doc =>
      updateDoc(doc.ref, { isRead: true })
    );

    await Promise.all(updatePromises);

    return { success: true, message: 'All notifications marked as read' };
  } catch (error) {
    console.error('Error marking all as read:', error);
    return {
      success: false,
      message: error.message || 'Failed to mark all as read',
    };
  }
}

/**
 * Delete notification
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} { success, message }
 */
export async function deleteNotification(notificationId) {
  try {
    const notificationRef = doc(db, COLLECTIONS.notifications, notificationId);
    await deleteDoc(notificationRef);

    return { success: true, message: 'Notification deleted' };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return {
      success: false,
      message: error.message || 'Failed to delete notification',
    };
  }
}

/**
 * Notification templates for common events
 */

export async function notifyApplicationApproved(userId, applicationId) {
  return await createNotification({
    userId,
    title: 'Application Approved! 🎉',
    message: 'Congratulations! Your kreator application has been approved. You can now create and publish frames.',
    type: 'application_approved',
    relatedId: applicationId,
  });
}

export async function notifyApplicationRejected(userId, applicationId, reason) {
  return await createNotification({
    userId,
    title: 'Application Update',
    message: `Your kreator application was not approved. Reason: ${reason}`,
    type: 'application_rejected',
    relatedId: applicationId,
  });
}

export async function notifyFrameApproved(userId, frameId, frameName) {
  return await createNotification({
    userId,
    title: 'Frame Approved! ✨',
    message: `Your frame "${frameName}" has been approved and is now live in the marketplace!`,
    type: 'frame_approved',
    relatedId: frameId,
  });
}

export async function notifyFrameRejected(userId, frameId, frameName, reason) {
  return await createNotification({
    userId,
    title: 'Frame Rejected',
    message: `Your frame "${frameName}" was rejected. Reason: ${reason}`,
    type: 'frame_rejected',
    relatedId: frameId,
  });
}

export async function notifyFrameChangesRequested(userId, frameId, frameName, feedback) {
  return await createNotification({
    userId,
    title: 'Changes Requested 📝',
    message: `Changes requested for "${frameName}". Feedback: ${feedback}`,
    type: 'frame_changes_requested',
    relatedId: frameId,
  });
}
