import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../config/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import userStorage from "../utils/userStorage";

const AuthContext = createContext();

// Helper function to save user to Firestore
async function saveUserToFirestore(userData) {
  if (!db) {
    console.warn("Firestore not available, skipping save");
    return;
  }

  try {
    const userRef = doc(db, "fremio_all_users", userData.uid);
    await setDoc(
      userRef,
      {
        ...userData,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log("✅ User saved to Firestore:", userData.email);
  } catch (error) {
    console.error("❌ Error saving to Firestore:", error);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auto-migrate profile photo from email-based to UID-based key
  const migrateProfilePhoto = (userData) => {
    if (!userData.uid || !userData.email) return;

    const uidKey = `profilePhoto_${userData.uid}`;
    const emailKey = `profilePhoto_${userData.email}`;

    // Check if photo exists with email key but not UID key
    const photoByEmail = localStorage.getItem(emailKey);
    const photoByUid = localStorage.getItem(uidKey);

    if (photoByEmail && !photoByUid) {
      // Migrate from email to UID
      localStorage.setItem(uidKey, photoByEmail);
      console.log(`✅ Auto-migrated profile photo: ${userData.email} → UID`);
    }
  };

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in with Firebase
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName:
            firebaseUser.displayName || firebaseUser.email?.split("@")[0],
          emailVerified: firebaseUser.emailVerified,
        };

        setUser(userData);
        localStorage.setItem("fremio_user", JSON.stringify(userData));

        // Auto-migrate profile photo
        migrateProfilePhoto(userData);

        console.log("✅ Firebase user authenticated:", userData.email);
        setLoading(false);
      } else {
        // Check if there's a stored user session (for hardcoded admin)
        const storedUser = localStorage.getItem("fremio_user");
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            console.log(
              "✅ Restored user session from localStorage:",
              userData.email
            );
            setUser(userData);
          } catch (error) {
            console.error("Error parsing stored user:", error);
            localStorage.removeItem("fremio_user");
          }
        } else {
          // No user at all
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  function login(userData) {
    setUser(userData);
    localStorage.setItem("fremio_user", JSON.stringify(userData));
  }

  async function logout() {
    try {
      await signOut(auth);
      userStorage.clearUserData();
      setUser(null);
      localStorage.removeItem("fremio_user");
      console.log("✅ User logged out successfully");
    } catch (error) {
      console.error("❌ Logout error:", error);
      throw error;
    }
  }

  async function register(userData) {
    try {
      const { email, password, firstName, lastName } = userData;

      // Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      console.log("✅ User registered successfully:", firebaseUser.email);

      // Save user to Firestore for admin management
      const newUserData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name:
          `${firstName || ""} ${lastName || ""}`.trim() ||
          firebaseUser.email?.split("@")[0],
        displayName: `${firstName || ""} ${lastName || ""}`.trim(),
        role: "user",
        status: "active",
        createdAt: new Date().toISOString(),
      };

      // Save to Firestore
      await saveUserToFirestore(newUserData);

      // Also save to localStorage for backward compatibility
      try {
        console.log("💾 Saving user to localStorage...");
        const { saveUserToStorage } = await import("../services/userService");
        const savedUser = saveUserToStorage(newUserData);
        console.log("✅ User saved to localStorage:", savedUser);
      } catch (err) {
        console.error("❌ Error saving user to localStorage:", err);
      }

      // Immediately sign out so user must login manually
      await signOut(auth);
      console.log("✅ User signed out after registration");

      return {
        success: true,
        message: "Registration successful",
        user: firebaseUser,
      };
    } catch (error) {
      console.error("❌ Registration error:", error);

      let message = "Registration failed";
      if (error.code === "auth/email-already-in-use") {
        message = "Email already registered";
      } else if (error.code === "auth/weak-password") {
        message = "Password should be at least 6 characters";
      } else if (error.code === "auth/invalid-email") {
        message = "Invalid email address";
      }

      return { success: false, message };
    }
  }

  async function authenticateUser(email, password) {
    try {
      // Hardcoded admin login
      if (email === "admin@admin.com" && password === "admin") {
        const adminUser = {
          email: "admin@admin.com",
          displayName: "Administrator",
          role: "admin",
          uid: "admin-uid-001",
        };
        setUser(adminUser);
        localStorage.setItem("fremio_user", JSON.stringify(adminUser));

        // Save admin to Firestore
        await saveUserToFirestore({
          uid: adminUser.uid,
          email: adminUser.email,
          name: adminUser.displayName,
          displayName: adminUser.displayName,
          role: "admin",
          status: "active",
          createdAt: new Date().toISOString(),
        });

        // Also save to localStorage
        try {
          const { saveUserToStorage } = await import("../services/userService");
          saveUserToStorage({
            id: adminUser.uid,
            uid: adminUser.uid,
            email: adminUser.email,
            name: adminUser.displayName,
            displayName: adminUser.displayName,
            role: "admin",
            status: "active",
            createdAt: new Date().toISOString(),
          });
        } catch (err) {
          console.error("Error saving admin to storage:", err);
        }

        return { success: true, message: "Admin login successful" };
      }

      // Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      console.log("✅ User logged in successfully:", firebaseUser.email);

      // Save/update Firebase user to Firestore for admin visibility
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email?.split("@")[0],
        displayName:
          firebaseUser.displayName || firebaseUser.email?.split("@")[0],
        role: "user",
        status: "active",
        lastLoginAt: new Date().toISOString(),
      };

      // Save to Firestore
      await saveUserToFirestore(userData);

      // Also save to localStorage
      try {
        const { saveUserToStorage } = await import("../services/userService");
        saveUserToStorage(userData);
        console.log("✅ Firebase user saved to storage");
      } catch (err) {
        console.error("❌ Error saving Firebase user to storage:", err);
      }

      return {
        success: true,
        message: "Login successful",
        user: firebaseUser,
      };
    } catch (error) {
      console.error("❌ Login error:", error);

      let message = "Invalid email or password";
      if (error.code === "auth/user-not-found") {
        message = "No account found with this email";
      } else if (error.code === "auth/wrong-password") {
        message = "Incorrect password";
      } else if (error.code === "auth/invalid-email") {
        message = "Invalid email address";
      }

      return { success: false, message };
    }
  }

  function updateUser(updatedUserData) {
    setUser(updatedUserData);
    localStorage.setItem("fremio_user", JSON.stringify(updatedUserData));
    localStorage.setItem(
      `userProfile_${updatedUserData.email}`,
      JSON.stringify(updatedUserData)
    );
  }

  async function changePassword(currentPassword, newPassword) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        return { success: false, message: "No user logged in" };
      }

      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);

      console.log("✅ Password changed successfully");
      return { success: true, message: "Password changed successfully" };
    } catch (error) {
      console.error("❌ Change password error:", error);

      let message = "Failed to change password";
      if (error.code === "auth/wrong-password") {
        message = "Current password is incorrect";
      } else if (error.code === "auth/weak-password") {
        message = "New password should be at least 6 characters";
      } else if (error.code === "auth/requires-recent-login") {
        message = "Please logout and login again before changing password";
      }

      return { success: false, message };
    }
  }

  async function resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log("✅ Password reset email sent");
      return { success: true, message: "Password reset email sent" };
    } catch (error) {
      console.error("❌ Reset password error:", error);

      let message = "Failed to send reset email";
      if (error.code === "auth/user-not-found") {
        message = "No account found with this email";
      } else if (error.code === "auth/invalid-email") {
        message = "Invalid email address";
      }

      return { success: false, message };
    }
  }

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        register,
        authenticateUser,
        updateUser,
        changePassword,
        resetPassword,
        isAuthenticated,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
