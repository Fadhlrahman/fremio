/**
 * Storage Debug Utilities
 * Untuk troubleshooting localStorage
 */

/**
 * Check localStorage usage
 */
export const checkLocalStorageUsage = () => {
  let total = 0;
  const details = {};

  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const itemSize = (localStorage[key].length + key.length) * 2; // UTF-16
      details[key] = {
        size: itemSize,
        sizeKB: (itemSize / 1024).toFixed(2),
        sizeMB: (itemSize / 1024 / 1024).toFixed(4),
      };
      total += itemSize;
    }
  }

  const totalMB = (total / 1024 / 1024).toFixed(2);
  const percentUsed = ((total / (5 * 1024 * 1024)) * 100).toFixed(2); // 5MB limit

  console.log("📊 LocalStorage Usage Report:");
  console.log("Total: " + totalMB + " MB (" + percentUsed + "% of ~5MB limit)");
  console.log("Details:", details);

  return {
    total,
    totalMB,
    percentUsed,
    details,
    isNearLimit: parseFloat(percentUsed) > 80,
  };
};

/**
 * Check custom frames storage
 */
export const checkCustomFramesStorage = () => {
  try {
    const frames = JSON.parse(localStorage.getItem("custom_frames") || "[]");
    const framesJSON = localStorage.getItem("custom_frames") || "[]";
    const size = framesJSON.length * 2; // UTF-16
    const sizeMB = (size / 1024 / 1024).toFixed(2);

    return {
      count: frames.length,
      size,
      sizeMB,
      frames: frames.map((f) => ({
        id: f.id,
        name: f.name,
        category: f.category,
        slots: f.slots?.length,
        hasImage: !!f.imagePath,
        imageSizeKB: f.imagePath ? (f.imagePath.length / 1024).toFixed(2) : "0",
      })),
    };
  } catch (error) {
    console.error("❌ Error checking custom frames:", error);
    return { count: 0, size: 0, sizeMB: "0", frames: [] };
  }
};

/**
 * Test localStorage write capability
 */
export const testLocalStorageWrite = (testSize = 100 * 1024) => {
  const testKey = "__test_write__";
  const testData = "x".repeat(testSize);

  try {
    console.log("🧪 Testing localStorage write (" + (testSize / 1024).toFixed(0) + "KB)...");
    localStorage.setItem(testKey, testData);
    localStorage.removeItem(testKey);
    console.log("✅ Write test successful");
    return { success: true, message: "Write successful" };
  } catch (error) {
    console.error("❌ Write test failed:", error);
    return { success: false, message: error.message, error: error.name };
  }
};

/**
 * Clear custom frames from localStorage
 */
export const clearCustomFrames = (confirm = false) => {
  if (!confirm) {
    console.warn("⚠️ Please call with confirm=true to actually clear");
    return { success: false, message: "Confirmation required" };
  }

  try {
    localStorage.removeItem("custom_frames");
    console.log("✅ Custom frames cleared from localStorage");
    return { success: true, message: "Custom frames cleared" };
  } catch (error) {
    console.error("❌ Error clearing custom frames:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Comprehensive storage diagnostic
 */
export const runStorageDiagnostic = () => {
  console.log("🔍 Running Storage Diagnostic...\n");

  const lsUsage = checkLocalStorageUsage();
  const lsFrames = checkCustomFramesStorage();
  const writeTest = testLocalStorageWrite(100 * 1024); // Test 100KB

  const report = {
    timestamp: new Date().toISOString(),
    usage: lsUsage,
    customFrames: lsFrames,
    writeTest,
    warnings: [],
    recommendations: [],
  };

  // Generate warnings
  if (lsUsage.isNearLimit) {
    report.warnings.push("⚠️ LocalStorage usage is near limit (>80%)");
    report.recommendations.push("Hapus frame yang tidak dipakai atau compress images");
  }

  if (!writeTest.success) {
    report.warnings.push("❌ LocalStorage write test failed");
    report.recommendations.push("Clear browser cache atau gunakan incognito mode");
  }

  console.log("\n📋 Diagnostic Report:");
  console.log(report);

  return report;
};

// Export utilities to window for easy console access
if (typeof window !== "undefined") {
  window.storageDebug = {
    checkUsage: checkLocalStorageUsage,
    checkFrames: checkCustomFramesStorage,
    testWrite: testLocalStorageWrite,
    clearFrames: clearCustomFrames,
    runDiagnostic: runStorageDiagnostic,
  };
  console.log(
    "💡 Storage debug tools available at window.storageDebug\n" +
      "Usage:\n" +
      "  window.storageDebug.runDiagnostic()\n" +
      "  window.storageDebug.checkUsage()\n" +
      "  window.storageDebug.checkFrames()\n" +
      "  window.storageDebug.clearFrames(true)"
  );
}

export default {
  checkLocalStorageUsage,
  checkCustomFramesStorage,
  testLocalStorageWrite,
  clearCustomFrames,
  runStorageDiagnostic,
};
