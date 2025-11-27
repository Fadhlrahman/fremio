import {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import html2canvas from "html2canvas";
import {
  CheckCircle2,
  AlertTriangle,
  Palette,
  Image as ImageIcon,
  Type as TypeIcon,
  Shapes,
  UploadCloud,
  Maximize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  CornerDownRight,
  Settings2,
  X,
  Square,
  Layers,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
} from "lucide-react";
import CanvasPreview from "../components/creator/CanvasPreview.jsx";
import PropertiesPanel from "../components/creator/PropertiesPanel.jsx";
import ColorPicker from "../components/creator/ColorPicker.jsx";
import useCreatorStore from "../store/useCreatorStore.js";
import {
  CAPTURED_OVERLAY_Z_OFFSET,
  NORMAL_ELEMENTS_MIN_Z,
  BACKGROUND_PHOTO_Z,
  PHOTO_SLOT_MIN_Z,
} from "../constants/layers.js";
import { useShallow } from "zustand/react/shallow";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from "../components/creator/canvasConstants.js";
import draftStorage from "../utils/draftStorage.js";
import { computeDraftSignature } from "../utils/draftHelpers.js";
import safeStorage from "../utils/safeStorage.js";
import userStorage from "../utils/userStorage.js";
import { clearStaleFrameCache } from "../utils/frameCacheCleaner.js";
import "./Create.css";

const panelMotion = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const TOAST_MESSAGES = {
  saveError: "Gagal menyimpan draft. Coba lagi.",
  pasteSuccess: "Gambar ditempel ke kanvas.",
  pasteError: "Gagal menempel gambar. Pastikan clipboard berisi gambar.",
  deleteSuccess: "Elemen dihapus dari kanvas.",
};

const parseNumericValue = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const addRoundedRectPath = (ctx, x, y, width, height, radius) => {
  const effectiveRadius = Math.max(
    0,
    Math.min(radius, Math.min(width, height) / 2)
  );
  if (effectiveRadius === 0) {
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.closePath();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(x + effectiveRadius, y);
  ctx.lineTo(x + width - effectiveRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + effectiveRadius);
  ctx.lineTo(x + width, y + height - effectiveRadius);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - effectiveRadius,
    y + height
  );
  ctx.lineTo(x + effectiveRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - effectiveRadius);
  ctx.lineTo(x, y + effectiveRadius);
  ctx.quadraticCurveTo(x, y, x + effectiveRadius, y);
  ctx.closePath();
};

const loadImageAsync = (
  src,
  { timeoutMs = 8000, crossOrigin = "anonymous" } = {}
) =>
  new Promise((resolve, reject) => {
    if (typeof src !== "string" || src.length === 0) {
      reject(new Error("Invalid image source"));
      return;
    }

    const isDataUrl = src.startsWith("data:");
    const isBlobUrl = src.startsWith("blob:");
    const isHttpUrl = /^https?:/i.test(src);
    const isRelativeUrl =
      src.startsWith("/") || src.startsWith("./") || src.startsWith("../");

    if (!isDataUrl && !isBlobUrl && !isHttpUrl && !isRelativeUrl) {
      reject(
        new Error(`Unsupported image source format: ${src.slice(0, 32)}...`)
      );
      return;
    }

    const img = new Image();
    let timeoutId = null;

    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      img.onload = null;
      img.onerror = null;
    };

    if (isHttpUrl || isRelativeUrl) {
      img.crossOrigin = crossOrigin;
    }

    img.onload = () => {
      cleanup();
      resolve(img);
    };

    img.onerror = (error) => {
      cleanup();
      reject(
        error instanceof Error ? error : new Error("Failed to load image")
      );
    };

    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Image load timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }

    img.decoding = "async";
    img.src = src;
  });

const withTimeout = (
  promise,
  { timeoutMs = 10000, timeoutMessage, onTimeout } = {}
) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const timerId = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      try {
        onTimeout?.();
      } catch (error) {
        console.warn("⚠️ withTimeout onTimeout handler failed:", error);
      }
      const err = new Error(
        timeoutMessage || `Operation timed out after ${timeoutMs}ms`
      );
      err.name = "TimeoutError";
      reject(err);
    }, timeoutMs);

    promise
      .then((value) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timerId);
        resolve(value);
      })
      .catch((error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timerId);
        reject(error);
      });
  });
};

const computeDraftSaveTimeoutMs = (bytes, baseTimeoutMs = 20000) => {
  // ⚡ Increased base from 15s to 20s
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return baseTimeoutMs;
  }

  const bytesPerMb = 1024 * 1024;
  const approxMb = bytes / bytesPerMb;

  // ⚡ More generous scaling: 8s per MB (up from 6s) to handle larger payloads
  const extraMsPerMb = 8000;
  const extraMs = Math.max(
    0,
    Math.ceil(Math.max(0, approxMb - 1)) * extraMsPerMb
  );
  const computedTimeout = baseTimeoutMs + extraMs;
  const maxTimeout = 90000; // ⚡ Extended cap from 60s to 90s for very large drafts

  return Math.min(Math.max(baseTimeoutMs, computedTimeout), maxTimeout);
};

const prepareCanvasExportClone = (rootNode) => {
  if (!rootNode) {
    return;
  }

  try {
    rootNode.setAttribute("data-export-clone", "true");

    // Remove UI elements that shouldn't be in export
    const ignoreNodes = rootNode.querySelectorAll("[data-export-ignore]");
    ignoreNodes.forEach((node) => node.remove());

    const resizeHandles = rootNode.querySelectorAll(
      ".react-rnd-handle, .creator-resize-wrapper"
    );
    resizeHandles.forEach((node) => node.remove());

    // Make photo slots transparent (they will be filled with actual photos later)
    const photoSlots = rootNode.querySelectorAll(
      ".creator-element--type-photo"
    );
    photoSlots.forEach((slot) => {
      slot.style.background = "transparent";
      slot.style.backgroundColor = "transparent";
      slot.style.boxShadow = "none";
      slot.style.color = "transparent";
      slot.style.textShadow = "none";
      slot.style.fontSize = "0px";
      slot.style.filter = "none";
      slot.style.mixBlendMode = "normal";
      const children = Array.from(slot.children || []);
      children.forEach((child) => slot.removeChild(child));
    });

    // ✅ CRITICAL FIX: Physically reorder DOM elements by z-index
    // html2canvas renders based on DOM order when position:absolute is used
    const creatorElements = Array.from(
      rootNode.querySelectorAll(".creator-element")
    );

    if (creatorElements.length > 0) {
      // Get parent container
      const parent = creatorElements[0].parentNode;

      // Sort elements by z-index (low to high)
      const sorted = creatorElements.sort((a, b) => {
        const aZ =
          Number.parseFloat(a.getAttribute("data-element-zindex")) ||
          Number.parseFloat(a.style.zIndex) ||
          0;
        const bZ =
          Number.parseFloat(b.getAttribute("data-element-zindex")) ||
          Number.parseFloat(b.style.zIndex) ||
          0;
        return aZ - bZ;
      });

      // Remove all elements from DOM
      sorted.forEach((el) => el.remove());

      // Re-append in sorted order (low z-index first, high z-index last)
      sorted.forEach((el) => {
        // Sync CSS z-index to match data attribute
        const dataZ = el.getAttribute("data-element-zindex");
        if (dataZ && Number.isFinite(Number.parseFloat(dataZ))) {
          el.style.zIndex = dataZ;
        }
        parent.appendChild(el);
      });

      console.log(
        "✅ [prepareCanvasExportClone] DOM reordered by z-index:",
        sorted.map((el) => ({
          type: el.className.match(/creator-element--type-(\w+)/)?.[1],
          zIndex: el.style.zIndex,
          dataZIndex: el.getAttribute("data-element-zindex"),
        }))
      );
    }
  } catch (error) {
    console.error(
      "❌ [prepareCanvasExportClone] Error during clone preparation:",
      error
    );
  }
};

const getSafeZIndex = (element) => {
  if (!element || typeof element !== "object") {
    return NORMAL_ELEMENTS_MIN_Z;
  }
  const parsed = Number(element.zIndex);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  if (element.type === "background-photo") {
    return BACKGROUND_PHOTO_Z;
  }
  return NORMAL_ELEMENTS_MIN_Z;
};

const collectOverlayElementIds = (elements = []) => {
  if (!Array.isArray(elements) || elements.length === 0) {
    return new Set();
  }

  const photoElements = elements.filter(
    (element) =>
      element &&
      element.type === "photo" &&
      element.data?.__capturedOverlay !== true
  );

  if (photoElements.length === 0) {
    return new Set();
  }

  const overlayIds = new Set();
  const photoZValues = photoElements.map((photo) => getSafeZIndex(photo));

  elements.forEach((candidate) => {
    if (!candidate || overlayIds.has(candidate.id)) {
      return;
    }

    if (
      candidate.type === "photo" ||
      candidate.type === "background-photo" ||
      candidate.type === "transparent-area" ||
      candidate.data?.__capturedOverlay === true
    ) {
      return;
    }

    const candidateZ = getSafeZIndex(candidate);

    const shouldOverlay = photoZValues.some((photoZ) => candidateZ > photoZ);
    if (shouldOverlay && candidate?.id) {
      overlayIds.add(candidate.id);
    }
  });

  return overlayIds;
};

const normalizePhotoLayering = (elements = []) => {
  if (!Array.isArray(elements) || elements.length === 0) {
    return elements;
  }

  let didMutate = false;

  const normalizedElements = elements.map((element) => {
    if (!element || typeof element !== "object") {
      return element;
    }

    if (element.type === "background-photo") {
      return element;
    }

    // If element already has a valid z-index, KEEP IT!
    // Don't auto-increment or change existing z-index values
    if (Number.isFinite(element.zIndex)) {
      return element;
    }

    // Only set default z-index for elements that don't have one
    const absoluteMin = BACKGROUND_PHOTO_Z + 1;
    let defaultZ = NORMAL_ELEMENTS_MIN_Z;

    // Photo and upload elements can start lower
    if (element.type === "photo" || element.type === "upload") {
      defaultZ = PHOTO_SLOT_MIN_Z;
    }

    let desiredZ = defaultZ;
    if (desiredZ < absoluteMin) {
      desiredZ = absoluteMin;
    }

    didMutate = true;
    return { ...element, zIndex: desiredZ };
  });

  return didMutate ? normalizedElements : elements;
};

