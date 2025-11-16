import React, { createContext, useContext, useState, useEffect } from "react";
import userStorage from "../utils/userStorage";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("fremio_user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);

        // Check if there's an updated profile in localStorage
        const userProfile = localStorage.getItem(
          `userProfile_${parsedUser.email}`
        );
        if (userProfile) {
          try {
            const updatedProfile = JSON.parse(userProfile);
            setUser(updatedProfile);
          } catch (e) {
            setUser(parsedUser);
          }
        } else {
          setUser(parsedUser);
        }
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem("fremio_user");
      }
    }
    setLoading(false);
  }, []);

  function login(userData) {
    setUser(userData);
    localStorage.setItem("fremio_user", JSON.stringify(userData));
  }

  function logout() {
    // Clear ALL user-specific data using userStorage
    userStorage.clearUserData();

    setUser(null);
    localStorage.removeItem("fremio_user");

    console.log("✅ User logged out and all session data cleared");
  }

  function register(userData) {
    // Simpan ke localStorage (simulasi database)
    const users = JSON.parse(localStorage.getItem("fremio_users") || "[]");

    // Check if email already exists
    const existingUser = users.find((u) => u.email === userData.email);
    if (existingUser) {
      return { success: false, message: "Email already registered" };
    }

    // Add new user
    users.push(userData);
    localStorage.setItem("fremio_users", JSON.stringify(users));

    // Auto login after register
    login(userData);
    return { success: true, message: "Registration successful" };
  }

  function authenticateUser(email, password) {
    // Hardcoded admin login - menggunakan email format
    if (email === "admin@admin.com" && password === "admin") {
      const adminUser = {
        email: "admin@admin.com",
        name: "Administrator",
        role: "admin",
        uid: "admin-uid-001",
      };
      login(adminUser);
      return { success: true, message: "Admin login successful" };
    }

    const users = JSON.parse(localStorage.getItem("fremio_users") || "[]");
    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (user) {
      // Don't store password in session
      const { password, ...userWithoutPassword } = user;
      login(userWithoutPassword);
      return { success: true, message: "Login successful" };
    }

    return { success: false, message: "Invalid email or password" };
  }

  function updateUser(updatedUserData) {
    setUser(updatedUserData);
    localStorage.setItem("fremio_user", JSON.stringify(updatedUserData));
    localStorage.setItem(
      `userProfile_${updatedUserData.email}`,
      JSON.stringify(updatedUserData)
    );
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
