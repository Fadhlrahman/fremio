import express from "express";
import { body } from "express-validator";
import { getFirestore, getAuth } from "../config/firebase.js";
import { verifyToken } from "../middleware/auth.js";
import validate from "../middleware/validator.js";

const router = express.Router();

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get("/me", verifyToken, async (req, res) => {
  try {
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userData = userDoc.data();

    res.json({
      success: true,
      user: {
        uid: req.user.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        photoURL: userData.photoURL,
        createdAt: userData.createdAt,
        stats: {
          totalFramesCreated: userData.totalFramesCreated || 0,
          totalPhotosDownloaded: userData.totalPhotosDownloaded || 0,
          totalVideosDownloaded: userData.totalVideosDownloaded || 0,
        },
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user profile",
    });
  }
});

/**
 * POST /api/auth/register
 * Register new user (create user document in Firestore)
 */
router.post(
  "/register",
  [
    body("uid").notEmpty().withMessage("UID is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("name").notEmpty().withMessage("Name is required"),
  ],
  validate,
  async (req, res) => {
    try {
      const { uid, email, name, photoURL } = req.body;
      const db = getFirestore();

      // Check if user already exists
      const existingUser = await db.collection("users").doc(uid).get();
      if (existingUser.exists) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Create user document
      const userData = {
        uid,
        email,
        name,
        role: "user",
        photoURL: photoURL || null,
        phoneNumber: null,
        bio: null,
        location: null,
        totalFramesCreated: 0,
        totalPhotosDownloaded: 0,
        totalVideosDownloaded: 0,
        preferences: {
          defaultCamera: "user",
          defaultTimer: 3,
          autoSavePhotos: true,
          notificationsEnabled: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      await db.collection("users").doc(uid).set(userData);

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: userData,
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to register user",
      });
    }
  }
);

/**
 * PUT /api/auth/update-profile
 * Update user profile
 */
router.put(
  "/update-profile",
  verifyToken,
  [
    body("name").optional().notEmpty().withMessage("Name cannot be empty"),
    body("bio").optional().isString(),
    body("location").optional().isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const db = getFirestore();
      const { name, bio, location, phoneNumber, preferences } = req.body;

      const updates = {
        updatedAt: new Date().toISOString(),
      };

      if (name) updates.name = name;
      if (bio !== undefined) updates.bio = bio;
      if (location !== undefined) updates.location = location;
      if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
      if (preferences) updates.preferences = preferences;

      await db.collection("users").doc(req.user.uid).update(updates);

      res.json({
        success: true,
        message: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update profile",
      });
    }
  }
);

export default router;
