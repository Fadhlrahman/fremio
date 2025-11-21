// ⚠️ DEPRECATED: Hardcoded frames have been removed
// All frames now must be uploaded via Admin Panel (/admin/upload-frame)
// This file kept for backward compatibility only

console.warn(
  "⚠️ frameConfigs.js is DEPRECATED. Use customFrameService.js instead."
);
console.warn(
  "📝 All frames must be uploaded via Admin Panel: /admin/upload-frame"
);

// Empty exports for backward compatibility
export const FRAME_CONFIGS = {};

// Helper function untuk mendapatkan konfigurasi frame berdasarkan nama
export const getFrameConfig = (frameName) => {
  console.warn(
    `⚠️ getFrameConfig("${frameName}") deprecated. Frames are now admin-uploaded only.`
  );
  return null;
};

// Helper function untuk mendapatkan semua frame yang tersedia
export const getAllFrames = () => {
  console.warn(
    "⚠️ getAllFrames() deprecated. Use getAllCustomFrames() from customFrameService.js"
  );
  return [];
};

// Helper function untuk validasi frame
export const isValidFrame = (frameName) => {
  console.warn(
    `⚠️ isValidFrame("${frameName}") deprecated. Check custom frames instead.`
  );
  return false;
};
