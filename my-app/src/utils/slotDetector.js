/**
 * Automatic Slot Detection from PNG Frame
 * Detects transparent rectangular areas in PNG and generates slot configurations
 */

/**
 * Detect transparent rectangular areas in PNG image
 * @param {File|string} imageSource - Image file or base64 data URL
 * @param {Object} options - Detection options
 * @returns {Promise<Array>} Array of detected slot configurations
 */
export async function detectSlotsFromImage(imageSource, options = {}) {
  const {
    minWidth = 50, // Minimum slot width in pixels
    minHeight = 50, // Minimum slot height in pixels
    alphaThreshold = 50, // Alpha value below this is considered transparent (0-255)
    mergeTolerance = 10, // Pixels tolerance for merging nearby transparent areas
    maxSlots = 10, // Maximum number of slots to detect
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        console.log("🔍 Starting slot detection...");
        console.log("📐 Image dimensions:", img.width, "x", img.height);

        // Create canvas to analyze image
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        // Draw image
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const pixels = imageData.data;

        // Find transparent regions
        const transparentRegions = findTransparentRegions(
          pixels,
          img.width,
          img.height,
          alphaThreshold
        );

        console.log("📍 Found transparent regions:", transparentRegions.length);

        // Convert regions to rectangles
        const rectangles = regionsToRectangles(
          transparentRegions,
          img.width,
          img.height
        );

        console.log("📦 Detected rectangles:", rectangles.length);

        // Filter by minimum size
        const validRectangles = rectangles.filter(
          (rect) => rect.width >= minWidth && rect.height >= minHeight
        );

        console.log(
          "✅ Valid rectangles (after size filter):",
          validRectangles.length
        );

        // Merge nearby rectangles
        const mergedRectangles = mergeNearbyRectangles(
          validRectangles,
          mergeTolerance
        );

        console.log("🔗 Merged rectangles:", mergedRectangles.length);

        // Sort by position (top to bottom, left to right)
        mergedRectangles.sort((a, b) => {
          if (Math.abs(a.y - b.y) < 50) {
            return a.x - b.x; // Same row, sort by x
          }
          return a.y - b.y; // Different row, sort by y
        });

        // Limit to maxSlots
        const finalRectangles = mergedRectangles.slice(0, maxSlots);

        // Convert to slot configuration format
        const slots = finalRectangles.map((rect, index) => ({
          id: `slot_${index + 1}`,
          left: rect.x / img.width,
          top: rect.y / img.height,
          width: rect.width / img.width,
          height: rect.height / img.height,
          aspectRatio: calculateAspectRatio(rect.width, rect.height),
          zIndex: 2,
          photoIndex: index,
        }));

        console.log("🎯 Generated slots:", slots.length);
        slots.forEach((slot, i) => {
          console.log(`  Slot ${i + 1}:`, {
            position: `${(slot.left * 100).toFixed(1)}%, ${(
              slot.top * 100
            ).toFixed(1)}%`,
            size: `${(slot.width * 100).toFixed(1)}% x ${(
              slot.height * 100
            ).toFixed(1)}%`,
            ratio: slot.aspectRatio,
          });
        });

        resolve(slots);
      } catch (error) {
        console.error("❌ Error during slot detection:", error);
        reject(error);
      }
    };

    img.onerror = (error) => {
      console.error("❌ Error loading image:", error);
      reject(new Error("Failed to load image"));
    };

    // Load image
    if (typeof imageSource === "string") {
      img.src = imageSource;
    } else if (imageSource instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageSource);
    } else {
      reject(new Error("Invalid image source"));
    }
  });
}

/**
 * Find transparent regions in image data
 */
function findTransparentRegions(pixels, width, height, alphaThreshold) {
  const regions = [];
  const visited = new Set();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const alpha = pixels[index + 3];
      const key = `${x},${y}`;

      // Check if transparent and not visited
      if (alpha < alphaThreshold && !visited.has(key)) {
        const region = floodFill(
          pixels,
          width,
          height,
          x,
          y,
          alphaThreshold,
          visited
        );
        if (region.length > 100) {
          // Minimum 100 pixels
          regions.push(region);
        }
      }
    }
  }

  return regions;
}

/**
 * Flood fill algorithm to find connected transparent pixels
 */
