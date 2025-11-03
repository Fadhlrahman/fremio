export const CAPTURED_OVERLAY_MIN_Z = -10000;

// Layer ordering constants (from back to front)
export const PHOTO_AREA_BASE_Z = -5000;  // Photo areas at the very back
export const BACKGROUND_PHOTO_Z = -4000; // Background layer
export const TRANSPARENT_AREA_BASE_Z = BACKGROUND_PHOTO_Z + 1; // Transparent areas exactly one layer above background
export const NORMAL_ELEMENTS_MIN_Z = 1; // Normal elements (shapes, text, uploads) start here
