import admin from "firebase-admin";
import { readFile } from "fs/promises";
import dotenv from "dotenv";

dotenv.config();

let firebaseApp = null;
let db = null;
let storage = null;

export const initializeFirebase = async () => {
  try {
    // Load service account key
    const serviceAccountPath =
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./serviceAccountKey.json";

    // Check if file exists
    const fs = await import("fs");
    const path = await import("path");
    const fullPath = path.resolve(serviceAccountPath);

    if (!fs.existsSync(fullPath)) {
      console.warn(
        "⚠️  Firebase service account not found. Running in limited mode."
      );
      console.warn("   To enable Firebase features:");
      console.warn(
        "   1. Download serviceAccountKey.json from Firebase Console"
      );
      console.warn("   2. Save to backend/serviceAccountKey.json");
      return { db: null, storage: null, admin: null };
    }

    const serviceAccount = JSON.parse(
      await readFile(serviceAccountPath, "utf8")
    );

    // Initialize Firebase Admin
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

    db = admin.firestore();
    storage = admin.storage();

    console.log("✅ Firebase Admin initialized successfully");
    return { db, storage, admin };
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error.message);
    console.warn("   Running in limited mode without Firebase.");
    return { db: null, storage: null, admin: null };
  }
};

export const getFirestore = () => {
  if (!db) {
    throw new Error(
      "Firestore not initialized. Call initializeFirebase() first."
    );
  }
  return db;
};

export const getStorage = () => {
  if (!storage) {
    throw new Error(
      "Storage not initialized. Call initializeFirebase() first."
    );
  }
  return storage;
};

export const getAuth = () => {
  if (!admin.apps.length) {
    throw new Error(
      "Firebase not initialized. Call initializeFirebase() first."
    );
  }
  return admin.auth();
};

export default { initializeFirebase, getFirestore, getStorage, getAuth };
