import safeStorage from "./safeStorage.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../components/creator/canvasConstants.js";
import { sanitizeFrameConfigForStorage } from "./frameConfigSanitizer.js";

const toAspectRatioString = (width, height) => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "1:1";
  }

  const scaleToInt = (value) => {
    const precision = 1000;
    return Math.round(Number(value) * precision);
  };

  const gcd = (a, b) => {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) {
      const temp = y;
      y = x % y;
      x = temp;
    }
    return x || 1;
  };

  const scaledWidth = scaleToInt(width);
  const scaledHeight = scaleToInt(height);
  const divisor = gcd(scaledWidth, scaledHeight);
  const w = Math.round(scaledWidth / divisor);
  const h = Math.round(scaledHeight / divisor);
  return `${Math.max(1, w)}:${Math.max(1, h)}`;
};

const normalizeElement = (element) => {
  if (!element || typeof element !== "object") return null;
  const {
    id,
    type,
    x,
    y,
    width,
    height,
    rotation,
    zIndex,
    isLocked,
    data,
  } = element;

  return {
    id,
    type,
    x,
    y,
    width,
    height,
    rotation,
    zIndex,
    isLocked,
    data,
  };
};

const coerceNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const extractDraftElements = (draft) => {
  if (!draft || typeof draft !== "object") {
    return [];
  }

  if (Array.isArray(draft.elements) && draft.elements.length > 0) {
    return draft.elements;
  }

  if (Array.isArray(draft.designer?.elements) && draft.designer.elements.length > 0) {
    return draft.designer.elements;
  }

  if (Array.isArray(draft.frameConfig?.designer?.elements) && draft.frameConfig.designer.elements.length > 0) {
    return draft.frameConfig.designer.elements;
  }

  return [];
};

const normalizePhotoPlaceholders = (elements = []) => {
  if (!Array.isArray(elements)) {
    return [];
  }

  return elements.filter((element) => {
    if (!element || typeof element !== "object") {
      return false;
    }

    if (element.type === "photo") {
      return true;
    }

    const label = String(element?.data?.label || "").toLowerCase();
    return element.type === "shape" && label.includes("foto");
  });
};

const clampNormalized = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
};

const normalizeSlotFromElement = (element, index, canvasWidth, canvasHeight) => {
  const safeCanvasWidth = canvasWidth > 0 ? canvasWidth : CANVAS_WIDTH;
  const safeCanvasHeight = canvasHeight > 0 ? canvasHeight : CANVAS_HEIGHT;

  const rawX = coerceNumber(element?.x);
  const rawY = coerceNumber(element?.y);
  const rawWidth = Math.max(1, coerceNumber(element?.width, 0));
  const rawHeight = Math.max(1, coerceNumber(element?.height, 0));
  const rotation = coerceNumber(element?.rotation, 0);

  const left = clampNormalized(rawX / safeCanvasWidth);
  const top = clampNormalized(rawY / safeCanvasHeight);
  const width = clampNormalized(rawWidth / safeCanvasWidth);
  const height = clampNormalized(rawHeight / safeCanvasHeight);

  const aspectRatio = rawHeight > 0 ? toAspectRatioString(rawWidth, rawHeight) : "4:5";
  const photoIndex = Number.isFinite(element?.data?.photoIndex)
    ? element.data.photoIndex
    : index;

  return {
    id: element?.id || `custom_slot_${index + 1}`,
    left,
    top,
    width: width || 0,
    height: height || 0,
    aspectRatio,
    zIndex: Number.isFinite(element?.zIndex) ? element.zIndex : 1,
    rotation,
    photoIndex,
  };
};

const normalizeLegacySlot = (slot, index) => {
  if (!slot || typeof slot !== "object") {
    return null;
  }

  const left = clampNormalized(coerceNumber(slot.left ?? slot.x, 0));
  const top = clampNormalized(coerceNumber(slot.top ?? slot.y, 0));
  const width = clampNormalized(coerceNumber(slot.width ?? slot.w, 0));
  const height = clampNormalized(coerceNumber(slot.height ?? slot.h, 0));
  const aspectRatio = typeof slot.aspectRatio === "string" && slot.aspectRatio.includes(":")
    ? slot.aspectRatio
    : toAspectRatioString(width || 1, height || 1);

  return {
    id: slot.id || `legacy_slot_${index + 1}`,
    left,
    top,
    width,
    height,
    aspectRatio,
    zIndex: Number.isFinite(slot.zIndex) ? slot.zIndex : 1,
    rotation: coerceNumber(slot.rotation, 0),
    photoIndex: Number.isFinite(slot.photoIndex) ? slot.photoIndex : index,
  };
};

export const computeDraftSignature = (elements = [], canvasBackground, aspectRatio) => {
  const payload = {
    aspectRatio,
    canvasBackground,
    elements: elements.map(normalizeElement),
  };
  try {
    return JSON.stringify(payload);
  } catch (error) {
    console.warn("⚠️ Failed to serialize draft signature", error);
    return `${Date.now()}-${Math.random()}`;
  }
};

const clamp01 = (value) => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

