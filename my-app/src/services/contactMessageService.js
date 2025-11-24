import { db, isFirebaseConfigured } from "../config/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import { COLLECTIONS } from "../config/firebaseCollections";

// LocalStorage key for contact messages
const CONTACT_MESSAGES_KEY = "contact_messages";

/**
 * Submit a new contact message
 */
export const submitContactMessage = async (messageData) => {
  try {
    const messageWithTimestamp = {
      ...messageData,
      status: "new",
      priority: getPriority(messageData.topic),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured) {
      // Firebase mode
      const docRef = await addDoc(
        collection(db, COLLECTIONS.CONTACT_MESSAGES),
        {
          ...messageWithTimestamp,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }
      );
      return { success: true, id: docRef.id };
    } else {
      // LocalStorage mode
      const messages = getMessagesFromLocalStorage();
      const newMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...messageWithTimestamp,
      };
      messages.push(newMessage);
      localStorage.setItem(CONTACT_MESSAGES_KEY, JSON.stringify(messages));
      return { success: true, id: newMessage.id };
    }
  } catch (error) {
    console.error("Error submitting contact message:", error);
    throw error;
  }
};

/**
 * Get all contact messages (Admin only)
 */
export const getAllContactMessages = async () => {
  try {
    if (!isFirebaseConfigured || !db) {
      // LocalStorage mode
      const messages = getMessagesFromLocalStorage();
      return messages.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }

    try {
      // Firebase mode
      const q = query(
        collection(db, COLLECTIONS.CONTACT_MESSAGES),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        repliedAt: doc.data().repliedAt?.toDate?.() || null,
      }));
    } catch (firebaseError) {
      // Fallback to LocalStorage if Firebase fails
      console.warn(
        "Firebase failed, using LocalStorage:",
        firebaseError.message
      );
      const messages = getMessagesFromLocalStorage();
      return messages.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }
  } catch (error) {
    console.error("Error getting contact messages:", error);
    return [];
  }
};

/**
 * Get unread messages count (for notification badge)
 */
export const getUnreadMessagesCount = async () => {
  try {
    if (!isFirebaseConfigured || !db) {
      const messages = getMessagesFromLocalStorage();
      return messages.filter((msg) => msg.status === "new").length;
    }

    try {
      const q = query(
        collection(db, COLLECTIONS.CONTACT_MESSAGES),
        where("status", "==", "new")
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (firebaseError) {
      console.warn(
        "Firebase failed, using LocalStorage:",
        firebaseError.message
      );
      const messages = getMessagesFromLocalStorage();
      return messages.filter((msg) => msg.status === "new").length;
    }
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
};

/**
 * Update message status
 */
export const updateMessageStatus = async (messageId, status) => {
  try {
    if (isFirebaseConfigured) {
      const messageRef = doc(db, COLLECTIONS.CONTACT_MESSAGES, messageId);
      await updateDoc(messageRef, {
        status,
        updatedAt: Timestamp.now(),
      });
    } else {
      const messages = getMessagesFromLocalStorage();
      const index = messages.findIndex((msg) => msg.id === messageId);
      if (index !== -1) {
        messages[index].status = status;
        messages[index].updatedAt = new Date().toISOString();
        localStorage.setItem(CONTACT_MESSAGES_KEY, JSON.stringify(messages));
      }
    }
    return { success: true };
  } catch (error) {
    console.error("Error updating message status:", error);
    throw error;
  }
};

/**
 * Reply to message
 */
export const replyToMessage = async (messageId, reply, adminUid) => {
  try {
    if (isFirebaseConfigured) {
      const messageRef = doc(db, COLLECTIONS.CONTACT_MESSAGES, messageId);
      await updateDoc(messageRef, {
        reply,
        repliedBy: adminUid,
        repliedAt: Timestamp.now(),
        status: "replied",
        updatedAt: Timestamp.now(),
      });
    } else {
      const messages = getMessagesFromLocalStorage();
      const index = messages.findIndex((msg) => msg.id === messageId);
      if (index !== -1) {
        messages[index].reply = reply;
        messages[index].repliedBy = adminUid || "admin";
        messages[index].repliedAt = new Date().toISOString();
        messages[index].status = "replied";
        messages[index].updatedAt = new Date().toISOString();
        localStorage.setItem(CONTACT_MESSAGES_KEY, JSON.stringify(messages));
      }
    }
    return { success: true };
  } catch (error) {
    console.error("Error replying to message:", error);
    throw error;
  }
};

/**
 * Delete message
 */
export const deleteContactMessage = async (messageId) => {
  try {
    if (isFirebaseConfigured) {
      await deleteDoc(doc(db, COLLECTIONS.CONTACT_MESSAGES, messageId));
    } else {
      const messages = getMessagesFromLocalStorage();
      const filtered = messages.filter((msg) => msg.id !== messageId);
      localStorage.setItem(CONTACT_MESSAGES_KEY, JSON.stringify(filtered));
    }
    return { success: true };
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
};

// Helper Functions

/**
 * Get messages from localStorage
 */
const getMessagesFromLocalStorage = () => {
  try {
    const messages = localStorage.getItem(CONTACT_MESSAGES_KEY);
    return messages ? JSON.parse(messages) : [];
  } catch (error) {
    console.error("Error reading messages from localStorage:", error);
    return [];
  }
};

/**
 * Determine priority based on topic
 */
const getPriority = (topic) => {
  switch (topic) {
    case "technical":
      return "high";
    case "billing":
      return "high";
    case "account":
      return "medium";
    case "feedback":
      return "low";
    case "general":
    default:
      return "medium";
  }
};

/**
 * Get topic label
 */
export const getTopicLabel = (topic) => {
  const labels = {
    technical: "🔧 Technical Support",
    account: "👤 Account Issues",
    billing: "💳 Billing & Payments",
    general: "❓ General Inquiry",
    feedback: "💬 Feedback & Suggestions",
  };
  return labels[topic] || topic;
};

/**
 * Get status badge color
 */
export const getStatusColor = (status) => {
  const colors = {
    new: "#3b82f6", // blue
    read: "#f59e0b", // orange
    replied: "#10b981", // green
    closed: "#6b7280", // gray
  };
  return colors[status] || "#6b7280";
};

/**
 * Get priority color
 */
export const getPriorityColor = (priority) => {
  const colors = {
    low: "#10b981", // green
    medium: "#f59e0b", // orange
    high: "#ef4444", // red
  };
  return colors[priority] || "#6b7280";
};
