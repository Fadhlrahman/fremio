import {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Grid3X3,
  ArrowLeft,
  Upload,
  Save,
} from "lucide-react";
import CanvasPreview from "../../components/creator/CanvasPreview.jsx";
import PropertiesPanel from "../../components/creator/PropertiesPanel.jsx";
import ColorPicker from "../../components/creator/ColorPicker.jsx";
import useCreatorStore from "../../store/useCreatorStore.js";
import {
  CAPTURED_OVERLAY_Z_OFFSET,
  NORMAL_ELEMENTS_MIN_Z,
  BACKGROUND_PHOTO_Z,
  PHOTO_SLOT_MIN_Z,
} from "../../constants/layers.js";
import { useShallow } from "zustand/react/shallow";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from "../../components/creator/canvasConstants.js";
import {
  getFrameById,
  createFrame,
  updateFrame,
} from "../../services/frameService.js";
import "../Create.css";
import "../../styles/admin.css";

const panelMotion = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

// Helper functions
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
      if (settled) return;
      settled = true;
      onTimeout?.();
      const err = new Error(
        timeoutMessage || `Operation timed out after ${timeoutMs}ms`
      );
      err.name = "TimeoutError";
      reject(err);
    }, timeoutMs);

    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timerId);
        resolve(value);
      })
      .catch((error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timerId);
        reject(error);
      });
  });
};

const prepareCanvasExportClone = (rootNode) => {
  if (!rootNode) return;

  try {
    rootNode.setAttribute("data-export-clone", "true");

    // 1. Remove elements marked for export ignore
    const ignoreNodes = rootNode.querySelectorAll("[data-export-ignore]");
    ignoreNodes.forEach((node) => node.remove());

    // 2. Remove ALL resize handles - react-rnd creates them in various ways
    // Target by class names
    const resizeHandles = rootNode.querySelectorAll(
      ".react-rnd-handle, .creator-resize-wrapper, [class*='react-rnd'], [class*='resize'], [class*='handle']"
    );
    resizeHandles.forEach((node) => {
      if (!node.classList.contains('creator-element')) {
        node.remove();
      }
    });

    // 3. Remove resize handles by inline style patterns (cursor: *-resize)
    const allElements = rootNode.querySelectorAll('*');
    allElements.forEach((el) => {
      // Check inline style for cursor resize
      const inlineStyle = el.getAttribute('style') || '';
      if (inlineStyle.includes('resize') || inlineStyle.includes('cursor')) {
        // Check if this looks like a resize handle (small, positioned absolutely)
        const width = parseInt(el.style.width) || el.offsetWidth || 0;
        const height = parseInt(el.style.height) || el.offsetHeight || 0;
        
        // Resize handles are typically small (< 50px)
        if ((width > 0 && width < 50) || (height > 0 && height < 50)) {
          if (!el.classList.contains('creator-element') && !el.querySelector('img')) {
            el.remove();
            return;
          }
        }
      }
      
      // 4. Remove any small circular elements (likely resize dots)
      const borderRadius = el.style.borderRadius || '';
      if (borderRadius === '50%' || borderRadius.includes('50%')) {
        const width = parseInt(el.style.width) || el.offsetWidth || 0;
        if (width < 40) { // Small circular element = resize dot
          el.remove();
          return;
        }
      }
      
      // 5. Hide elements with very high z-index (resize handles use z-index 9999)
      const zIndexStyle = el.style.zIndex;
      const zIndex = parseInt(zIndexStyle) || 0;
      if (zIndex >= 9999 && !el.classList.contains('creator-element') && !el.querySelector('img')) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
      }
    });

    // 6. Make photo slots completely transparent (they are just placeholders)
    const photoSlots = rootNode.querySelectorAll(".creator-element--type-photo");
    photoSlots.forEach((slot) => {
      slot.style.background = "transparent";
      slot.style.backgroundColor = "transparent";
      slot.style.boxShadow = "none";
      slot.style.color = "transparent";
      slot.style.textShadow = "none";
      slot.style.fontSize = "0px";
      slot.style.filter = "none";
      slot.style.mixBlendMode = "normal";
      slot.style.border = "none";
      slot.style.outline = "none";
      // Remove all children (labels, icons, etc.)
      const children = Array.from(slot.children || []);
      children.forEach((child) => slot.removeChild(child));
    });
    
    // 7. HIDE overlay upload elements when in EDIT MODE
    // In EDIT mode: background-photo-1 contains the frame image, overlay elements are restored from layout.elements
    // We need to hide overlay elements to prevent "baking" them twice into the frame image
    // In CREATE mode: all upload elements are part of the frame, so don't hide anything
    const uploadElements = rootNode.querySelectorAll(".creator-element--type-upload");
    const hasBackgroundPhoto = rootNode.querySelector('[data-element-id="background-photo-1"]') !== null;
    
    if (hasBackgroundPhoto) {
      // EDIT MODE: Hide all upload elements except background-photo-1
      // These overlays are saved separately in layout.elements
      uploadElements.forEach((el) => {
        const elementId = el.getAttribute("data-element-id");
        if (elementId !== "background-photo-1") {
          console.log("[Export] EDIT MODE - Hiding overlay:", elementId, "- saved separately in layout.elements");
          el.style.display = "none";
          el.style.visibility = "hidden";
          el.style.opacity = "0";
        }
      });
    } else {
      // CREATE MODE: All upload elements are captured into frame image
      console.log("[Export] CREATE MODE - Including all", uploadElements.length, "upload elements in frame image");
    }

    // Reorder DOM elements by z-index
    const creatorElements = Array.from(
      rootNode.querySelectorAll(".creator-element")
    );

    if (creatorElements.length > 0) {
      const parent = creatorElements[0].parentNode;
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

      sorted.forEach((el) => el.remove());
      sorted.forEach((el) => {
        const dataZ = el.getAttribute("data-element-zindex");
        if (dataZ && Number.isFinite(Number.parseFloat(dataZ))) {
          el.style.zIndex = dataZ;
        }
        parent.appendChild(el);
      });
    }
  } catch (error) {
    console.error("Error preparing canvas export clone:", error);
  }
};

