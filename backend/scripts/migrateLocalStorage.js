/**
 * Migration Script: LocalStorage → Firebase
 *
 * This script helps users migrate their data from browser localStorage to Firebase.
 *
 * Usage:
 * 1. Export data from browser console:
 *    const data = {
 *      customFrames: JSON.parse(localStorage.getItem('custom_frames') || '[]'),
 *      drafts: JSON.parse(localStorage.getItem('fremio-creator-drafts') || '[]'),
 *      savedImages: JSON.parse(localStorage.getItem('savedImages') || '[]')
 *    };
 *    console.log(JSON.stringify(data));
 *
 * 2. Save output to data.json
 *
 * 3. Run: node scripts/migrateLocalStorage.js <userId> data.json
 */

import admin from "firebase-admin";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");
const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const db = admin.firestore();
const storage = admin.storage();

/**
 * Upload base64 data URL to Firebase Storage
 */
const uploadDataURL = async (dataUrl, filePath) => {
  try {
    if (!dataUrl || !dataUrl.startsWith("data:")) {
      throw new Error("Invalid data URL");
    }

    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid data URL format");
    }

    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    const bucket = storage.bucket();
    const file = bucket.file(filePath);

    await file.save(buffer, {
      metadata: { contentType },
      public: true,
    });

    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    return publicUrl;
  } catch (error) {
    console.error("Upload data URL error:", error);
    throw error;
  }
};

/**
 * Migrate custom frames
 */
const migrateCustomFrames = async (frames, userId) => {
  console.log(`\n📦 Migrating ${frames.length} custom frames...`);

  let successCount = 0;
  let errorCount = 0;

  for (const frame of frames) {
    try {
      // Upload frame image if it's a data URL
      let imagePath = frame.imagePath;
      let thumbnailUrl = frame.thumbnailUrl;

      if (frame.imagePath && frame.imagePath.startsWith("data:")) {
        const timestamp = Date.now();
        imagePath = await uploadDataURL(
          frame.imagePath,
          `frames/${timestamp}/${frame.id}.png`
        );
        console.log(`   ✅ Uploaded frame image: ${frame.id}`);
      }

      // Create frame document
      const frameData = {
        ...frame,
        imagePath,
        thumbnailUrl: thumbnailUrl || imagePath,
        createdBy: userId,
        status: "approved",
        views: frame.views || 0,
        uses: frame.uses || 0,
        downloads: frame.downloads || 0,
        likes: frame.likes || 0,
        isPublic: true,
        isFeatured: false,
        tags: frame.tags || [],
        createdAt: frame.createdAt || new Date().toISOString(),
        updatedAt: frame.updatedAt || new Date().toISOString(),
      };

      await db.collection("custom_frames").doc(frame.id).set(frameData);
      console.log(`   ✅ Migrated frame: ${frame.name}`);
      successCount++;
    } catch (error) {
      console.error(
        `   ❌ Failed to migrate frame ${frame.id}:`,
        error.message
      );
      errorCount++;
    }
  }

  console.log(`   📊 Success: ${successCount}, Errors: ${errorCount}`);
};

/**
 * Migrate drafts
 */
const migrateDrafts = async (drafts, userId) => {
  console.log(`\n📝 Migrating ${drafts.length} drafts...`);

  let successCount = 0;
  let errorCount = 0;

  for (const draft of drafts) {
    try {
      // Upload element images
      const migratedElements = [];

      for (const element of draft.elements || []) {
        const migratedElement = { ...element };

        if (element.data?.image && element.data.image.startsWith("data:")) {
          const timestamp = Date.now();
          const elementId = element.id || Date.now();
          const imageUrl = await uploadDataURL(
            element.data.image,
            `users/${userId}/drafts/${draft.id}/elements/${elementId}.jpg`
          );
          migratedElement.data.image = imageUrl;
          console.log(`   ✅ Uploaded element image: ${element.type}`);
        }

        migratedElements.push(migratedElement);
      }

      // Create draft document
      const draftData = {
        ...draft,
        userId,
        elements: migratedElements,
        capturedPhotos: [], // Will be migrated separately if needed
        capturedVideos: [],
        createdAt: draft.createdAt || new Date().toISOString(),
        updatedAt: draft.updatedAt || new Date().toISOString(),
      };

      await db.collection("drafts").doc(draft.id).set(draftData);
      console.log(`   ✅ Migrated draft: ${draft.title}`);
      successCount++;
    } catch (error) {
      console.error(
        `   ❌ Failed to migrate draft ${draft.id}:`,
        error.message
      );
      errorCount++;
    }
  }

  console.log(`   📊 Success: ${successCount}, Errors: ${errorCount}`);
};

/**
 * Migrate saved images
 */
const migrateSavedImages = async (savedImages, userId) => {
  console.log(`\n🖼️  Migrating ${savedImages.length} saved images...`);

  let successCount = 0;
  let errorCount = 0;

  for (const saved of savedImages) {
    try {
      // Upload result image
      let resultUrl = saved.image;

      if (saved.image && saved.image.startsWith("data:")) {
        const timestamp = Date.now();
        resultUrl = await uploadDataURL(
          saved.image,
          `users/${userId}/results/${timestamp}.png`
        );
        console.log(`   ✅ Uploaded result image`);
      }

      // Create saved result document
      const resultData = {
        userId,
        frameId: saved.frameId,
        frameName: saved.frameName || "Unknown",
        type: "photo",
        resultUrl,
        thumbnailUrl: resultUrl,
        originalPhotos: [],
        originalVideos: [],
        filters: {},
        fileSize: 0,
        dimensions: { width: 1080, height: 1920 },
        createdAt: new Date(saved.timestamp).toISOString(),
      };

      await db.collection("saved_results").add(resultData);
      console.log(`   ✅ Migrated saved result`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Failed to migrate saved image:`, error.message);
      errorCount++;
    }
  }

  console.log(`   📊 Success: ${successCount}, Errors: ${errorCount}`);
};

/**
 * Main migration function
 */
const migrate = async () => {
  try {
    const args = process.argv.slice(2);

    if (args.length < 2) {
      console.log(
        "Usage: node migrateLocalStorage.js <userId> <dataFile.json>"
      );
      console.log("");
      console.log("Example:");
      console.log("  node migrateLocalStorage.js user123 data.json");
      process.exit(1);
    }

    const userId = args[0];
    const dataFilePath = path.resolve(args[1]);

    console.log("");
    console.log("🚀 ============================================");
    console.log("🚀 Fremio Migration: LocalStorage → Firebase");
    console.log("🚀 ============================================");
    console.log(`   User ID: ${userId}`);
    console.log(`   Data file: ${dataFilePath}`);
    console.log("");

    // Read data file
    const dataContent = await readFile(dataFilePath, "utf8");
    const data = JSON.parse(dataContent);

    // Verify user exists
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.error("❌ User not found. Please register user first.");
      process.exit(1);
    }

    console.log(`✅ User found: ${userDoc.data().email}`);

    // Migrate data
    if (data.customFrames && data.customFrames.length > 0) {
      await migrateCustomFrames(data.customFrames, userId);
    }

    if (data.drafts && data.drafts.length > 0) {
      await migrateDrafts(data.drafts, userId);
    }

    if (data.savedImages && data.savedImages.length > 0) {
      await migrateSavedImages(data.savedImages, userId);
    }

    console.log("");
    console.log("✅ ============================================");
    console.log("✅ Migration completed successfully!");
    console.log("✅ ============================================");
    console.log("");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

migrate();
