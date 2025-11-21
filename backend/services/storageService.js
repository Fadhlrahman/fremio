import { getStorage } from "../config/firebase.js";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

/**
 * Upload file to Firebase Storage
 * @param {Buffer} buffer - File buffer
 * @param {string} path - Storage path (e.g., 'users/uid/avatars/avatar.jpg')
 * @param {object} metadata - File metadata
 * @returns {Promise<string>} Public URL
 */
export const uploadFile = async (buffer, path, metadata = {}) => {
  try {
    const bucket = getStorage().bucket();
    const file = bucket.file(path);

    await file.save(buffer, {
      metadata: {
        contentType: metadata.contentType || "application/octet-stream",
        metadata: metadata.customMetadata || {},
      },
      public: metadata.public !== false,
    });

    if (metadata.public !== false) {
      await file.makePublic();
    }

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;
    return publicUrl;
  } catch (error) {
    console.error("Upload file error:", error);
    throw new Error("Failed to upload file to storage");
  }
};

/**
 * Upload image with automatic optimization
 * @param {Buffer} buffer - Image buffer
 * @param {string} path - Storage path
 * @param {object} options - Optimization options
 * @returns {Promise<string>} Public URL
 */
export const uploadImage = async (buffer, path, options = {}) => {
  try {
    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 85,
      format = "jpeg",
    } = options;

    // Optimize image
    let optimizedBuffer = await sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .toFormat(format, { quality })
      .toBuffer();

    const metadata = {
      contentType: `image/${format}`,
      public: true,
    };

    return await uploadFile(optimizedBuffer, path, metadata);
  } catch (error) {
    console.error("Upload image error:", error);
    throw new Error("Failed to upload image");
  }
};

/**
 * Upload image with thumbnail generation
 * @param {Buffer} buffer - Image buffer
 * @param {string} basePath - Base storage path
 * @returns {Promise<object>} { imageUrl, thumbnailUrl }
 */
export const uploadImageWithThumbnail = async (buffer, basePath) => {
  try {
    const imageId = uuidv4();
    const imagePath = `${basePath}/${imageId}.jpg`;
    const thumbnailPath = `${basePath}/thumbnails/${imageId}_thumb.jpg`;

    // Upload full image
    const imageUrl = await uploadImage(buffer, imagePath, {
      maxWidth: 1920,
      quality: 85,
    });

    // Generate and upload thumbnail
    const thumbnailBuffer = await sharp(buffer)
      .resize(300, 533, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: 70 })
      .toBuffer();

    const thumbnailUrl = await uploadFile(thumbnailBuffer, thumbnailPath, {
      contentType: "image/jpeg",
      public: true,
    });

    return { imageUrl, thumbnailUrl };
  } catch (error) {
    console.error("Upload with thumbnail error:", error);
    throw new Error("Failed to upload image with thumbnail");
  }
};

/**
 * Delete file from Firebase Storage
 * @param {string} path - Storage path
 */
export const deleteFile = async (path) => {
  try {
    const bucket = getStorage().bucket();
    await bucket.file(path).delete();
    console.log(`✅ Deleted file: ${path}`);
  } catch (error) {
    console.error("Delete file error:", error);
    // Don't throw - file might not exist
  }
};

/**
 * Extract storage path from public URL
 * @param {string} url - Public URL
 * @returns {string} Storage path
 */
export const getPathFromUrl = (url) => {
  try {
    const bucket = getStorage().bucket();
    const bucketName = bucket.name;
    const prefix = `https://storage.googleapis.com/${bucketName}/`;

    if (url.startsWith(prefix)) {
      return decodeURIComponent(url.replace(prefix, ""));
    }

    return null;
  } catch (error) {
    console.error("Get path from URL error:", error);
    return null;
  }
};

/**
 * Delete file by URL
 * @param {string} url - Public URL
 */
export const deleteFileByUrl = async (url) => {
  const path = getPathFromUrl(url);
  if (path) {
    await deleteFile(path);
  }
};

/**
 * Clean up temp files older than specified hours
 * @param {number} hours - Age threshold in hours
 */
export const cleanupTempFiles = async (hours = 24) => {
  try {
    const bucket = getStorage().bucket();
    const [files] = await bucket.getFiles({ prefix: "public/temp/" });

    const now = Date.now();
    const threshold = hours * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const createdTime = new Date(metadata.timeCreated).getTime();

      if (now - createdTime > threshold) {
        await file.delete();
        deletedCount++;
      }
    }

    console.log(
      `✅ Cleaned up ${deletedCount} temp files older than ${hours} hours`
    );
  } catch (error) {
    console.error("Cleanup temp files error:", error);
  }
};

export default {
  uploadFile,
  uploadImage,
  uploadImageWithThumbnail,
  deleteFile,
  deleteFileByUrl,
  getPathFromUrl,
  cleanupTempFiles,
};
