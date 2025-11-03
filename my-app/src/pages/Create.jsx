import { useMemo, useRef, useState, useEffect, useCallback, useLayoutEffect } from "react";
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
  CAPTURED_OVERLAY_MIN_Z,
  BACKGROUND_PHOTO_Z,
} from "../constants/layers.js";
import { useShallow } from "zustand/react/shallow";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../components/creator/canvasConstants.js";
import draftStorage from "../utils/draftStorage.js";
import { computeDraftSignature } from "../utils/draftHelpers.js";
import safeStorage from "../utils/safeStorage.js";
import {
  syncAutoTransparentAreas,
  isAutoTransparentAreaActive,
} from "../utils/transparentAreaManager.js";
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
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const addRoundedRectPath = (ctx, x, y, width, height, radius) => {
  const effectiveRadius = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
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
  ctx.quadraticCurveTo(x + width, y + height, x + width - effectiveRadius, y + height);
  ctx.lineTo(x + effectiveRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - effectiveRadius);
  ctx.lineTo(x, y + effectiveRadius);
  ctx.quadraticCurveTo(x, y, x + effectiveRadius, y);
  ctx.closePath();
};

const loadImageAsync = (src) =>
  new Promise((resolve, reject) => {
    if (typeof src !== 'string' || !src.startsWith('data:')) {
      reject(new Error('Invalid image source'));
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    img.decoding = 'async';
    img.src = src;
  });


const prepareCanvasExportClone = (rootNode) => {
  if (!rootNode) {
    return;
  }

  try {
    rootNode.setAttribute('data-export-clone', 'true');

    const ignoreNodes = rootNode.querySelectorAll('[data-export-ignore]');
    ignoreNodes.forEach((node) => node.remove());

    const resizeHandles = rootNode.querySelectorAll('.react-rnd-handle, .creator-resize-wrapper');
    resizeHandles.forEach((node) => node.remove());

    const photoSlots = rootNode.querySelectorAll('.creator-element--type-photo');
    photoSlots.forEach((slot) => {
      slot.style.background = 'transparent';
      slot.style.backgroundColor = 'transparent';
      slot.style.boxShadow = 'none';
      slot.style.color = 'transparent';
      slot.style.textShadow = 'none';
      slot.style.fontSize = '0px';
      slot.style.filter = 'none';
      slot.style.mixBlendMode = 'normal';
      const children = Array.from(slot.children || []);
      children.forEach((child) => slot.removeChild(child));
    });

    // Remove captured photo overlays so html2canvas doesn't capture actual photos
    const capturedOverlays = rootNode.querySelectorAll('.creator-element--captured-overlay');
    console.log('🗑️ [prepareCanvasExportClone] Found captured overlays to remove:', capturedOverlays.length);
    capturedOverlays.forEach((overlay) => {
      console.log('  - Removing overlay:', overlay.style.zIndex, overlay.className);
      overlay.remove();
    });

    // Handle transparent-area elements - make them completely transparent
    const transparentAreaSlots = rootNode.querySelectorAll('.creator-element--type-transparent-area');
    transparentAreaSlots.forEach((slot) => {
      slot.style.background = 'transparent';
      slot.style.backgroundColor = 'transparent';
      slot.style.boxShadow = 'none';
      slot.style.border = 'none';
      slot.style.color = 'transparent';
      slot.style.textShadow = 'none';
      slot.style.fontSize = '0px';
      slot.style.filter = 'none';
      slot.style.mixBlendMode = 'normal';
      const children = Array.from(slot.children || []);
      children.forEach((child) => slot.removeChild(child));
    });

    // Reorder creator elements by z-index so html2canvas respects stacking order
  const rootParent = rootNode.querySelector(':scope > .creator-element')?.parentNode;
  const candidateParent = rootParent && rootParent.hasAttribute('data-export-clone') ? rootParent : rootNode;
    const creatorElements = Array.from(candidateParent.children || []).filter((child) =>
      child.classList?.contains('creator-element')
    );

    if (creatorElements.length > 1) {
      creatorElements.sort((a, b) => {
        const aZ = Number.parseFloat(a.style.zIndex) || 0;
        const bZ = Number.parseFloat(b.style.zIndex) || 0;
        return aZ - bZ;
      });

      creatorElements.forEach((child) => {
        candidateParent.appendChild(child);
      });

      console.log('🔄 [prepareCanvasExportClone] Reordered elements for export:',
        creatorElements.map((el) => ({
          type: el.className.match(/creator-element--type-(\w+)/)?.[1] || 'unknown',
          zIndex: Number.parseFloat(el.style.zIndex) || 0,
        }))
      );
    }
  } catch (error) {
    console.error('❌ [prepareCanvasExportClone] Error during clone preparation:', error);
  }
};

const normalizePhotoLayering = (elements = []) => {
  if (!Array.isArray(elements) || elements.length === 0) {
    return elements;
  }

  const backgroundElements = elements.filter(
    (element) => element?.type === 'background-photo'
  );

  const backgroundBaseZ = backgroundElements.length
    ? Math.min(
        ...backgroundElements.map((element) =>
          typeof element?.zIndex === 'number' ? element.zIndex : 0
        )
      )
    : 0;

  const usedZ = new Set(
    elements
      .filter((element) => element && typeof element.zIndex === 'number')
      .map((element) => element.zIndex)
  );

  const ensureUniqueZ = (start) => {
    let candidate = start;
    while (usedZ.has(candidate)) {
      candidate += 1;
    }
    usedZ.add(candidate);
    return candidate;
  };

  // Reserve background z-index values to keep them below photos.
  backgroundElements.forEach((element) => {
    const normalized =
      typeof element?.zIndex === 'number' ? element.zIndex : backgroundBaseZ;
    usedZ.add(normalized);
  });

  return elements.map((element) => {
    if (!element || typeof element !== 'object') {
      return element;
    }

    if (element.type === 'background-photo') {
      const normalizedZ =
        typeof element.zIndex === 'number' ? element.zIndex : backgroundBaseZ;
      if (normalizedZ === element.zIndex) {
        return element;
      }
      usedZ.add(normalizedZ);
      return { ...element, zIndex: normalizedZ };
    }

    // Remove special handling for 'photo' type - let it use normal z-index
    // This allows other elements to be placed above photo elements
    if (typeof element.zIndex === 'number') {
      usedZ.add(element.zIndex);
    }
    
    // Debug logging for photo elements
    if (element.type === 'photo') {
      console.log('📸 [Photo Element zIndex]', {
        id: element.id?.slice(0, 8),
        type: element.type,
        zIndex: element.zIndex,
        backgroundBaseZ,
      });
    }

    return element;
  });
};

const createOverlayId = (placeholderId, photoIndex) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `captured-overlay-${placeholderId || 'slot'}-${photoIndex}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
};

const createCapturedPhotoOverlay = (
  placeholder,
  photoData,
  photoIndex,
  zIndexOverride
) => {
  const overlayId = createOverlayId(placeholder?.id, photoIndex);
  const overlayZIndex =
    typeof zIndexOverride === 'number'
      ? zIndexOverride
      : CAPTURED_OVERLAY_MIN_Z;
  return {
    id: overlayId,
    type: 'upload',
    x: placeholder?.x ?? 0,
    y: placeholder?.y ?? 0,
    width: placeholder?.width ?? 0,
    height: placeholder?.height ?? 0,
    rotation: placeholder?.rotation ?? 0,
    zIndex: overlayZIndex,
    isLocked: true,
    data: {
      image: photoData,
      objectFit: 'cover',
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

  const storedPhotos = safeStorage.getJSON('capturedPhotos');
  if (!Array.isArray(storedPhotos) || storedPhotos.length === 0) {
    return elements.filter((element) => !element?.data?.__capturedOverlay);
  }

  const cleanedElements = elements.filter(
    (element) => !element?.data?.__capturedOverlay
  );

  const photoPlaceholders = cleanedElements.filter(
    (element) => element?.type === 'photo'
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
    if (typeof photoData !== 'string' || !photoData.startsWith('data:')) {
      return;
    }
    console.log(`📸 [injectCapturedPhotoOverlays] Creating overlay ${photoIndex} with z-index:`, CAPTURED_OVERLAY_MIN_Z);
    overlays.push(
      createCapturedPhotoOverlay(
        placeholder,
        photoData,
        photoIndex,
        CAPTURED_OVERLAY_MIN_Z
      )
    );
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
    if (el?.type === 'photo' && el.id && overlayBySource.has(el.id)) {
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

  console.log('✅ [injectCapturedPhotoOverlays] Final result:', {
    totalElements: result.length,
    overlaysAdded: overlays.length,
    zIndexes: result.map(el => ({ type: el.type, zIndex: el.zIndex, isOverlay: el?.data?.__capturedOverlay }))
  });

  return result;
};

export default function Create() {
  console.log('[Create] Component rendering...');
  const fileInputRef = useRef(null);
  const uploadPurposeRef = useRef("upload");
  const toastTimeoutRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [activeMobileProperty, setActiveMobileProperty] = useState(null);
  const [canvasAspectRatio, setCanvasAspectRatio] = useState("9:16"); // Story Instagram default
  const [activeDraftId, setActiveDraftId] = useState(null);
  const previewFrameRef = useRef(null);
  const [previewConstraints, setPreviewConstraints] = useState({
    maxWidth: 360,
    maxHeight: 640,
  });
  const hasLoadedDraftRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

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

  const autoTransparentState = useMemo(() => {
    if (!Array.isArray(elements) || elements.length === 0) {
      return {
        shouldShow: false,
        active: false,
        areaId: null,
        linkedPhotoId: null,
      };
    }

    const photoElements = elements.filter((element) => element?.type === "photo");
    if (photoElements.length === 0) {
      return {
        shouldShow: false,
        active: false,
        areaId: null,
        linkedPhotoId: null,
      };
    }

    const backgroundElement =
      elements.find((element) => element?.type === "background-photo") || null;

    const baseBackgroundZ = Number.isFinite(backgroundElement?.zIndex)
      ? backgroundElement.zIndex
      : Number.isFinite(BACKGROUND_PHOTO_Z)
      ? BACKGROUND_PHOTO_Z
      : 0;

    const autoAreas = elements.filter(
      (element) =>
        element?.type === "transparent-area" &&
        element?.data?.__autoTransparentArea === true
    );

    if (autoAreas.length === 0) {
      return {
        shouldShow: true,
        active: false,
        areaId: null,
        linkedPhotoId: null,
      };
    }

    let activeAreaId = null;
    let linkedPhotoId = null;

    const isActive = autoAreas.some((area) => {
      const photoId = area?.data?.__linkedPhotoId;
      if (!photoId) {
        return false;
      }

      const linkedPhoto = photoElements.find((photo) => photo.id === photoId);
      if (!linkedPhoto) {
        return false;
      }

      const active = isAutoTransparentAreaActive(area, linkedPhoto, baseBackgroundZ);
      if (active && !activeAreaId) {
        activeAreaId = area.id;
        linkedPhotoId = linkedPhoto.id;
      }
      return active;
    });

    if (!activeAreaId) {
      const fallback = autoAreas[0];
      activeAreaId = fallback?.id ?? null;
      linkedPhotoId = fallback?.data?.__linkedPhotoId ?? null;
    }

    return {
      shouldShow: true,
      active: isActive,
      areaId: activeAreaId,
      linkedPhotoId,
    };
  }, [elements]);

  const {
    shouldShow: shouldShowAutoTransparent,
    active: autoTransparentActive,
    areaId: autoTransparentAreaId,
    linkedPhotoId: autoTransparentLinkedPhotoId,
  } = autoTransparentState;

  useEffect(() => {
    const storedPhotos = safeStorage.getJSON('capturedPhotos');
    const hasStoredPhotos = Array.isArray(storedPhotos) && storedPhotos.length > 0;
    const hasOverlays = elements.some((element) => element?.data?.__capturedOverlay);

    if (hasStoredPhotos && !hasOverlays) {
      const augmented = injectCapturedPhotoOverlays(elements);
      if (augmented.length !== elements.length) {
        setElements(augmented);
      }
      return;
    }

    if (!hasStoredPhotos && hasOverlays) {
      const cleaned = elements.filter((element) => !element?.data?.__capturedOverlay);
      if (cleaned.length !== elements.length) {
        setElements(cleaned);
      }
    }
  }, [elements, setElements]);

  useEffect(() => {
    const synced = syncAutoTransparentAreas(elements);
    if (synced !== elements) {
      setElements(synced);
    }
  }, [elements, setElements]);

  const handleAutoTransparentSync = useCallback(() => {
    const synced = syncAutoTransparentAreas(elements);
    if (synced !== elements) {
      setElements(synced);
      showToast("success", "Area transparan otomatis diperbarui.");
      return;
    }

    if (autoTransparentActive) {
      if (autoTransparentAreaId) {
        selectElement(autoTransparentAreaId);
      } else if (autoTransparentLinkedPhotoId) {
        selectElement(autoTransparentLinkedPhotoId);
      }
      showToast("success", "Area transparan otomatis sudah aktif.");
      return;
    }

    showToast(
      "error",
      "Tambahkan area foto ukuran penuh untuk mengaktifkan transparan otomatis."
    );
  }, [
    elements,
    setElements,
    showToast,
    autoTransparentActive,
    autoTransparentAreaId,
    autoTransparentLinkedPhotoId,
    selectElement,
  ]);

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
    selectedElement && selectedElement !== "background" ? selectedElement : null;
  const isBackgroundSelected = selectedElement === "background";
  const isMobilePropertyToolbar =
    isMobileView && (isBackgroundSelected || Boolean(selectedElementObject));

  useEffect(() => {
    if (!isMobileView) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const canvasNode = previewFrameRef.current?.querySelector("#creator-canvas");
      const toolbarNode = document.querySelector(".create-mobile-toolbar");
      const propertyPanelNode = document.querySelector(".create-mobile-property-panel");

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

    console.log('🎯 [getCanvasDimensions] Input ratio:', ratio);

    if (typeof ratio !== "string") {
      console.log('  ❌ Not a string, returning default');
      return defaultDimensions;
    }

    const [rawWidth, rawHeight] = ratio.split(":").map(Number);
    const ratioWidth = Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : null;
    const ratioHeight = Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : null;

    console.log('  Parsed:', { rawWidth, rawHeight, ratioWidth, ratioHeight });

    if (!ratioWidth || !ratioHeight) {
      console.log('  ❌ Invalid ratio parts, returning default');
      return defaultDimensions;
    }

    if (ratioHeight >= ratioWidth) {
      const result = {
        width: CANVAS_WIDTH,
        height: Math.round((CANVAS_WIDTH * ratioHeight) / ratioWidth),
      };
      console.log('  ✅ Portrait/Square mode (H>=W):', result);
      return result;
    }

    const result = {
      width: Math.round((CANVAS_HEIGHT * ratioWidth) / ratioHeight),
      height: CANVAS_HEIGHT,
    };
    console.log('  ✅ Landscape mode (W>H):', result);
    return result;
  }, []);

  const deriveAspectRatioFromDraft = useCallback((draft) => {
    if (!draft) {
      return "9:16";
    }

    if (typeof draft.aspectRatio === "string" && draft.aspectRatio.includes(":")) {
      return draft.aspectRatio;
    }

    const width = Number(draft.canvasWidth);
    const height = Number(draft.canvasHeight);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
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

  const scaleDraftElements = useCallback((elements, fromWidth, fromHeight, toWidth, toHeight) => {
    if (!Array.isArray(elements)) {
      return [];
    }

    if (!Number.isFinite(fromWidth) || !Number.isFinite(fromHeight) || fromWidth <= 0 || fromHeight <= 0) {
      return elements;
    }

    if (!Number.isFinite(toWidth) || !Number.isFinite(toHeight) || toWidth <= 0 || toHeight <= 0) {
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
          data.borderRadius = Math.max(0, Math.round(data.borderRadius * averageScale));
        }

        if (typeof data.strokeWidth === "number") {
          data.strokeWidth = Math.max(0, Math.round(data.strokeWidth * averageScale));
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
          data.outlineWidth = Math.max(0, Math.round(data.outlineWidth * averageScale));
        }

        next.data = data;
      }

      return next;
    });
  }, []);

  const loadDraftIntoEditor = useCallback(
    (draftId, { notify = true } = {}) => {
      console.log('🎬 [loadDraftIntoEditor] STARTED with draftId:', draftId);
      
      if (!draftId) {
        console.log('❌ [loadDraftIntoEditor] No draftId provided');
        return false;
      }

      const draft = draftStorage.getDraftById(draftId);
      console.log('📦 [loadDraftIntoEditor] Draft from storage:', {
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
        return false;
      }

      // Restore captured photos if they were saved with the draft
      if (Array.isArray(draft.capturedPhotos) && draft.capturedPhotos.length > 0) {
        console.log('📸 [loadDraftIntoEditor] Restoring captured photos:', draft.capturedPhotos.length);
        safeStorage.setJSON("capturedPhotos", draft.capturedPhotos);
      } else {
        console.log('📸 [loadDraftIntoEditor] No captured photos to restore');
        safeStorage.removeItem("capturedPhotos");
      }

      const clonedElements = Array.isArray(draft.elements)
        ? typeof structuredClone === "function"
          ? structuredClone(draft.elements)
          : JSON.parse(JSON.stringify(draft.elements))
        : [];

      console.log('📋 [loadDraftIntoEditor] Cloned elements:', clonedElements.length);

      // Add frame artwork if it was saved with the draft
      // OR use the preview as frame artwork if no explicit artwork was saved
      const hasFrameArtwork = !!draft.frameArtwork;
      const shouldUsePreviewAsArtwork = !hasFrameArtwork && draft.preview && draft.capturedPhotos?.length > 0;
      
      if (hasFrameArtwork || shouldUsePreviewAsArtwork) {
        const artworkData = hasFrameArtwork ? draft.frameArtwork : {
          image: draft.preview,
          x: 0,
          y: 0,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          zIndex: 1000,
          rotation: 0,
        };
        
        console.log('🖼️ [loadDraftIntoEditor] Adding frame artwork element', {
          source: hasFrameArtwork ? 'saved' : 'preview',
          hasPhotos: draft.capturedPhotos?.length || 0
        });
        
        const artworkElement = {
          id: `frame-artwork-${Date.now()}`,
          type: 'upload',
          x: artworkData.x || 0,
          y: artworkData.y || 0,
          width: artworkData.width || CANVAS_WIDTH,
          height: artworkData.height || CANVAS_HEIGHT,
          rotation: artworkData.rotation || 0,
          zIndex: artworkData.zIndex || 1000,
          isLocked: true,
          data: {
            image: artworkData.image,
            objectFit: 'cover',
            label: 'Frame Artwork',
            __isFrameArtwork: true,
          },
        };
        clonedElements.push(artworkElement);
      }

  const targetAspectRatio = deriveAspectRatioFromDraft(draft);
      const targetDimensions = getCanvasDimensions(targetAspectRatio);
      const sourceWidth = Number(draft.canvasWidth) || targetDimensions.width;
      const sourceHeight = Number(draft.canvasHeight) || targetDimensions.height;
      const scaledElements = scaleDraftElements(
        clonedElements,
        sourceWidth,
        sourceHeight,
        targetDimensions.width,
        targetDimensions.height
      );

  const normalizedElements = normalizePhotoLayering(scaledElements);
  const runtimeElements = injectCapturedPhotoOverlays(normalizedElements);

  console.log('✅ [loadDraftIntoEditor] Setting elements:', {
    normalizedCount: normalizedElements.length,
    runtimeCount: runtimeElements.length,
    aspectRatio: targetAspectRatio,
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

      safeStorage.setItem("activeDraftId", draft.id);
      if (effectiveSignature) {
        safeStorage.setItem("activeDraftSignature", effectiveSignature);
      }

      hasLoadedDraftRef.current = true;

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
    
    console.log('🎯 [Create useEffect] Navigation detected:', {
      hasDraftId: !!draftId,
      draftId,
      comeFromDraftsPage,
      pathname: location.pathname,
      state: location.state,
    });
    
    if (comeFromDraftsPage) {
      // User clicked "Lihat Frame" from Drafts page - load the draft
      console.log('📂 [Create] Loading draft from Drafts page:', draftId);
      hasLoadedDraftRef.current = false; // Reset before loading
      const success = loadDraftIntoEditor(draftId, { notify: true });
      console.log('📂 [Create] loadDraftIntoEditor result:', success);
      navigate(location.pathname, { replace: true, state: null });
    } else if (!hasLoadedDraftRef.current) {
      // User entered Create page directly - reset ONLY on first mount
      console.log('🔄 [Create] First time entry - resetting canvas');
      setElements([]);
      setCanvasBackground('#f7f1ed');
      setCanvasAspectRatio('9:16');
      setActiveDraftId(null);
      clearSelection();
      safeStorage.removeItem("activeDraftId");
      safeStorage.removeItem("activeDraftSignature");
      safeStorage.removeItem("capturedPhotos");
      safeStorage.removeItem("draftFrameArtwork");
      hasLoadedDraftRef.current = true; // Mark as initialized
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.draftId]); // Only re-run when draftId changes, not on every location change

  useEffect(() => {
    if (hasLoadedDraftRef.current) {
      return;
    }

    const storedDraftId = safeStorage.getItem("activeDraftId");
    if (!storedDraftId) {
      return;
    }

    const loaded = loadDraftIntoEditor(storedDraftId, { notify: false });
    if (loaded) {
      const storedSignature = safeStorage.getItem("activeDraftSignature");
      const draft = draftStorage.getDraftById(storedDraftId);
      if (storedSignature && draft?.signature && storedSignature !== draft.signature) {
        // Signature mismatch - update storage to reflect current draft state
        safeStorage.setItem("activeDraftSignature", draft.signature);
      }
    }
  }, [loadDraftIntoEditor]);

  useEffect(() => {
    if (!backgroundPhotoElement) {
      return;
    }

    if (!backgroundPhotoElement.data?.imageAspectRatio) {
      const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(canvasAspectRatio);
      const inferredRatio =
        backgroundPhotoElement.width > 0 && backgroundPhotoElement.height > 0
          ? backgroundPhotoElement.width / backgroundPhotoElement.height
          : canvasWidth / canvasHeight;
      updateElement(backgroundPhotoElement.id, {
        data: { imageAspectRatio: inferredRatio },
      });
    }
  }, [backgroundPhotoElement, updateElement, canvasAspectRatio, getCanvasDimensions]);

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
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
          const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(canvasAspectRatio);
          addBackgroundPhoto(dataUrl, { 
            ...metadata, 
            canvasWidth, 
            canvasHeight 
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

    setSaving(true);
    try {
      const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(canvasAspectRatio);
      
      console.log('🔍 [SAVE DRAFT DEBUG]');
      console.log('  canvasAspectRatio state:', canvasAspectRatio);
      console.log('  Calculated dimensions:', { canvasWidth, canvasHeight });
      console.log('  Calculated aspect ratio:', canvasWidth / canvasHeight);
      console.log('  Expected for 9:16:', 9/16, '=', 1080/1920);

      const captureScale = canvasWidth <= 720 ? 2 : 1;
      let cleanupCapture = () => {};

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

      prepareCanvasExportClone(exportCanvasNode);

      // DEBUG: Log all remaining elements after cleanup
      const remainingElements = exportCanvasNode.querySelectorAll('.creator-element');
      console.log('📋 [After prepareCanvasExportClone] Remaining elements:', remainingElements.length);
      remainingElements.forEach((el, idx) => {
        const type = el.className.match(/creator-element--type-(\w+)/)?.[1];
        const isOverlay = el.classList.contains('creator-element--captured-overlay');
        const zIndex = el.style.zIndex;
        console.log(`  ${idx + 1}. ${type} - zIndex: ${zIndex}${isOverlay ? ' [OVERLAY - SHOULD BE REMOVED!]' : ''}`);
      });

      cleanupCapture = () => {
        if (exportWrapper.parentNode) {
          exportWrapper.parentNode.removeChild(exportWrapper);
        }
      };

      const captureCanvas = await html2canvas(exportCanvasNode, {
        backgroundColor: null, // Use null to enable transparency
        useCORS: true,
        scale: captureScale,
        width: canvasWidth,
        height: canvasHeight,
        windowWidth: canvasWidth,
        windowHeight: canvasHeight,
        scrollX: 0,
        scrollY: 0,
        allowTaint: true,
        ignoreElements: (element) => {
          if (!element) {
            return false;
          }

          if (element.nodeType === Node.ELEMENT_NODE) {
            if (element.classList?.contains('creator-element--captured-overlay')) {
              return true;
            }
            if (element.classList?.contains('captured-photo-overlay-content')) {
              return true;
            }
            if (element.getAttribute?.('data-export-ignore') === 'true') {
              return true;
            }
            if (element.closest?.('[data-export-ignore="true"]')) {
              return true;
            }
          }

          return false;
        },
      });

      console.log('📸 [html2canvas result]', {
        width: captureCanvas.width,
        height: captureCanvas.height,
      });

      // Create a new canvas to properly handle transparency
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = captureCanvas.width;
      finalCanvas.height = captureCanvas.height;
      const finalCtx = finalCanvas.getContext('2d', { alpha: true });
      
      if (finalCtx) {
        const transparentAreaElements = elements.filter((el) => el.type === 'transparent-area');
        const photoElements = elements.filter((el) => el.type === 'photo');
        const photoSlotInfos = [];

        photoElements.forEach((photoEl, placeholderIndex) => {
          const rawX = Number(photoEl?.x) || 0;
          const rawY = Number(photoEl?.y) || 0;
          const rawWidth = Number(photoEl?.width) || 0;
          const rawHeight = Number(photoEl?.height) || 0;
          if (rawWidth <= 0 || rawHeight <= 0) {
            console.log('⚠️ [Photo Export] Skipping slot with invalid size', {
              id: photoEl?.id,
              rawWidth,
              rawHeight,
            });
            return;
          }

          const candidateIndex = Number(photoEl?.data?.photoIndex);
          const photoIndex = Number.isFinite(candidateIndex) ? candidateIndex : placeholderIndex;

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
            borderRadius: parseNumericValue(photoEl?.data?.borderRadius) * captureScale,
            rotationRadians: ((Number(photoEl?.rotation) || 0) * Math.PI) / 180,
          });
        });

        let photoLayerCanvas = null;

        if (photoSlotInfos.length > 0) {
          const capturedPhotos = safeStorage.getJSON('capturedPhotos') || [];
          const imageCache = new Map();

          if (Array.isArray(capturedPhotos) && capturedPhotos.length > 0) {
            photoLayerCanvas = document.createElement('canvas');
            photoLayerCanvas.width = finalCanvas.width;
            photoLayerCanvas.height = finalCanvas.height;
            const photoCtx = photoLayerCanvas.getContext('2d', { alpha: true });

            if (photoCtx) {
              for (const slotInfo of photoSlotInfos) {
                const photoData = capturedPhotos[slotInfo.photoIndex];
                if (typeof photoData !== 'string' || !photoData.startsWith('data:')) {
                  console.log('ℹ️ [Photo Export] Missing captured photo for slot', {
                    elementId: slotInfo.elementId,
                    placeholderIndex: slotInfo.placeholderIndex,
                    photoIndex: slotInfo.photoIndex,
                  });
                  continue;
                }

                let image = imageCache.get(slotInfo.photoIndex);
                if (!image) {
                  try {
                    image = await loadImageAsync(photoData);
                    imageCache.set(slotInfo.photoIndex, image);
                  } catch (error) {
                    console.warn('⚠️ [Photo Export] Failed to load captured photo', {
                      photoIndex: slotInfo.photoIndex,
                      error,
                    });
                    continue;
                  }
                }

                const imgWidth = image.naturalWidth || image.width || 1;
                const imgHeight = image.naturalHeight || image.height || 1;
                const slotRatio = slotInfo.width / slotInfo.height;
                const imageRatio = imgWidth / imgHeight;
                let drawWidth;
                let drawHeight;

                if (imageRatio > slotRatio) {
                  drawHeight = slotInfo.height;
                  drawWidth = drawHeight * imageRatio;
                } else {
                  drawWidth = slotInfo.width;
                  drawHeight = drawWidth / imageRatio;
                }

                const drawX = -drawWidth / 2;
                const drawY = -drawHeight / 2;

                photoCtx.save();
                photoCtx.translate(slotInfo.centerX, slotInfo.centerY);
                if (slotInfo.rotationRadians) {
                  photoCtx.rotate(slotInfo.rotationRadians);
                }

                addRoundedRectPath(
                  photoCtx,
                  -slotInfo.width / 2,
                  -slotInfo.height / 2,
                  slotInfo.width,
                  slotInfo.height,
                  slotInfo.borderRadius
                );
                photoCtx.clip();

                photoCtx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
                photoCtx.restore();
              }

              console.log('🖼️ [Photo Export] Rendered captured photos into photo layer', {
                slots: photoSlotInfos.length,
                availablePhotos: capturedPhotos.length,
              });
            }
          } else {
            console.log('ℹ️ [Photo Export] No captured photos available, skipping photo rendering');
          }
        }

        // Step 1: Draw background layer with transparency holes
        const backgroundCanvas = document.createElement('canvas');
        backgroundCanvas.width = finalCanvas.width;
        backgroundCanvas.height = finalCanvas.height;
        const bgCtx = backgroundCanvas.getContext('2d', { alpha: true });

        if (bgCtx) {
          // Fill with solid background color first
          bgCtx.fillStyle = canvasBackground || '#ffffff';
          bgCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);

          // Cut transparent holes ONLY in background layer
          if (transparentAreaElements.length > 0) {
            bgCtx.globalCompositeOperation = 'destination-out';

            transparentAreaElements.forEach((transparentEl) => {
              const x = (transparentEl.x || 0) * captureScale;
              const y = (transparentEl.y || 0) * captureScale;
              const width = (transparentEl.width || 200) * captureScale;
              const height = (transparentEl.height || 200) * captureScale;
              const borderRadius = parseNumericValue(transparentEl?.data?.borderRadius) * captureScale;
              const rotationRadians = ((Number(transparentEl.rotation) || 0) * Math.PI) / 180;

              bgCtx.save();
              bgCtx.translate(x + width / 2, y + height / 2);
              if (rotationRadians) {
                bgCtx.rotate(rotationRadians);
              }

              addRoundedRectPath(
                bgCtx,
                -width / 2,
                -height / 2,
                width,
                height,
                borderRadius
              );

              bgCtx.fillStyle = 'rgba(0, 0, 0, 1)';
              bgCtx.fill();
              bgCtx.restore();

              console.log('🕳️ [Created transparent hole in background only]', {
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(width),
                height: Math.round(height),
                borderRadius: Math.round(borderRadius),
                rotation: transparentEl.rotation || 0,
              });
            });

            bgCtx.globalCompositeOperation = 'source-over';
          }

          // Step 2: Composite all layers in correct order
          // Draw background with holes
          finalCtx.drawImage(backgroundCanvas, 0, 0);

          // Draw captured photos layer
          if (photoLayerCanvas) {
            finalCtx.drawImage(photoLayerCanvas, 0, 0);
          }

          // Draw all other elements (text, shapes, uploads) on top
          // These will NOT be affected by transparent areas
          finalCtx.drawImage(captureCanvas, 0, 0);
        }
      }

      let exportCanvas = finalCanvas;
      const maxPreviewWidth = 640;
      if (exportCanvas.width > maxPreviewWidth) {
        const previewScale = maxPreviewWidth / exportCanvas.width;
        const scaledCanvas = document.createElement("canvas");
        scaledCanvas.width = Math.max(1, Math.round(exportCanvas.width * previewScale));
        scaledCanvas.height = Math.max(1, Math.round(exportCanvas.height * previewScale));
        const ctx = scaledCanvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(exportCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
          exportCanvas = scaledCanvas;
        }
      }


      console.log('🖼️ [Preview canvas after scaling]', {
        width: exportCanvas.width,
        height: exportCanvas.height,
      });
      
      // Use PNG format to preserve transparency in photo areas
      let previewDataUrl = "";
      try {
        previewDataUrl = exportCanvas.toDataURL("image/png");
        console.log('✅ [Using PNG format to preserve transparency]');
      } catch (err) {
        console.warn("⚠️ PNG preview error, falling back to WebP", err);
        try {
          previewDataUrl = exportCanvas.toDataURL("image/webp", 0.82);
        } catch (err2) {
          console.warn("⚠️ WebP also failed, using JPEG (no transparency)", err2);
          previewDataUrl = exportCanvas.toDataURL("image/jpeg", 0.85);
        }
      }

      if (!previewDataUrl || !previewDataUrl.startsWith("data:image")) {
        previewDataUrl = exportCanvas.toDataURL("image/png"); // Fallback to PNG for transparency
      }
      const serializedElements =
        typeof structuredClone === "function"
          ? structuredClone(elements)
          : JSON.parse(JSON.stringify(elements));

      console.log('🔍 [SAVE DEBUG] serializedElements z-index info:', 
        serializedElements.map(el => ({
          type: el.type,
          id: el.id?.slice(0, 8),
          zIndex: el.zIndex,
          isOverlay: el?.data?.__capturedOverlay,
        }))
      );

      const cleanElements = serializedElements.filter(
        (element) => !element?.data?.__capturedOverlay
      );

      console.log('💾 [SAVING DRAFT] Elements breakdown:', {
        total: serializedElements.length,
        cleaned: cleanElements.length,
        types: cleanElements.map(el => ({ type: el.type, zIndex: el.zIndex, hasImage: !!el.data?.image })),
      });

      // Compress upload element images before saving
      const compressedElements = await Promise.all(cleanElements.map(async (element) => {
        if (element.type === 'upload' && element.data?.image) {
          try {
            // Create a smaller version of upload images to save storage
            const img = new Image();
            img.src = element.data.image;
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
            });

            // Compress to max 800px width while maintaining aspect ratio
            const maxWidth = 800;
            let targetWidth = img.width;
            let targetHeight = img.height;
            
            if (targetWidth > maxWidth) {
              const scale = maxWidth / targetWidth;
              targetWidth = maxWidth;
              targetHeight = Math.round(targetHeight * scale);
            }

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            
            const compressedImage = canvas.toDataURL('image/jpeg', 0.85);
            console.log('🗜️ Compressed upload image:', {
              original: element.data.image.length,
              compressed: compressedImage.length,
              saved: element.data.image.length - compressedImage.length,
            });

            return {
              ...element,
              data: {
                ...element.data,
                image: compressedImage,
                originalImage: undefined, // Remove original to save space
              },
            };
          } catch (error) {
            console.warn('⚠️ Failed to compress upload image, using original:', error);
            return element;
          }
        }
        return element;
      }));

      const signature = computeDraftSignature(
        compressedElements,
        canvasBackground,
        canvasAspectRatio
      );

      console.log('💾 [SAVING DRAFT] Final data being saved:', {
        canvasWidth,
        canvasHeight,
        aspectRatio: canvasAspectRatio,
        'Calculated ratio': canvasWidth / canvasHeight,
        'Expected 9:16': 9/16,
        'Match?': Math.abs((canvasWidth / canvasHeight) - (9/16)) < 0.001
      });

      // Save captured photos with the draft
      const capturedPhotos = safeStorage.getJSON('capturedPhotos') || [];
      console.log('💾 [SAVING DRAFT] Captured photos to save:', capturedPhotos.length);

      // Check if there's a frame artwork element (upload element with very high z-index and locked)
      const frameArtworkElement = serializedElements.find(
        (el) => 
          el?.type === 'upload' && 
          el?.isLocked === true && 
          el?.data?.__isFrameArtwork === true
      );

      let frameArtwork = null;
      if (frameArtworkElement) {
        frameArtwork = {
          image: frameArtworkElement.data.image,
          x: frameArtworkElement.x,
          y: frameArtworkElement.y,
          width: frameArtworkElement.width,
          height: frameArtworkElement.height,
          zIndex: frameArtworkElement.zIndex,
          rotation: frameArtworkElement.rotation,
        };
        console.log('🖼️ [SAVING DRAFT] Frame artwork found and saved');
      }

      const savedDraft = draftStorage.saveDraft({
        id: activeDraftId || undefined,
        canvasBackground,
        canvasWidth,
        canvasHeight,
        aspectRatio: canvasAspectRatio,
        elements: compressedElements,
        preview: previewDataUrl,
        signature,
        capturedPhotos: Array.isArray(capturedPhotos) && capturedPhotos.length > 0 ? capturedPhotos : undefined,
        frameArtwork: frameArtwork || undefined,
      });

      setActiveDraftId(savedDraft.id);

      const successTitle = savedDraft.title || "Draft";
      showToast(
        "success",
        `${successTitle} tersimpan! Lihat di Profile → Drafts.`
      );
    } catch (error) {
      console.error("Failed to save draft", error);
      const message =
        error?.message && /quota|persist/i.test(error.message)
          ? "Penyimpanan penuh. Hapus draft lama terlebih dahulu."
          : TOAST_MESSAGES.saveError;
      showToast("error", message);
    } finally {
      try {
        if (typeof cleanupCapture === "function") {
          cleanupCapture();
        }
      } catch (err) {
        console.warn("⚠️ Failed to clean up capture node", err);
      }
      setSaving(false);
    }
  };

  const addToolElement = (type) => {
    if (type === "background") {
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
        id: "background",
        label: "Background",
        mobileLabel: "Background",
        icon: Palette,
        onClick: () => {
          selectElement("background");
          if (!backgroundPhotoElement && !isMobileView) {
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
        onClick: () => addToolElement("photo"),
        isActive: selectedElement?.type === "photo",
      },
      {
        id: "text",
        label: "Add Text",
        mobileLabel: "Teks",
        icon: TypeIcon,
        onClick: () => addToolElement("text"),
        isActive: selectedElement?.type === "text",
      },
      {
        id: "shape",
        label: "Shape",
        mobileLabel: "Bentuk",
        icon: Shapes,
        onClick: () => addToolElement("shape"),
        isActive: selectedElement?.type === "shape",
      },
      {
        id: "upload",
        label: "Unggahan",
        mobileLabel: "Unggah",
        icon: UploadCloud,
        onClick: () => addToolElement("upload"),
        isActive: selectedElement?.type === "upload",
      },
    ];

    if (shouldShowAutoTransparent) {
      buttons.push({
        id: "auto-transparent",
        label: "Transparan Otomatis",
        mobileLabel: "Transparan",
        icon: Layers,
        onClick: handleAutoTransparentSync,
        isActive: autoTransparentActive,
      });
    }

    return buttons;
  }, [
    addToolElement,
    selectElement,
    selectedElement?.type,
    selectedElementId,
    backgroundPhotoElement,
    triggerBackgroundUpload,
    isMobileView,
    shouldShowAutoTransparent,
    handleAutoTransparentSync,
    autoTransparentActive,
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
      const usableWidth = Math.max(0, Math.floor(clientWidth - 12));
      const usableHeight = Math.max(0, Math.floor(clientHeight - 12));

      if (usableWidth > 0 && usableHeight > 0) {
        setPreviewConstraints({
          maxWidth: usableWidth,
          maxHeight: usableHeight,
        });
      }
    };

    computeConstraints();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => computeConstraints());
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", computeConstraints);
    return () => window.removeEventListener("resize", computeConstraints);
  }, [isMobileView, canvasAspectRatio]);

  const canvasRatioOptions = [
    { id: "9:16", label: "Story Instagram", ratio: 9 / 16 },
    { id: "4:5", label: "Instagram Feed", ratio: 4 / 5 },
    { id: "2:3", label: "Photostrip", ratio: 2 / 3 },
  ];

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
        content = (
          <ColorPicker
            value={canvasBackground}
            onChange={(nextColor) => setCanvasBackground(nextColor)}
          />
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
              {backgroundPhotoElement ? "Ganti foto background" : "Tambah foto background"}
            </button>
            {backgroundPhotoElement && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(canvasAspectRatio);
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
            'Inter', 'Roboto', 'Lato', 'Open Sans', 'Montserrat', 
            'Poppins', 'Nunito Sans', 'Rubik', 'Work Sans', 'Source Sans Pro',
            'Merriweather', 'Playfair Display', 'Libre Baskerville', 
            'Cormorant Garamond', 'Bitter', 'Raleway', 'Oswald', 
            'Bebas Neue', 'Anton', 'Pacifico'
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
                    (data.fontFamily ?? 'Inter') === font
                      ? 'create-mobile-property-panel__action--active'
                      : ''
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
                  const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(canvasAspectRatio);
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
          if (selectedElementObject?.type !== 'background-photo') {
            content = (
              <div className="create-mobile-property-panel__actions" style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '12px' 
              }}>
                <button
                  type="button"
                  onClick={() => {
                    bringToFront(selectedElementObject.id);
                  }}
                  className="create-mobile-property-panel__action"
                >
                  <ChevronsUp size={18} style={{ marginRight: '8px' }} />
                  Paling Depan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    bringForward(selectedElementObject.id);
                  }}
                  className="create-mobile-property-panel__action"
                >
                  <ArrowUp size={18} style={{ marginRight: '8px' }} />
                  Kedepankan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sendToBack(selectedElementObject.id);
                  }}
                  className="create-mobile-property-panel__action"
                >
                  <ChevronsDown size={18} style={{ marginRight: '8px' }} />
                  Paling Belakang
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sendBackward(selectedElementObject.id);
                  }}
                  className="create-mobile-property-panel__action"
                >
                  <ArrowDown size={18} style={{ marginRight: '8px' }} />
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
            className={`create-toast ${toast.type === "success" ? "create-toast--success" : "create-toast--error"}`}
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
              {toolButtons.map((button) => (
                <button
                  key={button.id}
                  type="button"
                  onClick={() => handleToolButtonPress(button)}
                  className={`create-tools__button ${button.isActive ? "create-tools__button--active" : ""}`.trim()}
                >
                  {button.label}
                </button>
              ))}
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
            <div className="create-ratio-selector">
              <label htmlFor="canvas-ratio-select" className="create-ratio-label">
                Ukuran Canvas:
              </label>
              <select
                id="canvas-ratio-select"
                value={canvasAspectRatio}
                onChange={(e) => setCanvasAspectRatio(e.target.value)}
                className="create-ratio-dropdown"
              >
                {canvasRatioOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

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
            {(isMobilePropertyToolbar ? mobilePropertyButtons : toolButtons).map((button) => {
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
