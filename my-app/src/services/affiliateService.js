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
  Timestamp,
} from "firebase/firestore";

const STORAGE_KEY = "fremio_affiliate_applications";

// Helper: Get from LocalStorage
const getFromLocalStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return [];
  }
};

// Helper: Save to LocalStorage
const saveToLocalStorage = (applications) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

// Submit new affiliate application
export const submitAffiliateApplication = async (applicationData) => {
  console.log("📝 submitAffiliateApplication called with:", applicationData);

  const timestamp = new Date().toISOString();
  const id = `aff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newApplication = {
    ...applicationData,
    status: "pending", // pending, approved, rejected
    submittedAt: timestamp,
    reviewedAt: null,
    reviewedBy: null,
    id,
  };

  console.log("📦 New application object:", newApplication);

  // Save to LocalStorage first (always as backup)
  try {
    const applications = getFromLocalStorage();
    console.log(
      "📂 Current applications in localStorage:",
      applications.length
    );

    applications.push(newApplication);
    saveToLocalStorage(applications);

    console.log("✅ Affiliate application saved to localStorage");
    console.log("📊 Total applications now:", applications.length);
  } catch (error) {
    console.error("❌ Error saving to localStorage:", error);
  }

  // Try Firebase
  if (isFirebaseConfigured && db) {
    try {
      const docRef = await addDoc(collection(db, "affiliate_applications"), {
        ...newApplication,
        submittedAt: Timestamp.now(),
      });
      console.log(
        "✅ Affiliate application also saved to Firestore:",
        docRef.id
      );
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("❌ Firebase error (data already in localStorage):", error);
      return { success: true, id, mode: "localStorage" };
    }
  }

  return { success: true, id, mode: "localStorage" };
};

// Get all affiliate applications
export const getAllAffiliateApplications = async () => {
  // Always read from LocalStorage first (it's our primary storage now)
  const localApplications = getFromLocalStorage();
  console.log(
    `✅ Retrieved ${localApplications.length} affiliate applications from localStorage`
  );

  // Also try to sync with Firestore if available
  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, "affiliate_applications"),
        orderBy("submittedAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const firestoreApplications = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        firestoreApplications.push({
          id: doc.id,
          ...data,
          submittedAt:
            data.submittedAt?.toDate?.()?.toISOString() || data.submittedAt,
          reviewedAt:
            data.reviewedAt?.toDate?.()?.toISOString() || data.reviewedAt,
        });
      });

      if (firestoreApplications.length > 0) {
        console.log(
          `✅ Also found ${firestoreApplications.length} applications in Firestore`
        );

        // Merge: Add Firestore apps that don't exist in localStorage
        const localIds = new Set(localApplications.map((app) => app.id));
        const newAppsFromFirestore = firestoreApplications.filter(
          (app) => !localIds.has(app.id)
        );

        if (newAppsFromFirestore.length > 0) {
          const merged = [...localApplications, ...newAppsFromFirestore];
          saveToLocalStorage(merged);
          console.log(
            `✅ Merged ${newAppsFromFirestore.length} new apps from Firestore to localStorage`
          );
          return merged.sort(
            (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
          );
        }
      }
    } catch (error) {
      // Silently fallback to localStorage if Firebase fails
    }
  }

  // Return localStorage data sorted by date
  return localApplications.sort(
    (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
  );
};

// Get applications by status
export const getApplicationsByStatus = async (status) => {
  const allApplications = await getAllAffiliateApplications();
  return allApplications.filter((app) => app.status === status);
};

// Update application status (approve/reject)
export const updateApplicationStatus = async (
  applicationId,
  status,
  reviewerEmail
) => {
  const timestamp = new Date().toISOString();
  const updateData = {
    status,
    reviewedAt: timestamp,
    reviewedBy: reviewerEmail,
  };

  // Update LocalStorage first
  try {
    const applications = getFromLocalStorage();
    const index = applications.findIndex((app) => app.id === applicationId);
    if (index !== -1) {
      applications[index] = { ...applications[index], ...updateData };
      saveToLocalStorage(applications);
      console.log(`✅ Application ${applicationId} updated in localStorage`);
    } else {
      console.error(
        `❌ Application ${applicationId} not found in localStorage`
      );
      return { success: false, error: "Application not found" };
    }
  } catch (error) {
    console.error("❌ Error updating localStorage:", error);
  }

  // Also update in Firebase if available
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, "affiliate_applications", applicationId);
      await updateDoc(docRef, {
        ...updateData,
        reviewedAt: Timestamp.now(),
      });
      console.log(`✅ Application ${applicationId} also updated in Firestore`);
    } catch (error) {
      console.error(
        "❌ Firebase update error (localStorage already updated):",
        error
      );
    }
  }

  return { success: true };
};

// Delete application
export const deleteAffiliateApplication = async (applicationId) => {
  // Delete from LocalStorage first
  try {
    const applications = getFromLocalStorage();
    const filtered = applications.filter((app) => app.id !== applicationId);
    saveToLocalStorage(filtered);
    console.log(`✅ Application ${applicationId} deleted from localStorage`);
  } catch (error) {
    console.error("❌ Error deleting from localStorage:", error);
  }

  // Also delete from Firebase if available
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, "affiliate_applications", applicationId));
      console.log(
        `✅ Application ${applicationId} also deleted from Firestore`
      );
    } catch (error) {
      console.error(
        "❌ Firebase delete error (localStorage already deleted):",
        error
      );
    }
  }

  return { success: true };
};

// Get statistics
export const getAffiliateStats = async () => {
  const applications = await getAllAffiliateApplications();
  return {
    total: applications.length,
    pending: applications.filter((app) => app.status === "pending").length,
    approved: applications.filter((app) => app.status === "approved").length,
    rejected: applications.filter((app) => app.status === "rejected").length,
  };
};
