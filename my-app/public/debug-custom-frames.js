// Debug script untuk melihat custom frames di localStorage
console.log("=== DEBUG CUSTOM FRAMES ===");

// Check localStorage
const customFramesRaw = localStorage.getItem("custom_frames");
console.log("Raw custom_frames:", customFramesRaw);

if (customFramesRaw) {
  try {
    const frames = JSON.parse(customFramesRaw);
    console.log("Parsed custom frames:", frames);
    console.log("Total custom frames:", frames.length);

    frames.forEach((frame, idx) => {
      console.log(`\nFrame ${idx + 1}:`, {
        id: frame.id,
        name: frame.name,
        maxCaptures: frame.maxCaptures,
        slotsCount: frame.slots?.length,
        hasImagePath: !!frame.imagePath,
        imagePathPreview: frame.imagePath?.substring(0, 50),
        category: frame.category,
      });
    });
  } catch (error) {
    console.error("Error parsing custom_frames:", error);
  }
} else {
  console.log("❌ No custom_frames found in localStorage");
}

// Check other frame-related keys
console.log("\n=== OTHER FRAME KEYS ===");
console.log("selectedFrame:", localStorage.getItem("selectedFrame"));
console.log(
  "frameConfig:",
  localStorage.getItem("frameConfig") ? "EXISTS" : "NONE"
);

// List all localStorage keys
console.log("\n=== ALL LOCALSTORAGE KEYS ===");
const allKeys = Object.keys(localStorage);
console.log("Total keys:", allKeys.length);
allKeys.forEach((key) => {
  const value = localStorage.getItem(key);
  const size = new Blob([value]).size;
  console.log(`- ${key}: ${size} bytes`);
});
