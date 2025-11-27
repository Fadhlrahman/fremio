/**
 * Image compression utilities
 * Compress images before storing in localStorage
 */

/**
 * Compress image file to target size
 * @param {File} file - Image file to compress
 * @param {number} maxWidth - Maximum width in pixels
 * @param {number} maxHeight - Maximum height in pixels
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<Blob>} Compressed image blob
 */
export const compressImage = (
  file,
  maxWidth = 1080,
  maxHeight = 1920,
  quality = 0.8
) => {
  return new Promise((resolve, reject) => {
    console.log("🗜️ Starting image compression...");
    console.log("📥 Input file:", file.name, "Size:", (file.size / 1024).toFixed(2), "KB");

    const reader = new FileReader();

    reader.onerror = () => {
      console.error("❌ FileReader error");
      reject(new Error("Failed to read file"));
    };

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => {
        console.error("❌ Image load error");
        reject(new Error("Failed to load image"));
      };

      img.onload = () => {
        console.log("📐 Original dimensions:", img.width, "x", img.height);

        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (maxHeight / height) * width;
          height = maxHeight;
        }

        console.log("📐 New dimensions:", width, "x", height);

        // Create canvas
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              console.error("❌ Failed to create blob");
              reject(new Error("Failed to compress image"));
              return;
            }

            console.log("✅ Compression complete!");
            console.log("📤 Output size:", (blob.size / 1024).toFixed(2), "KB");
            console.log("📉 Compression ratio:", ((blob.size / file.size) * 100).toFixed(1), "%");

            resolve(blob);
          },
          "image/png",
          quality
        );
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Compress image and convert to base64
 * @param {File} file - Image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<string>} Base64 encoded image
 */
export const compressImageToBase64 = async (
  file,
  options = {}
) => {
  const {
    maxWidth = 1080,
    maxHeight = 1920,
    quality = 0.75,
    targetSizeKB = 400, // Target max 400KB
  } = options;

  console.log("🎯 Target size:", targetSizeKB, "KB");

  let currentQuality = quality;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`\n🔄 Compression attempt ${attempts}/${maxAttempts} (quality: ${currentQuality.toFixed(2)})`);

    try {
      const blob = await compressImage(file, maxWidth, maxHeight, currentQuality);
      const sizeKB = blob.size / 1024;

      console.log("📊 Result size:", sizeKB.toFixed(2), "KB");

      // If size is acceptable, convert to base64
      if (sizeKB <= targetSizeKB || attempts === maxAttempts) {
        console.log("✅ Compression successful!");
        
        // Convert blob to base64
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      // If still too large, reduce quality
      console.log("⚠️ Still too large, reducing quality...");
      currentQuality *= 0.8; // Reduce quality by 20%

    } catch (error) {
      console.error("❌ Compression error:", error);
      throw error;
    }
  }

  throw new Error("Failed to compress image to target size");
};

/**
 * Get image dimensions without loading full image
 * @param {File} file - Image file
 * @returns {Promise<{width: number, height: number}>}
 */
export const getImageDimensions = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = reject;

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Validate image file
 * @param {File} file - Image file to validate
 * @param {Object} options - Validation options
 * @returns {Promise<{valid: boolean, errors: string[]}>}
 */
export const validateImageFile = async (file, options = {}) => {
  const {
    maxSizeMB = 5,
    allowedTypes = ["image/png", "image/jpeg", "image/jpg"],
    minWidth = 100,
    minHeight = 100,
    maxWidth = 4000,
    maxHeight = 4000,
  } = options;

  const errors = [];

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Invalid file type. Allowed: ${allowedTypes.join(", ")}`);
  }

  // Check file size
  const sizeMB = file.size / 1024 / 1024;
  if (sizeMB > maxSizeMB) {
    errors.push(`File too large (${sizeMB.toFixed(2)}MB). Max: ${maxSizeMB}MB`);
  }

  // Check dimensions
  try {
    const { width, height } = await getImageDimensions(file);

    if (width < minWidth || height < minHeight) {
      errors.push(`Image too small (${width}x${height}). Min: ${minWidth}x${minHeight}`);
    }

    if (width > maxWidth || height > maxHeight) {
      errors.push(`Image too large (${width}x${height}). Max: ${maxWidth}x${maxHeight}`);
    }
  } catch (error) {
    errors.push("Failed to read image dimensions");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export default {
  compressImage,
  compressImageToBase64,
  getImageDimensions,
  validateImageFile,
};
