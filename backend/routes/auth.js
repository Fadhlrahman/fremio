import express from "express";
import { body } from "express-validator";
import { getFirestore, getAuth } from "../config/firebase.js";
import { verifyToken } from "../middleware/auth.js";
import validate from "../middleware/validator.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pg from "pg";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "fremio_dev_secret_key";

// Database pool for JWT auth
const pool = new pg.Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "fremio",
  user: process.env.DB_USER || "salwa",
  password: process.env.DB_PASSWORD || "",
});

/**
 * POST /api/auth/login
 * Login with email/password (JWT)
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password diperlukan",
      });
    }

    // Find user in PostgreSQL
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND is_active = true",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
    }

    const user = result.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Update last login (ignore if column doesn't exist)
    try {
      await pool.query(
        "UPDATE users SET updated_at = NOW() WHERE id = $1",
        [user.id]
      );
    } catch (e) {
      // Ignore error if column doesn't exist
    }

    console.log(`✅ User logged in: ${user.email} (${user.role})`);

    res.json({
      success: true,
      message: "Login berhasil",
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login gagal. Coba lagi.",
    });
  }
});

/**
 * POST /api/auth/register-jwt
 * Register with email/password (JWT)
 */
router.post("/register-jwt", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password diperlukan",
      });
    }

    // Check if user exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email sudah terdaftar",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, email, display_name, role`,
      [email.toLowerCase(), passwordHash, displayName || email.split("@")[0]]
    );

    const user = result.rows[0];

    // Generate token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`✅ New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: "Registrasi berhasil",
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Registrasi gagal. Coba lagi.",
    });
  }
});

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
