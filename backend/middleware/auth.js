import { getAuth } from "../config/firebase.js";

/**
 * Verify Firebase ID Token from Authorization header
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const idToken = authHeader.split("Bearer ")[1];

    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.user = decodedToken;

    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/**
 * Check if user is admin
 */
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { getFirestore } = await import("../config/firebase.js");
    const db = getFirestore();

    const userDoc = await db.collection("users").doc(req.user.uid).get();

    if (!userDoc.exists || userDoc.data().role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    req.userRole = "admin";
    next();
  } catch (error) {
    console.error("Admin check failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify admin status",
    });
  }
};

/**
 * Check if user is kreator or admin
 */
export const requireKreator = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { getFirestore } = await import("../config/firebase.js");
    const db = getFirestore();

    const userDoc = await db.collection("users").doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const role = userDoc.data().role;
    if (role !== "kreator" && role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Kreator or admin access required",
      });
    }

    req.userRole = role;
    next();
  } catch (error) {
    console.error("Kreator check failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify kreator status",
    });
  }
};

/**
 * Optional authentication - continues even if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await getAuth().verifyIdToken(idToken);
      req.user = decodedToken;
    }

    next();
  } catch (error) {
    // Continue without user context
    next();
  }
};

export default { verifyToken, requireAdmin, requireKreator, optionalAuth };
