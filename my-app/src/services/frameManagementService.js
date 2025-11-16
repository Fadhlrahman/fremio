import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../config/firebase";
import { COLLECTIONS, FRAME_STATUS } from "../config/firebaseCollections";

/**
 * Frame CRUD Service for Firestore
 * Manages frame documents and workflow (draft → review → approved)
 */

/**
 * Create a new frame (draft)
 */
export async function createFrameDocument(frameData, userId) {
  try {
    const frameRef = await addDoc(collection(db, COLLECTIONS.frames), {
      ...frameData,
      createdBy: userId,
      status: FRAME_STATUS.DRAFT,
      isPublic: false,
      views: 0,
      uses: 0,
      likes: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      frameId: frameRef.id,
      message: "Frame created successfully",
    };
  } catch (error) {
    console.error("Error creating frame:", error);
    return {
      success: false,
      message: error.message || "Failed to create frame",
    };
  }
}

/**
 * Update frame data
 */
export async function updateFrameDocument(frameId, updates, userId) {
  try {
    const frameRef = doc(db, COLLECTIONS.frames, frameId);
    const frameSnap = await getDoc(frameRef);

    if (!frameSnap.exists()) {
      return { success: false, message: "Frame not found" };
    }

    const frameData = frameSnap.data();

    // Check permission (only owner or admin can update)
    if (frameData.createdBy !== userId) {
      return { success: false, message: "Permission denied" };
    }

    await updateDoc(frameRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    return { success: true, message: "Frame updated successfully" };
  } catch (error) {
    console.error("Error updating frame:", error);
    return {
      success: false,
      message: error.message || "Failed to update frame",
    };
  }
}

/**
 * Delete frame
 */
export async function deleteFrameDocument(frameId, userId) {
  try {
    const frameRef = doc(db, COLLECTIONS.frames, frameId);
    const frameSnap = await getDoc(frameRef);

    if (!frameSnap.exists()) {
      return { success: false, message: "Frame not found" };
    }

    const frameData = frameSnap.data();

    // Check permission
    if (frameData.createdBy !== userId) {
      return { success: false, message: "Permission denied" };
    }

    // Delete frame thumbnail if exists
    if (frameData.thumbnailUrl) {
      try {
        const thumbnailRef = ref(storage, frameData.thumbnailUrl);
        await deleteObject(thumbnailRef);
      } catch (err) {
        console.warn("Failed to delete thumbnail:", err);
      }
    }

    await deleteDoc(frameRef);

    return { success: true, message: "Frame deleted successfully" };
  } catch (error) {
    console.error("Error deleting frame:", error);
    return {
      success: false,
      message: error.message || "Failed to delete frame",
    };
  }
}

/**
 * Submit frame for review
 */
export async function submitFrameForReview(frameId, userId) {
  try {
    const frameRef = doc(db, COLLECTIONS.frames, frameId);
    const frameSnap = await getDoc(frameRef);

    if (!frameSnap.exists()) {
      return { success: false, message: "Frame not found" };
    }

    const frameData = frameSnap.data();

    // Check permission
    if (frameData.createdBy !== userId) {
      return { success: false, message: "Permission denied" };
    }

    // Check if frame is in draft or request_changes status
    if (
      ![FRAME_STATUS.DRAFT, FRAME_STATUS.REQUEST_CHANGES].includes(
        frameData.status
      )
    ) {
      return { success: false, message: "Frame is not in editable state" };
    }

    await updateDoc(frameRef, {
      status: FRAME_STATUS.PENDING_REVIEW,
      submittedForReviewAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, message: "Frame submitted for review" };
  } catch (error) {
    console.error("Error submitting frame:", error);
    return {
      success: false,
      message: error.message || "Failed to submit frame",
    };
  }
}

/**
 * Approve frame (admin only)
 */
export async function approveFrame(frameId, adminId) {
  try {
    const frameRef = doc(db, COLLECTIONS.frames, frameId);

    await updateDoc(frameRef, {
      status: FRAME_STATUS.APPROVED,
      isPublic: true,
      approvedAt: serverTimestamp(),
      approvedBy: adminId,
      updatedAt: serverTimestamp(),
    });

    return { success: true, message: "Frame approved and published" };
  } catch (error) {
    console.error("Error approving frame:", error);
    return {
      success: false,
      message: error.message || "Failed to approve frame",
    };
  }
}

/**
 * Reject frame (admin only)
 */
export async function rejectFrame(frameId, adminId, reason) {
  try {
    const frameRef = doc(db, COLLECTIONS.frames, frameId);

    await updateDoc(frameRef, {
      status: FRAME_STATUS.REJECTED,
      isPublic: false,
      rejectedAt: serverTimestamp(),
      rejectedBy: adminId,
      rejectionReason: reason,
      updatedAt: serverTimestamp(),
    });

    return { success: true, message: "Frame rejected" };
  } catch (error) {
    console.error("Error rejecting frame:", error);
    return {
      success: false,
      message: error.message || "Failed to reject frame",
    };
  }
}

/**
 * Request changes on frame (admin only)
 */
export async function requestFrameChanges(frameId, adminId, feedback) {
  try {
    const frameRef = doc(db, COLLECTIONS.frames, frameId);

    await updateDoc(frameRef, {
      status: FRAME_STATUS.REQUEST_CHANGES,
      isPublic: false,
      changeRequestedAt: serverTimestamp(),
      changeRequestedBy: adminId,
      changeRequestFeedback: feedback,
      updatedAt: serverTimestamp(),
    });

    return { success: true, message: "Change request sent" };
  } catch (error) {
    console.error("Error requesting changes:", error);
    return {
      success: false,
      message: error.message || "Failed to request changes",
    };
  }
}

/**
 * Get user's frames with optional status filter
 */
export async function getKreatorFrames(userId, statusFilter = null) {
  try {
    let q;

    if (statusFilter) {
      q = query(
        collection(db, COLLECTIONS.frames),
        where("createdBy", "==", userId),
        where("status", "==", statusFilter),
        orderBy("updatedAt", "desc")
      );
    } else {
      q = query(
        collection(db, COLLECTIONS.frames),
        where("createdBy", "==", userId),
        orderBy("updatedAt", "desc")
      );
    }

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching user frames:", error);
    return [];
  }
}

/**
 * Get all approved public frames
 */
export async function getApprovedFrames(categoryFilter = null) {
  try {
    let q;

    if (categoryFilter) {
      q = query(
        collection(db, COLLECTIONS.frames),
        where("status", "==", FRAME_STATUS.APPROVED),
        where("isPublic", "==", true),
        where("category", "==", categoryFilter),
        orderBy("createdAt", "desc")
      );
    } else {
      q = query(
        collection(db, COLLECTIONS.frames),
        where("status", "==", FRAME_STATUS.APPROVED),
        where("isPublic", "==", true),
        orderBy("createdAt", "desc")
      );
    }

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching public frames:", error);
    return [];
  }
}

/**
 * Get frames pending review (admin only)
 */
export async function getPendingFrames() {
  try {
    const q = query(
      collection(db, COLLECTIONS.frames),
      where("status", "==", FRAME_STATUS.PENDING_REVIEW),
      orderBy("submittedForReviewAt", "asc")
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching pending frames:", error);
    return [];
  }
}

/**
 * Get all frames with status filter (admin only)
 */
export async function getAllFrames(statusFilter = null) {
  try {
    let q;

    if (statusFilter) {
      q = query(
        collection(db, COLLECTIONS.frames),
        where("status", "==", statusFilter),
        orderBy("updatedAt", "desc")
      );
    } else {
      q = query(
        collection(db, COLLECTIONS.frames),
        orderBy("updatedAt", "desc")
      );
    }

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching all frames:", error);
    return [];
  }
}

/**
 * Increment frame usage count
 */
export async function incrementFrameUses(frameId) {
  try {
    const frameRef = doc(db, COLLECTIONS.frames, frameId);
    await updateDoc(frameRef, {
      uses: increment(1),
    });
  } catch (error) {
    console.error("Error incrementing frame uses:", error);
  }
}

/**
 * Increment frame view count
 */
export async function incrementFrameViews(frameId) {
  try {
    const frameRef = doc(db, COLLECTIONS.frames, frameId);
    await updateDoc(frameRef, {
      views: increment(1),
    });
  } catch (error) {
    console.error("Error incrementing frame views:", error);
  }
}

/**
 * Upload frame thumbnail to Firebase Storage
 */
export async function uploadFrameThumbnail(file, frameId) {
  try {
    const storageRef = ref(storage, `frames/${frameId}/thumbnail.jpg`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading thumbnail:", error);
    throw error;
  }
}

/**
 * Get frame statistics (admin/kreator)
 */
export async function getFrameStats(userId = null) {
  try {
    let frames;

    if (userId) {
      // Get stats for specific kreator
      frames = await getKreatorFrames(userId);
    } else {
      // Get stats for all frames (admin only)
      frames = await getAllFrames();
    }

    const stats = {
      total: frames.length,
      draft: frames.filter((f) => f.status === FRAME_STATUS.DRAFT).length,
      pending: frames.filter((f) => f.status === FRAME_STATUS.PENDING_REVIEW)
        .length,
      approved: frames.filter((f) => f.status === FRAME_STATUS.APPROVED).length,
      rejected: frames.filter((f) => f.status === FRAME_STATUS.REJECTED).length,
      requestChanges: frames.filter(
        (f) => f.status === FRAME_STATUS.REQUEST_CHANGES
      ).length,
    };

    return stats;
  } catch (error) {
    console.error("Error fetching frame stats:", error);
    return {
      total: 0,
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      requestChanges: 0,
    };
  }
}
