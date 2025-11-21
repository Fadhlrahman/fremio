/**
 * Generate sample custom frame for testing
 * This creates a simple frame with proper structure
 */

export const generateSampleCustomFrame = () => {
  // Simple 1x1 transparent PNG base64
  const sampleImage =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAAH0CAYAAADl1t+PAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAD9SURBVHhe7cEBDQAAAMKg909tDjcgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPBoBzYAAAH/e9sgAAAAAElFTkSuQmCC";

  const frame = {
    id: `sample-frame-${Date.now()}`,
    name: "Sample Custom Frame",
    description:
      "This is a sample frame for testing custom frame functionality",
    category: "custom",
    maxCaptures: 3,
    duplicatePhotos: false,
    imagePath: sampleImage,
    thumbnailUrl: sampleImage,
    slots: [
      {
        id: "slot_1",
        left: 0.15,
        top: 0.2,
        width: 0.35,
        height: 0.25,
        aspectRatio: "4:5",
        zIndex: 2,
        photoIndex: 0,
      },
      {
        id: "slot_2",
        left: 0.55,
        top: 0.2,
        width: 0.35,
        height: 0.25,
        aspectRatio: "4:5",
        zIndex: 2,
        photoIndex: 1,
      },
      {
        id: "slot_3",
        left: 0.35,
        top: 0.55,
        width: 0.35,
        height: 0.25,
        aspectRatio: "4:5",
        zIndex: 2,
        photoIndex: 2,
      },
    ],
    layout: {
      aspectRatio: "9:16",
      orientation: "portrait",
      backgroundColor: "#ffffff",
    },
    views: 0,
    uses: 0,
    likes: 0,
    createdBy: "system@fremio.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return frame;
};

/**
 * Add sample frame to localStorage
 */
export const addSampleFrameToStorage = () => {
  try {
    const frames = JSON.parse(localStorage.getItem("custom_frames") || "[]");
    const sampleFrame = generateSampleCustomFrame();

    frames.push(sampleFrame);
    localStorage.setItem("custom_frames", JSON.stringify(frames));

    console.log("✅ Sample frame added:", sampleFrame.id);
    return { success: true, frame: sampleFrame };
  } catch (error) {
    console.error("❌ Error adding sample frame:", error);
    return { success: false, error };
  }
};

export default {
  generateSampleCustomFrame,
  addSampleFrameToStorage,
};