const normalizePhotoLayering = (elements = []) => {
  if (!Array.isArray(elements) || elements.length === 0) {
    return elements;
  }

  let didMutate = false;

  const normalizedElements = elements.map((element) => {
    if (!element || typeof element !== "object") return element;
    if (element.type === "background-photo") return element;

    if (Number.isFinite(element.zIndex)) {
      return element;
    }

    const absoluteMin = BACKGROUND_PHOTO_Z + 1;
    let defaultZ = NORMAL_ELEMENTS_MIN_Z;

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

export default function AdminUploadFrame() {
  console.log("[AdminUploadFrame] Component rendering...");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editFrameId = searchParams.get("edit");
  const isEditMode = Boolean(editFrameId);

  const fileInputRef = useRef(null);
  const uploadPurposeRef = useRef("upload");
  const toastTimeoutRef = useRef(null);
  const previewFrameRef = useRef(null);
  const loadedFrameIdRef = useRef(null); // Track which frame was loaded to prevent duplicates

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [activeMobileProperty, setActiveMobileProperty] = useState(null);
  const [showCanvasSizeInProperties, setShowCanvasSizeInProperties] = useState(false);
  const [gradientColor1, setGradientColor1] = useState("#667eea");
  const [gradientColor2, setGradientColor2] = useState("#764ba2");
  const [canvasAspectRatio, setCanvasAspectRatio] = useState("9:16");
  const [isBackgroundLocked, setIsBackgroundLocked] = useState(false);
  const [pendingPhotoTool, setPendingPhotoTool] = useState(false);
  const [previewConstraints, setPreviewConstraints] = useState({
    maxWidth: 460,
    maxHeight: 480,
  });

  // Frame metadata
  const [frameName, setFrameName] = useState("");
  const [frameDescription, setFrameDescription] = useState("");
  const [frameCategory, setFrameCategory] = useState("Fremio Series");

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
    reset,
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
      reset: state.reset,
    }))
  );

  const selectedElement = useMemo(() => {
    if (selectedElementId === "background") return "background";
    return elements.find((el) => el.id === selectedElementId) || null;
  }, [elements, selectedElementId]);

  const backgroundPhotoElement = useMemo(
    () => elements.find((el) => el.type === "background-photo") || null,
    [elements]
  );

  const selectedElementObject =
    selectedElement && selectedElement !== "background" ? selectedElement : null;
  const isBackgroundSelected = selectedElement === "background";
  const isMobilePropertyToolbar =
    isMobileView && (isBackgroundSelected || Boolean(selectedElementObject));

  // Load frame for edit mode OR reset for new upload
  useEffect(() => {
    // For new upload (no editFrameId), always reset canvas
    if (!editFrameId) {
      console.log("[AdminUploadFrame] New upload mode - resetting canvas");
      loadedFrameIdRef.current = null;
      reset?.();
      setFrameName("");
      setFrameDescription("");
      setFrameCategory("Fremio Series");
      return;
    }

    // Skip if already loaded this frame
    if (loadedFrameIdRef.current === editFrameId) {
      console.log("[AdminUploadFrame] Frame already loaded, skipping:", editFrameId);
      return;
    }

    console.log("[AdminUploadFrame] Loading frame for edit:", editFrameId);
    
    // Reset canvas and form before loading new frame
    reset?.();
    setFrameName("");
    setFrameDescription("");
    setFrameCategory("Fremio Series");

    const loadFrameForEdit = async () => {

      setLoading(true);
      try {
        console.log("Fetching frame:", editFrameId);
        const frame = await getFrameById(editFrameId);

        if (frame) {
          console.log("Frame data:", frame);
          
          // Mark as loaded BEFORE adding elements
          loadedFrameIdRef.current = editFrameId;
          
          // Set metadata
          setFrameName(frame.name || "");
          setFrameDescription(frame.description || "");
          setFrameCategory(frame.category || "Fremio Series");

          // Build all elements first, then set them at once
          const newElements = [];

          // Add frame image as background-photo (at z-index 0, behind photo slots)
          if (frame.imagePath || frame.image_url) {
            const imageUrl = frame.imagePath || frame.image_url;
            console.log("Adding frame image as background:", imageUrl);
            
            newElements.push({
              id: "background-photo-1",
              type: "background-photo",
              x: 0,
              y: 0,
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              rotation: 0,
              zIndex: 0, // Background is at z-index 0
              isLocked: false,
              data: {
                image: imageUrl,
                objectFit: "cover",
                borderRadius: 0,
                label: "Background",
              },
            });
          } else {
            console.warn("No frame image found! frame.imagePath:", frame.imagePath, "frame.image_url:", frame.image_url);
          }

          // Convert slots to photo elements (z-index 1, above background)
          if (frame.slots && frame.slots.length > 0) {
            console.log("Adding", frame.slots.length, "photo slots");
            
            frame.slots.forEach((slot, index) => {
              // Slots are stored as fractions (0-1), convert to pixels
              const x = (slot.left || 0) * CANVAS_WIDTH;
              const y = (slot.top || 0) * CANVAS_HEIGHT;
              const width = (slot.width || 0.3) * CANVAS_WIDTH;
              const height = (slot.height || 0.2) * CANVAS_HEIGHT;
              
              newElements.push({
                id: slot.id || crypto.randomUUID(),
                type: "photo",
                x,
                y,
                width,
                height,
                rotation: 0,
                zIndex: 1, // Photo slots at z-index 1
                isLocked: false,
                data: {
                  photoIndex: slot.photoIndex ?? index,
                  aspectRatio: slot.aspectRatio || "4:5",
                  image: null,
                  borderRadius: slot.borderRadius || 0,
                },
              });
            });
          }
          
          // Restore other elements (upload overlays, text, shape) from layout
          if (frame.layout?.elements && Array.isArray(frame.layout.elements)) {
            console.log("Restoring", frame.layout.elements.length, "overlay elements from layout");
            frame.layout.elements.forEach((el) => {
              // Convert normalized positions back to absolute
              const restoredElement = {
                ...el,
                x: el.xNorm !== undefined ? el.xNorm * CANVAS_WIDTH : el.x,
                y: el.yNorm !== undefined ? el.yNorm * CANVAS_HEIGHT : el.y,
                width: el.widthNorm !== undefined ? el.widthNorm * CANVAS_WIDTH : el.width,
                height: el.heightNorm !== undefined ? el.heightNorm * CANVAS_HEIGHT : el.height,
                // Overlay elements should be above photo slots
                zIndex: Math.max(el.zIndex || 10, 10),
              };
              
              // For upload elements, recalculate height using aspect ratio
              if (el.type === "upload" && el.data?.imageAspectRatio) {
                restoredElement.height = restoredElement.width / el.data.imageAspectRatio;
              }
              
              // Remove normalized properties
              delete restoredElement.xNorm;
              delete restoredElement.yNorm;
              delete restoredElement.widthNorm;
              delete restoredElement.heightNorm;
              
              newElements.push(restoredElement);
            });
          }

          // Set all elements at once
          console.log("Setting", newElements.length, "elements");
          setElements(newElements);
        } else {
          console.error("Frame not found:", editFrameId);
          showToast("error", "Frame tidak ditemukan!");
          navigate("/admin/frames");
        }
      } catch (error) {
        console.error("Error loading frame:", error);
        showToast("error", "Gagal memuat frame: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    loadFrameForEdit();
  }, [editFrameId]); // Only depend on editFrameId

  const getCanvasDimensions = useCallback((ratio) => {
    const defaultDimensions = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
    if (typeof ratio !== "string") return defaultDimensions;

    const [rawWidth, rawHeight] = ratio.split(":").map(Number);
    const ratioWidth =
      Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : null;
    const ratioHeight =
      Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : null;

    if (!ratioWidth || !ratioHeight) return defaultDimensions;

    if (ratioHeight >= ratioWidth) {
      return {
        width: CANVAS_WIDTH,
        height: Math.round((CANVAS_WIDTH * ratioHeight) / ratioWidth),
      };
    }

    return {
      width: Math.round((CANVAS_HEIGHT * ratioWidth) / ratioHeight),
      height: CANVAS_HEIGHT,
    };
  }, []);

  // Tool buttons
  const toolButtons = useMemo(
    () => [
      {
        id: "photo",
        icon: ImageIcon,
        label: "Slot Foto",
        mobileLabel: "Foto",
      },
      { id: "shape", icon: Shapes, label: "Bentuk", mobileLabel: "Bentuk" },
      { id: "text", icon: TypeIcon, label: "Teks", mobileLabel: "Teks" },
      {
        id: "upload",
        icon: UploadCloud,
        label: "Upload",
        mobileLabel: "Upload",
      },
      {
        id: "background",
        icon: Palette,
        label: "Latar",
        mobileLabel: "Latar",
        isActive: selectedElementId === "background",
      },
    ],
    [selectedElementId]
  );

  const handleToolButtonPress = useCallback(
    (button) => {
      clearSelection();
      setActiveMobileProperty(null);

      switch (button.id) {
        case "photo":
          setPendingPhotoTool(true);
          break;
        case "shape":
          addElement("shape");
          break;
        case "text":
          addElement("text");
          break;
        case "upload":
          uploadPurposeRef.current = "upload";
          fileInputRef.current?.click();
          break;
        case "background":
          selectElement("background");
          break;
      }
    },
    [addElement, clearSelection, selectElement]
  );

  const handleFileChange = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result;

        if (uploadPurposeRef.current === "background") {
          addBackgroundPhoto(dataUrl);
        } else {
          addUploadElement(dataUrl);
        }
      };
      reader.readAsDataURL(file);

      event.target.value = "";
    },
    [addBackgroundPhoto, addUploadElement]
  );

  const triggerBackgroundUpload = useCallback(() => {
    uploadPurposeRef.current = "background";
    fileInputRef.current?.click();
  }, []);

  // Listen for background upload request from PropertiesPanel
  useEffect(() => {
    const handleBackgroundUploadRequest = () => {
      console.log("Background upload requested via custom event");
      triggerBackgroundUpload();
    };

    window.addEventListener("creator:request-background-upload", handleBackgroundUploadRequest);
    return () => {
      window.removeEventListener("creator:request-background-upload", handleBackgroundUploadRequest);
    };
  }, [triggerBackgroundUpload]);

  const toggleBackgroundLock = useCallback(() => {
    setIsBackgroundLocked((prev) => !prev);
  }, []);

  const resetBackground = useCallback(() => {
    setCanvasBackground("#ffffff");
    const bgPhoto = elements.find((el) => el.type === "background-photo");
    if (bgPhoto) {
      removeElement(bgPhoto.id);
    }
  }, [elements, removeElement, setCanvasBackground]);

  // Handle upload frame
  const handleUploadFrame = async () => {
    if (saving) return;

    // Validation
    if (!frameName.trim()) {
      showToast("error", "Nama frame harus diisi");
      return;
    }

    const photoElements = elements.filter((el) => el.type === "photo");
    if (photoElements.length === 0) {
      showToast("error", "Tambahkan minimal 1 slot foto");
      return;
    }

    // Check for upload element (frame artwork)
    const uploadElements = elements.filter((el) => el.type === "upload");
    if (uploadElements.length === 0) {
      showToast("error", "Upload gambar frame terlebih dahulu");
      return;
    }

    setSaving(true);

    try {
      // ===== SIMPLE APPROACH: Use the TOP overlay image directly =====
      // Find the upload element with HIGHEST zIndex (the overlay/frame)
      // This preserves transparency from the original PNG!
      const sortedUploads = [...uploadElements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
      const topOverlay = sortedUploads[0];
      
      // Get the ORIGINAL image data (not the resized display version)
      const originalImageData = topOverlay.data?.originalImage || topOverlay.data?.image;
      
      if (!originalImageData) {
        showToast("error", "Gambar overlay tidak ditemukan");
        setSaving(false);
        return;
      }
      
      console.log("📸 Using top overlay image directly (preserving transparency)");
      console.log("  - Overlay ID:", topOverlay.id);
      console.log("  - zIndex:", topOverlay.zIndex);
      console.log("  - Image data length:", originalImageData.length);
      
      // Convert data URL to blob/file
      const response = await fetch(originalImageData);
      const blob = await response.blob();
      
      // Determine file type from blob or data URL
      const isPng = blob.type === "image/png" || originalImageData.includes("data:image/png");
      const extension = isPng ? "png" : "jpg";
      const mimeType = isPng ? "image/png" : "image/jpeg";
      
      const imageFile = new File([blob], `frame-${Date.now()}.${extension}`, { type: mimeType });
      console.log(`  - File type: ${mimeType}, size: ${Math.round(blob.size / 1024)}KB`);

      // Prepare slots data
      const W = CANVAS_WIDTH;
      const H = CANVAS_HEIGHT;
      const slots = photoElements.map((el, index) => ({
        id: el.id,
        left: (el.x || 0) / W,
        top: (el.y || 0) / H,
        width: (el.width || 300) / W,
        height: (el.height || 200) / H,
        aspectRatio: el.data?.aspectRatio || "4:5",
        zIndex: 2, // Photo slots at z-index 2 (like old system)
        photoIndex: el.data?.photoIndex ?? index,
        borderRadius: el.data?.borderRadius || 0,
      }));

      // Prepare frame data (simple, like old system)
      const frameData = {
        name: frameName.trim(),
        description: frameDescription.trim(),
        category: frameCategory,
        maxCaptures: slots.length,
        max_captures: slots.length,
        slots,
      };

      console.log("Uploading frame...", {
        name: frameData.name,
        category: frameData.category,
        slots: slots.length,
        isEditMode,
        editFrameId,
      });

      let result;
      if (isEditMode && editFrameId) {
        // Update existing frame
        result = await updateFrame(editFrameId, frameData, imageFile);
      } else {
        // Create new frame
        result = await createFrame(frameData, imageFile);
      }

      if (result.success) {
        showToast(
          "success",
          isEditMode
            ? "Frame berhasil diupdate!"
            : "Frame berhasil diupload!"
        );
        
        // Navigate after short delay
        setTimeout(() => {
          navigate("/admin/frames");
        }, 1500);
      } else {
        throw new Error(result.message || "Failed to save frame");
      }
    } catch (error) {
      console.error("Error uploading frame:", error);
      showToast("error", "Gagal menyimpan frame: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Mobile property panel
  const mobilePropertyButtons = useMemo(() => {
    if (!isMobilePropertyToolbar) return [];

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

    if (!selectedElementObject) return [];

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
      default:
        return [];
    }
  }, [isMobilePropertyToolbar, isBackgroundSelected, backgroundPhotoElement, selectedElementObject]);

  // Responsive handling
  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Compute preview constraints
  useLayoutEffect(() => {
    const computeConstraints = () => {
      if (!previewFrameRef.current) return;
      const rect = previewFrameRef.current.getBoundingClientRect();
      setPreviewConstraints({
        maxWidth: Math.max(200, rect.width - 20),
        maxHeight: Math.max(200, rect.height - 20),
      });
    };

    computeConstraints();
    window.addEventListener("resize", computeConstraints);
    return () => window.removeEventListener("resize", computeConstraints);
  }, []);

  if (loading) {
    return (
      <div className="create-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="create-save__spinner" style={{ width: 48, height: 48, margin: "0 auto 16px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style={{ width: "100%", height: "100%" }}>
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p style={{ color: "#5c4941" }}>Memuat frame...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="create-page">
      {/* Toast */}
      {toast && (
        <Motion.div
          className="create-toast-wrapper"
          initial={{ opacity: 0, y: -12, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 460, damping: 26 }}
        >
          <div
            className={"create-toast " + (toast.type === "success" ? "create-toast--success" : "create-toast--error")}
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
        {/* Left Panel - Tools */}
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
                    className={"create-tools__button " + (button.isActive ? "create-tools__button--active" : "")}
                  >
                    <IconComponent size={20} strokeWidth={2} />
                    <span>{button.label}</span>
                  </button>
                );
              })}

              {/* Back button */}
              <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid rgba(224,183,169,0.3)" }}>
                <button
                  type="button"
                  onClick={() => navigate("/admin/frames")}
                  className="create-tools__button"
                >
                  <ArrowLeft size={20} strokeWidth={2} />
                  <span>Kembali</span>
                </button>
              </div>
            </div>
          </Motion.aside>
        )}

        {/* Center - Preview */}
        <Motion.section
          variants={panelMotion}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="create-preview"
        >
          <h2 className="create-preview__title">
            {isEditMode ? "Edit Frame" : "Upload Frame"}
          </h2>

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
                isBackgroundLocked={isBackgroundLocked}
                onToggleBackgroundLock={toggleBackgroundLock}
                onResetBackground={resetBackground}
              />
            </div>
          </div>

          {/* Upload/Update Button */}
          <Motion.button
            type="button"
            onClick={handleUploadFrame}
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
                {isEditMode ? "Mengupdate..." : "Mengupload..."}
              </>
            ) : (
              <>
                {isEditMode ? (
                  <Save size={18} strokeWidth={2.5} />
                ) : (
                  <Upload size={18} strokeWidth={2.5} />
                )}
                {isEditMode ? "Update Frame" : "Upload Frame"}
              </>
            )}
          </Motion.button>
        </Motion.section>

        {/* Right Panel - Properties */}
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
              {/* Frame Metadata Section */}
              <div style={{ marginBottom: "20px", padding: "16px", background: "rgba(224,183,169,0.1)", borderRadius: "12px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#5c4941", marginBottom: "12px" }}>
                  Info Frame
                </h3>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#8b7355", marginBottom: "4px" }}>
                    Nama Frame *
                  </label>
                  <input
                    type="text"
                    value={frameName}
                    onChange={(e) => setFrameName(e.target.value)}
                    placeholder="contoh: FremioSeries-red-3"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid rgba(224,183,169,0.5)",
                      borderRadius: "8px",
                      fontSize: "13px",
                      background: "white",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#8b7355", marginBottom: "4px" }}>
                    Deskripsi
                  </label>
                  <textarea
                    value={frameDescription}
                    onChange={(e) => setFrameDescription(e.target.value)}
                    placeholder="Deskripsi frame..."
                    rows={2}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid rgba(224,183,169,0.5)",
                      borderRadius: "8px",
                      fontSize: "13px",
                      background: "white",
                      resize: "vertical",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#8b7355", marginBottom: "4px" }}>
                    Kategori
                  </label>
                  <select
                    value={frameCategory}
                    onChange={(e) => setFrameCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid rgba(224,183,169,0.5)",
                      borderRadius: "8px",
                      fontSize: "13px",
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    <option value="Fremio Series">Fremio Series</option>
                    <option value="Sport Series">Sport Series</option>
                    <option value="Inspired By">Inspired By</option>
                    <option value="Music">Music</option>
                    <option value="Seasonal">Seasonal</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              {/* Element Properties */}
              <PropertiesPanel
                selectedElement={selectedElement}
                canvasBackground={canvasBackground}
                onBackgroundChange={(color) => setCanvasBackground(color)}
                onUpdateElement={updateElement}
                onDeleteElement={removeElement}
                clearSelection={clearSelection}
                onSelectBackgroundPhoto={() => {
                  if (isBackgroundLocked) {
                    showToast("info", "Background dikunci. Unlock untuk mengedit.", 2000);
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
                pendingPhotoTool={pendingPhotoTool}
                onConfirmAddPhoto={(rows, cols) => {
                  rows = rows || 1;
                  cols = cols || 1;
                  setPendingPhotoTool(false);

                  const canvasW = 1080;
                  const canvasH = 1920;
                  const gapX = 30;
                  const gapY = 30;
                  const marginX = 65;
                  const marginY = 140;

                  const availableWidth = canvasW - 2 * marginX - (cols - 1) * gapX;
                  const availableHeight = canvasH - 2 * marginY - (rows - 1) * gapY;

                  const photoWidth = Math.floor(availableWidth / cols);
                  const photoHeight = Math.floor(availableHeight / rows);

                  let lastAddedId = null;
                  for (let row = 0; row < rows; row++) {
                    for (let col = 0; col < cols; col++) {
                      const x = marginX + col * (photoWidth + gapX);
                      const y = marginY + row * (photoHeight + gapY);

                      const newId = addElement("photo", {
                        x,
                        y,
                        width: photoWidth,
                        height: photoHeight,
                      });

                      if (newId) {
                        lastAddedId = newId;
                      }
                    }
                  }

                  if (lastAddedId) {
                    selectElement(lastAddedId);
                  }
                }}
                onCancelPhotoTool={() => setPendingPhotoTool(false)}
              />
            </div>
          </Motion.aside>
        )}
      </div>

      {/* Mobile toolbar */}
      {isMobileView && (
        <nav
          className={"create-mobile-toolbar " + (isMobilePropertyToolbar ? "create-mobile-toolbar--properties" : "")}
        >
          {/* Back button for mobile */}
          <button
            type="button"
            onClick={() => navigate("/admin/frames")}
            className="create-mobile-toolbar__button"
          >
            <ArrowLeft size={20} strokeWidth={2.4} />
            <span>Back</span>
          </button>

          {(isMobilePropertyToolbar ? mobilePropertyButtons : toolButtons).map(
            (button) => {
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
                  className={"create-mobile-toolbar__button " + (isActive ? "create-mobile-toolbar__button--active" : "")}
                >
                  <Icon size={20} strokeWidth={2.4} />
                  <span>{label}</span>
                </button>
              );
            }
          )}
        </nav>
      )}

      {/* Hidden file input */}
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
