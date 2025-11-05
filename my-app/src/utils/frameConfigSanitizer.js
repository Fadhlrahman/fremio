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
    
    // IMPORTANT: Preserve background-photo and upload images!
    // These are essential for the frame to work in TakeMoment
    const isBackgroundPhoto = element.type === 'background-photo';
    const isUploadElement = element.type === 'upload';
    
    if (cloned.data && typeof cloned.data === "object") {
      const sanitizedData = { ...cloned.data };

      // Only remove base64 images for NON-critical elements
      // Background photos and uploads MUST keep their images
      if (!isBackgroundPhoto && !isUploadElement) {
        if (typeof sanitizedData.image === "string" && sanitizedData.image.startsWith("data:")) {
          sanitizedData.image = null;
        }

        if (typeof sanitizedData.originalImage === "string" && sanitizedData.originalImage.startsWith("data:")) {
          sanitizedData.originalImage = null;
        }

        if (typeof sanitizedData.preview === "string" && sanitizedData.preview.startsWith("data:")) {
          sanitizedData.preview = null;
        }
      }
      // For background-photo and upload elements, KEEP the images!
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

  delete sanitized.frameImage;
  delete sanitized.preview;

  const sanitizedDesigner = sanitizeDesigner(config.designer);
  if (sanitizedDesigner) {
    sanitized.designer = sanitizedDesigner;
  } else {
    delete sanitized.designer;
  }

  return sanitized;
};

export default sanitizeFrameConfigForStorage;
