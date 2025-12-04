// Test data for development - creates sample photos and custom test frame
// ⚠️ UPDATED: Now uses unified frame service

import safeStorage from "./safeStorage.js";
import unifiedFrameService from "../services/unifiedFrameService";

export function createSampleData() {
  // Create sample base64 photos (small colored rectangles)
  const createSamplePhoto = (color, width = 200, height = 150) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Fill with solid color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    // Add some text
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Sample Photo", width / 2, height / 2);

    return canvas.toDataURL("image/png");
  };

  // Create 3 sample photos
  const samplePhotos = [
    createSamplePhoto("#ff6b6b"), // Red
    createSamplePhoto("#4ecdc4"), // Teal
    createSamplePhoto("#45b7d1"), // Blue
  ];

  // Store in localStorage
  safeStorage.setJSON("capturedPhotos", samplePhotos);

  // Create a test custom frame
  const testFrame = {
    id: "test-sample-frame",
    name: "Test Sample Frame",
    imagePath:
      "https://via.placeholder.com/1080x1920/2563eb/ffffff?text=SAMPLE+FRAME",
    maxCaptures: 3,
    slots: [
      { left: 0.1, top: 0.2, width: 0.35, height: 0.25, photoIndex: 0 },
      { left: 0.55, top: 0.2, width: 0.35, height: 0.25, photoIndex: 1 },
      { left: 0.325, top: 0.55, width: 0.35, height: 0.25, photoIndex: 2 },
    ],
    category: "test",
    createdAt: Date.now(),
  };

  // Add test frame to custom frames
  unifiedFrameService.createFrame(testFrame);

  // Set it as selected frame
  safeStorage.setJSON("selectedFrame", {
    id: testFrame.id,
    name: testFrame.name,
    type: "custom",
  });

  console.log("✅ Sample data created:");
  console.log("- 3 sample photos stored in capturedPhotos");
  console.log("- Test custom frame added:", testFrame.name);
  console.log("- Frame selected for testing");

  return {
    photos: samplePhotos,
    frame: testFrame,
    frameId: testFrame.id,
  };
}

export function clearTestData() {
  safeStorage.removeItem("capturedPhotos");
  safeStorage.removeItem("selectedFrame");
  safeStorage.removeItem("frameConfig");
  safeStorage.removeItem("frameSlots"); // legacy

  console.log("🗑️ Test data cleared from localStorage");
}
