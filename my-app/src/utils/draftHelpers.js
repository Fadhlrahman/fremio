import safeStorage from "./safeStorage.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../components/creator/canvasConstants.js";

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
  if (!element) return null;
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

  const {
    id,
    title,
    preview,
    canvasBackground,
  canvasWidth = CANVAS_WIDTH,
  canvasHeight = CANVAS_HEIGHT,
    aspectRatio = "9:16",
    elements = [],
    signature: draftSignature,
    createdAt,
    updatedAt,
  } = draft;

  const signature = draftSignature || computeDraftSignature(elements, canvasBackground, aspectRatio);

  const photoElements = elements.filter((element) => element?.type === "photo");
  const maxCaptures = photoElements.length;

  const slots = photoElements.map((element, index) => {
    const left = clamp01(element.x / canvasWidth);
    const top = clamp01(element.y / canvasHeight);
    const widthRatio = clamp01(element.width / canvasWidth);
    const heightRatio = clamp01(element.height / canvasHeight);
    const aspect = toAspectRatioString(element.width, element.height);

    return {
      id: `custom_slot_${index + 1}`,
      left,
      top,
      width: widthRatio,
      height: heightRatio,
      aspectRatio: aspect,
      zIndex: element.zIndex ?? 1,
      rotation: element.rotation ?? 0,
      photoIndex: index,
    };
  });

  const orientation = canvasHeight >= canvasWidth ? "portrait" : "landscape";

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
      canvasWidth,
      canvasHeight,
    },
    maxCaptures,
    slots,
    designer: {
      elements,
      canvasBackground,
      aspectRatio,
      canvasWidth,
      canvasHeight,
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
  safeStorage.setJSON("frameConfig", frameConfig);
  safeStorage.setItem("selectedFrame", frameConfig.id);
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
  return frameConfig;
};

export default {
  computeDraftSignature,
  buildFrameConfigFromDraft,
  activateDraftFrame,
};
