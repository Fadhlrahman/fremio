const cloneSlots = (slots) => {
  if (!Array.isArray(slots)) return [];
  return slots.map((slot) => ({ ...slot }));
};

const cloneLayout = (layout) => {
  if (!layout || typeof layout !== "object") return undefined;
  return { ...layout };
};

const cloneMetadata = (metadata) => {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  return {
    ...metadata,
    storedAt: new Date().toISOString(),
  };
};

const sanitizeDesigner = (designer) => {
  if (!designer || typeof designer !== "object") {
    return undefined;
  }

  const { elements, ...rest } = designer;

  if (!Array.isArray(elements) || elements.length === 0) {
    return rest;
  }

  const sanitizedElements = elements.map((element) => {
    if (!element || typeof element !== "object") return element;

    const cloned = { ...element };

    // IMPORTANT: Preserve background-photo, upload, and photo elements!
    // These are essential for the frame to work properly
    const isBackgroundPhoto = element.type === "background-photo";
    const isUploadElement = element.type === "upload";
    const isPhotoElement = element.type === "photo"; // ADD: Custom frame photo slots

    if (cloned.data && typeof cloned.data === "object") {
      const sanitizedData = { ...cloned.data };

      // Only remove base64 images for NON-critical elements
      // Background photos, uploads, and photo slots MUST keep their structure
      if (!isBackgroundPhoto && !isUploadElement && !isPhotoElement) {
        if (
          typeof sanitizedData.image === "string" &&
          sanitizedData.image.startsWith("data:")
        ) {
          sanitizedData.image = null;
        }

        if (
          typeof sanitizedData.originalImage === "string" &&
          sanitizedData.originalImage.startsWith("data:")
        ) {
          sanitizedData.originalImage = null;
        }

        if (
          typeof sanitizedData.preview === "string" &&
          sanitizedData.preview.startsWith("data:")
        ) {
          sanitizedData.preview = null;
        }
      }
      // For background-photo, upload, and photo elements, KEEP the structure!
      // They are essential for frame functionality

      cloned.data = sanitizedData;
    }

    return cloned;
  });

  return {
    ...rest,
    elements: sanitizedElements,
  };
};

export const sanitizeFrameConfigForStorage = (config) => {
  if (!config || typeof config !== "object") {
    return null;
  }

  const sanitized = {
    ...config,
    slots: cloneSlots(config.slots),
    layout: cloneLayout(config.layout),
    metadata: cloneMetadata(config.metadata),
  };

  // Helper to detect UUID format (Supabase uses UUIDs)
  const isUUID = (str) => {
    if (typeof str !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  };

  // For custom frames (from Create page) OR Supabase frames (UUID), keep frameImage and preview!
  // They are essential for the frame to display correctly
  const isCustomFrame = config.isCustom || config.id?.startsWith("custom-") || isUUID(config.id);

  if (!isCustomFrame) {
    // Only remove frameImage/preview for non-custom frames
    // (regular frames from Frames page can reload these from frameConfigs.js)
    delete sanitized.frameImage;
    delete sanitized.preview;
  } else {
    // For Supabase/custom frames, always preserve the image URL (not base64)
    // This is critical for frame loading when offline or slow connection
    const imageUrl = config.imagePath || config.frameImage || config.thumbnailUrl || config.image_url;
    if (imageUrl && !imageUrl.startsWith('data:')) {
      sanitized.imagePath = imageUrl;
      sanitized.frameImage = imageUrl;
      sanitized.image_url = imageUrl;
    }
  }
  // For custom frames, KEEP frameImage and preview - they're needed!

  const sanitizedDesigner = sanitizeDesigner(config.designer);
  if (sanitizedDesigner) {
    sanitized.designer = sanitizedDesigner;
  } else {
    delete sanitized.designer;
  }

  return sanitized;
};

export default sanitizeFrameConfigForStorage;