export const buildFrameConfigFromDraft = (draft) => {
  if (!draft) {
    throw new Error("Draft is required to build frame configuration");
  }

  const sourceElements = extractDraftElements(draft);
  const photoElements = normalizePhotoPlaceholders(sourceElements);

  console.log('🔍 [buildFrameConfigFromDraft] Source elements z-index:', 
    sourceElements.map(el => ({ type: el.type, id: el.id?.slice(0, 8), zIndex: el.zIndex }))
  );

  const {
    id,
    title,
    preview,
    canvasBackground,
    canvasWidth = CANVAS_WIDTH,
    canvasHeight = CANVAS_HEIGHT,
    aspectRatio = "9:16",
    signature: draftSignature,
    createdAt,
    updatedAt,
  } = draft;

  const signature =
    draftSignature || computeDraftSignature(sourceElements, canvasBackground, aspectRatio);

  let slots = photoElements.map((element, index) =>
    normalizeSlotFromElement(element, index, coerceNumber(canvasWidth, CANVAS_WIDTH), coerceNumber(canvasHeight, CANVAS_HEIGHT))
  );

  if (slots.length === 0) {
    const legacySlotsSource = Array.isArray(draft.slots)
      ? draft.slots
      : Array.isArray(draft.designer?.slots)
      ? draft.designer.slots
      : Array.isArray(draft.frameConfig?.slots)
      ? draft.frameConfig.slots
      : [];

    slots = legacySlotsSource
      .map((slot, index) => normalizeLegacySlot(slot, index))
      .filter(Boolean);
  }

  if (slots.length === 0) {
    console.warn("⚠️ [buildFrameConfigFromDraft] Draft does not contain any photo slots", {
      draftId: draft.id,
      hasElements: Array.isArray(sourceElements) && sourceElements.length > 0,
    });
  }

  const uniquePhotoIndices = new Set();
  slots.forEach((slot, idx) => {
    if (!slot) return;
    if (Number.isFinite(slot.photoIndex)) {
      uniquePhotoIndices.add(slot.photoIndex);
    } else {
      uniquePhotoIndices.add(idx);
    }
  });

  const maxCaptures = uniquePhotoIndices.size > 0 ? uniquePhotoIndices.size : slots.length;

  const orientation = canvasHeight >= canvasWidth ? "portrait" : "landscape";

  console.log('✅ [buildFrameConfigFromDraft] Final frameConfig:', {
    id: `custom-${id}`,
    slotsCount: slots.length,
    designerElementsCount: sourceElements.length,
    designerElementsZIndex: sourceElements.map(el => ({ type: el.type, id: el.id?.slice(0, 8), zIndex: el.zIndex })),
  });

  return {
    id: `custom-${id}`,
    name: title || "Custom Frame",
    description: "Custom frame created in Fremio",
    isCustom: true,
    duplicatePhotos: false,
    frameImage: preview, // Base64 image for custom frames
    imagePath: preview,
    preview,
    layout: {
      aspectRatio,
      orientation,
      backgroundColor: canvasBackground,
      canvasWidth: coerceNumber(canvasWidth, CANVAS_WIDTH),
      canvasHeight: coerceNumber(canvasHeight, CANVAS_HEIGHT),
    },
    maxCaptures,
    slots,
    designer: {
      elements: sourceElements,
      canvasBackground,
      aspectRatio,
      canvasWidth: coerceNumber(canvasWidth, CANVAS_WIDTH),
      canvasHeight: coerceNumber(canvasHeight, CANVAS_HEIGHT),
      signature,
    },
    metadata: {
      source: "draft",
      draftId: id,
      signature,
      createdAt: createdAt || null,
      updatedAt: updatedAt || null,
    },
  };
};

export const activateDraftFrame = (draft) => {
  const frameConfig = buildFrameConfigFromDraft(draft);
  const sanitizedConfig = sanitizeFrameConfigForStorage(frameConfig);

  let configPersisted = false;
  if (sanitizedConfig) {
    configPersisted = safeStorage.setJSON("frameConfig", sanitizedConfig);
  }

  if (!configPersisted) {
    console.warn("⚠️ [activateDraftFrame] Failed to persist sanitized frame config, attempting minimal fallback");
    const fallbackConfig = sanitizedConfig ? { ...sanitizedConfig } : null;
    if (fallbackConfig) {
      delete fallbackConfig.imagePath;
      configPersisted = safeStorage.setJSON("frameConfig", fallbackConfig);
    }
  }

  const idPersisted = safeStorage.setItem("selectedFrame", frameConfig.id);

  if (!configPersisted || !idPersisted) {
    throw new Error("Frame config not properly saved to storage");
  }

  if (draft?.id) {
    safeStorage.setItem("activeDraftId", draft.id);
  } else {
    safeStorage.removeItem("activeDraftId");
  }
  if (frameConfig?.metadata?.signature) {
    safeStorage.setItem("activeDraftSignature", frameConfig.metadata.signature);
  } else {
    safeStorage.removeItem("activeDraftSignature");
  }
  
  // Restore captured photos if they were saved with the draft
  if (Array.isArray(draft.capturedPhotos) && draft.capturedPhotos.length > 0) {
    console.log('📸 [activateDraftFrame] Restoring captured photos:', draft.capturedPhotos.length);
    safeStorage.setJSON("capturedPhotos", draft.capturedPhotos);
  } else {
    console.log('📸 [activateDraftFrame] No captured photos to restore');
    safeStorage.removeItem("capturedPhotos");
  }
  
  // Store frame artwork info if available (for editor to load)
  if (draft.frameArtwork) {
    console.log('🖼️ [activateDraftFrame] Storing frame artwork info');
    safeStorage.setJSON("draftFrameArtwork", draft.frameArtwork);
  } else {
    safeStorage.removeItem("draftFrameArtwork");
  }
  
  return frameConfig;
};

export default {
  computeDraftSignature,
  buildFrameConfigFromDraft,
  activateDraftFrame,
};