const createOverlayId = (placeholderId, photoIndex) => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `captured-overlay-${
    placeholderId || "slot"
  }-${photoIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const deriveOverlayZIndex = (placeholder) => {
  const baseZ = Number.isFinite(placeholder?.zIndex)
    ? placeholder.zIndex
    : NORMAL_ELEMENTS_MIN_Z;
  return baseZ + CAPTURED_OVERLAY_Z_OFFSET;
};

const createCapturedPhotoOverlay = (placeholder, photoData, photoIndex) => {
  const overlayId = createOverlayId(placeholder?.id, photoIndex);
  const overlayZIndex = deriveOverlayZIndex(placeholder);
  return {
    id: overlayId,
    type: "upload",
    x: placeholder?.x ?? 0,
    y: placeholder?.y ?? 0,
    width: placeholder?.width ?? 0,
    height: placeholder?.height ?? 0,
    rotation: placeholder?.rotation ?? 0,
    zIndex: overlayZIndex,
    isLocked: true,
    data: {
      image: photoData,
      objectFit: "cover",
      borderRadius: placeholder?.data?.borderRadius ?? 0,
      stroke: null,
      strokeWidth: 0,
      label: `Foto ${photoIndex + 1}`,
      __capturedOverlay: true,
      __sourcePlaceholderId: placeholder?.id ?? null,
      __photoIndex: photoIndex,
    },
  };
};

const injectCapturedPhotoOverlays = (elements = []) => {
  if (!Array.isArray(elements) || elements.length === 0) {
    return elements;
  }

  const storedPhotos = safeStorage.getJSON("capturedPhotos");
  if (!Array.isArray(storedPhotos) || storedPhotos.length === 0) {
    return elements.filter((element) => !element?.data?.__capturedOverlay);
  }

  const cleanedElements = elements.filter(
    (element) => !element?.data?.__capturedOverlay
  );

  const photoPlaceholders = cleanedElements.filter(
    (element) => element?.type === "photo"
  );

  if (!photoPlaceholders.length) {
    return cleanedElements;
  }

  const overlays = [];

  // Force overlays to use minimum z-index so photos stay behind ALL other elements
  // including background and shapes. This ensures captured photos never appear on top.

  photoPlaceholders.forEach((placeholder, placeholderIndex) => {
    const photoIndex = placeholderIndex;
    const photoData = storedPhotos[photoIndex];
    if (typeof photoData !== "string" || !photoData.startsWith("data:")) {
      return;
    }
    const overlay = createCapturedPhotoOverlay(
      placeholder,
      photoData,
      photoIndex
    );
    console.log(
      `📸 [injectCapturedPhotoOverlays] Creating overlay ${photoIndex} with z-index:`,
      overlay.zIndex
    );
    overlays.push(overlay);
  });

  if (!overlays.length) {
    return cleanedElements;
  }

  // Build a map from placeholder id -> overlay so we can insert overlays
  // next to their source placeholder. Appending overlays at the end
  // causes DOM order to put overlays after placeholders with equal zIndex,
  // which makes overlays render on top. Insert overlay before its
  // placeholder so they remain associated and respect stacking rules.
  const overlayBySource = new Map();
  overlays.forEach((ov) => {
    const src = ov?.data?.__sourcePlaceholderId;
    if (src) overlayBySource.set(src, ov);
  });

  const result = [];
  cleanedElements.forEach((el) => {
    if (el?.type === "photo" && el.id && overlayBySource.has(el.id)) {
      // Insert overlay BEFORE the placeholder so placeholder remains later in DOM
      // (same zIndex but stable sort keeps array order). This prevents overlays
      // from being globally appended and accidentally appearing above unrelated
      // elements with the same stacking value.
      result.push(overlayBySource.get(el.id));
      result.push(el);
      overlayBySource.delete(el.id);
    } else {
      result.push(el);
    }
  });

  // If any overlays remain (no matching placeholder), append them at end
  overlayBySource.forEach((ov) => result.push(ov));

  console.log("✅ [injectCapturedPhotoOverlays] Final result:", {
    totalElements: result.length,
    overlaysAdded: overlays.length,
    zIndexes: result.map((el) => ({
      type: el.type,
      zIndex: el.zIndex,
      isOverlay: el?.data?.__capturedOverlay,
    })),
  });

  return result;
};

export default function Create() {
  console.log("[Create] Component rendering...");
  const fileInputRef = useRef(null);
  const uploadPurposeRef = useRef("upload");
  const toastTimeoutRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [activeMobileProperty, setActiveMobileProperty] = useState(null);
  const [showCanvasSizeInProperties, setShowCanvasSizeInProperties] =
    useState(false);
  const [gradientColor1, setGradientColor1] = useState("#667eea");
  const [gradientColor2, setGradientColor2] = useState("#764ba2");
  const [canvasAspectRatio, setCanvasAspectRatio] = useState("9:16"); // Story Instagram default
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [justSavedDraft, setJustSavedDraft] = useState(false); // Track if draft was just saved
  const [isBackgroundLocked, setIsBackgroundLocked] = useState(false); // Lock background to prevent accidental edits
  const previewFrameRef = useRef(null);
  const [previewConstraints, setPreviewConstraints] = useState({
    maxWidth: 280,
    maxHeight: 500,
  });
  const hasLoadedDraftRef = useRef(false);
  const isLoadingDraftRef = useRef(false); // NEW: Track when actively loading a draft
  const loadingTimeoutRef = useRef(null); // Track timeout for cleanup
  const location = useLocation();
  const navigate = useNavigate();

  // CRITICAL: Reset hasLoadedDraftRef on component unmount so storage clears on re-entry
  useEffect(() => {
    return () => {
      hasLoadedDraftRef.current = false;
    };
  }, []);

  const showToast = useCallback((type, message, duration = 3200) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, duration);
  }, []);

  const {
    elements,
    selectedElementId,
    canvasBackground,
    addElement,
    addUploadElement,
    addBackgroundPhoto,
    updateElement,
    selectElement,
    setCanvasBackground,
    removeElement,
    duplicateElement,
    toggleLock,
    resizeUploadImage,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    clearSelection,
    fitBackgroundPhotoToCanvas,
    setElements,
  } = useCreatorStore(
    useShallow((state) => ({
      elements: state.elements,
      selectedElementId: state.selectedElementId,
      canvasBackground: state.canvasBackground,
      addElement: state.addElement,
      addUploadElement: state.addUploadElement,
      addBackgroundPhoto: state.addBackgroundPhoto,
      updateElement: state.updateElement,
      selectElement: state.selectElement,
      setCanvasBackground: state.setCanvasBackground,
      removeElement: state.removeElement,
      duplicateElement: state.duplicateElement,
      toggleLock: state.toggleLock,
      resizeUploadImage: state.resizeUploadImage,
      bringToFront: state.bringToFront,
      sendToBack: state.sendToBack,
      bringForward: state.bringForward,
      sendBackward: state.sendBackward,
      clearSelection: state.clearSelection,
      fitBackgroundPhotoToCanvas: state.fitBackgroundPhotoToCanvas,
      setElements: state.setElements,
    }))
  );

  const selectedElement = useMemo(() => {
    if (selectedElementId === "background") return "background";
    return elements.find((el) => el.id === selectedElementId) || null;
  }, [elements, selectedElementId]);

  useEffect(() => {
    // Clear stale cache (older than 24 hours)
    clearStaleFrameCache();

    // ✅ CRITICAL FIX: Skip this effect while loading a draft
    // This prevents interference with draft loading process
    if (isLoadingDraftRef.current) {
      console.log(
        "⏭️ [useEffect] Skipping overlay injection - draft is loading"
      );
      return;
    }

    const storedPhotos = safeStorage.getJSON("capturedPhotos");
    const hasStoredPhotos =
      Array.isArray(storedPhotos) && storedPhotos.length > 0;
    const hasOverlays = elements.some(
      (element) => element?.data?.__capturedOverlay
    );

    if (hasStoredPhotos && !hasOverlays) {
      const augmented = injectCapturedPhotoOverlays(elements);
      if (augmented.length !== elements.length) {
        setElements(augmented);
      }
      return;
    }

    if (!hasStoredPhotos && hasOverlays) {
      const cleaned = elements.filter(
        (element) => !element?.data?.__capturedOverlay
      );
      if (cleaned.length !== elements.length) {
        setElements(cleaned);
      }
    }
  }, [elements, setElements]);

  useEffect(() => {
    if (!isMobileView) {
      setActiveMobileProperty(null);
      return;
    }
    if (!selectedElementId) {
      setActiveMobileProperty(null);
    }
  }, [isMobileView, selectedElementId]);

  const backgroundPhotoElement = useMemo(
    () => elements.find((el) => el.type === "background-photo") || null,
    [elements]
  );

  const selectedElementObject =
    selectedElement && selectedElement !== "background"
      ? selectedElement
      : null;
  const isBackgroundSelected = selectedElement === "background";
  const isMobilePropertyToolbar =
    isMobileView && (isBackgroundSelected || Boolean(selectedElementObject));

  useEffect(() => {
    if (!isMobileView) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const canvasNode =
        previewFrameRef.current?.querySelector("#creator-canvas");
      const toolbarNode = document.querySelector(".create-mobile-toolbar");
      const propertyPanelNode = document.querySelector(
        ".create-mobile-property-panel"
      );

      const target = event.target;
      const isInsideCanvas = canvasNode?.contains(target);
      const isInsideToolbar = toolbarNode?.contains(target);
      const isInsidePanel = propertyPanelNode?.contains(target);

      if (!isInsideCanvas && !isInsideToolbar && !isInsidePanel) {
        clearSelection();
        setActiveMobileProperty(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMobileView, clearSelection]);

  const mobilePropertyButtons = useMemo(() => {
    if (!isMobilePropertyToolbar) {
      return [];
    }

    if (isBackgroundSelected) {
      return [
        { id: "background-color", label: "Warna", icon: Palette },
        {
          id: "background-photo",
          label: backgroundPhotoElement ? "Foto" : "Tambah Foto",
          icon: ImageIcon,
        },
      ];
    }

    if (!selectedElementObject) {
      return [];
    }

    switch (selectedElementObject.type) {
      case "text":
        return [
          { id: "text-edit", label: "Edit", icon: TypeIcon },
          { id: "text-font", label: "Font", icon: TypeIcon },
          { id: "text-color", label: "Warna", icon: Palette },
          { id: "text-size", label: "Ukuran", icon: Maximize2 },
          { id: "text-align", label: "Rata", icon: AlignCenter },
          { id: "layer-order", label: "Lapisan", icon: Layers },
        ];
      case "shape":
        return [
          { id: "shape-color", label: "Warna", icon: Palette },
          { id: "shape-size", label: "Ukuran", icon: Maximize2 },
          { id: "shape-radius", label: "Sudut", icon: CornerDownRight },
          { id: "shape-outline", label: "Outline", icon: Square },
          { id: "layer-order", label: "Lapisan", icon: Layers },
        ];
      case "photo":
        return [
          { id: "photo-color", label: "Warna", icon: Palette },
          { id: "photo-fit", label: "Gaya", icon: Settings2 },
          { id: "photo-size", label: "Ukuran", icon: Maximize2 },
          { id: "photo-radius", label: "Sudut", icon: CornerDownRight },
          { id: "photo-outline", label: "Outline", icon: Square },
          { id: "layer-order", label: "Lapisan", icon: Layers },
        ];
      case "upload":
        return [
          { id: "photo-color", label: "Warna", icon: Palette },
          { id: "photo-fit", label: "Gaya", icon: Settings2 },
          { id: "photo-size", label: "Ukuran", icon: Maximize2 },
          { id: "photo-radius", label: "Sudut", icon: CornerDownRight },
          { id: "upload-outline", label: "Outline", icon: Square },
          { id: "layer-order", label: "Lapisan", icon: Layers },
        ];
      case "background-photo":
        return [
          { id: "bg-photo-fit", label: "Gaya", icon: Settings2 },
          { id: "bg-photo-size", label: "Ukuran", icon: Maximize2 },
          { id: "bg-photo-manage", label: "Foto", icon: ImageIcon },
        ];
      default:
        return [];
    }
  }, [
    isMobilePropertyToolbar,
    isBackgroundSelected,
    backgroundPhotoElement,
    selectedElementObject,
  ]);

  useEffect(() => {
    if (!activeMobileProperty) {
      return;
    }
    if (!isMobilePropertyToolbar) {
      setActiveMobileProperty(null);
      return;
    }
    const availableIds = new Set(mobilePropertyButtons.map((item) => item.id));
    if (!availableIds.has(activeMobileProperty)) {
      setActiveMobileProperty(null);
    }
  }, [activeMobileProperty, isMobilePropertyToolbar, mobilePropertyButtons]);

  const getImageMetadata = useCallback((src) => {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
          aspectRatio:
            image.naturalWidth > 0 && image.naturalHeight > 0
              ? image.naturalWidth / image.naturalHeight
              : undefined,
        });
      };
      image.onerror = () => resolve({});
      image.decoding = "async";
      image.src = src;
    });
  }, []);

  // Calculate canvas dimensions based on selected aspect ratio
  const getCanvasDimensions = useCallback((ratio) => {
    const defaultDimensions = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };

    console.log("🎯 [getCanvasDimensions] Input ratio:", ratio);

    if (typeof ratio !== "string") {
      console.log("  ❌ Not a string, returning default");
      return defaultDimensions;
    }

    const [rawWidth, rawHeight] = ratio.split(":").map(Number);
    const ratioWidth =
      Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : null;
    const ratioHeight =
      Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : null;

    console.log("  Parsed:", { rawWidth, rawHeight, ratioWidth, ratioHeight });

    if (!ratioWidth || !ratioHeight) {
      console.log("  ❌ Invalid ratio parts, returning default");
      return defaultDimensions;
    }

    if (ratioHeight >= ratioWidth) {
      const result = {
        width: CANVAS_WIDTH,
        height: Math.round((CANVAS_WIDTH * ratioHeight) / ratioWidth),
      };
      console.log("  ✅ Portrait/Square mode (H>=W):", result);
      return result;
    }

    const result = {
      width: Math.round((CANVAS_HEIGHT * ratioWidth) / ratioHeight),
      height: CANVAS_HEIGHT,
    };
    console.log("  ✅ Landscape mode (W>H):", result);
    return result;
  }, []);

  const deriveAspectRatioFromDraft = useCallback((draft) => {
    if (!draft) {
      return "9:16";
    }

    if (
      typeof draft.aspectRatio === "string" &&
      draft.aspectRatio.includes(":")
    ) {
      return draft.aspectRatio;
    }

    const width = Number(draft.canvasWidth);
    const height = Number(draft.canvasHeight);
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      return "9:16";
    }

    const normalize = (value) => Math.round(Number(value));
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

    const normalizedWidth = Math.max(1, normalize(width));
    const normalizedHeight = Math.max(1, normalize(height));
    const divisor = gcd(normalizedWidth, normalizedHeight);
    const ratioWidth = Math.max(1, Math.round(normalizedWidth / divisor));
    const ratioHeight = Math.max(1, Math.round(normalizedHeight / divisor));
    return `${ratioWidth}:${ratioHeight}`;
  }, []);

  const scaleDraftElements = useCallback(
    (elements, fromWidth, fromHeight, toWidth, toHeight) => {
      if (!Array.isArray(elements)) {
        return [];
      }

      if (
        !Number.isFinite(fromWidth) ||
        !Number.isFinite(fromHeight) ||
        fromWidth <= 0 ||
        fromHeight <= 0
      ) {
        return elements;
      }

      if (
        !Number.isFinite(toWidth) ||
        !Number.isFinite(toHeight) ||
        toWidth <= 0 ||
        toHeight <= 0
      ) {
        return elements;
      }

      const scaleX = toWidth / fromWidth;
      const scaleY = toHeight / fromHeight;

      if (Math.abs(scaleX - 1) < 0.001 && Math.abs(scaleY - 1) < 0.001) {
        return elements;
      }

      const averageScale = (scaleX + scaleY) / 2;

      return elements.map((element) => {
        if (!element || typeof element !== "object") {
          return element;
        }

        const next = { ...element };

        if (typeof next.x === "number") {
          next.x = Math.round(next.x * scaleX);
        }
        if (typeof next.y === "number") {
          next.y = Math.round(next.y * scaleY);
        }
        if (typeof next.width === "number") {
          next.width = Math.round(next.width * scaleX);
        }
        if (typeof next.height === "number") {
          next.height = Math.round(next.height * scaleY);
        }

        if (next?.data && typeof next.data === "object") {
          const data = { ...next.data };

          if (typeof data.borderRadius === "number") {
            data.borderRadius = Math.max(
              0,
              Math.round(data.borderRadius * averageScale)
            );
          }

          if (typeof data.strokeWidth === "number") {
            data.strokeWidth = Math.max(
              0,
              Math.round(data.strokeWidth * averageScale)
            );
          }

          if (typeof data.fontSize === "number") {
            data.fontSize = Math.max(1, Math.round(data.fontSize * scaleY));
          }

          if (typeof data.lineHeight === "number") {
            data.lineHeight = Math.max(0.1, data.lineHeight * scaleY);
          }

          if (typeof data.letterSpacing === "number") {
            data.letterSpacing = data.letterSpacing * scaleX;
          }

          if (typeof data.outlineWidth === "number") {
            data.outlineWidth = Math.max(
              0,
              Math.round(data.outlineWidth * averageScale)
            );
          }

          next.data = data;
        }

        return next;
      });
    },
    []
  );

  const loadDraftIntoEditor = useCallback(
    async (draftId, { notify = true } = {}) => {
      console.log("🎬 [loadDraftIntoEditor] STARTED with draftId:", draftId);

      if (!draftId) {
        console.log("❌ [loadDraftIntoEditor] No draftId provided");
        return false;
      }

      // ✅ CRITICAL FIX: Set loading flag to prevent useEffect interference
      isLoadingDraftRef.current = true;
      console.log("🔒 [loadDraftIntoEditor] Set loading flag to TRUE");

      // ✅ CRITICAL FIX: getDraftById is async, must await it!
      const draft = await draftStorage.getDraftById(draftId);
      console.log("📦 [loadDraftIntoEditor] Draft from storage:", {
        found: !!draft,
        id: draft?.id,
        elementsCount: draft?.elements?.length,
        hasPreview: !!draft?.preview,
        hasCapturedPhotos: draft?.capturedPhotos?.length || 0,
      });

      if (!draft) {
        if (notify) {
          showToast("error", "Draft tidak ditemukan.");
        }
        isLoadingDraftRef.current = false; // Reset flag on error
        return false;
      }

      // Restore captured photos if they were saved with the draft
      if (
        Array.isArray(draft.capturedPhotos) &&
        draft.capturedPhotos.length > 0
      ) {
        console.log(
          "📸 [loadDraftIntoEditor] Restoring captured photos:",
          draft.capturedPhotos.length
        );
        safeStorage.setJSON("capturedPhotos", draft.capturedPhotos);
      } else {
        console.log("📸 [loadDraftIntoEditor] No captured photos to restore");
        safeStorage.removeItem("capturedPhotos");
      }

      let clonedElements = Array.isArray(draft.elements)
        ? typeof structuredClone === "function"
          ? structuredClone(draft.elements)
          : JSON.parse(JSON.stringify(draft.elements))
        : [];

      console.log(
        "📋 [loadDraftIntoEditor] Cloned elements:",
        clonedElements.length
      );

      // Ensure background-photo always has z-index 0
      clonedElements = clonedElements.map((el) => {
        if (el?.type === "background-photo") {
          return { ...el, zIndex: 0 };
        }
        return el;
      });

      // ✅ FIX: Don't add frame artwork when loading draft!
      // The draft.elements already contains all elements including frame artwork if it was saved
      // Adding it again here causes DUPLICATION (frame appears 2x)
      //
      // REMOVED CODE:
      // - Check for draft.frameArtwork
      // - Use draft.preview as fallback
      // - Create and push artworkElement
      //
      // WHY: Draft should be self-contained with all elements
      // Frame artwork was already saved in draft.elements when template was created

      console.log(
        "📋 [loadDraftIntoEditor] Cloned elements (WITHOUT adding frame artwork separately):",
        {
          count: clonedElements.length,
          types: clonedElements.map((el) => el.type),
        }
      );

      const targetAspectRatio = deriveAspectRatioFromDraft(draft);
      const targetDimensions = getCanvasDimensions(targetAspectRatio);
      const sourceWidth = Number(draft.canvasWidth) || targetDimensions.width;
      const sourceHeight =
        Number(draft.canvasHeight) || targetDimensions.height;
      const scaledElements = scaleDraftElements(
        clonedElements,
        sourceWidth,
        sourceHeight,
        targetDimensions.width,
        targetDimensions.height
      );

      const withoutTransparentAreas = Array.isArray(scaledElements)
        ? scaledElements.filter(
            (element) => element?.type !== "transparent-area"
          )
        : [];
      const normalizedElements = normalizePhotoLayering(
        withoutTransparentAreas
      );

      // ✅ CRITICAL FIX: Don't inject overlays when loading draft
      // The draft should already have all elements it needs
      // Injecting overlays here causes issues with z-index and element visibility
      // The useEffect will handle overlay injection later if needed (but we skip it with the loading flag)
      console.log(
        "✅ [loadDraftIntoEditor] Using normalized elements WITHOUT overlay injection:",
        {
          elementsCount: normalizedElements.length,
          types: normalizedElements.map((el) => ({
            type: el.type,
            zIndex: el.zIndex,
          })),
        }
      );

      const runtimeElements = normalizedElements; // Don't inject overlays during load

      console.log("✅ [loadDraftIntoEditor] Setting elements:", {
        normalizedCount: normalizedElements.length,
        runtimeCount: runtimeElements.length,
        aspectRatio: targetAspectRatio,
        detailedElements: runtimeElements.map((el) => ({
          id: el.id?.slice(0, 8),
          type: el.type,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          zIndex: el.zIndex,
          hasImage: !!el.data?.image,
          text: el.data?.text,
        })),
      });

      setCanvasAspectRatio(targetAspectRatio);
      setElements(runtimeElements);
      if (draft.canvasBackground) {
        setCanvasBackground(draft.canvasBackground);
      }
      setActiveDraftId(draft.id);
      clearSelection();
      setActiveMobileProperty(null);

      const effectiveSignature =
        draft.signature ||
        computeDraftSignature(
          normalizedElements,
          draft.canvasBackground,
          targetAspectRatio
        );

      userStorage.setItem("activeDraftId", draft.id);
      if (effectiveSignature) {
        userStorage.setItem("activeDraftSignature", effectiveSignature);
      }

      hasLoadedDraftRef.current = true;

      // ✅ CRITICAL FIX: Clear loading flag after elements are set
      // Use tracked timeout for proper cleanup
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      loadingTimeoutRef.current = setTimeout(() => {
        isLoadingDraftRef.current = false;
        loadingTimeoutRef.current = null;
        console.log("🔓 [loadDraftIntoEditor] Cleared loading flag");
      }, 100);

      if (notify) {
        showToast("success", "Draft dimuat. Lanjutkan edit sesuai kebutuhan.");
      }

      return true;
    },
    [
      clearSelection,
      deriveAspectRatioFromDraft,
      getCanvasDimensions,
      scaleDraftElements,
      setActiveDraftId,
      setActiveMobileProperty,
      setCanvasAspectRatio,
      setCanvasBackground,
      setElements,
      showToast,
    ]
  );

  useEffect(() => {
    const draftId = location.state?.draftId;
    const comeFromDraftsPage = !!draftId;

    console.log("🎯 [Create useEffect] Navigation detected:", {
      hasDraftId: !!draftId,
      draftId,
      comeFromDraftsPage,
      pathname: location.pathname,
      state: location.state,
    });

    if (comeFromDraftsPage) {
      // User clicked "Lihat Frame" from Drafts page - load the draft
      console.log("📂 [Create] Loading draft from Drafts page:", draftId);
      hasLoadedDraftRef.current = false; // Reset before loading

      // ✅ CRITICAL FIX: loadDraftIntoEditor is now async, must await it
      loadDraftIntoEditor(draftId, { notify: true })
        .then((success) => {
          console.log("📂 [Create] loadDraftIntoEditor result:", success);
        })
        .catch((error) => {
          console.error("❌ [Create] Failed to load draft:", error);
        });

      navigate(location.pathname, { replace: true, state: null });
    } else if (!hasLoadedDraftRef.current) {
      // User entered Create page directly - reset ONLY on first mount
      console.log("🔄 [Create] First time entry - resetting canvas");
      setElements([]);
      setCanvasBackground("#f7f1ed");
      setCanvasAspectRatio("9:16");
      setActiveDraftId(null);
      clearSelection();
      userStorage.removeItem("activeDraftId");
      userStorage.removeItem("activeDraftSignature");
      // Clear capturedPhotos from BOTH storage systems to ensure clean state
      userStorage.removeItem("capturedPhotos");
      safeStorage.removeItem("capturedPhotos");
      safeStorage.removeItem("capturedVideos");
      userStorage.removeItem("draftFrameArtwork");
      hasLoadedDraftRef.current = true; // Mark as initialized
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.draftId]); // Only re-run when draftId changes, not on every location change

  useEffect(() => {
    if (hasLoadedDraftRef.current) {
      return;
    }

    const storedDraftId = userStorage.getItem("activeDraftId");
    if (!storedDraftId) {
      return;
    }

    // ✅ CRITICAL FIX: loadDraftIntoEditor is async
    loadDraftIntoEditor(storedDraftId, { notify: false })
      .then(async (loaded) => {
        if (loaded) {
          const storedSignature = userStorage.getItem("activeDraftSignature");
          const draft = await draftStorage.getDraftById(storedDraftId);
          if (
            storedSignature &&
            draft?.signature &&
            storedSignature !== draft.signature
          ) {
            // Signature mismatch - update storage to reflect current draft state
            safeStorage.setItem("activeDraftSignature", draft.signature);
          }
        }
      })
      .catch((error) => {
        console.error("❌ [Create] Failed to load stored draft:", error);
      });
  }, [loadDraftIntoEditor]);

  useEffect(() => {
    if (!backgroundPhotoElement) {
      return;
    }

    if (!backgroundPhotoElement.data?.imageAspectRatio) {
      const { width: canvasWidth, height: canvasHeight } =
        getCanvasDimensions(canvasAspectRatio);
      const inferredRatio =
        backgroundPhotoElement.width > 0 && backgroundPhotoElement.height > 0
          ? backgroundPhotoElement.width / backgroundPhotoElement.height
          : canvasWidth / canvasHeight;
      updateElement(backgroundPhotoElement.id, {
        data: { imageAspectRatio: inferredRatio },
      });
    }
  }, [
    backgroundPhotoElement,
    updateElement,
    canvasAspectRatio,
    getCanvasDimensions,
  ]);

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        isLoadingDraftRef.current = false;
      }
    },
    []
  );

  const triggerUpload = useCallback(() => {
    uploadPurposeRef.current = "upload";
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, []);

  const triggerBackgroundUpload = useCallback(() => {
    uploadPurposeRef.current = "background";
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === "string") {
        if (uploadPurposeRef.current === "background") {
          const metadata = await getImageMetadata(dataUrl);
          const { width: canvasWidth, height: canvasHeight } =
            getCanvasDimensions(canvasAspectRatio);
          addBackgroundPhoto(dataUrl, {
            ...metadata,
            canvasWidth,
            canvasHeight,
          });
          showToast("success", "Background foto diperbarui.", 2200);
        } else {
          addUploadElement(dataUrl);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTemplate = async () => {
    if (saving) return;
    const canvasNode = document.getElementById("creator-canvas");
    if (!canvasNode) return;

    let cleanupCapture = null;
    setSaving(true);
    try {
      const { width: canvasWidth, height: canvasHeight } =
        getCanvasDimensions(canvasAspectRatio);

      console.log("🔍 [SAVE DRAFT DEBUG]");
      console.log("  canvasAspectRatio state:", canvasAspectRatio);
      console.log("  Calculated dimensions:", { canvasWidth, canvasHeight });
      console.log("  Calculated aspect ratio:", canvasWidth / canvasHeight);
      console.log("  Expected for 9:16:", 9 / 16, "=", 1080 / 1920);

      // ⚡ AGGRESSIVE: Use lower scale to reduce capture time and size
      const captureScale = 1; // Always use 1x scale (was: 2x for small canvases)

      const exportWrapper = document.createElement("div");
      Object.assign(exportWrapper.style, {
        position: "fixed",
        top: "-10000px",
        left: "-10000px",
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        overflow: "hidden",
        pointerEvents: "none",
        opacity: "0",
        zIndex: "-1",
      });

      const exportCanvasNode = canvasNode.cloneNode(true);
      exportCanvasNode.id = "creator-canvas-export";
      Object.assign(exportCanvasNode.style, {
        transform: "none",
        transformOrigin: "top left",
        position: "relative",
        top: "0",
        left: "0",
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        margin: "0",
        boxShadow: "none",
      });

      exportWrapper.appendChild(exportCanvasNode);
      document.body.appendChild(exportWrapper);

      // ✅ SIMPLIFIED: No overlay logic, just sync z-index
      prepareCanvasExportClone(exportCanvasNode);

      cleanupCapture = () => {
        if (exportWrapper.parentNode) {
          exportWrapper.parentNode.removeChild(exportWrapper);
        }
      };

      // ✅ SINGLE CAPTURE: html2canvas will respect CSS z-index ordering
      console.log(
        "📸 [html2canvas] Starting capture with scale:",
        captureScale
      );
      const captureStartTime = Date.now();

      const capturePromise = html2canvas(exportCanvasNode, {
        backgroundColor: null, // Transparent background
        useCORS: true,
        scale: captureScale,
        width: canvasWidth,
        height: canvasHeight,
        windowWidth: canvasWidth,
        windowHeight: canvasHeight,
        scrollX: 0,
        scrollY: 0,
        allowTaint: true,
        logging: false, // Disable html2canvas verbose logging
        ignoreElements: (element) => {
          if (!element) return false;
          if (element.nodeType === Node.ELEMENT_NODE) {
            // Only ignore UI elements, NOT design elements
            if (
              element.classList?.contains("creator-element--captured-overlay")
            )
              return true;
            if (element.getAttribute?.("data-export-ignore") === "true")
              return true;
            if (element.closest?.('[data-export-ignore="true"]')) return true;
          }
          return false;
        },
      });

      let captureCanvas = null;
      try {
        captureCanvas = await withTimeout(capturePromise, {
          timeoutMs: 20000, // Increased from 15s to 20s for slower devices
          timeoutMessage: "Rendering canvas took too long",
          onTimeout: () =>
            console.warn("⚠️ html2canvas timed out while saving draft"),
        });
        const captureElapsed = Date.now() - captureStartTime;
        console.log(
          `📸 [html2canvas] Capture completed in ${captureElapsed}ms`
        );
      } catch (captureError) {
        const captureElapsed = Date.now() - captureStartTime;
        console.warn(
          `⚠️ html2canvas failed after ${captureElapsed}ms:`,
          captureError
        );
      }

      if (captureCanvas) {
        console.log("📸 [html2canvas result]", {
          width: captureCanvas.width,
          height: captureCanvas.height,
        });
      }

      // ✅ SIMPLIFIED PREVIEW GENERATION
      // Just use captureCanvas directly - it already has correct z-index layering
      // We only need to carve holes for photo slots

      const finalCanvas = document.createElement("canvas");
      finalCanvas.width =
        captureCanvas?.width ?? Math.round(canvasWidth * captureScale);
      finalCanvas.height =
        captureCanvas?.height ?? Math.round(canvasHeight * captureScale);
      const finalCtx = finalCanvas.getContext("2d", { alpha: true });

      if (finalCtx) {
        const photoElements = elements.filter((el) => el.type === "photo");
        const photoSlotInfos = [];

        photoElements.forEach((photoEl, placeholderIndex) => {
          const rawX = Number(photoEl?.x) || 0;
          const rawY = Number(photoEl?.y) || 0;
          const rawWidth = Number(photoEl?.width) || 0;
          const rawHeight = Number(photoEl?.height) || 0;
          if (rawWidth <= 0 || rawHeight <= 0) {
            return;
          }

          const candidateIndex = Number(photoEl?.data?.photoIndex);
          const photoIndex = Number.isFinite(candidateIndex)
            ? candidateIndex
            : placeholderIndex;

          photoSlotInfos.push({
            elementId: photoEl?.id ?? null,
            placeholderIndex,
            photoIndex,
            x: rawX * captureScale,
            y: rawY * captureScale,
            width: rawWidth * captureScale,
            height: rawHeight * captureScale,
            centerX: (rawX + rawWidth / 2) * captureScale,
            centerY: (rawY + rawHeight / 2) * captureScale,
            borderRadius:
              parseNumericValue(photoEl?.data?.borderRadius) * captureScale,
            rotationRadians: ((Number(photoEl?.rotation) || 0) * Math.PI) / 180,
          });
        });

        // Draw background (support solid color and gradients)
        const bgValue = canvasBackground || "#ffffff";
        if (
          bgValue.startsWith("linear-gradient") ||
          bgValue.startsWith("radial-gradient")
        ) {
          // Parse gradient and draw
          const gradientMatch = bgValue.match(
            /(linear|radial)-gradient\((.*)\)/
          );
          if (gradientMatch) {
            const [, type, params] = gradientMatch;
            const colors =
              params.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgba?\([^)]+\)/g) ||
              [];

            let gradient;
            if (type === "linear") {
              // Default diagonal gradient
              gradient = finalCtx.createLinearGradient(
                0,
                0,
                finalCanvas.width,
                finalCanvas.height
              );
            } else {
              // Radial gradient from center
              const centerX = finalCanvas.width / 2;
              const centerY = finalCanvas.height / 2;
              const radius =
                Math.max(finalCanvas.width, finalCanvas.height) / 2;
              gradient = finalCtx.createRadialGradient(
                centerX,
                centerY,
                0,
                centerX,
                centerY,
                radius
              );
            }

            // Add color stops
            if (colors.length >= 2) {
              gradient.addColorStop(0, colors[0]);
              gradient.addColorStop(1, colors[colors.length - 1]);
              if (colors.length > 2) {
                colors.slice(1, -1).forEach((color, i) => {
                  gradient.addColorStop((i + 1) / (colors.length - 1), color);
                });
              }
            }

            finalCtx.fillStyle = gradient;
          } else {
            finalCtx.fillStyle = "#ffffff";
          }
        } else {
          finalCtx.fillStyle = bgValue;
        }
        finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

        if (captureCanvas) {
          // Draw captured elements (already in correct z-index order)
          finalCtx.drawImage(captureCanvas, 0, 0);
        }

        // ✅ IMPORTANT: Do NOT carve holes for custom frames!
        // For custom frames:
        // - Preview image is just a thumbnail, not used as overlay in Editor
        // - Photo slots are already transparent in captureCanvas
        // - Editor renders photo slots + designer elements separately
        // - Carving would destroy text/shapes that are above photo slots!

        console.log(
          "✅ [Preview] Generated without carving (preserves layering for custom frames)"
        );
      }

      let exportCanvas = finalCanvas;
      const maxPreviewWidth = 400; // ⚡ Reduced from 640 for faster saves
      if (exportCanvas.width > maxPreviewWidth) {
        const previewScale = maxPreviewWidth / exportCanvas.width;
        const scaledCanvas = document.createElement("canvas");
        scaledCanvas.width = Math.max(
          1,
          Math.round(exportCanvas.width * previewScale)
        );
        scaledCanvas.height = Math.max(
          1,
          Math.round(exportCanvas.height * previewScale)
        );
        const ctx = scaledCanvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "medium"; // ⚡ Reduced from "high"
          ctx.drawImage(
            exportCanvas,
            0,
            0,
            scaledCanvas.width,
            scaledCanvas.height
          );
          exportCanvas = scaledCanvas;
        }
      }

      console.log("🖼️ [Preview canvas after scaling]", {
        width: exportCanvas.width,
        height: exportCanvas.height,
      });

      // IMPORTANT: Use JPEG with low quality for preview to save localStorage space
      // Preview is only used as thumbnail, doesn't need high quality or transparency
      // PNG format is 5-10x larger than JPEG and can cause quota exceeded errors!
      let previewDataUrl = "";
      try {
        // ⚡ Use JPEG with 0.5 quality (reduced from 0.6) - even smaller for faster saves
        previewDataUrl = exportCanvas.toDataURL("image/jpeg", 0.5);
        const previewSizeKB = Math.round(previewDataUrl.length / 1024);
        console.log("🖼️ [Preview compressed]", {
          format: "JPEG",
          quality: 0.5,
          sizeKB: previewSizeKB,
          purpose: "thumbnail only",
        });
      } catch (err) {
        console.warn("⚠️ JPEG preview error, trying lower quality", err);
        try {
          // Try even lower quality if needed
          previewDataUrl = exportCanvas.toDataURL("image/jpeg", 0.4);
        } catch (err2) {
          console.error("❌ Failed to generate preview:", err2);
          // Use tiny 1x1 placeholder if preview fails
          const tinyCanvas = document.createElement("canvas");
          tinyCanvas.width = 1;
          tinyCanvas.height = 1;
          previewDataUrl = tinyCanvas.toDataURL("image/jpeg", 0.5);
        }
      }

      if (!previewDataUrl || !previewDataUrl.startsWith("data:image")) {
        // Emergency fallback: tiny 1x1 image
        const tinyCanvas = document.createElement("canvas");
        tinyCanvas.width = 1;
        tinyCanvas.height = 1;
        previewDataUrl = tinyCanvas.toDataURL("image/jpeg", 0.5);
        console.warn("⚠️ Using emergency 1x1 preview fallback");
      }
      const serializedElements =
        typeof structuredClone === "function"
          ? structuredClone(elements)
          : JSON.parse(JSON.stringify(elements));

      console.log(
        "🔍 [SAVE DEBUG] serializedElements z-index info:",
        serializedElements.map((el) => ({
          type: el.type,
          id: el.id?.slice(0, 8),
          zIndex: el.zIndex,
          isOverlay: el?.data?.__capturedOverlay,
        }))
      );

      const cleanElements = serializedElements.filter(
        (element) =>
          element?.type !== "transparent-area" &&
          !element?.data?.__capturedOverlay
      );

      console.log("💾 [SAVING DRAFT] Elements breakdown:", {
        total: serializedElements.length,
        cleaned: cleanElements.length,
        types: cleanElements.map((el) => ({
          type: el.type,
          zIndex: el.zIndex,
          hasImage: !!el.data?.image,
        })),
      });

      const layeredElements = cleanElements.map((element) => {
        if (!element || typeof element !== "object") {
          return element;
        }

        // ✅ Photo slots: Ensure minimum z-index (above background)
        // But preserve user's z-index if already set higher
        if (element.type === "photo") {
          if (!Number.isFinite(element.zIndex)) {
            return {
              ...element,
              zIndex: PHOTO_SLOT_MIN_Z,
            };
          }
          // If user set z-index lower than minimum, enforce minimum
          if (element.zIndex < PHOTO_SLOT_MIN_Z) {
            console.warn(
              `⚠️ Photo slot z-index ${element.zIndex} is below minimum, setting to ${PHOTO_SLOT_MIN_Z}`
            );
            return {
              ...element,
              zIndex: PHOTO_SLOT_MIN_Z,
            };
          }
          // Keep user's z-index
          return element;
        }

        // ✅ Background photo: Always at the back
        if (element.type === "background-photo") {
          const desiredBackgroundZ = Number.isFinite(BACKGROUND_PHOTO_Z)
            ? BACKGROUND_PHOTO_Z
            : Number.isFinite(element.zIndex)
            ? element.zIndex
            : BACKGROUND_PHOTO_Z;

          if (element.zIndex === desiredBackgroundZ) {
            return element;
          }

          return {
            ...element,
            zIndex: desiredBackgroundZ,
          };
        }

        return element;
      });

      // ✅ DO NOT re-assign z-index for foreground elements!
      // The z-index from Create page should be preserved as-is.
      // Users have already arranged the layering in the canvas.

      console.log(
        "🔍 [SAVE DEBUG] Final layeredElements z-index info:",
        layeredElements.map((el) => ({
          type: el.type,
          id: el.id?.slice(0, 8),
          zIndex: el.zIndex,
        }))
      );

      // Compress upload and background-photo element images before saving
      console.log(
        "🗜️ [Compression] Starting image compression for elements:",
        layeredElements.length
      );
      const compressionStartTime = Date.now();

      const compressedElements = await Promise.all(
        layeredElements.map(async (element) => {
          const imageSource = element?.data?.image;
          const shouldCompress =
            typeof imageSource === "string" &&
            (element.type === "background-photo" || element.type === "upload");

          if (!shouldCompress) {
            return element;
          }

          try {
            const timeoutMs = element.type === "background-photo" ? 8000 : 6000; // Reduced timeout
            const img = await loadImageAsync(imageSource, { timeoutMs });

            if (
              !img ||
              !Number.isFinite(img.width) ||
              !Number.isFinite(img.height)
            ) {
              throw new Error("Invalid image dimensions");
            }

            // ⚡ ULTRA AGGRESSIVE: Smaller size and lower quality for faster saves
            const maxWidth = element.type === "background-photo" ? 600 : 480; // Reduced from 800/600
            const quality = element.type === "background-photo" ? 0.6 : 0.7; // Reduced from 0.65/0.75
            let targetWidth = img.width;
            let targetHeight = img.height;

            if (targetWidth > maxWidth) {
              const scale = maxWidth / targetWidth;
              targetWidth = maxWidth;
              targetHeight = Math.max(1, Math.round(targetHeight * scale));
            }

            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(targetWidth));
            canvas.height = Math.max(1, Math.round(targetHeight));
            const ctx = canvas.getContext("2d", { alpha: true }); // Enable alpha channel
            if (!ctx) {
              throw new Error("Failed to acquire 2D context");
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // ✅ CRITICAL FIX: Check if image has transparency
            // PNG images with transparency MUST stay as PNG, not convert to JPEG
            // JPEG doesn't support alpha channel - transparent areas become BLACK!
            const isOriginalPNG = imageSource.startsWith("data:image/png");
            const hasTransparency = isOriginalPNG; // Assume PNG has transparency

            let compressedImage;
            if (hasTransparency) {
              // Keep as PNG to preserve transparency
              compressedImage = canvas.toDataURL("image/png");
              console.log("🗜️ Keeping PNG format for transparency:", {
                type: element.type,
                format: "PNG",
                original: imageSource.length,
                compressed: compressedImage.length,
              });
            } else {
              // Use JPEG for better compression (no transparency)
              compressedImage = canvas.toDataURL("image/jpeg", quality);
              console.log("🗜️ Compressed image:", {
                type: element.type,
                format: "JPEG",
                original: imageSource.length,
                compressed: compressedImage.length,
                saved: imageSource.length - compressedImage.length,
                reductionPercent:
                  Math.round(
                    ((imageSource.length - compressedImage.length) /
                      imageSource.length) *
                      100
                  ) + "%",
              });
            }

            return {
              ...element,
              data: {
                ...element.data,
                image: compressedImage,
                originalImage: undefined,
              },
            };
          } catch (error) {
            console.warn(
              `⚠️ Failed to compress ${element.type} image, using original:`,
              error
            );
            return element;
          }
        })
      );

      const compressionElapsed = Date.now() - compressionStartTime;
      console.log(`🗜️ [Compression] Completed in ${compressionElapsed}ms`);

      const signature = computeDraftSignature(
        compressedElements,
        canvasBackground,
        canvasAspectRatio
      );

      console.log("💾 [SAVING DRAFT] Final data being saved:", {
        canvasWidth,
        canvasHeight,
        aspectRatio: canvasAspectRatio,
        "Calculated ratio": canvasWidth / canvasHeight,
        "Expected 9:16": 9 / 16,
        "Match?": Math.abs(canvasWidth / canvasHeight - 9 / 16) < 0.001,
      });

      // Save captured photos with the draft
      const rawCapturedPhotos = safeStorage.getJSON("capturedPhotos");
      const capturedPhotosCount = Array.isArray(rawCapturedPhotos)
        ? rawCapturedPhotos.length
        : 0;

      if (capturedPhotosCount > 0) {
        console.log(
          "� [SAVING DRAFT] Detected captured photos in storage but skipping persist to keep drafts lean:",
          {
            capturedPhotosCount,
          }
        );
      }

      // ✅ FIX: Don't save frameArtwork separately!
      // Frame artwork is already included in compressedElements array
      // Saving it separately causes duplication when loading
      //
      // REMOVED CODE:
      // - Find frameArtworkElement with __isFrameArtwork flag
      // - Extract frame artwork data
      // - Add frameArtwork property to draftDataToSave
      //
      // WHY: Elements array already contains all design elements including frame artwork
      // No need to duplicate it in a separate property

      // Calculate total size before saving
      const draftDataToSave = {
        id: activeDraftId || undefined,
        canvasBackground,
        canvasWidth,
        canvasHeight,
        aspectRatio: canvasAspectRatio,
        elements: compressedElements,
        preview: previewDataUrl,
        signature,
        capturedPhotos: undefined,
        // frameArtwork removed - already in elements array
      };

      const draftString = JSON.stringify(draftDataToSave);
      const draftSizeKB = Math.round(draftString.length / 1024);
      const draftSizeMB = (draftString.length / 1024 / 1024).toFixed(2);

      console.log("📏 [SAVE SIZE] Draft size before save:", {
        bytes: draftString.length,
        kilobytes: draftSizeKB + " KB",
        megabytes: draftSizeMB + " MB",
        elementsCount: compressedElements.length,
        backgroundPhotoCount: compressedElements.filter(
          (el) => el.type === "background-photo"
        ).length,
        uploadCount: compressedElements.filter((el) => el.type === "upload")
          .length,
      });

      // Check storage usage (IndexedDB provides much larger capacity)
      try {
        const { default: indexedDBStorage } = await import(
          "../utils/indexedDBStorage.js"
        );
        const storageEstimate = await indexedDBStorage.getStorageEstimate();
        console.log("💾 [STORAGE] IndexedDB usage:", {
          usageMB: (storageEstimate.usage / 1024 / 1024).toFixed(2) + " MB",
          quotaMB: (storageEstimate.quota / 1024 / 1024).toFixed(2) + " MB",
          percentage: storageEstimate.percentage + "%",
          newDraftSizeMB: draftSizeMB + " MB",
        });
      } catch (e) {
        console.warn("⚠️ Could not check storage usage:", e);
      }

      console.log("💾 [DRAFT SAVE] Starting save operation...");
      const saveStartTime = Date.now();

      const savePromise = draftStorage.saveDraft(draftDataToSave);
      const primaryTimeoutMs = computeDraftSaveTimeoutMs(draftString.length);
      const logTimeoutSeconds = Math.round(primaryTimeoutMs / 1000);

      console.log("⏱️ [DRAFT SAVE] Timeout budget:", {
        bytes: draftString.length,
        approxMB: draftSizeMB,
        primaryTimeoutMs,
        primaryTimeoutSeconds: logTimeoutSeconds,
      });

      const awaitDraftSave = async (promise, timeoutMs, attemptLabel) => {
        const seconds = Math.round(timeoutMs / 1000);
        return withTimeout(promise, {
          timeoutMs,
          timeoutMessage: `Menyimpan draft melebihi batas waktu (${attemptLabel}, ${seconds}s)`,
          onTimeout: () =>
            console.warn(
              `⚠️ Draft save timed out (${attemptLabel}, ${seconds}s)`
            ),
        });
      };

      let savedDraft;
      try {
        savedDraft = await awaitDraftSave(
          savePromise,
          primaryTimeoutMs,
          "utama"
        );
        const saveElapsed = Date.now() - saveStartTime;
        console.log(`💾 [DRAFT SAVE] Save completed in ${saveElapsed}ms`);
      } catch (primaryError) {
        if (primaryError?.name === "TimeoutError") {
          const extendedTimeoutMs = Math.min(primaryTimeoutMs + 20000, 60000);
          const extendedSeconds = Math.round(extendedTimeoutMs / 1000);
          console.warn(
            "⏱️ [DRAFT SAVE] Primary timeout elapsed, retrying with extended budget",
            {
              primaryTimeoutMs,
              extendedTimeoutMs,
              extendedSeconds,
            }
          );

          savedDraft = await awaitDraftSave(
            savePromise,
            extendedTimeoutMs,
            "lanjutan"
          );
          const saveElapsed = Date.now() - saveStartTime;
          console.log(
            `💾 [DRAFT SAVE] Save completed (extended) in ${saveElapsed}ms`
          );
        } else {
          throw primaryError;
        }
      }

      console.log("✅ [DRAFT SAVED] Success! Draft ID:", savedDraft.id);
      console.log(
        "✅ [DRAFT SAVED] Elements with preserved z-index:",
        compressedElements.map((el) => ({
          type: el.type,
          id: el.id?.slice(0, 8),
          zIndex: el.zIndex,
        }))
      );

      // IMPORTANT: Verify the draft is actually saved with correct z-index
      console.log("🔍 [VERIFICATION] Reading draft from storage...");
      const verifyDraft = await draftStorage.getDraftById(savedDraft.id);
      if (verifyDraft) {
        console.log("✅ [VERIFICATION] Draft loaded from storage:", {
          id: verifyDraft.id,
          elementsCount: verifyDraft.elements?.length,
          elementsZIndex: verifyDraft.elements?.map((el) => ({
            type: el.type,
            id: el.id?.slice(0, 8),
            zIndex: el.zIndex,
          })),
        });
      } else {
        console.error("❌ [VERIFICATION] Failed to load draft from storage!");
      }

      setActiveDraftId(savedDraft.id);
      setJustSavedDraft(true); // Show "Gunakan Frame Ini" button

      const successTitle = savedDraft.title || "Draft";
      showToast(
        "success",
        `${successTitle} tersimpan! Lihat di Profile → Drafts.`
      );
    } catch (error) {
      console.error("Failed to save draft", error);
      const isTimeoutError = error?.name === "TimeoutError";
      const message = isTimeoutError
        ? "Proses menyimpan terlalu lama. Coba kurangi ukuran gambar atau ulangi beberapa saat lagi."
        : error?.message && /quota|persist/i.test(error.message)
        ? "Penyimpanan penuh. Hapus draft lama terlebih dahulu."
        : TOAST_MESSAGES.saveError;
      showToast("error", message);
    } finally {
      try {
        cleanupCapture?.();
      } catch (err) {
        console.warn("⚠️ Failed to clean up capture node", err);
      }
      setSaving(false);
    }
  };

  const addToolElement = (type) => {
    if (type === "background") {
      if (isBackgroundLocked) {
        showToast("info", "Background dikunci. Unlock untuk mengedit.", 2000);
        return;
      }
      selectElement("background");
      return;
    }
    if (type === "upload") {
      triggerUpload();
      return;
    }
    const newElementId = addElement(type);
    if (newElementId) {
      selectElement(newElementId);
    }
  };

  const toggleBackgroundLock = useCallback(() => {
    setIsBackgroundLocked((prev) => !prev);
    showToast(
      "success",
      isBackgroundLocked ? "Background unlocked" : "Background locked",
      1500
    );
  }, [isBackgroundLocked, showToast]);

  const handleUseThisFrame = async () => {
    if (!activeDraftId) {
      showToast("error", "Tidak ada draft aktif untuk digunakan.");
      return;
    }

    try {
      console.log("🔍 [handleUseThisFrame] Looking for draft:", activeDraftId);

      // Check all drafts first
      const allDrafts = await draftStorage.loadDrafts();
      console.log(
        "🔍 [handleUseThisFrame] All drafts in storage:",
        allDrafts.map((d) => ({
          id: d.id,
          title: d.title,
          hasElements: !!d.elements,
        }))
      );

      // Load the draft
      let draft = await draftStorage.getDraftById(activeDraftId);
      if (!draft) {
        console.error("❌ [handleUseThisFrame] Draft not found!", {
          searchedId: activeDraftId,
          availableIds: allDrafts.map((d) => d.id),
        });

        // Try to re-save the current canvas as a new draft
        console.log(
          "🔄 [handleUseThisFrame] Attempting to save current canvas..."
        );
        showToast("info", "Draft hilang, menyimpan ulang...");

        try {
          // Trigger save again and WAIT for it to complete
          await handleSaveTemplate();

          console.log(
            "🔍 [handleUseThisFrame] After re-save, checking for draft:",
            activeDraftId
          );

          // Try to load again
          const retryDraft = await draftStorage.getDraftById(activeDraftId);

          if (!retryDraft) {
            console.error(
              "❌ [handleUseThisFrame] Draft STILL not found after re-save!",
              {
                activeDraftId,
                allDraftsAfterSave: (await draftStorage.loadDrafts()).map(
                  (d) => ({ id: d.id, title: d.title })
                ),
              }
            );
            throw new Error(
              "Draft tidak ditemukan setelah save ulang. Mungkin masalah storage."
            );
          }

          console.log(
            "✅ [handleUseThisFrame] Draft successfully saved and loaded!"
          );
          draft = retryDraft;
        } catch (saveError) {
          console.error("❌ [handleUseThisFrame] Save failed:", saveError);
          throw new Error(`Gagal menyimpan draft: ${saveError.message}`);
        }
      }

      console.log("✅ [handleUseThisFrame] Draft loaded:", {
        id: draft.id,
        title: draft.title,
        hasElements: !!draft.elements,
        elementsCount: draft.elements?.length,
      });

      // Activate the frame
      const { activateDraftFrame } = await import("../utils/draftHelpers.js");
      const frameConfig = activateDraftFrame(draft);

      if (!frameConfig) {
        throw new Error("Gagal membuat konfigurasi frame dari draft");
      }

      console.log("✅ [CREATE] Frame activated:", frameConfig.id);

      // Navigate to TakeMoment
      navigate("/take-moment");
    } catch (error) {
      console.error("❌ Failed to activate frame:", error);
      showToast("error", `Gagal menggunakan frame: ${error.message}`);
    }
  };

  useEffect(() => {
    const handleBackgroundUploadRequest = () => {
      triggerBackgroundUpload();
    };

    window.addEventListener(
      "creator:request-background-upload",
      handleBackgroundUploadRequest
    );

    const handlePaste = (event) => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      const target = event.target;
      if (
        target &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target.isContentEditable)
      ) {
        return;
      }

      const items = clipboardData.items ? Array.from(clipboardData.items) : [];
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      if (!imageItem) return;

      const file = imageItem.getAsFile();
      if (!file) return;

      event.preventDefault();

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          addUploadElement(result);
          showToast("success", TOAST_MESSAGES.pasteSuccess);
        } else {
          showToast("error", TOAST_MESSAGES.pasteError);
        }
      };
      reader.onerror = () => {
        showToast("error", TOAST_MESSAGES.pasteError);
      };
      reader.readAsDataURL(file);
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener(
        "creator:request-background-upload",
        handleBackgroundUploadRequest
      );
    };
  }, [addUploadElement, showToast, triggerBackgroundUpload]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return;

      if (event.key !== "Delete" && event.key !== "Backspace") return;

      const target = event.target;
      if (
        target &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target.isContentEditable)
      ) {
        return;
      }

      if (!selectedElementId || selectedElementId === "background") return;

      event.preventDefault();
      removeElement(selectedElementId);
      showToast("success", TOAST_MESSAGES.deleteSuccess, 2200);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, removeElement, showToast]);

  const toolButtons = useMemo(() => {
    const buttons = [
      {
        id: "canvas-size",
        label: "Ukuran Canvas",
        mobileLabel: "Ukuran",
        icon: Maximize2,
        onClick: () => {
          setShowCanvasSizeInProperties(true);
          selectElement(null); // Deselect any element
        },
        isActive: showCanvasSizeInProperties,
      },
      {
        id: "background",
        label: "Background",
        mobileLabel: "Background",
        icon: Palette,
        onClick: () => {
          setShowCanvasSizeInProperties(false);
          selectElement("background");
          // Desktop: hanya select background, tidak auto-upload
          // Upload dilakukan dari properties panel
          // Mobile: tetap auto-upload untuk UX lebih baik
          if (!backgroundPhotoElement && isMobileView) {
            triggerBackgroundUpload();
          }
        },
        isActive:
          selectedElementId === "background" ||
          selectedElement?.type === "background-photo",
      },
      {
        id: "photo",
        label: "Area Foto",
        mobileLabel: "Foto",
        icon: ImageIcon,
        onClick: () => {
          setShowCanvasSizeInProperties(false);
          addToolElement("photo");
        },
        isActive: selectedElement?.type === "photo",
      },
      {
        id: "text",
        label: "Add Text",
        mobileLabel: "Teks",
        icon: TypeIcon,
        onClick: () => {
          setShowCanvasSizeInProperties(false);
          addToolElement("text");
        },
        isActive: selectedElement?.type === "text",
      },
      {
        id: "shape",
        label: "Shape",
        mobileLabel: "Bentuk",
        icon: Shapes,
        onClick: () => {
          setShowCanvasSizeInProperties(false);
          addToolElement("shape");
        },
        isActive: selectedElement?.type === "shape",
      },
      {
        id: "upload",
        label: "Unggahan",
        mobileLabel: "Unggah",
        icon: UploadCloud,
        onClick: () => {
          setShowCanvasSizeInProperties(false);
          addToolElement("upload");
        },
        isActive: selectedElement?.type === "upload",
      },
    ];

    return buttons;
  }, [
    addToolElement,
    selectElement,
    selectedElement?.type,
    selectedElementId,
    backgroundPhotoElement,
    triggerBackgroundUpload,
    isMobileView,
    showCanvasSizeInProperties,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleChange = (event) => {
      setIsMobileView(event.matches);
    };

    setIsMobileView(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!isMobileView) {
      setActiveMobileProperty(null);
    }
  }, [isMobileView]);

  const handleToolButtonPress = (button) => {
    setActiveMobileProperty(null);
    button.onClick();
  };

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const node = previewFrameRef.current;
    if (!node) {
      return undefined;
    }

    const computeConstraints = () => {
      const { clientWidth, clientHeight } = node;
      const usableWidth = Math.max(0, Math.floor(clientWidth - 40));
      const usableHeight = Math.max(0, Math.floor(clientHeight - 40));

      if (usableWidth > 0 && usableHeight > 0) {
        setPreviewConstraints({
          maxWidth: usableWidth,
          maxHeight: usableHeight,
        });
      }
    };

    // Use requestAnimationFrame to ensure DOM is fully laid out
    requestAnimationFrame(() => {
      computeConstraints();
    });

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => computeConstraints());
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", computeConstraints);
    return () => window.removeEventListener("resize", computeConstraints);
  }, [isMobileView]);

  const handleElementDimensionChange = useCallback(
    (dimension, rawValue) => {
      if (!selectedElementObject) {
        return;
      }
      const numericValue = Number(rawValue);
      if (!Number.isFinite(numericValue)) {
        return;
      }
      const minValue = 40;
      const nextValue = Math.round(Math.max(minValue, numericValue));
      updateElement(selectedElementObject.id, { [dimension]: nextValue });
    },
    [selectedElementObject, updateElement]
  );

  const getMobilePropertyTitle = (propertyId) => {
    switch (propertyId) {
      case "text-edit":
        return "Edit Teks";
      case "text-font":
        return "Pilih Font";
      case "text-color":
        return "Warna Teks";
      case "text-size":
        return "Ukuran Teks";
      case "text-align":
        return "Perataan";
      case "shape-color":
        return "Warna Bentuk";
      case "shape-size":
        return "Ukuran Bentuk";
      case "shape-radius":
        return "Sudut Bentuk";
      case "photo-color":
        return "Warna";
      case "photo-fit":
        return "Gaya Foto";
      case "photo-size":
        return "Ukuran";
      case "photo-radius":
        return "Sudut";
      case "shape-outline":
        return "Outline Bentuk";
      case "photo-outline":
        return "Outline Foto";
      case "upload-outline":
        return "Outline Unggahan";
      case "layer-order":
        return "Atur Lapisan";
      case "background-color":
        return "Warna Latar";
      case "background-photo":
        return backgroundPhotoElement ? "Foto Latar" : "Tambah Foto";
      case "bg-photo-fit":
        return "Mode Foto";
      case "bg-photo-size":
        return "Ukuran Foto";
      case "bg-photo-manage":
        return "Kelola Foto";
      default:
        return "Properti";
    }
  };

  const renderMobilePropertyPanel = () => {
    if (!isMobilePropertyToolbar || !activeMobileProperty) {
      return null;
    }

    let content = null;
    let title = getMobilePropertyTitle(activeMobileProperty);

    if (isBackgroundSelected) {
      if (activeMobileProperty === "background-color") {
        const isGradient =
          canvasBackground?.startsWith("linear-gradient") ||
          canvasBackground?.startsWith("radial-gradient");
        const solidColor = isGradient
          ? "#ffffff"
          : canvasBackground || "#ffffff";

        content = (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <button
                type="button"
                onClick={() => setCanvasBackground(solidColor)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: !isGradient
                    ? "2px solid #8B5CF6"
                    : "1px solid #e2e8f0",
                  background: !isGradient ? "#F3E8FF" : "#fff",
                  color: !isGradient ? "#8B5CF6" : "#64748b",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Solid
              </button>
              <button
                type="button"
                onClick={() =>
                  setCanvasBackground(
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  )
                }
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: isGradient
                    ? "2px solid #8B5CF6"
                    : "1px solid #e2e8f0",
                  background: isGradient ? "#F3E8FF" : "#fff",
                  color: isGradient ? "#8B5CF6" : "#64748b",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Gradient
              </button>
            </div>

            {isGradient ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {/* Preview gradient */}
                <div
                  style={{
                    height: "80px",
                    borderRadius: "12px",
                    background: `linear-gradient(135deg, ${gradientColor1} 0%, ${gradientColor2} 100%)`,
                    border: "2px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />

                {/* Color Point 1 */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#64748b",
                    }}
                  >
                    Warna Titik 1:
                  </div>
                  <ColorPicker
                    value={gradientColor1}
                    onChange={(newColor) => {
                      setGradientColor1(newColor);
                      setCanvasBackground(
                        `linear-gradient(135deg, ${newColor} 0%, ${gradientColor2} 100%)`
                      );
                    }}
                  />
                </div>

                {/* Color Point 2 */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#64748b",
                    }}
                  >
                    Warna Titik 2:
                  </div>
                  <ColorPicker
                    value={gradientColor2}
                    onChange={(newColor) => {
                      setGradientColor2(newColor);
                      setCanvasBackground(
                        `linear-gradient(135deg, ${gradientColor1} 0%, ${newColor} 100%)`
                      );
                    }}
                  />
                </div>

                {/* Quick presets */}
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#475569",
                    marginTop: "4px",
                  }}
                >
                  Quick Presets:
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "6px",
                  }}
                >
                  {[
                    { name: "Purple", c1: "#667eea", c2: "#764ba2" },
                    { name: "Ocean", c1: "#667eea", c2: "#0093E9" },
                    { name: "Sunset", c1: "#f093fb", c2: "#f5576c" },
                    { name: "Forest", c1: "#11998e", c2: "#38ef7d" },
                    { name: "Pink", c1: "#FA8BFF", c2: "#2BD2FF" },
                    { name: "Gold", c1: "#FFB75E", c2: "#ED8F03" },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setGradientColor1(preset.c1);
                        setGradientColor2(preset.c2);
                        setCanvasBackground(
                          `linear-gradient(135deg, ${preset.c1} 0%, ${preset.c2} 100%)`
                        );
                      }}
                      style={{
                        padding: "20px 6px",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        background: `linear-gradient(135deg, ${preset.c1} 0%, ${preset.c2} 100%)`,
                        cursor: "pointer",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          bottom: "3px",
                          left: "50%",
                          transform: "translateX(-50%)",
                          fontSize: "9px",
                          fontWeight: 700,
                          color: "#fff",
                          textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ColorPicker
                value={solidColor}
                onChange={(nextColor) => setCanvasBackground(nextColor)}
              />
            )}
          </div>
        );
      } else if (activeMobileProperty === "background-photo") {
        content = (
          <div className="create-mobile-property-panel__actions">
            <button
              type="button"
              onClick={() => {
                triggerBackgroundUpload();
                setActiveMobileProperty(null);
              }}
              className="create-mobile-property-panel__action"
            >
              {backgroundPhotoElement
                ? "Ganti foto background"
                : "Tambah foto background"}
            </button>
            {backgroundPhotoElement && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const { width: canvasWidth, height: canvasHeight } =
                      getCanvasDimensions(canvasAspectRatio);
                    fitBackgroundPhotoToCanvas({ canvasWidth, canvasHeight });
                    setActiveMobileProperty(null);
                  }}
                  className="create-mobile-property-panel__action"
                >
                  Sesuaikan ke kanvas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeElement(backgroundPhotoElement.id);
                    clearSelection();
                    setActiveMobileProperty(null);
                  }}
                  className="create-mobile-property-panel__action create-mobile-property-panel__action--danger"
                >
                  Hapus foto background
                </button>
              </>
            )}
          </div>
        );
      }
    } else if (selectedElementObject) {
      const data = selectedElementObject.data ?? {};
      switch (activeMobileProperty) {
        case "text-edit":
          content = (
            <textarea
              className="create-mobile-property-panel__textarea"
              rows={4}
              value={data.text ?? ""}
              onChange={(event) =>
                updateElement(selectedElementObject.id, {
                  data: { text: event.target.value },
                })
              }
            />
          );
          break;
        case "text-font": {
          const fonts = [
            "Inter",
            "Roboto",
            "Lato",
            "Open Sans",
            "Montserrat",
            "Poppins",
            "Nunito Sans",
            "Rubik",
            "Work Sans",
            "Source Sans Pro",
            "Merriweather",
            "Playfair Display",
            "Libre Baskerville",
            "Cormorant Garamond",
            "Bitter",
            "Raleway",
            "Oswald",
            "Bebas Neue",
            "Anton",
            "Pacifico",
          ];
          content = (
            <div className="create-mobile-property-panel__actions">
              {fonts.map((font) => (
                <button
                  key={font}
                  type="button"
                  onClick={() => {
                    updateElement(selectedElementObject.id, {
                      data: { fontFamily: font },
                    });
                  }}
                  className={`create-mobile-property-panel__action ${
                    (data.fontFamily ?? "Inter") === font
                      ? "create-mobile-property-panel__action--active"
                      : ""
                  }`.trim()}
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              ))}
            </div>
          );
          break;
        }
        case "text-color":
          content = (
            <ColorPicker
              value={data.color ?? "#1F2933"}
              onChange={(nextColor) =>
                updateElement(selectedElementObject.id, {
                  data: { color: nextColor },
                })
              }
            />
          );
          break;
        case "text-size": {
          const fontSize = data.fontSize ?? 24;
          content = (
            <div className="create-mobile-property-panel__slider">
              <input
                type="range"
                min={12}
                max={72}
                value={fontSize}
                onChange={(event) =>
                  updateElement(selectedElementObject.id, {
                    data: { fontSize: Number(event.target.value) },
                  })
                }
              />
              <div className="create-mobile-property-panel__value-label">
                {fontSize}
                px
              </div>
            </div>
          );
          break;
        }
        case "text-align": {
          const alignOptions = [
            { id: "left", Icon: AlignLeft },
            { id: "center", Icon: AlignCenter },
            { id: "right", Icon: AlignRight },
          ];
          content = (
            <div className="create-mobile-property-panel__button-group">
              {alignOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    updateElement(selectedElementObject.id, {
                      data: { align: option.id },
                    })
                  }
                  className={`create-mobile-property-panel__button ${
                    (data.align ?? "center") === option.id
                      ? "create-mobile-property-panel__button--active"
                      : ""
                  }`.trim()}
                >
                  <option.Icon size={18} strokeWidth={2.5} />
                </button>
              ))}
            </div>
          );
          break;
        }
        case "shape-color":
        case "photo-color":
          content = (
            <ColorPicker
              value={data.fill ?? "#F4D3C2"}
              onChange={(nextColor) =>
                updateElement(selectedElementObject.id, {
                  data: { fill: nextColor },
                })
              }
            />
          );
          break;
        case "shape-size":
        case "photo-size":
          content = (
            <div className="create-mobile-property-panel__form-grid">
              <label className="create-mobile-property-panel__input">
                <span>Lebar</span>
                <input
                  type="number"
                  min={40}
                  value={Math.round(selectedElementObject.width ?? 0)}
                  onChange={(event) =>
                    handleElementDimensionChange("width", event.target.value)
                  }
                />
              </label>
              <label className="create-mobile-property-panel__input">
                <span>Tinggi</span>
                <input
                  type="number"
                  min={40}
                  value={Math.round(selectedElementObject.height ?? 0)}
                  onChange={(event) =>
                    handleElementDimensionChange("height", event.target.value)
                  }
                />
              </label>
            </div>
          );
          break;
        case "shape-radius":
        case "photo-radius": {
          const radiusValue = data.borderRadius ?? 24;
          content = (
            <div className="create-mobile-property-panel__slider">
              <input
                type="range"
                min={0}
                max={120}
                value={radiusValue}
                onChange={(event) =>
                  updateElement(selectedElementObject.id, {
                    data: { borderRadius: Number(event.target.value) },
                  })
                }
              />
              <div className="create-mobile-property-panel__value-label">
                {radiusValue}
                px
              </div>
            </div>
          );
          break;
        }
        case "shape-outline":
        case "photo-outline":
        case "upload-outline": {
          const elementType = selectedElementObject.type;
          const outlineWidth = Number(data.strokeWidth ?? 0);
          const defaultColor = elementType === "shape" ? "#d9b9ab" : "#f4f4f4";
          const outlineColor =
            typeof data.stroke === "string" && data.stroke.length > 0
              ? data.stroke
              : defaultColor;
          const maxWidth = elementType === "shape" ? 32 : 24;
          content = (
            <div className="create-mobile-property-panel__outline">
              <div className="create-mobile-property-panel__slider">
                <input
                  type="range"
                  min={0}
                  max={maxWidth}
                  value={outlineWidth}
                  onChange={(event) => {
                    const nextWidth = Number(event.target.value);
                    if (!Number.isFinite(nextWidth)) {
                      return;
                    }
                    const updates = {
                      strokeWidth: Math.max(0, nextWidth),
                    };
                    if (nextWidth > 0 && !data.stroke) {
                      updates.stroke = outlineColor;
                    }
                    updateElement(selectedElementObject.id, {
                      data: updates,
                    });
                  }}
                />
                <div className="create-mobile-property-panel__value-label">
                  {Math.round(outlineWidth)}px
                </div>
              </div>
              <div className="create-mobile-property-panel__color-picker">
                <ColorPicker
                  value={outlineColor}
                  onChange={(nextColor) =>
                    updateElement(selectedElementObject.id, {
                      data: { stroke: nextColor },
                    })
                  }
                />
              </div>
            </div>
          );
          break;
        }
        case "photo-fit":
        case "bg-photo-fit":
          content = (
            <div className="create-mobile-property-panel__select">
              <select
                value={data.objectFit ?? "cover"}
                onChange={(event) =>
                  updateElement(selectedElementObject.id, {
                    data: { objectFit: event.target.value },
                  })
                }
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Fill</option>
              </select>
            </div>
          );
          break;
        case "bg-photo-size":
          content = (
            <div className="create-mobile-property-panel__actions">
              <button
                type="button"
                onClick={() => {
                  const { width: canvasWidth, height: canvasHeight } =
                    getCanvasDimensions(canvasAspectRatio);
                  fitBackgroundPhotoToCanvas({ canvasWidth, canvasHeight });
                  setActiveMobileProperty(null);
                }}
                className="create-mobile-property-panel__action"
              >
                Sesuaikan ke kanvas
              </button>
            </div>
          );
          break;
        case "bg-photo-manage":
          content = (
            <div className="create-mobile-property-panel__actions">
              <button
                type="button"
                onClick={() => {
                  triggerBackgroundUpload();
                  setActiveMobileProperty(null);
                }}
                className="create-mobile-property-panel__action"
              >
                Ganti foto background
              </button>
              <button
                type="button"
                onClick={() => {
                  removeElement(selectedElementObject.id);
                  clearSelection();
                  setActiveMobileProperty(null);
                }}
                className="create-mobile-property-panel__action create-mobile-property-panel__action--danger"
              >
                Hapus foto background
              </button>
            </div>
          );
          break;
        case "layer-order":
          if (selectedElementObject?.type !== "background-photo") {
            content = (
              <div
                className="create-mobile-property-panel__actions"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    bringToFront(selectedElementObject.id);
                  }}
                  className="create-mobile-property-panel__action"
                >
                  <ChevronsUp size={18} style={{ marginRight: "8px" }} />
                  Paling Depan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    bringForward(selectedElementObject.id);
                  }}
                  className="create-mobile-property-panel__action"
                >
                  <ArrowUp size={18} style={{ marginRight: "8px" }} />
                  Kedepankan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sendToBack(selectedElementObject.id);
                  }}
                  className="create-mobile-property-panel__action"
                >
                  <ChevronsDown size={18} style={{ marginRight: "8px" }} />
                  Paling Belakang
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sendBackward(selectedElementObject.id);
                  }}
                  className="create-mobile-property-panel__action"
                >
                  <ArrowDown size={18} style={{ marginRight: "8px" }} />
                  Kebelakangkan
                </button>
              </div>
            );
          }
          break;
        default:
          break;
      }
    }

    if (!content) {
      return null;
    }

    return (
      <Motion.div
        key={activeMobileProperty}
        className="create-mobile-property-panel"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32 }}
        transition={{ type: "spring", stiffness: 360, damping: 32 }}
      >
        <div className="create-mobile-property-panel__header">
          <span>{title}</span>
          <button
            type="button"
            onClick={() => setActiveMobileProperty(null)}
            className="create-mobile-property-panel__close"
            aria-label="Tutup pengaturan"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className="create-mobile-property-panel__content">{content}</div>
      </Motion.div>
    );
  };

  return (
    <div className="create-page">
      {toast && (
        <Motion.div
          className="create-toast-wrapper"
          initial={{ opacity: 0, y: -12, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 460, damping: 26 }}
        >
          <div
            className={`create-toast ${
              toast.type === "success"
                ? "create-toast--success"
                : "create-toast--error"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={18} strokeWidth={2.5} />
            ) : (
              <AlertTriangle size={18} strokeWidth={2.5} />
            )}
            <span>{toast.message}</span>
          </div>
        </Motion.div>
      )}

      <div className="create-grid">
        {!isMobileView && (
          <Motion.aside
            variants={panelMotion}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.05 }}
            className="create-panel create-panel--tools"
          >
            <h2 className="create-panel__title">Tools</h2>
            <div className="create-tools__list">
              {toolButtons.map((button) => {
                const IconComponent = button.icon;
                return (
                  <button
                    key={button.id}
                    type="button"
                    onClick={() => handleToolButtonPress(button)}
                    className={`create-tools__button ${
                      button.isActive ? "create-tools__button--active" : ""
                    }`.trim()}
                  >
                    <IconComponent size={20} strokeWidth={2} />
                    <span>{button.label}</span>
                  </button>
                );
              })}
            </div>
          </Motion.aside>
        )}

        <Motion.section
          variants={panelMotion}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="create-preview"
        >
          <h2 className="create-preview__title">Preview</h2>

          <div className="create-preview__body">
            <div
              ref={previewFrameRef}
              className="create-preview__frame"
              data-canvas-ratio={canvasAspectRatio}
            >
              <CanvasPreview
                elements={elements}
                selectedElementId={selectedElementId}
                canvasBackground={canvasBackground}
                aspectRatio={canvasAspectRatio}
                previewConstraints={previewConstraints}
                onSelect={(id) => {
                  setActiveMobileProperty(null);
                  if (id === null) {
                    clearSelection();
                  } else if (id === "background") {
                    if (isBackgroundLocked) {
                      showToast(
                        "info",
                        "Background dikunci. Unlock untuk mengedit.",
                        2000
                      );
                      return;
                    }
                    selectElement("background");
                  } else {
                    selectElement(id);
                  }
                }}
                onUpdate={updateElement}
                onBringToFront={bringToFront}
                onRemove={removeElement}
                onDuplicate={duplicateElement}
                onToggleLock={toggleLock}
                onResizeUpload={resizeUploadImage}
              />
            </div>
          </div>
          <Motion.button
            type="button"
            onClick={handleSaveTemplate}
            disabled={saving}
            className="create-save"
            whileTap={{ scale: 0.97 }}
            whileHover={{ y: -3 }}
          >
            {saving ? (
              <>
                <svg
                  className="create-save__spinner"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="create-save__spinner-track"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="create-save__spinner-head"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Menyimpan...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} strokeWidth={2.5} />
                Save Template
              </>
            )}
          </Motion.button>

          {/* Show "Gunakan Frame Ini" button after save */}
          {justSavedDraft && activeDraftId && (
            <Motion.button
              type="button"
              onClick={handleUseThisFrame}
              className="create-save"
              style={{
                marginTop: "12px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -3 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Gunakan Frame Ini
              </>
            </Motion.button>
          )}
        </Motion.section>

        {!isMobileView && (
          <Motion.aside
            variants={panelMotion}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
            className="create-panel create-panel--properties"
          >
            <h2 className="create-panel__title">Properties</h2>
            <div className="create-panel__body">
              <PropertiesPanel
                selectedElement={selectedElement}
                canvasBackground={canvasBackground}
                onBackgroundChange={(color) => setCanvasBackground(color)}
                onUpdateElement={updateElement}
                onDeleteElement={removeElement}
                clearSelection={clearSelection}
                onSelectBackgroundPhoto={() => {
                  if (isBackgroundLocked) {
                    showToast(
                      "info",
                      "Background dikunci. Unlock untuk mengedit.",
                      2000
                    );
                    return;
                  }
                  if (backgroundPhotoElement) {
                    selectElement(backgroundPhotoElement.id);
                  } else {
                    triggerBackgroundUpload();
                  }
                }}
                onFitBackgroundPhoto={fitBackgroundPhotoToCanvas}
                backgroundPhoto={backgroundPhotoElement}
                onBringToFront={bringToFront}
                onSendToBack={sendToBack}
                onBringForward={bringForward}
                onSendBackward={sendBackward}
                canvasAspectRatio={canvasAspectRatio}
                onCanvasAspectRatioChange={(ratio) => {
                  setCanvasAspectRatio(ratio);
                }}
                showCanvasSizeMode={showCanvasSizeInProperties}
                gradientColor1={gradientColor1}
                gradientColor2={gradientColor2}
                setGradientColor1={setGradientColor1}
                setGradientColor2={setGradientColor2}
                isBackgroundLocked={isBackgroundLocked}
                onToggleBackgroundLock={toggleBackgroundLock}
              />
            </div>
          </Motion.aside>
        )}
      </div>

      {isMobileView && (
        <>
          {renderMobilePropertyPanel()}
          <nav
            className={`create-mobile-toolbar ${
              isMobilePropertyToolbar ? "create-mobile-toolbar--properties" : ""
            }`.trim()}
          >
            {(isMobilePropertyToolbar
              ? mobilePropertyButtons
              : toolButtons
            ).map((button) => {
              const Icon = button.icon;
              const isActive = isMobilePropertyToolbar
                ? activeMobileProperty === button.id
                : Boolean(button.isActive);
              const label = isMobilePropertyToolbar
                ? button.label
                : button.mobileLabel ?? button.label;

              const handleClick = () => {
                if (isMobilePropertyToolbar) {
                  setActiveMobileProperty((prev) =>
                    prev === button.id ? null : button.id
                  );
                } else {
                  handleToolButtonPress(button);
                }
              };

              return (
                <button
                  key={button.id}
                  type="button"
                  onClick={handleClick}
                  className={`create-mobile-toolbar__button ${
                    isActive ? "create-mobile-toolbar__button--active" : ""
                  }`.trim()}
                >
                  <Icon size={20} strokeWidth={2.4} />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{
          position: "absolute",
          left: "-9999px",
          opacity: 0,
          pointerEvents: "none",
        }}
        onChange={handleFileChange}
      />
    </div>
  );
}