function floodFill(
  pixels,
  width,
  height,
  startX,
  startY,
  alphaThreshold,
  visited
) {
  const region = [];
  const stack = [[startX, startY]];

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const key = `${x},${y}`;

    if (visited.has(key)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const index = (y * width + x) * 4;
    const alpha = pixels[index + 3];

    if (alpha >= alphaThreshold) continue;

    visited.add(key);
    region.push({ x, y });

    // Add neighbors (4-directional)
    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }

  return region;
}

/**
 * Convert transparent regions to bounding rectangles
 */
function regionsToRectangles(regions, imageWidth, imageHeight) {
  return regions.map((region) => {
    let minX = imageWidth;
    let minY = imageHeight;
    let maxX = 0;
    let maxY = 0;

    region.forEach(({ x, y }) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  });
}

/**
 * Merge rectangles that are close to each other
 */
function mergeNearbyRectangles(rectangles, tolerance) {
  if (rectangles.length === 0) return [];

  const merged = [];
  const used = new Set();

  for (let i = 0; i < rectangles.length; i++) {
    if (used.has(i)) continue;

    let current = { ...rectangles[i] };
    let changed = true;

    while (changed) {
      changed = false;

      for (let j = 0; j < rectangles.length; j++) {
        if (i === j || used.has(j)) continue;

        const other = rectangles[j];

        // Check if rectangles are close enough to merge
        if (isNearby(current, other, tolerance)) {
          // Merge rectangles
          const minX = Math.min(current.x, other.x);
          const minY = Math.min(current.y, other.y);
          const maxX = Math.max(
            current.x + current.width,
            other.x + other.width
          );
          const maxY = Math.max(
            current.y + current.height,
            other.y + other.height
          );

          current = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          };

          used.add(j);
          changed = true;
        }
      }
    }

    merged.push(current);
    used.add(i);
  }

  return merged;
}

/**
 * Check if two rectangles are nearby (within tolerance)
 */
function isNearby(rect1, rect2, tolerance) {
  const horizontalOverlap =
    rect1.x <= rect2.x + rect2.width + tolerance &&
    rect1.x + rect1.width + tolerance >= rect2.x;

  const verticalOverlap =
    rect1.y <= rect2.y + rect2.height + tolerance &&
    rect1.y + rect1.height + tolerance >= rect2.y;

  return horizontalOverlap && verticalOverlap;
}

/**
 * Calculate aspect ratio from width and height
 */
function calculateAspectRatio(width, height) {
  const ratio = width / height;

  // Common aspect ratios
  if (Math.abs(ratio - 1) < 0.1) return "1:1"; // Square
  if (Math.abs(ratio - 4 / 5) < 0.1) return "4:5"; // Portrait
  if (Math.abs(ratio - 3 / 4) < 0.1) return "3:4"; // Portrait
  if (Math.abs(ratio - 16 / 9) < 0.1) return "16:9"; // Landscape
  if (Math.abs(ratio - 4 / 3) < 0.1) return "4:3"; // Landscape

  // Default to 4:5 for portrait-ish, 16:9 for landscape-ish
  return ratio < 1 ? "4:5" : "16:9";
}

/**
 * Quick detection with default settings
 */
export async function quickDetectSlots(imageSource) {
  return detectSlotsFromImage(imageSource, {
    minWidth: 80,
    minHeight: 100,
    alphaThreshold: 50,
    mergeTolerance: 15,
    maxSlots: 8,
  });
}

/**
 * Visualize detected slots on canvas (for debugging)
 */
export function visualizeSlots(imageSource, slots, canvasElement) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const ctx = canvasElement.getContext("2d");
      canvasElement.width = img.width;
      canvasElement.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Draw slots
      slots.forEach((slot, index) => {
        const x = slot.left * img.width;
        const y = slot.top * img.height;
        const w = slot.width * img.width;
        const h = slot.height * img.height;

        // Draw rectangle
        ctx.strokeStyle = "#FF0000";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        // Draw label
        ctx.fillStyle = "#FF0000";
        ctx.font = "20px Arial";
        ctx.fillText(`${index + 1}`, x + 10, y + 30);
      });

      resolve();
    };

    img.onerror = reject;

    if (typeof imageSource === "string") {
      img.src = imageSource;
    } else {
      reject(new Error("Canvas visualization only supports data URLs"));
    }
  });
}

export default {
  detectSlotsFromImage,
  quickDetectSlots,
  visualizeSlots,
};
