import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { flushSync } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import frameProvider from "../utils/frameProvider.js";
import safeStorage from "../utils/safeStorage.js";
import { deriveFrameLayerPlan } from "../utils/frameLayerPlan.js";
import { clearStaleFrameCache } from "../utils/frameCacheCleaner.js";
import {
  storeVideoBlob,
  getVideoBlob,
  convertAllVideosToDataUrl,
  cleanupAllVideoBlobs,
  getMemoryUsage,
} from "../utils/videoMemoryManager.js";
import { trackFunnelEvent } from "../services/analyticsService";
import flipIcon from "../assets/flip.png";
import fremioLogo from "../assets/logo.svg";
import { useToast } from "../contexts/ToastContext";
import { requestCameraWithFallback } from "../utils/cameraHelper";

const MIRRORED_VIDEO_STYLE_ID = "take-moment-mirrored-video-controls";
const MIRRORED_VIDEO_STYLES = `
  .mirrored-video-controls {
    transform: scaleX(-1);
    transform-origin: center;
  }

  .mirrored-video-controls::-webkit-media-controls-panel,
  .mirrored-video-controls::-webkit-media-controls-play-button,
  .mirrored-video-controls::-webkit-media-controls-volume-slider,
  .mirrored-video-controls::-webkit-media-controls-timeline,
  .mirrored-video-controls::-webkit-media-controls-current-time-display,
  .mirrored-video-controls::-webkit-media-controls-time-remaining-display,
  .mirrored-video-controls::-webkit-media-controls-mute-button,
  .mirrored-video-controls::-webkit-media-controls-fullscreen-button,
  .mirrored-video-controls::-webkit-media-controls-overlay-play-button,
  .mirrored-video-controls::-webkit-media-controls-start-playback-button,
  .mirrored-video-controls::-webkit-media-controls-seek-back-button,
  .mirrored-video-controls::-webkit-media-controls-seek-forward-button,
  .mirrored-video-controls::-webkit-media-controls-return-to-realtime-button,
  .mirrored-video-controls::-webkit-media-controls-toggle-closed-captions-button,
  .mirrored-video-controls::-webkit-media-controls-playback-rate-button {
    transform: scaleX(-1);
  }

  .mirrored-video-controls::-webkit-media-controls-panel {
    direction: ltr;
  }
`;

const TIMER_OPTIONS = [3, 5, 10];
const PHONE_MAX_WIDTH = 480;
const POST_CAPTURE_BUFFER_SECONDS = 1;

const TIMER_VIDEO_DURATION_MAP = {
  3: { record: 4, playback: 4 },
  5: { record: 6, playback: 6 },
  10: { record: 6, playback: 6 },
};

const blobToDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

// Helper to detect mobile device
const isMobileDevice = () => {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth <= 768
  );
};

const dataURLToBlob = (dataUrl) => {
  if (typeof dataUrl !== "string") return null;
  const [header, base64Data] = dataUrl.split(",");
  if (!base64Data) return null;

  const mimeMatch = header.match(/:(.*?);/);
  const mimeType = mimeMatch?.[1] || "image/jpeg";
  const binary = atob(base64Data);
  const length = binary.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
};

const canvasToBlob = (canvas, mimeType = "image/jpeg", quality = 0.92) =>
  new Promise((resolve, reject) => {
    if (!canvas) {
      reject(new Error("Canvas element is not provided"));
      return;
    }

    if (canvas.toBlob) {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to extract blob from canvas"));
          }
        },
        mimeType,
        quality
      );
      return;
    }

    try {
      const dataUrl = canvas.toDataURL(mimeType, quality);
      const blob = dataURLToBlob(dataUrl);
      if (!blob) {
        reject(new Error("Failed to convert canvas data URL to blob"));
        return;
      }
      resolve(blob);
    } catch (error) {
      reject(error);
    }
  });

const revokeObjectURL = (url) => {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    console.warn("⚠️ Failed to revoke object URL", error);
  }
};

const isBlobUrl = (value) =>
  typeof value === "string" && value.startsWith("blob:");

const measureBlobDuration = (blob) =>
  new Promise((resolve) => {
    if (!blob) {
      resolve(null);
      return;
    }

    try {
      const tempUrl = URL.createObjectURL(blob);
      const videoEl = document.createElement("video");
      videoEl.preload = "metadata";
      videoEl.onloadedmetadata = () => {
        const duration = Number.isFinite(videoEl.duration)
          ? videoEl.duration
          : null;
        revokeObjectURL(tempUrl);
        resolve(duration);
      };
      videoEl.onerror = () => {
        revokeObjectURL(tempUrl);
        resolve(null);
      };
      videoEl.src = tempUrl;
    } catch (error) {
      console.warn("⚠️ Failed to measure blob duration", error);
      resolve(null);
    }
  });

const loadImageSourceFromBlob = async (blob) => {
  if (!blob) {
    throw new Error("Image blob is not available");
  }

  const supportsImageBitmap =
    typeof window !== "undefined" &&
    typeof window.createImageBitmap === "function";
  if (supportsImageBitmap) {
    const bitmap = await window.createImageBitmap(blob);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => {
        try {
          bitmap.close?.();
        } catch (error) {
          console.warn("⚠️ Failed to close ImageBitmap", error);
        }
      },
    };
  }

  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = "async";
  image.crossOrigin = "anonymous";

  return new Promise((resolve, reject) => {
    const cleanup = (shouldRevoke = true) => {
      if (shouldRevoke) {
        revokeObjectURL(objectUrl);
      }
      image.onload = null;
      image.onerror = null;
    };

    image.onload = () => {
      cleanup(false);
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        cleanup: () => {
          cleanup(true);
        },
      });
    };

    image.onerror = (error) => {
      cleanup(true);
      reject(error);
    };

    image.src = objectUrl;
  });
};

const generateScaledPhotoVariant = async (
  inputBlob,
  { maxWidth = 2048, maxHeight = 2048, quality = 0.85 }
) => {
  const { source, width, height, cleanup } = await loadImageSourceFromBlob(
    inputBlob
  );

  try {
    const widthRatio = maxWidth ? maxWidth / width : 1;
    const heightRatio = maxHeight ? maxHeight / height : 1;
    const ratio = Math.min(1, widthRatio, heightRatio);

    const targetWidth = Math.max(1, Math.round(width * ratio));
    const targetHeight = Math.max(1, Math.round(height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d", {
      alpha: false,
      willReadFrequently: false,
      desynchronized: true,
    });
    if (!ctx) {
      throw new Error("Failed to obtain 2D context for photo compression");
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

    const outputBlob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (!outputBlob) {
      throw new Error("Failed to produce compressed photo blob");
    }

    return {
      blob: outputBlob,
      width: targetWidth,
      height: targetHeight,
    };
  } finally {
    cleanup?.();
  }
};

const estimateBase64SizeMB = (blob) => {
  if (!blob) return 0;
  const base64Length = Math.ceil((blob.size / 3) * 4);
  const bytes = base64Length + 1;
  return bytes / (1024 * 1024);
};

const calculateStorageSize = ({ photos = [], videos = [] }) => {
  const totalBytes = [...photos, ...videos]
    .filter(Boolean)
    .reduce((sum, item) => {
      if (typeof item === "string") {
        return sum + item.length * 2;
      }
      if (item?.dataUrl) {
        return sum + item.dataUrl.length * 2;
      }
      if (
        typeof item?.sizeBytes === "number" &&
        Number.isFinite(item.sizeBytes)
      ) {
        return sum + item.sizeBytes;
      }
      if (item?.blob && typeof item.blob.size === "number") {
        return sum + item.blob.size;
      }
      return sum;
    }, 0);

  const kb = totalBytes / 1024;
  const mb = kb / 1024;
  return {
    bytes: totalBytes,
    kb: kb.toFixed(1),
    mb: mb.toFixed(2),
  };
};

const STORAGE_SAFETY_LIMIT_BYTES = 4.8 * 1024 * 1024; // ~4.8 MB guard below browser quota

const calculateProjectedStorageSize = ({ photos = [], videos = [] }) => {
  const sanitizeForEstimate = (items) =>
    items.map((item) => {
      if (!item) return null;
      if (typeof item === "string") {
        return item;
      }
      if (item?.dataUrl) {
        return item.dataUrl;
      }
      const sizeBytes =
        typeof item?.sizeBytes === "number"
          ? item.sizeBytes
          : item?.blob?.size ?? null;
      return {
        id: item.id ?? null,
        sizeBytes,
        mimeType: item.mimeType ?? null,
      };
    });

  const photosBytes = safeStorage.estimateJSONBytes(
    sanitizeForEstimate(photos)
  );
  const videosBytes = safeStorage.estimateJSONBytes(
    sanitizeForEstimate(videos)
  );
  const totalBytes = photosBytes + videosBytes;
  const kb = totalBytes / 1024;
  const mb = kb / 1024;

  return {
    bytes: totalBytes,
    kb: kb.toFixed(1),
    mb: mb.toFixed(2),
    breakdown: {
      photosBytes,
      videosBytes,
    },
  };
};

const detectMobile = () => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const touchCapable =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0;
  return /android|iPad|iPhone|iPod/i.test(ua) && touchCapable;
};

const persistCapturedMediaToDraft = async (draftId, photos, videos) => {
  if (!draftId) return;

  const timestamp = new Date().toISOString();

  try {
    const { default: draftStorage } = await import("../utils/draftStorage.js");
    const existingDraft = await draftStorage.getDraftById(draftId);

    if (!existingDraft) {
      console.warn(
        "⚠️ No existing draft found while persisting captured media",
        {
          draftId,
        }
      );
      return;
    }

    const draftUpdate = {
      ...existingDraft,
      capturedPhotos: Array.isArray(photos) ? [...photos] : [],
      capturedVideos: Array.isArray(videos) ? [...videos] : [],
      lastCapturedAt: timestamp,
    };

    await draftStorage.saveDraft(draftUpdate);

    console.log("✅ Captured media persisted to draft for recovery", {
      draftId,
      photos: draftUpdate.capturedPhotos.length,
      videos: draftUpdate.capturedVideos.length,
      timestamp,
    });
  } catch (error) {
    console.warn("⚠️ Failed to persist captured media to draft fallback", {
      draftId,
      error,
    });
  }
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => detectMobile());

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(detectMobile() || window.innerWidth <= PHONE_MAX_WIDTH);
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};

const compressImage = (
  dataUrl,
  { quality = 0.85, maxWidth = 2048, maxHeight = 2048 } = {}
) =>
  new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = dataUrl;
    } catch (error) {
      reject(error);
    }
  });

const compressPhotosArray = async (photos, options) => {
  const results = [];
  for (const photo of photos) {
    const compressed = await compressImage(photo, options);
    results.push(compressed);
  }
  return results;
};

const generateVideoEntryId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `video-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const generatePhotoEntryId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export default function TakeMoment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { showToast } = useToast();

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const activeRecordingRef = useRef(null);
  const captureSectionRef = useRef(null);
  const previewSectionRef = useRef(null);

  // ✅ PRE-INITIALIZED RECORDER refs for instant recording start
  const preInitializedRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const isRecorderReadyRef = useRef(false);

  // Background replacement refs
  const canvasRef = useRef(null);
  const segmentationRef = useRef(null);
  const animationFrameRef = useRef(null);
  const filterModeRef = useRef("original");
  const backgroundModeRef = useRef("blur");
  const backgroundColorRef = useRef("#10B981");
  const backgroundImageRef = useRef(null);
  const cachedImageRef = useRef(null); // Cache loaded Image object
  const hasInitialSegmentationRef = useRef(false);
  const personMaskCanvasRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [capturedVideos, setCapturedVideos] = useState([]);
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [timer, setTimer] = useState(TIMER_OPTIONS[0]);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);

  // Background replacement states
  const [filterMode, setFilterMode] = useState("original");
  const [blurMode, setBlurMode] = useState(null);
  const [isLoadingBlur, setIsLoadingBlur] = useState(false);
  const [backgroundMode, setBackgroundMode] = useState("blur");
  const [backgroundColor, setBackgroundColor] = useState("#10B981");
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [showBackgroundPanel, setShowBackgroundPanel] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);

  const capturedPhotosRef = useRef(capturedPhotos);
  const capturedVideosRef = useRef(capturedVideos);
  const previousCaptureCountRef = useRef(0);
  const previousCameraActiveRef = useRef(null);
  const mobileContentRef = useRef(null);

  // Auto-scroll to content area on mobile when page loads
  useEffect(() => {
    if (isMobile && mobileContentRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        mobileContentRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(MIRRORED_VIDEO_STYLE_ID)) return;

    const styleEl = document.createElement("style");
    styleEl.id = MIRRORED_VIDEO_STYLE_ID;
    styleEl.textContent = MIRRORED_VIDEO_STYLES;
    document.head.appendChild(styleEl);
  }, []);

  const replaceCurrentPhoto = useCallback((updater) => {
    setCurrentPhoto((prev) => {
      const nextValue = typeof updater === "function" ? updater(prev) : updater;
      if (
        prev?.previewUrl &&
        (!nextValue || prev.previewUrl !== nextValue.previewUrl)
      ) {
        revokeObjectURL(prev.previewUrl);
      }
      return nextValue ?? null;
    });
  }, []);

  const replaceCurrentVideo = useCallback((updater) => {
    setCurrentVideo((prev) => {
      const nextValue = typeof updater === "function" ? updater(prev) : updater;
      if (
        prev?.previewUrl &&
        (!nextValue || prev.previewUrl !== nextValue.previewUrl)
      ) {
        revokeObjectURL(prev.previewUrl);
      }
      return nextValue ?? null;
    });
  }, []);

  const cleanupCapturedPhotoPreview = useCallback((entry) => {
    if (!entry || typeof entry === "string") return;
    const previewUrl = entry.previewUrl;
    if (previewUrl && isBlobUrl(previewUrl)) {
      revokeObjectURL(previewUrl);
    }
  }, []);

  // ✅ Cleanup video preview URLs and blobs to free memory
  const cleanupCapturedVideoPreview = useCallback((entry) => {
    if (!entry || typeof entry === "string") return;
    const previewUrl = entry.previewUrl;
    if (previewUrl && isBlobUrl(previewUrl)) {
      revokeObjectURL(previewUrl);
    }
    // Clear blob reference to help garbage collection
    if (entry.blob) {
      entry.blob = null;
    }
  }, []);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState(4 / 3);
  const [slotAspectRatio, setSlotAspectRatio] = useState(null);

  // Helper to calculate and set slot aspect ratio from frame config
  const updateSlotAspectRatio = useCallback((frameConfig) => {
    if (frameConfig?.slots && frameConfig.slots.length > 0) {
      const firstSlot = frameConfig.slots[0];

      // Use aspectRatio string if available (e.g., "4:5")
      if (firstSlot.aspectRatio && typeof firstSlot.aspectRatio === "string") {
        const [w, h] = firstSlot.aspectRatio.split(":").map(Number);
        if (w && h) {
          const slotRatio = w / h;
          setSlotAspectRatio(slotRatio);
          console.log(
            "📐 Slot aspect ratio from string:",
            slotRatio,
            `(${w}:${h})`
          );
          return;
        }
      }

      // Fallback: calculate from width/height (already normalized 0-1)
      if (firstSlot.width && firstSlot.height) {
        const slotRatio = firstSlot.width / firstSlot.height;
        setSlotAspectRatio(slotRatio);
        console.log(
          "📐 Slot aspect ratio from dimensions:",
          slotRatio,
          `(${firstSlot.width} / ${firstSlot.height})`
        );
        return;
      }
    }

    setSlotAspectRatio(null);
    console.log("📐 No slots found, using default aspect ratio");
  }, []);
  const [maxCaptures, setMaxCaptures] = useState(4);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [isUsingBackCamera, setIsUsingBackCamera] = useState(false);
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const [isEditorTransitioning, setIsEditorTransitioning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [liveModeEnabled, setLiveModeEnabled] = useState(true); // Live mode: video + photo
  const [isDuplicateMode, setIsDuplicateMode] = useState(false); // Duplicate mode: each photo fills 2 slots

  // Calculate photos needed based on duplicate mode - defined early to avoid reference errors
  const photosNeeded = isDuplicateMode && maxCaptures > 1 
    ? Math.ceil(maxCaptures / 2) 
    : maxCaptures;

  const pendingStorageIdleRef = useRef(null);
  const pendingStorageTimeoutRef = useRef(null);
  const latestStoragePayloadRef = useRef({ photos: null, videos: null });

  const headingStyles = {
    fontFamily: "'Poppins', 'Inter', 'Helvetica Neue', sans-serif",
    fontSize: "22px",
    fontWeight: 700,
    color: "#1E293B",
    margin: 0,
    lineHeight: 1.4,
    letterSpacing: "-0.01em",
  };

  const headingLineOneStyle = {
    display: "block",
  };

  const headingLineTwoStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.4rem",
  };

  const headingLogoStyle = {
    height: "30px",
    width: "auto",
  };

  const sanitizeVideosForStorage = useCallback((videos) => {
    if (!Array.isArray(videos)) return [];
    return videos.map((entry, index) => {
      if (!entry || !entry.dataUrl) {
        return null;
      }

      const {
        id,
        dataUrl,
        mimeType,
        duration,
        timer,
        mirrored,
        requiresPreviewMirror,
        facingMode,
        sizeBytes,
        baseVideoIndex,
        recordedAt,
      } = entry;

      return {
        id: id || `video-${index}`,
        dataUrl,
        mimeType: mimeType || "video/webm",
        duration: duration ?? null,
        timer: timer ?? null,
        mirrored: Boolean(mirrored),
        requiresPreviewMirror: Boolean(requiresPreviewMirror),
        facingMode: facingMode ?? null,
        sizeBytes: sizeBytes ?? null,
        baseVideoIndex: baseVideoIndex ?? index,
        recordedAt: recordedAt ?? null,
      };
    });
  }, []);

  const getFrameCompressionProfile = useCallback((frameName) => {
    // All frames use high-quality settings to prevent blurry photos
    // Primary: Full quality for normal use
    // Moderate: Still good quality for slightly large files
    // Emergency: Minimum acceptable quality (only when localStorage is critically full)
    switch (frameName) {
      case "Testframe4":
        return {
          primary: { quality: 0.9, maxWidth: 2048, maxHeight: 2048 },
          moderate: { quality: 0.85, maxWidth: 1600, maxHeight: 1600 },
          emergency: { quality: 0.8, maxWidth: 1200, maxHeight: 1200 },
        };
      case "Testframe2":
        return {
          primary: { quality: 0.95, maxWidth: 2048, maxHeight: 2048 },
          moderate: { quality: 0.85, maxWidth: 1600, maxHeight: 1600 },
          emergency: { quality: 0.8, maxWidth: 1200, maxHeight: 1200 },
        };
      default:
        return {
          primary: { quality: 0.9, maxWidth: 2048, maxHeight: 2048 },
          moderate: { quality: 0.85, maxWidth: 1600, maxHeight: 1600 },
          emergency: { quality: 0.8, maxWidth: 1200, maxHeight: 1200 },
        };
    }
  }, []);

  const clearScheduledStorage = useCallback(() => {
    if (
      pendingStorageIdleRef.current &&
      typeof window !== "undefined" &&
      typeof window.cancelIdleCallback === "function"
    ) {
      window.cancelIdleCallback(pendingStorageIdleRef.current);
    }
    if (pendingStorageTimeoutRef.current) {
      window.clearTimeout(pendingStorageTimeoutRef.current);
    }
    pendingStorageIdleRef.current = null;
    pendingStorageTimeoutRef.current = null;
  }, []);

  // Helper to clear large cache items to free up localStorage space
  const clearLargeCacheItems = useCallback(() => {
    try {
      const keys = Object.keys(localStorage);
      let freedSpace = 0;
      
      // Remove large frame slots cache (keep only essential ones)
      keys.forEach(key => {
        if (key.startsWith('fremio_frame_slots_')) {
          const value = localStorage.getItem(key);
          if (value && value.length > 100000) { // > 100KB
            localStorage.removeItem(key);
            freedSpace += value.length;
            console.log(`🧹 Removed large cache: ${key} (${Math.round(value.length/1024)}KB)`);
          }
        }
      });
      
      // Also remove old frame cache versions
      ['fremio_frames_cache_v1', 'fremio_frames_cache_v2', 'fremio_frames_cache_time_v1', 'fremio_frames_cache_time_v2'].forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`🧹 Removed old cache: ${key}`);
        }
      });
      
      if (freedSpace > 0) {
        console.log(`✅ Freed ${Math.round(freedSpace/1024)}KB from localStorage`);
      }
    } catch (e) {
      console.warn('Failed to clear cache:', e);
    }
  }, []);

  const runStorageWrite = useCallback(() => {
    console.log("💾 [runStorageWrite] Starting...");
    
    // Clear large cache items first to make room
    clearLargeCacheItems();
    
    if (!safeStorage.isAvailable()) {
      console.warn("⚠️ [runStorageWrite] safeStorage not available!");
      return;
    }
    
    const payload = latestStoragePayloadRef.current;
    if (!payload?.photos) {
      console.log("ℹ️ [runStorageWrite] No photos in payload, skipping");
      return;
    }

    console.log("📸 [runStorageWrite] Processing", payload.photos.length, "photos");

    const photosPayload = Array.isArray(payload.photos)
      ? payload.photos.map((entry, idx) => {
          if (!entry) {
            console.log(`   Photo ${idx}: null entry`);
            return null;
          }
          if (typeof entry === "string") {
            console.log(`   Photo ${idx}: string (${entry.startsWith('data:') ? 'data URL' : 'other'})`);
            return entry;
          }

          const { dataUrl, previewUrl } = entry;
          console.log(`   Photo ${idx}: object - dataUrl=${dataUrl?.substring?.(0,30)}, previewUrl=${previewUrl?.substring?.(0,30)}`);
          
          if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
            console.log(`   Photo ${idx}: ✅ Using dataUrl`);
            return dataUrl;
          }
          if (
            typeof previewUrl === "string" &&
            previewUrl.startsWith("data:")
          ) {
            console.log(`   Photo ${idx}: ✅ Using previewUrl (data)`);
            return previewUrl;
          }
          console.warn(`   Photo ${idx}: ❌ NO VALID DATA URL - has blob=${!!entry.blob}`);
          return null;
        })
      : [];

    const videosPayload = sanitizeVideosForStorage(
      Array.isArray(payload.videos) ? payload.videos : []
    );

    const hasPersistablePhotos = photosPayload.some(
      (item) => typeof item === "string" && item.startsWith("data:")
    );
    const hasPersistableVideos = videosPayload.some(
      (item) =>
        typeof item?.dataUrl === "string" && item.dataUrl.startsWith("data:")
    );

    console.log("📊 [runStorageWrite] photosPayload:", photosPayload.length, "items");
    console.log("📊 [runStorageWrite] hasPersistablePhotos:", hasPersistablePhotos);
    console.log("📊 [runStorageWrite] hasPersistableVideos:", hasPersistableVideos);

    try {
      if (!hasPersistablePhotos && !hasPersistableVideos) {
        console.warn("⚠️ [runStorageWrite] No persistable data - REMOVING storage!");
        safeStorage.removeItem("capturedPhotos");
        safeStorage.removeItem("capturedVideos");
      } else {
        console.log("✅ [runStorageWrite] Saving to storage...");
        safeStorage.setJSON("capturedPhotos", photosPayload);
        safeStorage.setJSON("capturedVideos", videosPayload);
        console.log("✅ [runStorageWrite] Saved successfully!");
        
        // Verify
        const verify = safeStorage.getJSON("capturedPhotos");
        console.log("🔍 [runStorageWrite] Verification:", verify?.length || 0, "photos saved");
      }
    } catch (error) {
      console.error("❌ Failed to persist captured media", error);
      showToast({
        type: "error",
        title: "Penyimpanan Penuh",
        message:
          "Penyimpanan tidak tersedia. Silakan hapus beberapa foto atau kosongkan cache browser.",
        action: {
          label: "Hapus Semua",
          onClick: () => {
            setCapturedPhotos([]);
            setCapturedVideos([]);
            safeStorage.removeItem("capturedPhotos");
            safeStorage.removeItem("capturedVideos");
          },
        },
      });
    } finally {
      latestStoragePayloadRef.current = { photos: null, videos: null };
    }
  }, [sanitizeVideosForStorage, clearLargeCacheItems]);

  const scheduleStorageWrite = useCallback(
    (photos, videos, { immediate = false } = {}) => {
      if (!safeStorage.isAvailable()) return;
      latestStoragePayloadRef.current = { photos, videos };

      const execute = () => {
        clearScheduledStorage();
        runStorageWrite();
      };

      if (immediate) {
        execute();
        return;
      }

      if (
        typeof window !== "undefined" &&
        typeof window.requestIdleCallback === "function"
      ) {
        clearScheduledStorage();
        pendingStorageIdleRef.current = window.requestIdleCallback(execute, {
          timeout: 120,
        });
      } else {
        clearScheduledStorage();
        pendingStorageTimeoutRef.current = window.setTimeout(execute, 0);
      }
    },
    [clearScheduledStorage, runStorageWrite]
  );

  const flushStorageWrite = useCallback(() => {
    if (!latestStoragePayloadRef.current?.photos) return;
    clearScheduledStorage();
    runStorageWrite();
  }, [clearScheduledStorage, runStorageWrite]);

  const clearCapturedMedia = useCallback(() => {
    const existingPhotos = Array.isArray(capturedPhotosRef.current)
      ? capturedPhotosRef.current
      : [];
    existingPhotos.forEach((entry) => cleanupCapturedPhotoPreview(entry));

    // ✅ Also cleanup video URLs and blobs
    const existingVideos = Array.isArray(capturedVideosRef.current)
      ? capturedVideosRef.current
      : [];
    existingVideos.forEach((entry) => cleanupCapturedVideoPreview(entry));

    setCapturedPhotos([]);
    setCapturedVideos([]);

    if (!safeStorage.isAvailable()) return;

    clearScheduledStorage();
    latestStoragePayloadRef.current = { photos: null, videos: null };
    safeStorage.removeItem("capturedPhotos");
    safeStorage.removeItem("capturedVideos");
  }, [cleanupCapturedPhotoPreview, cleanupCapturedVideoPreview, clearScheduledStorage]);

  const cleanUpStorage = useCallback(() => {
    try {
      const photos = safeStorage.getJSON("capturedPhotos", []);
      const videos = safeStorage.getJSON("capturedVideos", []);

      const lastSavedPhoto = photos.slice(0, maxCaptures);
      const lastSavedVideos = videos.slice(0, maxCaptures);
      safeStorage.setJSON("capturedPhotos", lastSavedPhoto);
      safeStorage.setJSON("capturedVideos", lastSavedVideos);
    } catch (error) {
      console.warn("⚠️ Failed to clean up storage:", error);
    }
  }, [maxCaptures]);

  const persistLayerPlan = useCallback((config) => {
    try {
      if (!config || typeof config !== "object") {
        safeStorage.removeItem("frameLayerPlan");
        return;
      }

      const plan = deriveFrameLayerPlan(config);
      if (!plan) {
        safeStorage.removeItem("frameLayerPlan");
        return;
      }

      safeStorage.setJSON("frameLayerPlan", plan);
    } catch (error) {
      console.warn("⚠️ Failed to persist frame layer plan", error);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (activeRecordingRef.current) {
      try {
        activeRecordingRef.current.stop?.();
      } catch (error) {
        console.warn("⚠️ Error stopping active recording", error);
      }
      activeRecordingRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    setCameraActive(false);
  }, []);

  // Handle shared frame from URL
  useEffect(() => {
    const shareId = searchParams.get("share");  // NEW: VPS share link
    const sharedData = searchParams.get("d");   // Embedded data fallback
    const sharedFrameId = searchParams.get("frame"); // Legacy local ID
    
    // PRIORITY 1: VPS Share ID (from PostgreSQL)
    if (shareId) {
      console.log("🔗 Loading shared frame from VPS:", shareId);
      
      (async () => {
        try {
          showToast("info", "⏳ Memuat frame...");
          
          const draftService = (await import("../services/draftService.js")).default;
          const cloudDraft = await draftService.getSharedDraft(shareId);
          
          if (!cloudDraft) {
            showToast("error", "Frame tidak ditemukan atau tidak publik");
            setTimeout(() => navigate("/frames"), 2000);
            return;
          }
          
          // Parse frame data
          const frameData = typeof cloudDraft.frame_data === 'string' 
            ? JSON.parse(cloudDraft.frame_data) 
            : cloudDraft.frame_data;
          
          console.log("✅ Shared frame loaded from VPS:", {
            title: cloudDraft.title,
            elementsCount: frameData?.elements?.length,
            elementTypes: frameData?.elements?.map(el => el.type),
            hasBackground: frameData?.elements?.some(el => el.type === 'background-photo'),
            hasUpload: frameData?.elements?.some(el => el.type === 'upload'),
          });
          
          // Canvas dimensions for coordinate conversion
          const canvasWidth = frameData.canvasWidth || 1080;
          const canvasHeight = frameData.canvasHeight || 1920;
          
          // Filter photo elements for slots
          const photoElements = frameData.elements?.filter(el => el.type === "photo") || [];
          
          // Convert to frame config with FULL designer elements
          const frameConfig = {
            id: `shared-${shareId}`,
            title: cloudDraft.title || "Shared Frame",
            aspectRatio: frameData.aspectRatio || "9:16",
            elements: frameData.elements || [],
            canvasBackground: frameData.canvasBackground || "#f7f1ed",
            canvasWidth: canvasWidth,
            canvasHeight: canvasHeight,
            maxCaptures: photoElements.length || 1,
            slots: photoElements.map((el, idx) => ({
              id: el.id || `slot_${idx + 1}`,
              left: el.x / canvasWidth,    // Convert absolute to normalized (0-1)
              top: el.y / canvasHeight,
              width: el.width / canvasWidth,
              height: el.height / canvasHeight,
              zIndex: el.zIndex || 1,
              photoIndex: idx,
              aspectRatio: el.data?.aspectRatio || '4:5'
            })),
            // CRITICAL: Include designer object with ALL elements
            // This enables background-photo, upload overlays, text, etc.
            designer: {
              elements: frameData.elements || [],
              canvasBackground: frameData.canvasBackground || "#f7f1ed",
              aspectRatio: frameData.aspectRatio || "9:16",
              canvasWidth: canvasWidth,
              canvasHeight: canvasHeight
            },
            isCustom: true,
            isSharedFrame: true,
            shareId: shareId,
            preview: cloudDraft.preview_url
          };
          
          // Set frame via frameProvider
          await frameProvider.setCustomFrame(frameConfig);
          
          // Store in safeStorage
          safeStorage.setJSON("frameConfig", {
            ...frameConfig,
            __timestamp: Date.now(),
            __savedFrom: "TakeMoment_vpsShare"
          });
          safeStorage.setItem("selectedFrame", frameConfig.id);
          safeStorage.setItem("frameConfigTimestamp", String(Date.now()));
          
          // Update state
          setMaxCaptures(frameConfig.maxCaptures);
          updateSlotAspectRatio(frameConfig);
          persistLayerPlan(frameConfig);
          
          showToast("success", `✅ Frame "${cloudDraft.title}" berhasil dimuat!`);
          
          // Clean up URL
          window.history.replaceState({}, '', '/take-moment');
        } catch (error) {
          console.error("Error loading shared frame from VPS:", error);
          showToast("error", "Gagal memuat frame dari server");
          setTimeout(() => navigate("/frames"), 2000);
        }
      })();
      
      return;
    }
    
    // PRIORITY 2: Check for embedded data in URL (offline fallback)
    if (sharedData) {
      console.log("🔗 Found embedded frame data in URL");
      
      (async () => {
        try {
          const { decompressFrameData } = await import("../services/frameShareService.js");
          const draft = decompressFrameData(sharedData);
          
          if (!draft) {
            showToast("error", "Data frame rusak atau tidak valid");
            setTimeout(() => navigate("/frames"), 2000);
            return;
          }
          
          console.log("✅ Shared frame decompressed:", {
            title: draft.title,
            elementsCount: draft.elements?.length,
            elementTypes: draft.elements?.map(el => el.type || el.tp),
          });
          
          // Canvas dimensions for coordinate conversion
          const canvasWidth = draft.canvasWidth || 1080;
          const canvasHeight = draft.canvasHeight || 1920;
          
          // Filter photo elements
          const photoElements = draft.elements?.filter(el => el.type === "photo" || el.tp === "ph") || [];
          
          // Convert draft to frame config with FULL designer elements
          const frameConfig = {
            id: draft.id || `shared-${Date.now()}`,
            title: draft.title || "Shared Frame",
            aspectRatio: draft.aspectRatio || "9:16",
            elements: draft.elements || [],
            canvasBackground: draft.canvasBackground || "#f7f1ed",
            canvasWidth: canvasWidth,
            canvasHeight: canvasHeight,
            maxCaptures: photoElements.length || 1,
            slots: photoElements.map((el, idx) => ({
              id: el.id || `slot_${idx + 1}`,
              left: (el.x || 0) / canvasWidth,
              top: (el.y || 0) / canvasHeight,
              width: (el.width || el.w || 100) / canvasWidth,
              height: (el.height || el.h || 100) / canvasHeight,
              zIndex: el.zIndex || el.z || 1,
              photoIndex: idx,
              aspectRatio: el.data?.aspectRatio || el.d?.ar || '4:5'
            })),
            // CRITICAL: Include designer object with ALL elements
            designer: {
              elements: draft.elements || [],
              canvasBackground: draft.canvasBackground || "#f7f1ed",
              aspectRatio: draft.aspectRatio || "9:16",
              canvasWidth: canvasWidth,
              canvasHeight: canvasHeight
            },
            isCustom: true,
            isSharedFrame: true,
            preview: draft.preview
          };
          
          // Set frame via frameProvider (same as legacy method)
          await frameProvider.setCustomFrame(frameConfig);
          
          // Store in safeStorage
          safeStorage.setJSON("frameConfig", {
            ...frameConfig,
            __timestamp: Date.now(),
            __savedFrom: "TakeMoment_embeddedShare"
          });
          safeStorage.setItem("selectedFrame", frameConfig.id);
          safeStorage.setItem("frameConfigTimestamp", String(Date.now()));
          
          // Update state
          setMaxCaptures(frameConfig.maxCaptures);
          updateSlotAspectRatio(frameConfig);
          persistLayerPlan(frameConfig);
          
          showToast("success", `✅ Frame "${draft.title}" berhasil dimuat!`);
          
          // Clean up URL
          window.history.replaceState({}, '', '/take-moment');
        } catch (error) {
          console.error("Error loading embedded frame:", error);
          showToast("error", "Gagal memuat frame");
          setTimeout(() => navigate("/frames"), 2000);
        }
      })();
      
      return;
    }
    
    // PRIORITY 3: Legacy method - frame ID param (local IndexedDB)
    if (!sharedFrameId) return;
    
    console.log("🔗 Shared frame detected from URL:", sharedFrameId);
    
    (async () => {
      try {
        let draft = null;
        
        // PRIORITY 1: Check if sharedDraftData exists in storage (from SharedFrame page)
        const sharedDraftData = safeStorage.getJSON("sharedDraftData");
        if (sharedDraftData && (sharedDraftData.id === sharedFrameId || sharedDraftData.id === `shared-${sharedFrameId}`)) {
          console.log("✅ Using sharedDraftData from storage (cloud frame)");
          draft = sharedDraftData;
        }
        
        // PRIORITY 2: Try local IndexedDB (for same-device)
        if (!draft) {
          const { default: draftStorage } = await import("../utils/draftStorage.js");
          draft = await draftStorage.getDraftById(sharedFrameId);
          if (draft) {
            console.log("✅ Found draft in local IndexedDB");
          }
        }
        
        // PRIORITY 3: Try loading from cloud API (for cross-device sharing)
        if (!draft && sharedFrameId.length === 8) {
          // 8-char IDs are likely share_ids from cloud
          console.log("🔄 Trying to load from cloud API...");
          try {
            const draftService = (await import("../services/draftService.js")).default;
            const cloudDraft = await draftService.getSharedDraft(sharedFrameId);
            if (cloudDraft?.frame_data) {
              const frameData = typeof cloudDraft.frame_data === 'string' 
                ? JSON.parse(cloudDraft.frame_data) 
                : cloudDraft.frame_data;
              draft = {
                id: `shared-${cloudDraft.share_id}`,
                title: cloudDraft.title,
                ...frameData,
                preview: cloudDraft.preview_url
              };
              console.log("✅ Loaded draft from cloud API");
            }
          } catch (cloudError) {
            console.warn("⚠️ Cloud API failed:", cloudError.message);
          }
        }
        
        if (!draft) {
          console.error("❌ Shared frame not found:", sharedFrameId);
          showToast("error", "Frame tidak ditemukan. Silakan pilih frame lain.");
          // Redirect to frames page after 2 seconds
          setTimeout(() => {
            navigate("/frames");
          }, 2000);
          return;
        }
        
        console.log("✅ Shared frame loaded:", {
          id: draft.id,
          title: draft.title,
          hasElements: !!draft.elements,
          elementsCount: draft.elements?.length,
          elementTypes: draft.elements?.map(el => el.type),
        });
        
        // Canvas dimensions for coordinate conversion
        const canvasWidth = draft.canvasWidth || 1080;
        const canvasHeight = draft.canvasHeight || 1920;
        
        // Filter photo elements
        const photoElements = draft.elements?.filter(el => el.type === "photo") || [];
        
        // Convert draft to frame config with FULL designer elements
        const frameConfig = {
          id: draft.id,
          title: draft.title || "Shared Frame",
          aspectRatio: draft.aspectRatio || "9:16",
          elements: draft.elements || [],
          canvasBackground: draft.canvasBackground || "#f7f1ed",
          canvasWidth: canvasWidth,
          canvasHeight: canvasHeight,
          maxCaptures: photoElements.length || 1,
          slots: photoElements.map((el, idx) => ({
            id: el.id || `slot_${idx + 1}`,
            left: el.x / canvasWidth,
            top: el.y / canvasHeight,
            width: el.width / canvasWidth,
            height: el.height / canvasHeight,
            zIndex: el.zIndex || 1,
            photoIndex: idx,
            aspectRatio: el.data?.aspectRatio || '4:5'
          })),
          // CRITICAL: Include designer object with ALL elements
          designer: {
            elements: draft.elements || [],
            canvasBackground: draft.canvasBackground || "#f7f1ed",
            aspectRatio: draft.aspectRatio || "9:16",
            canvasWidth: canvasWidth,
            canvasHeight: canvasHeight
          },
          isCustom: true,
          isSharedFrame: true,
          preview: draft.preview,
        };
        
        // Set frame via frameProvider
        await frameProvider.setCustomFrame(frameConfig);
        
        // Store in safeStorage
        safeStorage.setJSON("frameConfig", {
          ...frameConfig,
          __timestamp: Date.now(),
          __savedFrom: "TakeMoment_sharedFrame"
        });
        safeStorage.setItem("selectedFrame", frameConfig.id);
        safeStorage.setItem("activeDraftId", draft.id);
        safeStorage.setItem("frameConfigTimestamp", String(Date.now()));
        
        // Update state
        setMaxCaptures(frameConfig.maxCaptures);
        updateSlotAspectRatio(frameConfig);
        persistLayerPlan(frameConfig);
        
        showToast("success", `Frame "${frameConfig.title}" dimuat`);
        
        // Remove query param from URL to prevent reload issues
        window.history.replaceState({}, "", "/take-moment");
        
      } catch (error) {
        console.error("❌ Error loading shared frame:", error);
        showToast("error", "Gagal memuat frame");
      }
    })();
  }, [searchParams, showToast]);

  useEffect(() => {
    clearCapturedMedia();

    // Clear stale cache (older than 24 hours)
    clearStaleFrameCache();

    // 🎯 PRIORITY 0: Check for shared frame in sessionStorage (highest priority)
    const SHARED_FRAME_KEY = '__fremio_shared_frame_temp__';
    let sharedFrameData = null;
    try {
      const rawSharedData = sessionStorage.getItem(SHARED_FRAME_KEY);
      if (rawSharedData) {
        sharedFrameData = JSON.parse(rawSharedData);
        console.log("🔗 [SHARED FRAME] Found in sessionStorage");
        
        const sharedConfig = sharedFrameData.frameConfig;
        if (sharedConfig) {
          console.log("✅ Using shared frame from sessionStorage:", sharedConfig.id);
          
          // Set the frame via frameProvider
          frameProvider.setCustomFrame(sharedConfig);
          
          // Update state
          if (sharedConfig.maxCaptures) {
            setMaxCaptures(sharedConfig.maxCaptures);
          }
          updateSlotAspectRatio(sharedConfig);
          persistLayerPlan(sharedConfig);
          
          // DO NOT persist to localStorage - keep shared frames in sessionStorage only
          console.log("✅ Shared frame loaded, keeping in sessionStorage only");
          return; // Skip all other loading logic
        }
      }
    } catch (e) {
      console.warn("⚠️ Failed to read shared frame from sessionStorage:", e);
    }

    // 🎯 PRIORITY 1: Check if frame is already in memory (just set from Frames page)
    const memoryConfig = frameProvider.getCurrentConfig();
    const memoryFrameName = frameProvider.getCurrentFrameName();
    
    if (memoryConfig?.id || memoryFrameName) {
      console.log("✅ Frame already in memory from Frames page:", memoryConfig?.id || memoryFrameName);
      // Frame is fresh from Frames page, use it
      if (memoryConfig?.maxCaptures) {
        setMaxCaptures(memoryConfig.maxCaptures);
      }
      updateSlotAspectRatio(memoryConfig);
      persistLayerPlan(memoryConfig);
      
      // 🆕 CRITICAL: Ensure localStorage is in sync with memory
      // This prevents next page load from thinking data is stale
      const currentTimestamp = safeStorage.getItem("frameConfigTimestamp");
      if (!currentTimestamp) {
        console.log("📝 Setting timestamp for memory frame to prevent stale detection");
        safeStorage.setItem("frameConfigTimestamp", String(Date.now()));
      }
      
      // Also ensure frameConfig is persisted if missing
      const storedConfig = safeStorage.getJSON("frameConfig");
      if (!storedConfig?.id && memoryConfig?.id) {
        console.log("📝 Persisting memory frame to localStorage:", memoryConfig.id);
        safeStorage.setJSON("frameConfig", {
          ...memoryConfig,
          __timestamp: Date.now(),
          __savedFrom: "TakeMoment_memorySync"
        });
        safeStorage.setItem("selectedFrame", memoryConfig.id);
      }
      
      return; // Skip all the localStorage clearing logic
    }

    // 🆕 NEW SESSION LOGIC: Clear old frame data to prevent carryover
    // Only keep frameConfig if it has a fresh timestamp (within last 5 minutes)
    const frameConfigTimestamp = safeStorage.getItem("frameConfigTimestamp");
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (frameConfigTimestamp) {
      const timeDiff = now - Number(frameConfigTimestamp);
      const isStaleSession = timeDiff > FIVE_MINUTES;

      console.log("🕐 TakeMoment session check:", {
        timestamp: new Date(Number(frameConfigTimestamp)).toLocaleString(),
        ageMinutes: Math.round(timeDiff / 1000 / 60),
        isStale: isStaleSession,
      });

      if (isStaleSession) {
        console.log("🧹 Clearing stale frame session (>5 minutes old)");
        safeStorage.removeItem("frameConfig");
        safeStorage.removeItem("frameConfigTimestamp");
        safeStorage.removeItem("selectedFrame");
        // Don't clear activeDraftId - user might want to resume draft
      }
    } else {
      // Check if there's a stored config with valid frame before clearing
      const storedConfig = safeStorage.getJSON("frameConfig");
      if (!storedConfig?.id) {
        // No valid config, safe to clear
        console.log("🧹 No valid frame data found, clearing");
        safeStorage.removeItem("frameConfig");
        safeStorage.removeItem("selectedFrame");
      } else {
        console.log("📦 Found existing frameConfig, keeping it:", storedConfig.id);
      }
    }

    // CRITICAL: Handle pending frame fetch (from Frames page when slots weren't cached)
    const pendingFrameFetch = safeStorage.getItem("pendingFrameFetch");
    if (pendingFrameFetch === "true") {
      safeStorage.removeItem("pendingFrameFetch");
      const selectedFrameId = safeStorage.getItem("selectedFrame");
      
      if (selectedFrameId) {
        console.log("🔄 Pending frame fetch detected, loading slots for:", selectedFrameId);
        
        // Default slots for 4-photo frame (standard layout)
        // Values in decimal (0-1) representing percentage of frame dimensions
        const DEFAULT_SLOTS = [
          { id: 1, left: 0.05, top: 0.05, width: 0.42, height: 0.20, zIndex: 1, photoIndex: 0, aspectRatio: '4:5' },
          { id: 2, left: 0.53, top: 0.05, width: 0.42, height: 0.20, zIndex: 1, photoIndex: 1, aspectRatio: '4:5' },
          { id: 3, left: 0.05, top: 0.28, width: 0.42, height: 0.20, zIndex: 1, photoIndex: 2, aspectRatio: '4:5' },
          { id: 4, left: 0.53, top: 0.28, width: 0.42, height: 0.20, zIndex: 1, photoIndex: 3, aspectRatio: '4:5' }
        ];
        
        (async () => {
          try {
            const unifiedFrameService = (await import("../services/unifiedFrameService")).default;
            
            // Try to get frame - single attempt with short timeout
            let fullFrame = await unifiedFrameService.getFrameById(selectedFrameId);
            
            // If no slots, use default slots
            if (!fullFrame?.slots || fullFrame.slots.length === 0) {
              console.log("⚠️ No slots found, using default slots");
              const storedConfig = safeStorage.getJSON("frameConfig");
              fullFrame = {
                ...storedConfig,
                ...fullFrame,
                slots: DEFAULT_SLOTS,
                maxCaptures: 4
              };
            }
            
            console.log("✅ Frame ready with slots:", fullFrame.slots.length);
            
            // Set frame via frameProvider
            await frameProvider.setCustomFrame(fullFrame);
            
            const frameConfig = frameProvider.getCurrentConfig();
            if (frameConfig?.maxCaptures) {
              setMaxCaptures(frameConfig.maxCaptures);
            } else {
              setMaxCaptures(fullFrame.maxCaptures || fullFrame.max_captures || 4);
            }
            updateSlotAspectRatio(frameConfig || fullFrame);
            persistLayerPlan(frameConfig || fullFrame);
          } catch (error) {
            console.error("❌ Error fetching pending frame:", error);
            // Use stored config with default slots as fallback
            const storedConfig = safeStorage.getJSON("frameConfig");
            if (storedConfig) {
              const fallbackFrame = { ...storedConfig, slots: DEFAULT_SLOTS, maxCaptures: 4 };
              await frameProvider.setCustomFrame(fallbackFrame);
              setMaxCaptures(4);
              console.log("✅ Using fallback frame with default slots");
            } else {
              alert("Gagal memuat data frame. Silakan pilih frame lagi.");
              window.location.href = "/frames";
            }
          }
        })();
        return;
      }
    }

    // CRITICAL: Always check localStorage first for custom frames (from Create page)
    const storedConfig = safeStorage.getJSON("frameConfig");
    const activeDraftId = safeStorage.getItem("activeDraftId");

    console.log("🔍 TakeMoment useEffect - checking frame sources:", {
      hasStoredConfig: !!storedConfig,
      storedConfigId: storedConfig?.id,
      isCustomStored:
        storedConfig?.isCustom || storedConfig?.id?.startsWith("custom-"),
      hasActiveDraftId: !!activeDraftId,
      activeDraftId: activeDraftId,
    });

    // Priority 1: Check for activeDraftId first (custom frame from Create page)
    if (activeDraftId) {
      console.log(
        "🎯 activeDraftId found in initialization, loading custom frame from draft"
      );
      console.log("   activeDraftId:", activeDraftId);
      console.log("   storedConfig.id:", storedConfig?.id);
      console.log("   storedConfig.isCustom:", storedConfig?.isCustom);

      // CRITICAL: Even if storedConfig exists, if activeDraftId is present, we MUST use draft
      // Because storedConfig might be incomplete (no images) or wrong frame (Testframe1)
      (async () => {
        try {
          // 🆕 SHARED FRAME SUPPORT: Check if this is a shared frame first
          const isSharedFrame = activeDraftId.startsWith('shared-');
          const isDraftFrame = activeDraftId.startsWith('draft-');
          let draft = null;
          
          if (isSharedFrame) {
            // For shared frames, use sharedDraftData from storage (no network call needed)
            const sharedData = safeStorage.getJSON('sharedDraftData');
            if (sharedData && sharedData.id === activeDraftId) {
              console.log('✅ Using sharedDraftData from storage (no login required)');
              draft = sharedData;
            }
          }
          
          // For regular drafts, try load from local draftStorage first
          if (!draft) {
            const { default: draftStorage } = await import(
              "../utils/draftStorage.js"
            );
            draft = await draftStorage.getDraftById(activeDraftId);
            if (draft) {
              console.log('✅ Loaded draft from local IndexedDB');
            }
          }
          
          // 🆕 FALLBACK: If draft not found locally and storedConfig exists, use storedConfig
          // This handles the case where shared frame data is in frameConfig but not in draftStorage
          if (!draft && storedConfig && (storedConfig.isCustom || storedConfig.isShared)) {
            console.log('✅ Using storedConfig as fallback (shared/custom frame)');
            // Build draft-like object from storedConfig
            draft = {
              id: storedConfig.id,
              title: storedConfig.title,
              aspectRatio: storedConfig.aspectRatio,
              elements: storedConfig.elements,
              canvasBackground: storedConfig.canvasBackground,
              preview: storedConfig.preview
            };
          }

          if (draft) {
            console.log("✅ Draft loaded:", {
              id: draft.id,
              title: draft.title,
              hasElements: !!draft.elements,
              elementsCount: draft.elements?.length,
              isSharedFrame: isSharedFrame,
            });

            const { buildFrameConfigFromDraft } = await import(
              "../utils/draftHelpers.js"
            );
            const customFrameConfig = buildFrameConfigFromDraft(draft);

            console.log("✅ Custom frame built from draft:", {
              id: customFrameConfig.id,
              maxCaptures: customFrameConfig.maxCaptures,
              slotsCount: customFrameConfig.slots?.length,
              hasBackgroundPhoto: !!customFrameConfig.designer?.elements?.find(
                (el) => el.type === "background-photo"
              ),
            });

            // Set to frameProvider
            await frameProvider.setFrame(customFrameConfig.id, {
              config: customFrameConfig,
              isCustom: true,
            });

            // Set maxCaptures from custom frame (NOT from storedConfig!)
            setMaxCaptures(customFrameConfig.maxCaptures || 1);
            console.log(
              "✅ Set maxCaptures to:",
              customFrameConfig.maxCaptures || 1
            );

            updateSlotAspectRatio(customFrameConfig);
            persistLayerPlan(customFrameConfig);
          } else {
            console.error("❌ Draft not found:", activeDraftId);
            // Fallback to stored config
            if (storedConfig?.maxCaptures) {
              setMaxCaptures(storedConfig.maxCaptures);
            }
          }
        } catch (error) {
          console.error("❌ Failed to load draft:", error);
          // Fallback to stored config
          if (storedConfig?.maxCaptures) {
            setMaxCaptures(storedConfig.maxCaptures);
          }
        }
      })();
      return;
    }

    // Priority 2: Use stored config from localStorage (for regular frames)
    if (storedConfig?.id && storedConfig.isCustom) {
      console.log(
        "✅ Using stored custom frame config from localStorage:",
        storedConfig.id
      );

      // Set to frameProvider for consistency
      frameProvider
        .setFrame(storedConfig.id, { config: storedConfig, isCustom: true })
        .then(() => {
          const frameConfig = frameProvider.getCurrentConfig();
          if (frameConfig?.maxCaptures) {
            setMaxCaptures(frameConfig.maxCaptures);
          } else {
            setMaxCaptures(4);
          }
          updateSlotAspectRatio(frameConfig);
          persistLayerPlan(frameConfig);
        });
      return;
    }

    // Priority 2: Check if frame is already loaded in frameProvider memory
    const existingConfig = frameProvider.getCurrentConfig();
    console.log("🔍 Checking frameProvider memory:", {
      hasExistingConfig: !!existingConfig,
      existingFrameId: existingConfig?.id,
      isCustom: existingConfig?.id?.startsWith("custom-"),
    });

    if (existingConfig?.id) {
      // Frame already set (e.g., from Frames page), use it
      console.log(
        "✅ Using existing frame config from frameProvider:",
        existingConfig.id
      );
      if (existingConfig?.maxCaptures) {
        setMaxCaptures(existingConfig.maxCaptures);
      } else {
        setMaxCaptures(4);
      }
      updateSlotAspectRatio(existingConfig);
      persistLayerPlan(existingConfig);
    } else {
      // Priority 3: No frame anywhere, load from storage
      console.log("📁 No frame in memory, loading from storage...");
      frameProvider
        .loadFrameFromStorage()
        .catch((error) => {
          console.warn("⚠️ Failed to load frame from storage", error);
        })
        .finally(() => {
          const frameConfig = frameProvider.getCurrentConfig();
          if (frameConfig?.maxCaptures) {
            setMaxCaptures(frameConfig.maxCaptures);
          } else {
            setMaxCaptures(4);
          }
          updateSlotAspectRatio(frameConfig);
          persistLayerPlan(frameConfig);
        });
    }
  }, [clearCapturedMedia, persistLayerPlan, updateSlotAspectRatio]);

  // Force camera container re-render when slot aspect ratio changes
  useEffect(() => {
    if (slotAspectRatio !== null) {
      console.log(
        "🔄 Slot aspect ratio changed, container will update:",
        slotAspectRatio
      );
    }
  }, [slotAspectRatio]);

  useEffect(() => {
    if (!capturedPhotos.length) return;

    const storageSize = calculateStorageSize({
      photos: capturedPhotos,
      videos: capturedVideos,
    });
    const projectedSize = calculateProjectedStorageSize({
      photos: capturedPhotos,
      videos: capturedVideos,
    });
    console.log("💾 Storage size", {
      raw: storageSize,
      projected: projectedSize,
    });
  }, [capturedPhotos, capturedVideos]);

  useEffect(() => {
    const previousCount = previousCaptureCountRef.current;
    const currentCount = capturedPhotos.length;
    previousCaptureCountRef.current = currentCount;

    if (
      photosNeeded > 0 &&
      currentCount >= photosNeeded &&
      previousCount < photosNeeded &&
      currentCount > 0 &&
      previewSectionRef.current
    ) {
      const targetNode = previewSectionRef.current;
      const scrollOptions = {
        behavior: "smooth",
        block: isMobile ? "start" : "center",
      };

      const performScroll = () => {
        try {
          targetNode.scrollIntoView(scrollOptions);
        } catch (error) {
          try {
            targetNode.scrollIntoView({ behavior: "smooth" });
          } catch {
            targetNode.scrollIntoView();
          }
        }
      };

      if (
        typeof window !== "undefined" &&
        typeof window.requestAnimationFrame === "function"
      ) {
        window.requestAnimationFrame(performScroll);
      } else {
        performScroll();
      }
    }
  }, [capturedPhotos.length, isMobile, photosNeeded]);

  useEffect(() => {
    if (typeof window === "undefined" || !isMobile) return;

    const previous = previousCameraActiveRef.current;
    previousCameraActiveRef.current = cameraActive;

    if (!cameraActive || previous === true) return;

    const scrollToCapture = (behavior = "smooth") => {
      if (!captureSectionRef.current) return;
      const rect = captureSectionRef.current.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;
      const targetTop = absoluteTop - window.innerHeight / 2 + rect.height / 2;
      window.scrollTo({ top: Math.max(targetTop, 0), behavior });
    };

    let timeoutId = null;
    const frame = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => scrollToCapture("smooth"), 60);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [cameraActive, isMobile]);

  useEffect(() => {
    return () => {
      stopCamera();
      flushStorageWrite();
    };
  }, [flushStorageWrite, stopCamera]);

  useEffect(() => {
    return () => {
      replaceCurrentPhoto(null);
      replaceCurrentVideo(null);
    };
  }, [replaceCurrentPhoto, replaceCurrentVideo]);

  useEffect(() => {
    capturedPhotosRef.current = capturedPhotos;
  }, [capturedPhotos]);

  useEffect(() => {
    capturedVideosRef.current = capturedVideos;
  }, [capturedVideos]);

  // ✅ PRE-INITIALIZE MediaRecorder when camera is active and live mode is ON
  // This eliminates the 3-second delay when user clicks capture button!
  useEffect(() => {
    // Only pre-init when camera is active and live mode is enabled
    if (!cameraActive || !liveModeEnabled || capturing) {
      preInitializedRecorderRef.current = null;
      isRecorderReadyRef.current = false;
      return;
    }

    const stream = cameraStreamRef.current;
    if (!stream) {
      console.log("⚠️ No stream available for pre-init");
      return;
    }

    // Check if stream tracks are active
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack || videoTrack.readyState !== 'live') {
      console.log("⚠️ Video track not ready for pre-init");
      return;
    }

    const initRecorder = () => {
      try {
        // Get adaptive bitrate based on how many videos captured
        const videoIndex = capturedVideosRef.current?.filter(v => v).length || 0;
        const baseBitrate = 600000; // 600kbps base - lower for smoother performance
        const qualityFactors = [1.0, 0.9, 0.7, 0.5, 0.4, 0.35];
        const factor = qualityFactors[Math.min(videoIndex, qualityFactors.length - 1)];
        const bitrate = Math.round(baseBitrate * factor);

        // Find supported mime type
        const mimeTypes = ["video/webm;codecs=vp8", "video/webm", "video/mp4"];
        const mimeType = mimeTypes.find(t => {
          try { return MediaRecorder.isTypeSupported(t); } catch { return false; }
        }) || "";
        
        if (!mimeType) {
          console.warn("❌ No supported video mime type found");
          return;
        }

        // Create recorder with EXISTING stream (NO CLONE - saves memory and CPU!)
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: bitrate,
        });

        preInitializedRecorderRef.current = recorder;
        recordingChunksRef.current = [];
        isRecorderReadyRef.current = true;

        console.log(`✅ MediaRecorder PRE-INITIALIZED (instant start ready):`, {
          mimeType,
          bitrate: `${bitrate / 1000}kbps`,
          videoIndex: videoIndex + 1,
          quality: `${Math.round(factor * 100)}%`,
        });

      } catch (error) {
        console.error("❌ Pre-init failed:", error);
        isRecorderReadyRef.current = false;
      }
    };

    // Small delay to ensure stream is stable
    const timer = setTimeout(initRecorder, 300);
    
    return () => {
      clearTimeout(timer);
      // Don't cleanup recorder here - let it be reused
    };
  }, [cameraActive, liveModeEnabled, capturing, capturedVideos.length]);

  const shouldMirrorVideo = useMemo(
    () => !isUsingBackCamera, // Front camera should be mirrored (like a mirror), back camera should NOT be mirrored
    [isUsingBackCamera]
  );

  const displayMirror = useMemo(
    () => shouldMirrorVideo, // Always mirror based on camera type, not just in blur mode
    [shouldMirrorVideo]
  );

  // Sync background settings to refs
  useEffect(() => {
    filterModeRef.current = filterMode;
    backgroundModeRef.current = backgroundMode;
    backgroundColorRef.current = backgroundColor;
    backgroundImageRef.current = backgroundImage;

    // Preload image when backgroundImage changes
    if (backgroundImage && backgroundMode === "image") {
      const img = new Image();
      img.onload = () => {
        cachedImageRef.current = img;
        console.log("🖼️ Background image cached:", img.width, "x", img.height);
      };
      img.onerror = () => {
        console.error("❌ Failed to load background image");
        cachedImageRef.current = null;
      };
      img.src = backgroundImage;
    } else {
      cachedImageRef.current = null;
    }
  }, [filterMode, backgroundMode, backgroundColor, backgroundImage]);

  useEffect(() => {
    if (filterMode !== "blur") {
      setShowBackgroundPanel(false);
    }
  }, [filterMode]);

  // MediaPipe Background Replacement
  useEffect(() => {
    let isMounted = true;

    const cleanup = () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      if (segmentationRef.current) {
        try {
          segmentationRef.current.close();
        } catch (e) {}
        segmentationRef.current = null;
      }
      hasInitialSegmentationRef.current = false;
    };

    if (filterMode === "original") {
      cleanup();
      setBlurMode(null);
      setIsLoadingBlur(false);
      hasInitialSegmentationRef.current = false;
      return;
    }

    const initMediaPipe = async () => {
      if (typeof window === "undefined") {
        return;
      }

      if (!cameraActive || !videoRef.current) {
        console.log(
          "⚠️ Cannot init MediaPipe: cameraActive=",
          cameraActive,
          "videoRef=",
          !!videoRef.current
        );
        return;
      }

      console.log("🎬 Starting MediaPipe initialization...");
      hasInitialSegmentationRef.current = false;
      setIsLoadingBlur(true);

      const sources = [
        {
          script:
            "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/selfie_segmentation.js",
          assetBase:
            "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747",
        },
        {
          script:
            "https://unpkg.com/@mediapipe/selfie_segmentation@0.1.1675465747/selfie_segmentation.js",
          assetBase:
            "https://unpkg.com/@mediapipe/selfie_segmentation@0.1.1675465747",
        },
      ];

      const loadSelfieSegmentationFromSource = (source) => {
        return new Promise((resolve, reject) => {
          if (window.__SELFIE_SEG_CTOR) {
            return resolve(window.__SELFIE_SEG_CTOR);
          }

          const globalModule =
            window.SelfieSegmentation || window.selfieSegmentation;
          const ctorCandidate =
            globalModule?.SelfieSegmentation || globalModule;
          if (typeof ctorCandidate === "function") {
            window.__SELFIE_SEG_CTOR = ctorCandidate;
            window.__SELFIE_SEG_ASSET_BASE =
              window.__SELFIE_SEG_ASSET_BASE || source.assetBase;
            return resolve(ctorCandidate);
          }

          const existingScript = document.querySelector(
            'script[data-selfie-segmentation="true"]'
          );
          if (existingScript && existingScript.dataset.src === source.script) {
            existingScript.addEventListener(
              "load",
              () => {
                const readyModule =
                  window.SelfieSegmentation || window.selfieSegmentation;
                const ctor = readyModule?.SelfieSegmentation || readyModule;
                if (typeof ctor === "function") {
                  window.__SELFIE_SEG_CTOR = ctor;
                  window.__SELFIE_SEG_ASSET_BASE = source.assetBase;
                  resolve(ctor);
                } else {
                  reject(
                    new Error(
                      "SelfieSegmentation global not available after script load"
                    )
                  );
                }
              },
              { once: true }
            );
            existingScript.addEventListener(
              "error",
              () => {
                reject(new Error("SelfieSegmentation script failed to load"));
              },
              { once: true }
            );
            return;
          }

          const script = document.createElement("script");
          script.src = source.script;
          script.async = true;
          script.crossOrigin = "anonymous";
          script.dataset.selfieSegmentation = "true";
          script.dataset.src = source.script;
          script.onload = () => {
            const readyModule =
              window.SelfieSegmentation || window.selfieSegmentation;
            const ctor = readyModule?.SelfieSegmentation || readyModule;
            if (typeof ctor === "function") {
              window.__SELFIE_SEG_CTOR = ctor;
              window.__SELFIE_SEG_ASSET_BASE = source.assetBase;
              resolve(ctor);
            } else {
              reject(
                new Error(
                  "SelfieSegmentation global not available after script load"
                )
              );
            }
          };
          script.onerror = () =>
            reject(new Error("SelfieSegmentation script failed to load"));
          document.head.appendChild(script);
        });
      };

      for (let source of sources) {
        try {
          console.log("🔄 Loading MediaPipe from:", source.script);
          const SelfieSegmentationCtor = await Promise.race([
            loadSelfieSegmentationFromSource(source),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("CDN Timeout after 20s")),
                20000
              )
            ),
          ]);

          if (!isMounted) {
            console.log("⚠️ Component unmounted, aborting MediaPipe init");
            return;
          }

          if (typeof SelfieSegmentationCtor !== "function") {
            console.error(
              "❌ Failed to resolve SelfieSegmentation constructor from script source",
              source.script
            );
            continue;
          }

          console.log("✅ MediaPipe module loaded successfully");
          const seg = new SelfieSegmentationCtor({
            locateFile: (file) => {
              const base = window.__SELFIE_SEG_ASSET_BASE || source.assetBase;
              return `${base}/${file}`;
            },
          });

          seg.setOptions({ modelSelection: 1, selfieMode: false });
          console.log(
            "⚙️ MediaPipe options set (selfieMode: false for CSS mirror), attaching onResults..."
          );

          if (typeof seg.initialize === "function") {
            try {
              await seg.initialize();
              console.log("📦 MediaPipe initialized base models");
            } catch (initErr) {
              console.warn(
                "⚠️ MediaPipe initialize() warning:",
                initErr?.message || initErr
              );
            }
          }

          seg.onResults((results) => {
            if (!isMounted || !canvasRef.current) return;

            // Check filterMode from ref
            if (filterModeRef.current === "original") return;

            if (!hasInitialSegmentationRef.current) {
              hasInitialSegmentationRef.current = true;
              setBlurMode("mediapipe");
              setIsLoadingBlur(false);
              console.log("✨ MediaPipe background ready");
            }

            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            const mirrorOutput = false; // Preview mirroring handled via CSS transform

            const drawMirrored = (context, image, width, height) => {
              if (!image) return;
              if (mirrorOutput) {
                context.save();
                context.scale(-1, 1);
                context.drawImage(image, -width, 0, width, height);
                context.restore();
              } else {
                context.drawImage(image, 0, 0, width, height);
              }
            };

            if (!results.segmentationMask) {
              console.warn("⚠️ MediaPipe returned empty segmentation mask");
              if (!hasInitialSegmentationRef.current) {
                setIsLoadingBlur(false);
              }
              return;
            }

            if (canvas.width !== results.image.width) {
              canvas.width = results.image.width;
              canvas.height = results.image.height;
              console.log(
                "📐 Canvas resized:",
                canvas.width,
                "x",
                canvas.height
              );
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw background - use refs to get latest values
            const mode = backgroundModeRef.current;
            const color = backgroundColorRef.current;
            const cachedImage = cachedImageRef.current;

            if (mode === "blur") {
              ctx.save();
              ctx.filter = "blur(20px)";
              drawMirrored(ctx, results.image, canvas.width, canvas.height);
              ctx.restore();
            } else if (mode === "color") {
              ctx.fillStyle = color;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else if (mode === "image" && cachedImage) {
              drawMirrored(ctx, cachedImage, canvas.width, canvas.height);
            } else {
              // Fallback to blur if no background set
              ctx.save();
              ctx.filter = "blur(20px)";
              drawMirrored(ctx, results.image, canvas.width, canvas.height);
              ctx.restore();
            }

            // Draw person
            if (results.segmentationMask) {
              let maskCanvas = personMaskCanvasRef.current;
              if (!maskCanvas) {
                maskCanvas = document.createElement("canvas");
                personMaskCanvasRef.current = maskCanvas;
              }

              if (maskCanvas.width !== canvas.width) {
                maskCanvas.width = canvas.width;
                maskCanvas.height = canvas.height;
              }

              const maskCtx = maskCanvas.getContext("2d");
              maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
              drawMirrored(
                maskCtx,
                results.image,
                maskCanvas.width,
                maskCanvas.height
              );
              maskCtx.globalCompositeOperation = "destination-in";
              drawMirrored(
                maskCtx,
                results.segmentationMask,
                maskCanvas.width,
                maskCanvas.height
              );
              maskCtx.globalCompositeOperation = "source-over";
              ctx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
            }
          });

          segmentationRef.current = seg;

          const processFrame = async () => {
            if (!isMounted || !videoRef.current || !segmentationRef.current)
              return;
            if (filterModeRef.current === "original") return;

            try {
              await segmentationRef.current.send({ image: videoRef.current });
            } catch (e) {
              console.error("MediaPipe send error:", e);
            }

            if (isMounted && filterModeRef.current !== "original") {
              animationFrameRef.current = requestAnimationFrame(processFrame);
            }
          };

          console.log("✅ MediaPipe initialized, starting processFrame loop");
          processFrame();
          return;
        } catch (e) {
          console.warn("⚠️ CDN failed:", source.script, e.message);
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      // All CDNs failed
      console.error("❌ All MediaPipe CDNs failed");
      setIsLoadingBlur(false);
      setBlurMode(null);
    };

    if (filterMode === "blur" && cameraActive) {
      initMediaPipe();
    }

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [filterMode, cameraActive, displayMirror]);

  // photosNeeded is already defined earlier (near line 648)
  const hasReachedMaxPhotos = capturedPhotos.length >= photosNeeded;
  const isCaptureDisabled =
    capturing || isVideoProcessing || hasReachedMaxPhotos;

  const determineVideoBitrate = (recordSeconds) => {
    // Get current video count to reduce quality as more videos are captured
    const currentVideoCount = capturedVideosRef.current?.length || 0;
    
    // ✅ AGGRESSIVE MEMORY OPTIMIZATION for mobile
    // Use very low bitrates to keep video files small
    if (isMobileDevice()) {
      // Progressive quality reduction - MUCH more aggressive
      // Video 1: 100%, Video 2: 80%, Video 3: 60%, Video 4+: 40%
      const qualityMultiplier = 
        currentVideoCount === 0 ? 1.0 :
        currentVideoCount === 1 ? 0.8 :
        currentVideoCount === 2 ? 0.6 :
        0.4; // 40% bitrate for video 4, 5, 6
      
      // Base bitrate already reduced significantly
      let baseBitrate;
      if (recordSeconds <= 4) baseBitrate = 800_000;  // Reduced from 1.2M
      else if (recordSeconds <= 6) baseBitrate = 600_000; // Reduced from 1M
      else baseBitrate = 500_000; // Reduced
      
      const finalBitrate = Math.round(baseBitrate * qualityMultiplier);
      console.log(`🎬 Video ${currentVideoCount + 1} bitrate: ${(finalBitrate / 1000).toFixed(0)}kbps (${(qualityMultiplier * 100).toFixed(0)}% quality)`);
      return finalBitrate;
    }

    // Desktop: Keep original higher bitrates
    if (recordSeconds <= 4) return 2_500_000;
    if (recordSeconds <= 6) return 2_000_000;
    if (recordSeconds <= 8) return 1_500_000;
    return 1_200_000;
  };

  const createCapturedVideoEntry = (videoSource, videoIndex) => {
    if (!videoSource) return null;

    const id = videoSource.id || generateVideoEntryId();
    const blob = videoSource.blob instanceof Blob ? videoSource.blob : null;
    const mimeType = videoSource.mimeType || blob?.type || "video/webm";
    const hasDataUrl = videoSource.dataUrl && videoSource.dataUrl.length > 0;

    // ✅ MEMORY OPTIMIZATION: Store blob in memory manager, NOT in React state!
    // This prevents React from holding onto large blobs and causing memory issues
    let previewUrl = videoSource.previewUrl || null;
    
    if (blob && !hasDataUrl) {
      // Store blob externally and get preview URL
      previewUrl = storeVideoBlob(id, blob);
      console.log(`📹 Video blob stored externally: ${id.slice(-8)}`);
      
      // Log memory usage
      const memUsage = getMemoryUsage();
      console.log(`💾 Total video memory: ${memUsage.totalMB}MB (${memUsage.count} videos)`);
    }

    // Return lightweight entry - blob is stored in memory manager, NOT in state!
    return {
      id,
      blob: null, // ✅ NEVER store blob in React state - use memory manager instead!
      dataUrl: videoSource.dataUrl ?? null,
      previewUrl: previewUrl, // For preview display
      mimeType,
      duration: Number.isFinite(videoSource.duration)
        ? videoSource.duration
        : null,
      timer: Number.isFinite(videoSource.timer) ? videoSource.timer : null,
      mirrored: Boolean(
        videoSource.mirrored ?? videoSource.requiresPreviewMirror
      ),
      requiresPreviewMirror: Boolean(videoSource.requiresPreviewMirror),
      facingMode: videoSource.facingMode || null,
      sizeBytes: videoSource.sizeBytes ?? (blob ? blob.size : null),
      baseVideoIndex: videoSource.baseVideoIndex ?? videoIndex,
      recordedAt:
        videoSource.recordedAt ?? videoSource.capturedAt ?? Date.now(),
      isConverting: false,
      conversionError: false,
    };
  };

  const renderConfirmationModal = () => {
    if (!showConfirmation || !currentPhoto) return null;

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "18px",
            width: "min(420px, 100%)",
            maxHeight: "calc(100vh - 3rem)",
            padding: "1.75rem",
            boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 700,
                color: "#333",
              }}
            >
              📸 Foto berhasil diambil!
            </div>
            <img
              src={currentPhoto.previewUrl || currentPhoto.dataUrl || ""}
              alt="Captured"
              style={{
                width: "100%",
                maxHeight: "320px",
                borderRadius: "12px",
                objectFit: "contain",
                boxShadow: "0 12px 24px rgba(0,0,0,0.2)",
              }}
            />
            {isVideoProcessing && (
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: "#E8A889",
                }}
              >
                ⏳ Menyiapkan video, mohon tunggu sebentar...
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              onClick={handleChoosePhoto}
              disabled={isVideoProcessing}
              style={{
                flex: "1 1 120px",
                padding: "0.85rem 1.5rem",
                borderRadius: "999px",
                border: "none",
                background: isVideoProcessing ? "#6c757d" : "#28a745",
                color: "#fff",
                fontWeight: 600,
                cursor: isVideoProcessing ? "not-allowed" : "pointer",
                boxShadow: "0 16px 32px rgba(40,167,69,0.35)",
              }}
            >
              {isVideoProcessing ? "⏳ Sedang menyiapkan..." : "✓ Pilih"}
            </button>
            <button
              onClick={handleRetakePhoto}
              style={{
                flex: "1 1 120px",
                padding: "0.85rem 1.5rem",
                borderRadius: "999px",
                border: "none",
                background: "#6c757d",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 16px 32px rgba(108,117,125,0.35)",
              }}
            >
              🔄 Ulangi
            </button>
          </div>
        </div>
      </div>
    );
  };

  const startCamera = useCallback(async (desiredFacingMode = "user") => {
    try {
      setCameraError(null);
      setIsSwitchingCamera(true);

      // Use camera helper with better error handling
      const result = await requestCameraWithFallback({
        facingMode: desiredFacingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        keepStream: true
      });

      if (!result.granted) {
        throw new Error(result.message || "Tidak dapat mengakses kamera");
      }

      const stream = result.stream;
      if (!stream) {
        throw new Error("Gagal mendapatkan stream kamera");
      }

      cameraStreamRef.current = stream;
      setCameraActive(true);
      
      // Note: Mirror state is automatically computed from isUsingBackCamera via useMemo
      // No need to manually set it - shouldMirrorVideo = !isUsingBackCamera

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current
            .play()
            .then(() => {
              console.log("✅ Video playing");
            })
            .catch((error) => {
              console.error("❌ video play failed", error);
            });
        }
      }, 100);
    } catch (error) {
      console.error("❌ Error accessing camera", error);
      setCameraError(error.message);
      
      // Show user-friendly error message
      const errorMessage = error.message || "Pastikan izin kamera sudah diberikan di browser.";
      const isPermissionError = errorMessage.includes("izin") || errorMessage.includes("permission");
      
      showToast({
        type: "error",
        title: isPermissionError ? "Izin Kamera Diperlukan" : "Kamera Tidak Dapat Diakses",
        message: errorMessage,
        action: {
          label: "Coba Lagi",
          onClick: () => window.location.reload(),
        },
      });
    } finally {
      setIsSwitchingCamera(false);
    }
  }, []);

  const handleCameraToggle = useCallback(() => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera(isUsingBackCamera ? "environment" : "user");
    }
  }, [cameraActive, isUsingBackCamera, startCamera, stopCamera]);

  const handleSwitchCamera = useCallback(async () => {
    if (!cameraActive || isSwitchingCamera) return;

    const nextState = !isUsingBackCamera;
    stopCamera();
    setIsUsingBackCamera(nextState);
    await startCamera(nextState ? "environment" : "user");
  }, [
    cameraActive,
    isUsingBackCamera,
    isSwitchingCamera,
    startCamera,
    stopCamera,
  ]);

  const handleFileSelect = useCallback(
    async (event) => {
      const files = Array.from(event.target.files || []).filter((file) =>
        file.type.startsWith("image/")
      );
      if (!files.length) {
        event.target.value = "";
        return;
      }

      try {
        const preparedEntries = await Promise.all(
          files.map(async (file) => {
            try {
              const previewUrl = URL.createObjectURL(file);
              return {
                id: generatePhotoEntryId(),
                blob: file,
                dataUrl: null,
                previewUrl,
                width: null,
                height: null,
                capturedAt: Date.now(),
                sizeBytes: typeof file.size === "number" ? file.size : null,
                source: "upload",
              };
            } catch (previewError) {
              console.warn(
                "⚠️ Failed to prepare uploaded photo preview",
                previewError
              );
              return null;
            }
          })
        );

        const validEntries = preparedEntries.filter(Boolean);
        if (!validEntries.length) {
          showToast({
            type: "warning",
            title: "Foto Tidak Valid",
            message:
              "Tidak ada foto yang bisa diproses dari galeri. Pilih foto yang valid.",
          });
          return;
        }

        const availableSlots = Math.max(0, photosNeeded - capturedPhotos.length);
        const acceptedEntries = availableSlots
          ? validEntries.slice(0, availableSlots)
          : [];
        const discardedEntries = availableSlots
          ? validEntries.slice(availableSlots)
          : validEntries;
        discardedEntries.forEach((entry) => cleanupCapturedPhotoPreview(entry));

        if (!acceptedEntries.length) {
          showToast({
            type: "warning",
            title: "Batas Maksimal Tercapai",
            message: `Maksimal ${photosNeeded} foto untuk frame ini sudah tercapai.`,
            action: {
              label: "Hapus Foto",
              onClick: () => setCapturedPhotos([]),
            },
          });
          return;
        }

        const mergedPhotos = [...capturedPhotos, ...acceptedEntries];
        const mergedVideos = (() => {
          const base = [...capturedVideos];
          while (base.length < mergedPhotos.length) {
            base.push(null);
          }
          return base.slice(0, mergedPhotos.length);
        })();

        setCapturedPhotos(mergedPhotos);
        setCapturedVideos(mergedVideos);
        scheduleStorageWrite(mergedPhotos, mergedVideos);
        showToast({
          type: "success",
          title: "Foto Ditambahkan",
          message: `${acceptedEntries.length} foto berhasil ditambahkan.`,
        });
      } catch (error) {
        console.error("❌ Failed to process uploaded photos", error);
        showToast({
          type: "error",
          title: "Upload Gagal",
          message: "Gagal memproses foto dari galeri. Coba pilih file lain.",
        });
      } finally {
        event.target.value = "";
      }
    },
    [
      capturedPhotos,
      capturedVideos,
      cleanupCapturedPhotoPreview,
      maxCaptures,
      photosNeeded,
      scheduleStorageWrite,
    ]
  );

  const renderCountdownOverlay = () => {
    if (!countdown) return null;
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "20px",
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontSize: "4rem",
            fontWeight: "bold",
            color: "white",
            textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
          }}
        >
          {countdown}
        </span>
      </div>
    );
  };

  const startVideoRecording = useCallback(
    (timerSeconds) => {
      const baseStream = cameraStreamRef.current || videoRef.current?.srcObject;
      if (!baseStream) {
        console.warn("⚠️ No camera stream available for video recording");
        return null;
      }

      const { record: recordSeconds } = TIMER_VIDEO_DURATION_MAP[
        timerSeconds
      ] || { record: timerSeconds + 1 };
      const desiredStopSeconds = timerSeconds + POST_CAPTURE_BUFFER_SECONDS;
      const delayBeforeStartSeconds = Math.max(
        0,
        desiredStopSeconds - recordSeconds
      );

      // ✅ OPTIMIZATION: Use pre-initialized recorder if available (INSTANT START!)
      let recorder = null;
      let recordingStream = null;
      let stopRecordingStream = () => {};
      let usePreInitialized = false;

      if (preInitializedRecorderRef.current && isRecorderReadyRef.current) {
        console.log("✅ Using PRE-INITIALIZED recorder - INSTANT START!");
        recorder = preInitializedRecorderRef.current;
        recordingStream = baseStream; // Use original stream, no clone needed
        usePreInitialized = true;
        
        // Clear pre-initialized refs (will be re-initialized after recording)
        preInitializedRecorderRef.current = null;
        isRecorderReadyRef.current = false;
        
        // No need to stop stream since we're using the original
        stopRecordingStream = () => {
          console.log("🛑 Recording stream cleanup (using original stream)");
        };
      } else {
        // Fallback: Create new recorder (slower path)
        console.log("⚠️ No pre-initialized recorder, creating new one...");
        recordingStream = baseStream.clone();

        // ✅ MEMORY OPTIMIZATION: Reduce video track resolution for mobile
        if (isMobileDevice()) {
          const videoTrack = recordingStream.getVideoTracks()[0];
          if (videoTrack) {
            const currentVideoCount = capturedVideosRef.current?.length || 0;
            const targetWidth = currentVideoCount >= 2 ? 480 : 640;
            const targetHeight = currentVideoCount >= 2 ? 360 : 480;
            
            try {
              videoTrack.applyConstraints({
                width: { ideal: targetWidth },
                height: { ideal: targetHeight },
              });
              console.log(`📐 Video ${currentVideoCount + 1} resolution: ${targetWidth}x${targetHeight}`);
            } catch (constraintErr) {
              console.warn("⚠️ Could not apply resolution constraints:", constraintErr);
            }
          }
        }

        stopRecordingStream = () => {
          recordingStream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch (stopError) {
              console.warn("⚠️ Failed to stop recording track", stopError);
            }
          });
        };

        const mimeCandidates = [
          "video/webm;codecs=vp9",
          "video/webm;codecs=vp8",
          "video/webm",
          "video/mp4;codecs=h264",
        ];

        const supportedMimeType =
          mimeCandidates.find((candidate) => {
            try {
              return candidate && MediaRecorder.isTypeSupported(candidate);
            } catch {
              return false;
            }
          }) || "";

        const tunedBitrate = determineVideoBitrate(recordSeconds);
        const hasAudioTrack = recordingStream.getAudioTracks().length > 0;

        try {
          const options = supportedMimeType
            ? {
                mimeType: supportedMimeType,
                videoBitsPerSecond: tunedBitrate,
                ...(hasAudioTrack ? { audioBitsPerSecond: 64_000 } : {}),
              }
            : {
                videoBitsPerSecond: tunedBitrate,
                ...(hasAudioTrack ? { audioBitsPerSecond: 64_000 } : {}),
              };
          recorder = new MediaRecorder(recordingStream, options);
        } catch (error) {
          console.warn("⚠️ Failed to create tuned MediaRecorder", error);
          try {
            recorder = supportedMimeType
              ? new MediaRecorder(recordingStream, {
                  mimeType: supportedMimeType,
                })
              : new MediaRecorder(recordingStream);
          } catch (fallbackError) {
            console.error("❌ Failed to create MediaRecorder", fallbackError);
            stopRecordingStream();
            return null;
          }
        }
      }

      const chunks = [];
      let startTimeout;
      let stopTimeout;
      let hasRecordingStarted = false;
      let hasRecordingStopped = false;

      let rejectPromise;
      const controller = {
        stop: () => {
          if (stopTimeout) {
            clearTimeout(stopTimeout);
            stopTimeout = null;
          }
          if (startTimeout) {
            clearTimeout(startTimeout);
            startTimeout = null;
          }

          if (!hasRecordingStarted) {
            hasRecordingStopped = true;
            stopRecordingStream();
            rejectPromise?.(new Error("Recording cancelled before start"));
            return;
          }

          hasRecordingStopped = true;
          if (recorder.state !== "inactive") {
            try {
              recorder.stop();
            } catch (error) {
              console.warn("⚠️ Error stopping recorder", error);
            }
          }
        },
        promise: null,
      };

      controller.promise = new Promise((resolve, reject) => {
        rejectPromise = reject;
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
            // Only log first and last chunks to avoid console spam
            if (chunks.length === 1 || chunks.length % 10 === 0) {
              console.log(
                `📹 Received video chunk: ${(event.data.size / 1024).toFixed(
                  2
                )}KB (total: ${chunks.length} chunks)`
              );
            }
          } else {
            console.warn("⚠️ Received empty video chunk");
          }
        };

        recorder.onerror = (event) => {
          console.error("❌ MediaRecorder error", event.error || event);
          controller.stop();
          stopRecordingStream();
          reject(event.error || new Error("MediaRecorder error"));
        };

        recorder.onstop = async () => {
          hasRecordingStopped = true;
          let previewUrl;
          try {
            const blob = new Blob(chunks, {
              type: recorder.mimeType || supportedMimeType || "video/webm",
            });

            // Validate blob size
            if (blob.size < 100) {
              console.error(
                "❌ Recorded video blob is too small:",
                blob.size,
                "bytes"
              );
              throw new Error(
                `Invalid video blob: size is only ${blob.size} bytes`
              );
            }

            console.log("✅ Video blob created:", {
              size: (blob.size / 1024).toFixed(2) + "KB",
              type: blob.type,
              chunkCount: chunks.length,
              recordDuration: recordSeconds + "s",
            });

            previewUrl = URL.createObjectURL(blob);

            // Try to validate video duration, but don't block if it fails
            // Some browsers may not be able to determine duration immediately
            const validationResult = await new Promise((validateResolve) => {
              const tempVideo = document.createElement("video");
              tempVideo.preload = "metadata";
              tempVideo.muted = true;
              let validated = false;

              const cleanup = () => {
                if (validated) return;
                validated = true;
                tempVideo.onloadedmetadata = null;
                tempVideo.onloadeddata = null;
                tempVideo.onerror = null;
                tempVideo.src = "";
              };

              tempVideo.onloadedmetadata = () => {
                const actualDuration = tempVideo.duration;
                if (Number.isFinite(actualDuration) && actualDuration > 0) {
                  cleanup();
                  console.log("✅ Video duration validated:", {
                    actualDuration: actualDuration.toFixed(2) + "s",
                    expectedDuration: recordSeconds + "s",
                  });
                  validateResolve({
                    isValid: true,
                    actualDuration,
                  });
                }
              };

              tempVideo.onloadeddata = () => {
                const actualDuration = tempVideo.duration;
                if (Number.isFinite(actualDuration) && actualDuration > 0) {
                  cleanup();
                  console.log("✅ Video duration validated (onloadeddata):", {
                    actualDuration: actualDuration.toFixed(2) + "s",
                  });
                  validateResolve({
                    isValid: true,
                    actualDuration,
                  });
                }
              };

              tempVideo.onerror = (e) => {
                cleanup();
                console.warn("⚠️ Video validation error (non-critical):", e);
                // Don't fail - just use estimated duration
                validateResolve({
                  isValid: true,
                  actualDuration: recordSeconds,
                });
              };

              // Timeout after 2 seconds - use estimated duration as fallback
              setTimeout(() => {
                cleanup();
                console.warn(
                  "⚠️ Video validation timeout - using estimated duration"
                );
                validateResolve({
                  isValid: true,
                  actualDuration: recordSeconds,
                });
              }, 2000);

              tempVideo.src = previewUrl;
            });

            console.log("📹 Video recording complete:", {
              blobSize: (blob.size / 1024).toFixed(2) + "KB",
              duration:
                (validationResult.actualDuration || recordSeconds).toFixed(2) +
                "s",
              validated:
                validationResult.isValid &&
                Number.isFinite(validationResult.actualDuration),
            });

            // ✅ OPTIMIZED: Skip dataUrl conversion during recording
            // dataUrl will be created lazily when needed (handleChoosePhoto)
            // This reduces memory pressure during rapid video captures
            console.log("✅ Video blob ready (dataUrl will be created lazily)");

            resolve({
              blob,
              dataUrl: null, // Will be converted lazily when needed
              previewUrl,
              mimeType:
                blob.type ||
                recorder.mimeType ||
                supportedMimeType ||
                "video/webm",
              duration: Number.isFinite(validationResult.actualDuration)
                ? validationResult.actualDuration
                : recordSeconds,
              timer: timerSeconds,
              actualDelay: delayBeforeStartSeconds,
              facingMode: shouldMirrorVideo ? "user" : "environment",
              requiresPreviewMirror: shouldMirrorVideo,
              skipAutoMirror: shouldMirrorVideo,
              mirrored: false,
              sizeBytes: blob.size,
            });
          } catch (error) {
            if (previewUrl) {
              revokeObjectURL(previewUrl);
            }
            reject(error);
          } finally {
            stopRecordingStream();
          }
        };
      });

      const startRecording = () => {
        if (hasRecordingStarted || hasRecordingStopped) return;
        hasRecordingStarted = true;
        try {
          // Use timeslice of 100ms for more frequent data chunks
          recorder.start(100);
          console.log(
            `🎬 Recording started: ${recordSeconds}s duration planned`
          );

          const totalRecordDurationMs = Math.max(
            750,
            Math.round(recordSeconds * 1000 + 500)
          );
          stopTimeout = setTimeout(() => {
            if (recorder.state !== "inactive") {
              console.log(
                `🎬 Recording stopping after ${totalRecordDurationMs}ms`
              );

              // Check if we received any chunks
              if (chunks.length === 0) {
                console.error("❌ No video chunks received during recording!");
              }

              recorder.stop();
            }
          }, totalRecordDurationMs);
        } catch (error) {
          console.error("❌ Failed to start MediaRecorder", error);
          stopRecordingStream();
          hasRecordingStopped = true;
          rejectPromise?.(error);
        }
      };

      if (delayBeforeStartSeconds > 0) {
        startTimeout = setTimeout(
          startRecording,
          delayBeforeStartSeconds * 1000
        );
      } else {
        startRecording();
      }

      controller.promise.finally(() => {
        if (activeRecordingRef.current === controller) {
          activeRecordingRef.current = null;
        }
      });

      activeRecordingRef.current = controller;
      return controller;
    },
    [shouldMirrorVideo]
  );

  const capturePhoto = useCallback(async () => {
    // Use canvas when MediaPipe is active, otherwise use video
    const sourceElement =
      blurMode === "mediapipe" && canvasRef.current
        ? canvasRef.current
        : videoRef.current;

    if (!sourceElement) {
      throw new Error("Video element is not ready for capture");
    }

    const video = videoRef.current;
    const width = video?.videoWidth || 1280;
    const height = video?.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to access 2D context for capture canvas");
    }

    const mirrorForCapture = filterMode === "blur" ? true : shouldMirrorVideo;

    if (mirrorForCapture) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(sourceElement, -width, 0, width, height);
      ctx.restore();
    } else {
      ctx.drawImage(sourceElement, 0, 0, width, height);
    }

    // Use lower quality for mobile to reduce memory usage
    const quality = isMobileDevice() ? 0.75 : 0.9;
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    const previewUrl = URL.createObjectURL(blob);

    // Convert blob to dataUrl for localStorage storage
    console.log("🔄 Converting photo blob to dataUrl...");
    const reader = new FileReader();
    const dataUrl = await new Promise((resolve, reject) => {
      reader.onloadend = () => {
        const result = reader.result;
        console.log("✅ Photo dataUrl created:", {
          length: result?.length || 0,
          preview: result?.substring(0, 50) || "none",
        });
        resolve(result);
      };
      reader.onerror = () => {
        console.warn("⚠️ Failed to convert photo blob to dataUrl");
        reject(new Error("FileReader error"));
      };
      reader.readAsDataURL(blob);
    });

    const payload = {
      blob,
      dataUrl, // Add dataUrl for storage
      previewUrl,
      width,
      height,
      capturedAt: Date.now(),
    };

    replaceCurrentPhoto(payload);
    setShowConfirmation(true);
    
    // Track funnel event for photo taken
    trackFunnelEvent("photo_taken");
    
    return payload;
  }, [replaceCurrentPhoto, shouldMirrorVideo, blurMode, filterMode]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || capturing || isVideoProcessing) return;
    if (!cameraActive) {
      showToast({
        type: "warning",
        title: "Kamera Belum Aktif",
        message: "Aktifkan kamera terlebih dahulu sebelum mengambil foto.",
      });
      return;
    }
    if (hasReachedMaxPhotos) {
      showToast({
        type: "warning",
        title: "Batas Maksimal",
        message: `Maksimal ${photosNeeded} foto sudah tercapai untuk frame ini!`,
        action: {
          label: "Reset",
          onClick: () => setCapturedPhotos([]),
        },
      });
      return;
    }

    const effectiveTimer = TIMER_OPTIONS.includes(timer)
      ? timer
      : TIMER_OPTIONS[0];
    if (effectiveTimer !== timer) setTimer(effectiveTimer);

    if (activeRecordingRef.current) {
      console.warn("⚠️ A recording is already in progress");
      return;
    }

    // ✅ Memory check for mobile devices before recording
    const currentVideoCount = capturedVideosRef.current?.length || 0;
    if (isMobileDevice() && currentVideoCount >= 4) {
      // Log memory warning for video 5+
      console.log(`⚠️ Recording video ${currentVideoCount + 1} - memory optimization active`);
      
      // Try to trigger garbage collection by clearing old references
      if (typeof window !== 'undefined' && window.gc) {
        try { window.gc(); } catch (e) { /* ignore */ }
      }
    }

    // Wrap in try-catch to prevent crashes
    try {
      setCapturing(true);
      replaceCurrentVideo(null);

      // Only record video if Live Mode is enabled
      if (liveModeEnabled) {
        setIsVideoProcessing(true);

        const recordingController = startVideoRecording(effectiveTimer);
        if (recordingController) {
          recordingController.promise
            .then((videoData) => {
              replaceCurrentVideo(videoData);
            })
            .catch((error) => {
              console.error("❌ Failed to record video", error);
              showToast({
                type: "error",
                title: "Perekaman Gagal",
                message: "Perekaman video gagal. Silakan coba lagi.",
                action: {
                  label: "Coba Lagi",
                  onClick: handleCapture,
                },
              });
            })
            .finally(() => {
              setIsVideoProcessing(false);
            });
        } else {
          setIsVideoProcessing(false);
        }
      } else {
        // Live Mode OFF: No video recording, just photo
        console.log("📸 Live Mode OFF - Skipping video recording");
        setIsVideoProcessing(false);
      }
    } catch (error) {
      console.error("❌ Capture error:", error);
      showToast({
        type: "error",
        title: "Kesalahan Capture",
        message: "Terjadi kesalahan saat mengambil foto. Silakan coba lagi.",
      });
      setCapturing(false);
      setIsVideoProcessing(false);
    }

    setCountdown(effectiveTimer);
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) {
          return null;
        }
        if (prev === 1) {
          clearInterval(countdownInterval);
          (async () => {
            try {
              await capturePhoto();
            } catch (error) {
              console.error("❌ Failed to capture photo", error);
              showToast({
                type: "error",
                title: "Capture Gagal",
                message: "Gagal mengambil foto. Silakan coba lagi.",
              });
            } finally {
              setCapturing(false);
            }
          })();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [
    capturing,
    capturePhoto,
    cameraActive,
    hasReachedMaxPhotos,
    maxCaptures,
    startVideoRecording,
    timer,
    isVideoProcessing,
    replaceCurrentVideo,
    liveModeEnabled,
  ]);

  useEffect(() => {
    if (!cameraActive) return;

    const handleKeyDown = (event) => {
      if (event.repeat) return;
      if (event.code !== "Space" && event.key !== " ") return;

      const target = event.target;
      const tagName = target?.tagName;
      if (tagName && ["INPUT", "TEXTAREA", "SELECT"].includes(tagName)) return;
      if (target?.isContentEditable) return;

      event.preventDefault();
      handleCapture();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cameraActive, handleCapture]);

  const handleChoosePhoto = useCallback(async () => {
    if (!currentPhoto) return;

    if (isVideoProcessing) {
      showToast({
        type: "info",
        title: "Tunggu Sebentar",
        message: "Video masih diproses. Mohon tunggu beberapa detik lagi.",
      });
      return;
    }

    // Only check for video if Live Mode is enabled
    if (
      liveModeEnabled &&
      !currentVideo?.dataUrl &&
      !(currentVideo?.blob instanceof Blob)
    ) {
      showToast({
        type: "warning",
        title: "Video Tidak Ditemukan",
        message: "Silakan tunggu hingga proses selesai atau ambil ulang.",
        action: {
          label: "Ambil Ulang",
          onClick: () => {
            setShowConfirmation(false);
            replaceCurrentPhoto(null);
            replaceCurrentVideo(null);
          },
        },
      });
      return;
    }

    // Store current photo/video refs before clearing
    const photoToSave = currentPhoto;
    const videoToSave = currentVideo;

    // ✅ IMMEDIATELY hide modal with flushSync for instant update
    flushSync(() => {
      setShowConfirmation(false);
      replaceCurrentPhoto(null);
      replaceCurrentVideo(null);
    });

    let willReachMax = false;
    let saveSucceeded = false;

    try {
      // Log memory info for mobile debugging
      if (isMobileDevice() && performance.memory) {
        console.log("📊 Memory before save:", {
          used: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(
            2
          )}MB`,
          total: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(
            2
          )}MB`,
          limit: `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(
            2
          )}MB`,
          photoCount: capturedPhotos.length + 1,
        });
      }

      if (!photoToSave.blob) {
        throw new Error("Current photo blob is missing");
      }

      const previewUrl = URL.createObjectURL(photoToSave.blob);
      let resolvedPhotoDataUrl = photoToSave.dataUrl;
      if (!resolvedPhotoDataUrl && photoToSave.blob instanceof Blob) {
        try {
          resolvedPhotoDataUrl = await blobToDataURL(photoToSave.blob);
          console.log("📸 Photo dataUrl generated during save", {
            length: resolvedPhotoDataUrl?.length || 0,
          });
        } catch (photoConversionError) {
          console.warn(
            "⚠️ Failed to convert photo blob to dataUrl during save",
            photoConversionError
          );
        }
      }

      const photoEntry = {
        id: generatePhotoEntryId(),
        blob: photoToSave.blob,
        dataUrl:
          typeof resolvedPhotoDataUrl === "string" &&
          resolvedPhotoDataUrl.startsWith("data:")
            ? resolvedPhotoDataUrl
            : null,
        previewUrl,
        width: photoToSave.width ?? null,
        height: photoToSave.height ?? null,
        capturedAt: photoToSave.capturedAt ?? Date.now(),
        sizeBytes:
          typeof photoToSave.blob.size === "number"
            ? photoToSave.blob.size
            : null,
        source: "camera",
      };

      if (!photoEntry.dataUrl) {
        console.warn(
          "⚠️ Photo entry missing dataUrl; fallback to preview URL only"
        );
      }

      const basePhotos = Array.isArray(capturedPhotosRef.current)
        ? [...capturedPhotosRef.current]
        : [];
      const baseVideos = Array.isArray(capturedVideosRef.current)
        ? [...capturedVideosRef.current]
        : [];

      const appendedPhotos = [...basePhotos, photoEntry];
      
      // DEBUG: Log maxCaptures to verify it's correct before trimming
      console.log("📷 [CAPTURE DEBUG] Photo capture state:", {
        maxCaptures,
        basePhotosCount: basePhotos.length,
        appendedPhotosCount: appendedPhotos.length,
        isDuplicateMode,
        photosNeeded,
      });
      
      const trimmedPhotos = appendedPhotos.slice(0, maxCaptures);
      const overflowPhotos = appendedPhotos.slice(maxCaptures);
      overflowPhotos.forEach((entry) => cleanupCapturedPhotoPreview(entry));

      const insertedIndex = trimmedPhotos.findIndex(
        (entry) => entry?.id === photoEntry.id
      );

      let preparedVideoEntry = null;

      // Only process video if Live Mode is enabled
      if (liveModeEnabled && (videoToSave?.blob || videoToSave?.dataUrl)) {
        let videoSource = videoToSave;
        if (!videoToSave.dataUrl && videoToSave.blob instanceof Blob) {
          try {
            const dataUrl = await blobToDataURL(videoToSave.blob);
            videoSource = {
              ...videoToSave,
              dataUrl,
            };
            console.log("🎥 Video dataUrl generated from blob", {
              length: dataUrl?.length || 0,
            });
            
            // ✅ MEMORY OPTIMIZATION: Revoke blob URL and clear blob after conversion
            if (videoToSave.previewUrl && isBlobUrl(videoToSave.previewUrl)) {
              revokeObjectURL(videoToSave.previewUrl);
              console.log("🧹 Revoked video blob URL after conversion");
            }
          } catch (videoConversionError) {
            console.error(
              "❌ Failed to convert recorded video blob to dataUrl",
              videoConversionError
            );
            showToast({
              type: "error",
              title: "Video Gagal Diproses",
              message:
                "Silakan tunggu beberapa detik lalu pilih lagi atau ambil ulang.",
              action: {
                label: "Ambil Ulang",
                onClick: handleCapture,
              },
            });
            return;
          }
        }

        if (!videoSource?.dataUrl) {
          console.warn("⚠️ Video source has no dataUrl even after conversion");
        }

        const targetIndex =
          insertedIndex === -1 ? trimmedPhotos.length - 1 : insertedIndex;
        preparedVideoEntry = createCapturedVideoEntry(
          videoSource,
          Math.max(0, targetIndex)
        );
      } else if (!liveModeEnabled) {
        console.log("📸 Live Mode OFF - No video to save");
      }

      if (!preparedVideoEntry && liveModeEnabled) {
        console.warn(
          "⚠️ No video entry prepared; captured video may be missing"
        );
      }

      const videosWorking = [...baseVideos];
      if (insertedIndex !== -1) {
        videosWorking.splice(insertedIndex, 0, preparedVideoEntry ?? null);
      } else {
        videosWorking.push(preparedVideoEntry ?? null);
      }
      while (videosWorking.length < trimmedPhotos.length) {
        videosWorking.push(null);
      }
      const trimmedVideos = videosWorking.slice(0, trimmedPhotos.length);

      capturedPhotosRef.current = trimmedPhotos;
      capturedVideosRef.current = trimmedVideos;
      setCapturedPhotos(trimmedPhotos);
      setCapturedVideos(trimmedVideos);
      
      // Check if this is the last photo - if so, save IMMEDIATELY
      willReachMax = trimmedPhotos.length >= photosNeeded;
      
      if (willReachMax) {
        console.log("🔥 [FINAL PHOTO] Force immediate storage write!");
        // Save with immediate flag to bypass requestIdleCallback
        scheduleStorageWrite(trimmedPhotos, trimmedVideos, { immediate: true });
        
        // Also do a direct backup save
        try {
          const backupPhotos = trimmedPhotos.map(p => {
            if (typeof p === 'string' && p.startsWith('data:')) return p;
            if (p?.dataUrl && p.dataUrl.startsWith('data:')) return p.dataUrl;
            return null;
          }).filter(Boolean);
          
          if (backupPhotos.length > 0) {
            localStorage.setItem('capturedPhotos', JSON.stringify(backupPhotos));
            window.__fremio_photos = backupPhotos;
            console.log("✅ [FINAL PHOTO] Direct backup saved:", backupPhotos.length, "photos");
          }
        } catch (backupErr) {
          console.warn("⚠️ Direct backup failed:", backupErr.message);
        }
      } else {
        scheduleStorageWrite(trimmedPhotos, trimmedVideos);
      }

      saveSucceeded = true;

      // ✅ AGGRESSIVE MEMORY CLEANUP for mobile devices
      if (isMobileDevice()) {
        console.log(
          `🧹 Mobile memory cleanup after photo ${trimmedPhotos.length}/${maxCaptures}`
        );
        
        // Clean up old video blobs that are no longer needed (we have dataUrl)
        trimmedVideos.forEach((video, idx) => {
          if (video?.blob && video?.dataUrl) {
            console.log(`   🗑️ Clearing blob for video ${idx} (dataUrl exists)`);
            video.blob = null;
          }
          if (video?.previewUrl && isBlobUrl(video.previewUrl)) {
            revokeObjectURL(video.previewUrl);
            video.previewUrl = null;
          }
        });
        
        // Force garbage collection hint
        setTimeout(() => {
          if (window.gc) {
            window.gc();
            console.log("✅ Manual GC triggered");
          }
        }, 100);
      }
    } catch (error) {
      console.error("❌ Error processing captured media", error);
      showToast({
        type: "error",
        title: "Proses Gagal",
        message: "Gagal memproses foto. Silakan coba lagi.",
        action: {
          label: "Coba Lagi",
          onClick: handleChoosePhoto,
        },
      });
      // Restore state on error so user can retry
      replaceCurrentPhoto(photoToSave);
      replaceCurrentVideo(videoToSave);
      setShowConfirmation(true);
      return;
    } finally {
      if (saveSucceeded) {
        setIsVideoProcessing(false);

        if (cameraActive && willReachMax) {
          stopCamera();
        }
      } else {
        setIsVideoProcessing(false);
      }
    }
  }, [
    cameraActive,
    capturedPhotosRef,
    capturedVideosRef,
    currentPhoto,
    currentVideo,
    isVideoProcessing,
    createCapturedVideoEntry,
    maxCaptures,
    replaceCurrentPhoto,
    replaceCurrentVideo,
    cleanupCapturedPhotoPreview,
    scheduleStorageWrite,
    stopCamera,
    liveModeEnabled,
  ]);

  const handleRetakePhoto = useCallback(() => {
    replaceCurrentPhoto(null);
    replaceCurrentVideo(null);
    setIsVideoProcessing(false);
    setShowConfirmation(false);
  }, [replaceCurrentPhoto, replaceCurrentVideo]);

  const handleSaveAsDraft = useCallback(async () => {
    try {
      const { default: draftStorage } = await import(
        "../utils/draftStorage.js"
      );

      // Get current frame config
      const frameConfig = frameProvider.getCurrentConfig();
      if (!frameConfig) {
        showToast({
          type: "error",
          title: "Gagal Menyimpan",
          message: "Frame tidak ditemukan.",
        });
        return;
      }

      const draftData = {
        frameConfig: frameConfig,
        capturedPhotos: [...capturedPhotos],
        capturedVideos: [...capturedVideos],
        title: `Draft ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await draftStorage.saveDraft(draftData);

      showToast({
        type: "success",
        title: "Draft Tersimpan",
        message: "Draft berhasil disimpan! Bisa dilanjutkan nanti.",
      });

      setShowConfirmation(false);
      replaceCurrentPhoto(null);
      replaceCurrentVideo(null);
    } catch (error) {
      console.error("Failed to save draft:", error);
      showToast({
        type: "error",
        title: "Gagal Menyimpan",
        message: "Terjadi kesalahan saat menyimpan draft.",
      });
    }
  }, [
    capturedPhotos,
    capturedVideos,
    showToast,
    replaceCurrentPhoto,
    replaceCurrentVideo,
  ]);

  const handleDeletePhoto = useCallback(
    (indexToDelete) => {
      const removedPhoto = capturedPhotos[indexToDelete];
      cleanupCapturedPhotoPreview(removedPhoto);

      const newPhotos = capturedPhotos.filter(
        (_, index) => index !== indexToDelete
      );
      const trimmedVideos = capturedVideos.filter(
        (_, index) => index !== indexToDelete
      );
      const reindexedVideos = trimmedVideos.map((entry, idx) => {
        if (!entry) return null;
        return {
          ...entry,
          baseVideoIndex: entry.baseVideoIndex ?? idx,
        };
      });

      setCapturedPhotos(newPhotos);
      setCapturedVideos(reindexedVideos);
      scheduleStorageWrite(newPhotos, reindexedVideos);
    },
    [
      capturedPhotos,
      capturedVideos,
      cleanupCapturedPhotoPreview,
      scheduleStorageWrite,
    ]
  );

  const handleEdit = useCallback(async () => {
    console.log("🚀 [handleEdit] START");
    console.log("📊 [handleEdit] capturedPhotos.length:", capturedPhotos.length);
    console.log("📊 [handleEdit] maxCaptures:", maxCaptures);
    
    // DETAILED DEBUG: Show what's in each photo
    console.log("🔬 [DEBUG] Detailed capturedPhotos analysis:");
    capturedPhotos.forEach((p, i) => {
      console.log(`   Photo ${i}:`, {
        type: typeof p,
        isString: typeof p === 'string',
        hasDataUrl: !!p?.dataUrl,
        dataUrlPreview: p?.dataUrl?.substring?.(0, 60),
        hasPreviewUrl: !!p?.previewUrl,
        previewUrlPreview: p?.previewUrl?.substring?.(0, 60),
        hasBlob: !!p?.blob,
        blobType: p?.blob?.type,
        blobSize: p?.blob?.size,
      });
    });
    
    if (capturedPhotos.length < photosNeeded) {
      console.log("❌ [handleEdit] EARLY RETURN - photos not complete");
      showToast({
        type: "warning",
        title: "Foto Belum Lengkap",
        message: `Ambil ${photosNeeded - capturedPhotos.length} foto lagi (${
          capturedPhotos.length
        }/${photosNeeded}).`,
      });
      return;
    }

    console.log("✅ [handleEdit] Photos complete, proceeding...");
    
    // EMERGENCY: Save photos immediately at start of handleEdit
    console.log("🆘 [EMERGENCY] Saving photos immediately...");
    try {
      // First, collect all dataUrls (only data: URLs, not blob: URLs)
      let emergencyPhotos = capturedPhotos.map((p, idx) => {
        if (typeof p === 'string' && p.startsWith('data:')) {
          console.log(`   Photo ${idx}: Using direct string (data URL)`);
          return p;
        }
        if (p?.dataUrl && typeof p.dataUrl === 'string' && p.dataUrl.startsWith('data:')) {
          console.log(`   Photo ${idx}: Using dataUrl property`);
          return p.dataUrl;
        }
        // DON'T use previewUrl as it's a blob URL which can't be serialized!
        console.warn(`   Photo ${idx}: NO VALID DATA URL! dataUrl=${p?.dataUrl?.substring?.(0,30)}, previewUrl=${p?.previewUrl?.substring?.(0,30)}`);
        return null;
      }).filter(Boolean);
      
      // DUPLICATE MODE: If enabled, duplicate each photo for emergency save too
      if (isDuplicateMode && maxCaptures > emergencyPhotos.length) {
        console.log("🔁 [EMERGENCY DUPLICATE] Duplicating photos in emergency save...");
        const duplicated = [];
        for (let i = 0; i < emergencyPhotos.length; i++) {
          duplicated.push(emergencyPhotos[i]);
          duplicated.push(emergencyPhotos[i]);
        }
        emergencyPhotos = duplicated.slice(0, maxCaptures);
        console.log("✅ [EMERGENCY DUPLICATE] Photos duplicated:", emergencyPhotos.length);
      }
      
      console.log("🆘 [EMERGENCY] Photos to save:", emergencyPhotos.length);
      console.log("🆘 [EMERGENCY] First photo type:", typeof emergencyPhotos[0]);
      console.log("🆘 [EMERGENCY] First photo preview:", emergencyPhotos[0]?.substring?.(0, 60));
      
      if (emergencyPhotos.length > 0) {
        // Save to localStorage
        localStorage.setItem('capturedPhotos', JSON.stringify(emergencyPhotos));
        console.log("✅ [EMERGENCY] Photos saved to localStorage!");
        
        // Also save to window for backup
        window.__fremio_photos = emergencyPhotos;
        console.log("✅ [EMERGENCY] Photos saved to window.__fremio_photos!");
        
        // Also save to sessionStorage as backup
        try {
          sessionStorage.setItem('capturedPhotos_backup', JSON.stringify(emergencyPhotos));
          console.log("✅ [EMERGENCY] Photos saved to sessionStorage backup!");
        } catch (sessErr) {
          console.warn("⚠️ sessionStorage backup failed:", sessErr.message);
        }
        
        // Verify localStorage
        const verify = localStorage.getItem('capturedPhotos');
        const parsed = verify ? JSON.parse(verify) : [];
        console.log("🔍 [EMERGENCY] Verification - localStorage has:", parsed.length, "photos");
        console.log("🔍 [EMERGENCY] Verification - first photo starts with:", parsed[0]?.substring?.(0, 30));
        
        if (parsed.length === 0) {
          console.error("❌ [EMERGENCY] localStorage save FAILED! Data not persisted.");
        }
      } else {
        console.error("❌ [EMERGENCY] No valid photos to save!");
        console.log("📊 [EMERGENCY] This means photos don't have dataUrl property");
        console.log("📊 [EMERGENCY] Need to check if capturePhoto() is creating dataUrl correctly");
      }
    } catch (emergencyError) {
      console.error("❌ [EMERGENCY] Save failed:", emergencyError);
    }
    
    setIsEditorTransitioning(true);

    const photosSnapshot = Array.isArray(capturedPhotosRef.current)
      ? [...capturedPhotosRef.current]
      : [];
    const videosSnapshot = Array.isArray(capturedVideosRef.current)
      ? [...capturedVideosRef.current]
      : [];

    let processingShown = false;
    const ensureProcessingIndicator = () => {
      if (!processingShown) {
        processingShown = true;
        setIsVideoProcessing(true);
      }
    };
    const clearProcessingIndicator = (options = {}) => {
      if (processingShown) {
        processingShown = false;
        setIsVideoProcessing(false);
      }
      if (!options.keepTransitionOverlay) {
        setIsEditorTransitioning(false);
      }
    };

    const frameName = frameProvider.getCurrentFrameName();
    const compressionProfile = getFrameCompressionProfile(frameName);
    const primaryPhotoProfile = compressionProfile?.primary ?? {
      quality: 0.9,
      maxWidth: 2048,
      maxHeight: 2048,
    };
    const fallbackPhotoProfile =
      compressionProfile?.moderate ?? primaryPhotoProfile;

    const convertPhotosForEditing = async (entries) => {
      const results = [];
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        if (!entry) {
          results.push(null);
          continue;
        }

        if (typeof entry === "string") {
          results.push({
            id: `photo-${index}`,
            dataUrl: entry,
            previewUrl: entry,
            blob: null,
            capturedAt: Date.now(),
            width: null,
            height: null,
            sizeBytes: entry.length * 2,
          });
          continue;
        }

        if (entry.dataUrl) {
          const shouldReplacePreview =
            entry.previewUrl &&
            isBlobUrl(entry.previewUrl) &&
            entry.previewUrl !== entry.dataUrl;
          if (shouldReplacePreview) {
            revokeObjectURL(entry.previewUrl);
          }
          results.push({
            ...entry,
            blob: null,
            previewUrl: shouldReplacePreview
              ? entry.dataUrl
              : entry.previewUrl || entry.dataUrl,
            sizeBytes:
              typeof entry.sizeBytes === "number" &&
              Number.isFinite(entry.sizeBytes)
                ? entry.sizeBytes
                : entry.dataUrl.length * 2,
          });
          continue;
        }

        if (!entry.blob) {
          throw new Error(
            `Photo ${index + 1} tidak memiliki data untuk diproses.`
          );
        }

        let scaledResult;
        try {
          scaledResult = await generateScaledPhotoVariant(
            entry.blob,
            primaryPhotoProfile
          );
        } catch (primaryError) {
          console.warn(
            "⚠️ Gagal kompresi foto dengan profil utama, mencoba fallback",
            primaryError
          );
          try {
            scaledResult = await generateScaledPhotoVariant(
              entry.blob,
              fallbackPhotoProfile
            );
          } catch (fallbackError) {
            console.warn(
              "⚠️ Fallback kompresi foto gagal, memakai blob asli",
              fallbackError
            );
            scaledResult = {
              blob: entry.blob,
              width: entry.width ?? null,
              height: entry.height ?? null,
            };
          }
        }

        const targetBlob = scaledResult?.blob ?? entry.blob;
        const dataUrl = await blobToDataURL(targetBlob);
        if (entry.previewUrl && isBlobUrl(entry.previewUrl)) {
          revokeObjectURL(entry.previewUrl);
        }

        results.push({
          ...entry,
          dataUrl,
          previewUrl: dataUrl,
          blob: null,
          width: scaledResult?.width ?? entry.width ?? null,
          height: scaledResult?.height ?? entry.height ?? null,
          sizeBytes:
            typeof targetBlob.size === "number"
              ? targetBlob.size
              : entry.sizeBytes ?? null,
        });
      }
      return results;
    };

    const convertVideosForEditing = async (entries) => {
      // ✅ MEMORY OPTIMIZATION: Use videoMemoryManager for sequential conversion
      // This prevents memory spikes when converting 6 videos at once
      console.log("🎬 Converting videos for editing (using memory manager)...");
      console.log(`📊 Total videos to convert: ${entries.length}`);
      
      // Use the memory manager's sequential conversion
      const convertedVideos = await convertAllVideosToDataUrl(
        entries,
        (current, total, id) => {
          console.log(`🎬 Progress: ${current}/${total} (${id?.slice(-8) || 'unknown'})`);
        }
      );
      
      // Cleanup all blobs from memory manager after conversion
      cleanupAllVideoBlobs();
      console.log("✅ All video blobs cleaned up from memory manager");
      
      // Map to the expected format
      const results = convertedVideos.map((entry, index) => {
        if (!entry) return null;
        
        return {
          ...entry,
          blob: null, // Already cleaned up
          isConverting: false,
          conversionError: false,
          sizeBytes:
            typeof entry.sizeBytes === "number" && Number.isFinite(entry.sizeBytes)
              ? entry.sizeBytes
              : entry.dataUrl ? entry.dataUrl.length * 2 : null,
        };
      });
      
      console.log(`✅ Video conversion complete: ${results.filter(r => r?.dataUrl).length}/${entries.length} videos`);
      return results;
    };

    ensureProcessingIndicator();

    let convertedPhotos;
    try {
      convertedPhotos = await convertPhotosForEditing(photosSnapshot);
      setCapturedPhotos(convertedPhotos);
      capturedPhotosRef.current = convertedPhotos;
      scheduleStorageWrite(convertedPhotos, videosSnapshot);
    } catch (error) {
      console.error("❌ Gagal memproses foto sebelum masuk editor", error);
      showToast({
        type: "error",
        title: "Proses Foto Gagal",
        message: "Mohon ulangi pengambilan atau coba lagi.",
        action: {
          label: "Coba Lagi",
          onClick: handleEdit,
        },
      });
      clearProcessingIndicator();
      return;
    }

    if (convertedPhotos.some((entry) => !entry || !entry.dataUrl)) {
      showToast({
        type: "info",
        title: "Masih Memproses",
        message: "Foto masih diproses. Mohon tunggu sebentar dan coba lagi.",
      });
      clearProcessingIndicator();
      return;
    }

    let convertedVideos;
    try {
      convertedVideos = await convertVideosForEditing(videosSnapshot);
      setCapturedVideos(convertedVideos);
      capturedVideosRef.current = convertedVideos;
      scheduleStorageWrite(convertedPhotos, convertedVideos);
    } catch (error) {
      console.error("❌ Gagal memproses video sebelum masuk editor", error);
      showToast({
        type: "error",
        title: "Proses Video Gagal",
        message: error?.message || "Video gagal diproses. Silakan coba lagi.",
        action: {
          label: "Coba Lagi",
          onClick: handleEdit,
        },
      });
      clearProcessingIndicator();
      return;
    }

    if (convertedVideos.some((entry) => entry && !entry.dataUrl)) {
      showToast({
        type: "info",
        title: "Masih Memproses",
        message:
          "Video masih diproses atau gagal tersimpan. Mohon tunggu sebentar dan coba lagi.",
      });
      clearProcessingIndicator();
      return;
    }

    const frameConfig = frameProvider.getCurrentConfig();
    console.log("🎯 Frame config before editor navigation:", {
      fromProvider: frameConfig?.id || "null",
      fromStorage: safeStorage.getItem("selectedFrame"),
      hasSlots: frameConfig?.slots?.length || 0,
    });

    const sanitizeVideoForPayload = (video, index) => {
      if (!video || !video.dataUrl) return null;
      return {
        id: video.id || `video-${index}`,
        dataUrl: video.dataUrl,
        mimeType: video.mimeType || "video/webm",
        duration: video.duration ?? null,
        timer: video.timer ?? null,
        mirrored: Boolean(video.mirrored),
        requiresPreviewMirror: Boolean(video.requiresPreviewMirror),
        facingMode: video.facingMode ?? null,
        sizeBytes: video.sizeBytes ?? null,
        baseVideoIndex: video.baseVideoIndex ?? index,
        recordedAt: video.recordedAt ?? null,
      };
    };

    const normalizeVideos = (videos, targetLength) => {
      const normalized = [...videos];
      while (normalized.length < targetLength) {
        normalized.push(null);
      }
      const sliced = normalized.slice(0, targetLength);
      return sliced.map((entry, idx) => sanitizeVideoForPayload(entry, idx));
    };

    const preparePayload = (photosSource, videosSource) => {
      const photosPrepared = [...photosSource];
      const videosPrepared = normalizeVideos(
        videosSource,
        photosPrepared.length
      );
      return {
        photos: photosPrepared,
        videos: videosPrepared,
      };
    };

    try {
      let photoPayloadSource = convertedPhotos.map(
        (entry) => entry?.dataUrl ?? null
      );
      
      console.log("📸 [SAVE DEBUG] Photo payload preparation:");
      console.log("  - convertedPhotos count:", convertedPhotos.length);
      console.log("  - photoPayloadSource count:", photoPayloadSource.length);
      console.log("  - Has null values:", photoPayloadSource.some((value) => !value));
      console.log("  - First photo preview:", photoPayloadSource[0]?.substring(0, 50));
      console.log("  - isDuplicateMode:", isDuplicateMode);
      console.log("  - maxCaptures:", maxCaptures);
      console.log("  - convertedVideos count:", convertedVideos.length);
      
      if (photoPayloadSource.some((value) => !value)) {
        throw new Error("Foto tidak lengkap untuk disimpan.");
      }

      // Prepare video source for potential duplication
      let videoPayloadSource = [...convertedVideos];
      
      console.log("🎬 [VIDEO DEBUG] Before duplication check:");
      console.log("  - videoPayloadSource.length:", videoPayloadSource.length);
      console.log("  - maxCaptures:", maxCaptures);
      console.log("  - isDuplicateMode:", isDuplicateMode);
      console.log("  - Condition (isDuplicateMode && maxCaptures > 1):", isDuplicateMode && maxCaptures > 1);
      console.log("  - Condition (videoPayloadSource.length < maxCaptures):", videoPayloadSource.length < maxCaptures);

      // DUPLICATE MODE: If enabled, duplicate each photo AND video to fill all slots
      // Example: 3 photos with 6 slots -> Photo1, Photo1, Photo2, Photo2, Photo3, Photo3
      // Photos may already be duplicated from capture step, but videos need duplication here
      if (isDuplicateMode && maxCaptures > 1) {
        // Check if photos need duplication (may already be done in capture step)
        if (photoPayloadSource.length < maxCaptures) {
          console.log("🔁 [DUPLICATE MODE] Duplicating photos...");
          console.log("  - Original photos:", photoPayloadSource.length);
          console.log("  - Target slots:", maxCaptures);
          
          const duplicatedPhotos = [];
          for (let i = 0; i < photoPayloadSource.length; i++) {
            const photo = photoPayloadSource[i];
            duplicatedPhotos.push(photo); // First copy
            duplicatedPhotos.push(photo); // Duplicate copy
          }
          // Trim to maxCaptures in case we have odd number
          photoPayloadSource = duplicatedPhotos.slice(0, maxCaptures);
          
          console.log("✅ [DUPLICATE MODE] Photos duplicated:", photoPayloadSource.length);
        } else {
          console.log("📸 [DUPLICATE MODE] Photos already at target count:", photoPayloadSource.length);
        }
        
        // ALWAYS duplicate videos if they're less than maxCaptures
        // Videos are NOT duplicated in capture step, only here
        if (videoPayloadSource.length < maxCaptures) {
          console.log("🔁 [DUPLICATE MODE] Duplicating videos...");
          console.log("  - Original videos:", videoPayloadSource.length);
          console.log("  - Target slots:", maxCaptures);
          
          const duplicatedVideos = [];
          for (let i = 0; i < videoPayloadSource.length; i++) {
            const video = videoPayloadSource[i];
            if (video) {
              // Create duplicate with unique IDs but same content
              duplicatedVideos.push({ ...video, id: video.id || `video-${i * 2}` });
              duplicatedVideos.push({ ...video, id: `${video.id || 'video'}-dup-${i * 2 + 1}` });
            } else {
              duplicatedVideos.push(null);
              duplicatedVideos.push(null);
            }
          }
          // Trim to maxCaptures
          videoPayloadSource = duplicatedVideos.slice(0, maxCaptures);
          
          console.log("✅ [DUPLICATE MODE] Videos duplicated:", videoPayloadSource.length);
        } else {
          console.log("🎬 [DUPLICATE MODE] Videos already at target count:", videoPayloadSource.length);
        }
      }
      
      // SAFETY CHECK: If photos count > videos count, duplicate videos to match
      // This handles cases where photos were duplicated but videos weren't
      console.log("🔍 [SAFETY CHECK] Before duplication check:");
      console.log("  - photoPayloadSource.length:", photoPayloadSource.length);
      console.log("  - videoPayloadSource.length:", videoPayloadSource.length);
      console.log("  - Condition (photos > videos):", photoPayloadSource.length > videoPayloadSource.length);
      console.log("  - Condition (videos > 0):", videoPayloadSource.length > 0);
      
      if (photoPayloadSource.length > videoPayloadSource.length && videoPayloadSource.length > 0) {
        console.log("⚠️ [SAFETY] Photo/Video count mismatch, duplicating videos to match...");
        console.log("  - Photos:", photoPayloadSource.length);
        console.log("  - Videos:", videoPayloadSource.length);
        
        const duplicatedVideos = [];
        const targetCount = photoPayloadSource.length;
        const originalCount = videoPayloadSource.length;
        
        // Each original video should be duplicated to fill slots
        // ratio = targetCount / originalCount (e.g., 6/3 = 2)
        const ratio = Math.ceil(targetCount / originalCount);
        
        for (let i = 0; i < originalCount; i++) {
          const video = videoPayloadSource[i];
          for (let j = 0; j < ratio; j++) {
            if (duplicatedVideos.length >= targetCount) break;
            if (video) {
              duplicatedVideos.push({ 
                ...video, 
                id: j === 0 ? (video.id || `video-${i}`) : `${video.id || 'video'}-dup-${i}-${j}` 
              });
            } else {
              duplicatedVideos.push(null);
            }
          }
        }
        
        videoPayloadSource = duplicatedVideos.slice(0, targetCount);
        console.log("✅ [SAFETY] Videos duplicated to match photos:", videoPayloadSource.length);
      }

      // Flush any pending writes first
      flushStorageWrite();
      
      // NOTE: Do NOT call cleanUpStorage() here - it would read empty storage and write empty back!
      // cleanUpStorage() should only be called AFTER photos are written

      const basePayload = preparePayload(photoPayloadSource, videoPayloadSource);
      const storageSize = calculateStorageSize(basePayload);
      
      console.log("📸 [SAVE DEBUG] Storage preparation:");
      console.log("  - Payload photos count:", basePayload.photos.length);
      console.log("  - Payload videos count:", basePayload.videos.length);
      console.log("  - Storage size:", storageSize.mb, "MB");

      if (parseFloat(storageSize.mb) > 4) {
        console.log("⚠️ [SAVE DEBUG] Using emergency compression (>4MB)");
        const emergencyCompressedBase = await compressPhotosArray(
          photoPayloadSource,
          {
            quality: 0.8,
            maxWidth: 1200,
            maxHeight: 1200,
          }
        );
        const emergencyPayload = preparePayload(
          emergencyCompressedBase,
          videoPayloadSource
        );
        
        // Try direct localStorage first, then fallback to safeStorage
        try {
          console.log("📸 [SAVE DEBUG] Attempting direct localStorage save...");
          localStorage.setItem("capturedPhotos", JSON.stringify(emergencyPayload.photos));
          localStorage.setItem("capturedVideos", JSON.stringify(emergencyPayload.videos));
          console.log("✅ [SAVE DEBUG] Direct localStorage save successful!");
        } catch (directError) {
          console.warn("⚠️ [SAVE DEBUG] Direct save failed, trying safeStorage:", directError);
          safeStorage.setJSON("capturedPhotos", emergencyPayload.photos);
          safeStorage.setJSON("capturedVideos", emergencyPayload.videos);
        }
        console.log("✅ [SAVE DEBUG] Emergency photos saved:", emergencyPayload.photos.length);
      } else {
        console.log("📸 [SAVE DEBUG] Saving normal payload");
        
        // Try direct localStorage first, then fallback to safeStorage
        try {
          console.log("📸 [SAVE DEBUG] Attempting direct localStorage save...");
          localStorage.setItem("capturedPhotos", JSON.stringify(basePayload.photos));
          localStorage.setItem("capturedVideos", JSON.stringify(basePayload.videos));
          console.log("✅ [SAVE DEBUG] Direct localStorage save successful!");
        } catch (directError) {
          console.warn("⚠️ [SAVE DEBUG] Direct save failed, trying safeStorage:", directError);
          safeStorage.setJSON("capturedPhotos", basePayload.photos);
          safeStorage.setJSON("capturedVideos", basePayload.videos);
        }
        console.log("✅ [SAVE DEBUG] Photos saved to localStorage:", basePayload.photos.length);
      }
      
      // VERIFY SAVE
      const verifyPhotos = safeStorage.getJSON("capturedPhotos");
      console.log("🔍 [SAVE DEBUG] Verification - Photos in localStorage:", verifyPhotos?.length || 0);

      const activeDraftId = safeStorage.getItem("activeDraftId");

      if (activeDraftId) {
        await persistCapturedMediaToDraft(
          activeDraftId,
          basePayload.photos,
          basePayload.videos
        );
      }

      // Save frame config - CRITICAL: prioritize custom frame from draft
      console.log("💾 [SAVE DATA] Starting frame config save...");
      console.log(
        "   Captured photos count:",
        capturedPhotosRef.current.length
      );
      console.log(
        "   Photos data preview:",
        capturedPhotosRef.current.map((p, i) => ({
          index: i,
          hasData: !!p,
          isString: typeof p === "string",
          length: typeof p === "string" ? p.length : "N/A",
          preview:
            typeof p === "string" ? p.substring(0, 30) + "..." : "Not a string",
        }))
      );

      let configToSave = null;

      // PRIORITY 0: Check for shared frame in sessionStorage FIRST
      // Shared frames have ALL elements including background-photo and uploads
      const SHARED_FRAME_KEY = '__fremio_shared_frame_temp__';
      try {
        const rawSharedData = sessionStorage.getItem(SHARED_FRAME_KEY);
        if (rawSharedData) {
          const sharedFrameData = JSON.parse(rawSharedData);
          if (sharedFrameData?.frameConfig) {
            console.log("🔗 [SHARED FRAME] Using frameConfig from sessionStorage");
            console.log("   Elements count:", sharedFrameData.frameConfig.designer?.elements?.length);
            console.log("   Element types:", sharedFrameData.frameConfig.designer?.elements?.map(el => el?.type));
            configToSave = sharedFrameData.frameConfig;
          }
        }
      } catch (e) {
        console.warn("⚠️ Failed to read shared frame from sessionStorage:", e);
      }

      // If there's an activeDraftId, it means user came from Create page with custom frame
      // MUST use that custom frame, not any other stored frameConfig!
      // BUT skip this if we already have config from shared frame
      if (!configToSave && activeDraftId) {
        console.log(
          "🎯 CRITICAL: activeDraftId found, using custom frame from current session"
        );
        console.log("   activeDraftId:", activeDraftId);

        // Use frameConfig from frameProvider (set by activateDraftFrame)
        configToSave = frameConfig;
        console.log("   frameProvider config ID:", configToSave?.id);

        if (!configToSave || !configToSave.id?.startsWith("custom-")) {
          console.warn(
            "⚠️ activeDraftId exists but frameProvider has wrong frame, rebuilding from draft..."
          );
          try {
            const { default: draftStorage } = await import(
              "../utils/draftStorage.js"
            );
            const draft = await draftStorage.getDraftById(activeDraftId);
            if (draft) {
              const { buildFrameConfigFromDraft } = await import(
                "../utils/draftHelpers.js"
              );
              configToSave = buildFrameConfigFromDraft(draft);
              console.log(
                "✅ Rebuilt custom frame from draft:",
                configToSave.id
              );
            } else {
              console.error("❌ Draft not found:", activeDraftId);
            }
          } catch (error) {
            console.error("❌ Failed to rebuild from draft:", error);
          }
        } else {
          console.log(
            "✅ Using custom frame from frameProvider:",
            configToSave.id
          );
        }
      } else if (!configToSave) {
        // No activeDraftId AND no shared frame, means user came from Frames page (regular frame)
        // Use stored frameConfig or frameProvider
        console.log("📦 No activeDraftId and no shared frame, using regular frame");
        configToSave = safeStorage.getJSON("frameConfig");

        if (!configToSave || !configToSave.id) {
          console.warn("⚠️ No stored frameConfig, using frameProvider...");
          configToSave = frameConfig;
        } else {
          console.log(
            "✅ Using stored frameConfig (regular frame):",
            configToSave.id
          );
        }
      }

      if (configToSave && configToSave.id) {
        try {
          console.log("💾 Saving frame config before editor:", configToSave.id);
          safeStorage.setItem("selectedFrame", configToSave.id);

          // Add timestamp for validation
          const configWithTimestamp = {
            ...configToSave,
            __timestamp: Date.now(),
            __savedFrom: "TakeMoment",
          };

          safeStorage.setJSON("frameConfig", configWithTimestamp);
          safeStorage.setItem(
            "frameConfigTimestamp",
            String(configWithTimestamp.__timestamp)
          );

          console.log(
            "✅ Frame config saved with timestamp:",
            configWithTimestamp.__timestamp
          );
        } catch (error) {
          console.error(
            "❌ QuotaExceededError when saving frame config",
            error
          );
          console.warn(
            "⚠️ Frame config too large for localStorage, EditPhoto will load from draft"
          );

          // Make sure activeDraftId is still there as fallback
          const activeDraftId = safeStorage.getItem("activeDraftId");
          if (!activeDraftId && configToSave.metadata?.draftId) {
            safeStorage.setItem("activeDraftId", configToSave.metadata.draftId);
            console.log(
              "✅ Restored activeDraftId:",
              configToSave.metadata.draftId
            );
          }
        }
      } else {
        console.error("❌ No valid frame config to save!");
      }
    } catch (error) {
      console.error("❌ Gagal menyimpan data sebelum masuk editor", error);
      showToast({
        type: "error",
        title: "Penyimpanan Gagal",
        message:
          error?.message ||
          "Terjadi kesalahan saat menyiapkan data untuk editor.",
        action: {
          label: "Coba Lagi",
          onClick: handleEdit,
        },
      });
      clearProcessingIndicator();
      return;
    }

    clearProcessingIndicator({ keepTransitionOverlay: true });
    stopCamera();
    try {
      safeStorage.setItem("editorAutoSelectFirstSlot", "true");
    } catch (error) {
      console.warn("⚠️ Failed to set editor auto-select flag", error);
    }

    // CRITICAL DEBUG: Log everything before navigating to editor
    console.log("🎯 TAKEMOMENT: About to navigate to /edit-photo");
    console.log("📊 Frame data verification:");
    console.log(
      "  - frameProvider.getCurrentFrameName():",
      frameProvider.getCurrentFrameName()
    );
    console.log(
      "  - frameProvider.getCurrentConfig():",
      frameProvider.getCurrentConfig()
    );
    console.log(
      "  - localStorage selectedFrame:",
      safeStorage.getItem("selectedFrame")
    );
    console.log(
      "  - localStorage frameConfig:",
      safeStorage.getJSON("frameConfig")
    );
    console.log(
      "  - localStorage activeDraftId:",
      safeStorage.getItem("activeDraftId")
    );
    const storedConfig = safeStorage.getJSON("frameConfig");
    if (storedConfig) {
      console.log("  - Stored config details:");
      console.log("    - ID:", storedConfig.id);
      console.log("    - Slots:", storedConfig.slots?.length);
      console.log("    - Max captures:", storedConfig.maxCaptures);
      console.log("    - Has frameImage:", !!storedConfig.frameImage);
      console.log("    - Is custom:", storedConfig.isCustom);
    }

    // FINAL VERIFICATION before navigate
    const finalPhotosCheck = safeStorage.getJSON("capturedPhotos");
    console.log("🔍 FINAL CHECK before navigate:");
    console.log("  - capturedPhotos in localStorage:", finalPhotosCheck?.length || 0);
    console.log("  - capturedPhotosRef.current length:", capturedPhotosRef.current?.length || 0);
    console.log("  - capturedPhotos state length:", capturedPhotos?.length || 0);
    
    // Always save to window object as backup (survives navigation)
    try {
      let backupPhotos = (capturedPhotosRef.current || []).map(p => 
        typeof p === 'string' ? p : p?.dataUrl || null
      ).filter(Boolean);
      
      if (backupPhotos.length === 0 && capturedPhotos?.length > 0) {
        backupPhotos = capturedPhotos.map(p => 
          typeof p === 'string' ? p : p?.dataUrl || null
        ).filter(Boolean);
      }
      
      if (backupPhotos.length > 0) {
        window.__fremio_photos = backupPhotos;
        console.log("💾 Saved photos to window.__fremio_photos:", backupPhotos.length);
      }
    } catch (e) {
      console.warn("Failed to backup photos to window:", e);
    }
    
    if (!finalPhotosCheck || finalPhotosCheck.length === 0) {
      console.error("❌ CRITICAL: Photos not saved to localStorage!");
      console.error("  - capturedPhotosRef:", capturedPhotosRef.current);
      console.error("  - Attempting emergency save...");
      
      // Clear large cache items first
      clearLargeCacheItems();
      
      // Emergency direct save - try multiple sources
      try {
        // First try capturedPhotosRef
        let emergencyPhotos = (capturedPhotosRef.current || []).map(p => 
          typeof p === 'string' ? p : p?.dataUrl || null
        ).filter(Boolean);
        
        // If ref is empty, try state
        if (emergencyPhotos.length === 0 && capturedPhotos?.length > 0) {
          console.log("  - Using capturedPhotos state instead of ref");
          emergencyPhotos = capturedPhotos.map(p => 
            typeof p === 'string' ? p : p?.dataUrl || null
          ).filter(Boolean);
        }
        
        if (emergencyPhotos.length > 0) {
          localStorage.setItem('capturedPhotos', JSON.stringify(emergencyPhotos));
          console.log("✅ Emergency save successful:", emergencyPhotos.length, "photos");
        } else {
          console.error("❌ No photos to save!");
        }
      } catch (err) {
        console.error("❌ Emergency save failed:", err);
        // Photos should still be in window.__fremio_photos as backup
      }
    }

    navigate("/edit-photo");
  }, [
    capturedPhotos,
    capturedPhotosRef,
    capturedVideosRef,
    cleanUpStorage,
    clearLargeCacheItems,
    flushStorageWrite,
    getFrameCompressionProfile,
    maxCaptures,
    photosNeeded,
    isDuplicateMode,
    navigate,
    scheduleStorageWrite,
    stopCamera,
  ]);

  const renderEditorTransitionOverlay = () => {
    if (!isEditorTransitioning) return null;

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.82)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
            padding: "2.25rem 2.75rem",
            borderRadius: "28px",
            background: "rgba(255,255,255,0.12)",
            boxShadow: "0 24px 80px rgba(15,23,42,0.45)",
            color: "white",
            textAlign: "center",
            maxWidth: "min(460px, 90vw)",
          }}
        >
          <div style={{ fontSize: "2.25rem" }}>🎞️</div>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              letterSpacing: "0.015em",
            }}
          >
            Menyiapkan editor…
          </div>
          <div
            style={{
              fontSize: "1rem",
              lineHeight: 1.5,
              opacity: 0.85,
            }}
          >
            Foto dan video kamu sedang diproses. Mohon tunggu sebentar sampai
            halaman editor siap.
          </div>
        </div>
      </div>
    );
  };

  const renderPreviewPanel = (variant) => {
    const isMobileVariant = variant === "mobile";
    const displayablePhotos = capturedPhotos
      .map((photo, idx) => ({ photo, idx }))
      .filter(({ photo }) => Boolean(photo))
      .map(({ photo, idx }) => {
        const previewSource =
          typeof photo === "string"
            ? photo
            : photo.previewUrl || photo.dataUrl || null;
        if (!previewSource) {
          return null;
        }
        return {
          id:
            typeof photo === "string"
              ? `photo-${idx}`
              : photo.id || `photo-${idx}`,
          src: previewSource,
          index: idx,
        };
      })
      .filter(Boolean);
    const containerStyle = isMobileVariant
      ? {
          background: "#fff",
          borderRadius: "14px",
          padding: "0.75rem",
          margin: "0 0 0.85rem",
          minHeight: "220px",
          display: "flex",
          flexDirection: "column",
          gap: "0.65rem",
          width: "100%",
          boxShadow: "none",
        }
      : {
          background: "rgba(232,168,137,0.24)",
          borderRadius: "24px",
          padding: "0.75rem 1rem",
          minHeight: "150px",
          width: "min(420px, 100%)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          boxShadow: "0 24px 48px rgba(232,168,137,0.22)",
          border: "1px solid rgba(232,168,137,0.28)",
          alignSelf: "center",
        };

    return (
      <div style={containerStyle}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <h3
            style={{
              fontSize: isMobileVariant ? "1.05rem" : "1.05rem",
              fontWeight: "bold",
              color: "#333",
              margin: 0,
            }}
          >
            Preview
          </h3>
          {capturedPhotos.length > 0 && (
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: 500,
                color: "#94a3b8",
              }}
            >
              {capturedPhotos.length}/{photosNeeded}
            </span>
          )}
        </header>

        <div
          style={{
            flex: "1 1 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
          }}
        >
          {capturedPhotos.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  capturedPhotos.length > 1
                    ? "repeat(auto-fit, minmax(110px, 1fr))"
                    : "1fr",
                gap: isMobileVariant ? "0.45rem" : "0.45rem",
                width: "100%",
                maxWidth: isMobileVariant ? "240px" : "100%",
              }}
            >
              {displayablePhotos.map(({ id, src, index }) => (
                <div
                  key={id}
                  style={{
                    position: "relative",
                    aspectRatio: slotAspectRatio
                      ? `${slotAspectRatio} / 1`
                      : "4 / 3",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: isMobileVariant
                      ? "0 2px 10px rgba(0,0,0,0.12)"
                      : "0 10px 20px rgba(15,23,42,0.15)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  <img
                    src={src}
                    alt={`Photo ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />

                  <button
                    onClick={() => handleDeletePhoto(index)}
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "6px",
                      width: "22px",
                      height: "22px",
                      borderRadius: "11px",
                      border: "none",
                      background: "rgba(255, 59, 48, 0.95)",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                    }}
                    title={`Hapus foto ${index + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "#999",
                fontSize: isMobileVariant ? "0.9rem" : "0.82rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  fontSize: isMobileVariant ? "2.35rem" : "1.9rem",
                  lineHeight: 1,
                }}
              >
                📸
              </div>
              <div
                style={{
                  fontWeight: 500,
                }}
              >
                belum ada foto
              </div>
              <div
                style={{
                  fontSize: isMobileVariant ? "0.8rem" : "0.72rem",
                  color: "#666",
                }}
              >
                ambil foto untuk melihat preview di sini
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleEdit}
          disabled={capturedPhotos.length < photosNeeded}
          style={{
            width: "100%",
            padding: isMobileVariant ? "0.75rem" : "0.65rem",
            background:
              capturedPhotos.length >= photosNeeded ? "#1E293B" : "#d7dde5",
            color: "white",
            border: "none",
            borderRadius: "999px",
            fontSize: isMobileVariant ? "0.95rem" : "0.88rem",
            fontWeight: 600,
            cursor:
              capturedPhotos.length >= photosNeeded ? "pointer" : "not-allowed",
            boxShadow: isMobileVariant
              ? "0 8px 16px rgba(0,0,0,0.1)"
              : "0 14px 28px rgba(30,41,59,0.15)",
            transition: "transform 0.2s ease",
            opacity: capturedPhotos.length >= photosNeeded ? 1 : 0.7,
          }}
        >
          {capturedPhotos.length >= photosNeeded
            ? "✨ Edit Photos"
            : `📝 ${capturedPhotos.length}/${photosNeeded} foto`}
        </button>
      </div>
    );
  };

  const renderCameraControls = (variant) => {
    const isMobileVariant = variant === "mobile";
    const showCameraButtonLabel = isMobileVariant
      ? "Pakai Kamera"
      : cameraActive
      ? "Stop Camera"
      : "Camera";
    const shouldShowTimer = cameraActive;

    // Mobile: Clean minimal controls
    if (isMobileVariant) {
      return (
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.5rem",
          width: "100%",
        }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            style={{
              position: "absolute",
              left: "-9999px",
              opacity: 0,
              pointerEvents: "none",
            }}
          />
          
          {/* Photo Counter - Left side, clickable to toggle duplicate mode */}
          {maxCaptures > 1 && maxCaptures % 2 === 0 && capturedPhotos.length === 0 ? (
            <button
              onClick={() => setIsDuplicateMode(!isDuplicateMode)}
              disabled={capturing}
              style={{
                padding: "0.45rem 0.7rem",
                background: isDuplicateMode ? "rgba(139,92,246,0.15)" : "rgba(232,168,137,0.15)",
                color: isDuplicateMode ? "#8B5CF6" : "#5D4E47",
                borderRadius: "999px",
                fontSize: "0.8rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                border: isDuplicateMode ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(232,168,137,0.3)",
                cursor: capturing ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {isDuplicateMode ? "🔁" : "📸"} {capturedPhotos.length}/{photosNeeded}
              {isDuplicateMode && <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>ON</span>}
            </button>
          ) : (
            <div
              style={{
                padding: "0.45rem 0.7rem",
                background: hasReachedMaxPhotos ? "rgba(239,68,68,0.1)" : "rgba(232,168,137,0.15)",
                color: hasReachedMaxPhotos ? "#ef4444" : "#5D4E47",
                borderRadius: "999px",
                fontSize: "0.8rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                border: hasReachedMaxPhotos ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(232,168,137,0.3)",
              }}
            >
              📸 {capturedPhotos.length}/{photosNeeded}
              {isDuplicateMode && <span style={{ color: "#8B5CF6" }}>🔁</span>}
            </div>
          )}
          
          {/* Upload Galeri */}
          <button
            onClick={() => {
              if (capturedPhotos.length >= photosNeeded) return;
              fileInputRef.current?.click();
            }}
            disabled={capturedPhotos.length >= photosNeeded}
            style={{
              padding: "0.45rem 0.7rem",
              background: capturedPhotos.length >= photosNeeded ? "#f1f5f9" : "#fff",
              color: capturedPhotos.length >= photosNeeded ? "#94a3b8" : "#5D4E47",
              border: "1px solid rgba(232,168,137,0.3)",
              borderRadius: "999px",
              fontSize: "0.8rem",
              fontWeight: 500,
              cursor: capturedPhotos.length >= photosNeeded ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(139,92,77,0.08)",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            🖼️ Galeri
          </button>

          {/* Kamera Toggle */}
          <button
            onClick={handleCameraToggle}
            style={{
              padding: "0.45rem 0.7rem",
              background: cameraActive ? "#E8A889" : "#fff",
              color: cameraActive ? "#fff" : "#5D4E47",
              border: cameraActive ? "1px solid #E8A889" : "1px solid rgba(232,168,137,0.3)",
              borderRadius: "999px",
              fontSize: "0.8rem",
              fontWeight: 500,
              cursor: "pointer",
              boxShadow: cameraActive
                ? "0 8px 20px rgba(232,168,137,0.3)"
                : "0 4px 12px rgba(139,92,77,0.08)",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            📷 {cameraActive ? "Stop" : "Kamera"}
          </button>

          {/* Settings Menu - only show when camera is active */}
          {cameraActive && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowMobileSettings(!showMobileSettings)}
                style={{
                  padding: "0.45rem",
                  background: showMobileSettings ? "#E8A889" : "#fff",
                  color: showMobileSettings ? "#fff" : "#5D4E47",
                  border: "1px solid rgba(232,168,137,0.3)",
                  borderRadius: "50%",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(139,92,77,0.08)",
                  width: "34px",
                  height: "34px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ⚙️
              </button>
              
              {/* Settings Dropdown */}
              {showMobileSettings && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  background: "rgba(255,255,255,0.98)",
                  borderRadius: "16px",
                  padding: "12px",
                  boxShadow: "0 12px 32px rgba(139,92,77,0.2)",
                  border: "1px solid rgba(232,168,137,0.3)",
                  zIndex: 200,
                  minWidth: "160px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}>
                  {/* Timer */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#5D4E47" }}>
                      ⏱️ Timer
                    </span>
                    <select
                      value={timer}
                      onChange={(e) => setTimer(Number(e.target.value))}
                      disabled={capturing}
                      style={{
                        padding: "0.4rem 0.6rem",
                        borderRadius: "999px",
                        border: "1px solid rgba(232,168,137,0.3)",
                        background: "#fff",
                        color: "#5D4E47",
                        fontSize: "0.85rem",
                        cursor: capturing ? "not-allowed" : "pointer",
                      }}
                    >
                      {TIMER_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}s
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Live Mode */}
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    cursor: capturing ? "not-allowed" : "pointer",
                  }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#5D4E47" }}>
                      🎥 Live Mode
                    </span>
                    <input
                      type="checkbox"
                      checked={liveModeEnabled}
                      onChange={(e) => setLiveModeEnabled(e.target.checked)}
                      disabled={capturing}
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: "#E8A889",
                        cursor: capturing ? "not-allowed" : "pointer",
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Desktop layout unchanged
    const containerStyle = {
      display: "grid",
      gridTemplateColumns: "1fr auto 1fr",
      alignItems: "center",
      columnGap: "0.75rem",
      marginBottom: "1rem",
      width: "100%",
    };

    return (
      <div style={containerStyle}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          style={{
            position: "absolute",
            left: "-9999px",
            opacity: 0,
            pointerEvents: "none",
          }}
        />
        <button
          onClick={() => {
            if (capturedPhotos.length >= photosNeeded) return;
            fileInputRef.current?.click();
          }}
          disabled={capturedPhotos.length >= photosNeeded}
          title={
            capturedPhotos.length >= photosNeeded
              ? "Maksimal foto sudah tercapai"
              : "Pilih file dari galeri"
          }
          style={{
            padding: isMobileVariant ? "0.65rem 0.85rem" : "0.7rem 1.35rem",
            background:
              capturedPhotos.length >= photosNeeded ? "#f1f5f9" : "#fff",
            color: capturedPhotos.length >= photosNeeded ? "#94a3b8" : "#333",
            border: "1px solid #e2e8f0",
            borderRadius: "999px",
            fontSize: isMobileVariant ? "0.92rem" : "1rem",
            fontWeight: 500,
            cursor:
              capturedPhotos.length >= photosNeeded ? "not-allowed" : "pointer",
            boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            justifySelf: isMobileVariant ? "center" : "start",
            gridColumn: "1",
          }}
        >
          {capturedPhotos.length >= photosNeeded
            ? "Max photos reached"
            : isMobileVariant
            ? "Upload dari galeri"
            : `Choose file (${photosNeeded - capturedPhotos.length} left)`}
        </button>

        {shouldShowTimer ? (
          <div
            style={{
              display: "flex",
              flexDirection: isMobileVariant ? "column" : "row",
              alignItems: "center",
              gap: isMobileVariant ? "0.3rem" : "0.5rem",
              justifySelf: "center",
              gridColumn: "2",
              textAlign: isMobileVariant ? "center" : "left",
            }}
          >
            <span
              style={{
                fontSize: isMobileVariant ? "0.88rem" : "0.95rem",
                fontWeight: isMobileVariant ? 600 : 500,
                color: isMobileVariant ? "#1E293B" : "#475569",
              }}
            >
              Timer:
            </span>
            <select
              value={timer}
              onChange={(e) => setTimer(Number(e.target.value))}
              disabled={capturing}
              style={{
                padding: isMobileVariant ? "0.5rem 0.85rem" : "0.45rem 0.6rem",
                borderRadius: "999px",
                border: "1px solid #e2e8f0",
                background: "#fff",
                color: "#333",
                fontSize: isMobileVariant ? "0.95rem" : "0.9rem",
                cursor: capturing ? "not-allowed" : "pointer",
                boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
                minWidth: isMobileVariant ? "132px" : "auto",
              }}
            >
              {TIMER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} detik
                </option>
              ))}
            </select>

            {/* Live Mode Toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginLeft: isMobileVariant ? 0 : "0.5rem",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  cursor: "pointer",
                  fontSize: isMobileVariant ? "0.88rem" : "0.95rem",
                  fontWeight: isMobileVariant ? 600 : 500,
                  color: isMobileVariant ? "#1E293B" : "#475569",
                }}
              >
                <input
                  type="checkbox"
                  checked={liveModeEnabled}
                  onChange={(e) => setLiveModeEnabled(e.target.checked)}
                  disabled={capturing}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: capturing ? "not-allowed" : "pointer",
                    accentColor: "#E8A889",
                  }}
                />
                <span>🎥 Live Mode</span>
              </label>
            </div>

            {/* Duplicate Mode Toggle - only show when maxCaptures is EVEN (genap) */}
            {maxCaptures > 1 && maxCaptures % 2 === 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginLeft: isMobileVariant ? 0 : "0.5rem",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    cursor: capturing ? "not-allowed" : "pointer",
                    fontSize: isMobileVariant ? "0.88rem" : "0.95rem",
                    fontWeight: isMobileVariant ? 600 : 500,
                    color: isDuplicateMode 
                      ? "#8B5CF6" 
                      : (isMobileVariant ? "#1E293B" : "#475569"),
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isDuplicateMode}
                    onChange={(e) => setIsDuplicateMode(e.target.checked)}
                    disabled={capturing || capturedPhotos.length > 0}
                    style={{
                      width: "18px",
                      height: "18px",
                      cursor: capturing || capturedPhotos.length > 0 ? "not-allowed" : "pointer",
                      accentColor: "#8B5CF6",
                    }}
                  />
                  <span>🔁 Duplikat ({photosNeeded} foto)</span>
                </label>
              </div>
            )}

            {/* Normal/Background Toggle - Desktop only, next to Duplikat */}
            {!isMobileVariant && cameraActive && !isSwitchingCamera && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  marginLeft: "0.5rem",
                  background: "rgba(247,241,237,0.95)",
                  padding: "6px 10px",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(139,92,77,0.1)",
                  border: "1px solid rgba(232,168,137,0.3)",
                }}
              >
                <button
                  onClick={() => {
                    setFilterMode("original");
                    setShowBackgroundPanel(false);
                  }}
                  disabled={capturing}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "8px",
                    border: "none",
                    background: filterMode === "original" ? "#E8A889" : "transparent",
                    color: filterMode === "original" ? "#fff" : "#5D4E47",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: capturing ? "not-allowed" : "pointer",
                    opacity: capturing ? 0.5 : 1,
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  📷 Normal
                </button>
                <button
                  onClick={() => {
                    setFilterMode("blur");
                    setShowBackgroundPanel(true);
                  }}
                  disabled={capturing || isLoadingBlur}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "8px",
                    border: "none",
                    background: filterMode === "blur" ? "#E8A889" : "transparent",
                    color: filterMode === "blur" ? "#fff" : "#5D4E47",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: capturing || isLoadingBlur ? "not-allowed" : "pointer",
                    opacity: capturing || isLoadingBlur ? 0.5 : 1,
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  🎨 Background
                  {isLoadingBlur && <span style={{ fontSize: "9px" }}>⏳</span>}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              gridColumn: "2",
              justifySelf: "center",
              minHeight: isMobileVariant ? "48px" : 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Duplicate Mode Toggle - only show when maxCaptures is EVEN (genap) */}
            {maxCaptures > 1 && maxCaptures % 2 === 0 && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  cursor: capturedPhotos.length > 0 ? "not-allowed" : "pointer",
                  fontSize: isMobileVariant ? "0.88rem" : "0.95rem",
                  fontWeight: isMobileVariant ? 600 : 500,
                  color: isDuplicateMode 
                    ? "#8B5CF6" 
                    : (isMobileVariant ? "#1E293B" : "#475569"),
                }}
              >
                <input
                  type="checkbox"
                  checked={isDuplicateMode}
                  onChange={(e) => setIsDuplicateMode(e.target.checked)}
                  disabled={capturedPhotos.length > 0}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: capturedPhotos.length > 0 ? "not-allowed" : "pointer",
                    accentColor: "#8B5CF6",
                  }}
                />
                <span>🔁 Duplikat ({photosNeeded} foto)</span>
              </label>
            )}
          </div>
        )}

        <button
          onClick={handleCameraToggle}
          style={{
            padding: isMobileVariant ? "0.65rem 0.9rem" : "0.7rem 1.35rem",
            background: cameraActive ? "#E8A889" : "#fff",
            color: cameraActive ? "#fff" : "#333",
            border: cameraActive ? "1px solid #E8A889" : "1px solid #e2e8f0",
            borderRadius: "999px",
            fontSize: isMobileVariant ? "0.92rem" : "1rem",
            fontWeight: 500,
            cursor: "pointer",
            boxShadow: cameraActive
              ? "0 16px 32px rgba(232,168,137,0.35)"
              : "0 12px 24px rgba(15,23,42,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            justifySelf: isMobileVariant ? "center" : "end",
            gridColumn: "3",
          }}
        >
          {isMobileVariant && (
            <span role="img" aria-hidden="true">
              📷
            </span>
          )}
          {showCameraButtonLabel}
        </button>
      </div>
    );
  };

  const renderCaptureArea = (variant, sectionRef) => {
    const isMobileVariant = variant === "mobile";

    return (
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isMobileVariant ? "12px" : "16px",
        }}
      >
        <div
          ref={sectionRef}
          style={{
            background: "#fff",
            borderRadius: isMobileVariant ? "18px" : "20px",
            overflow: "hidden",
            position: "relative",
            // Fixed size for consistent video preview - not dependent on slot aspect ratio
            height: isMobileVariant ? "min(400px, 60vh)" : "480px",
            width: isMobileVariant ? "100%" : "640px",
            maxWidth: "100%",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {cameraActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: displayMirror ? "scaleX(-1)" : "none",
                  background: "#000",
                  opacity: blurMode === "mediapipe" ? 0 : 1,
                  transition: "opacity 200ms ease",
                  pointerEvents: blurMode === "mediapipe" ? "none" : "auto",
                  zIndex: 1,
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setVideoAspectRatio(
                      videoRef.current.videoWidth /
                        Math.max(videoRef.current.videoHeight, 1)
                    );
                  }
                }}
                onError={(error) => {
                  console.error("🚫 Video error", error);
                  setCameraError("Video gagal dimuat");
                }}
              />

              {/* MediaPipe Canvas */}
              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  background: "#000",
                  transform: displayMirror ? "scaleX(-1)" : "none",
                  opacity: blurMode === "mediapipe" ? 1 : 0,
                  transition: "opacity 200ms ease",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />

              {cameraError && (
                <div
                  style={{
                    position: "absolute ",
                    bottom: isMobileVariant ? "16px" : "24px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(255, 59, 48, 0.95)",
                    color: "#fff",
                    padding: "0.75rem 1rem",
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
                    maxWidth: "90%",
                    textAlign: "left",
                    fontSize: "0.95rem",
                  }}
                >
                  <span role="img" aria-label="Camera error">
                    ⚠️
                  </span>
                  <span>{cameraError}</span>
                </div>
              )}

              {renderCountdownOverlay()}

              {/* Flip Camera Button - Mobile Only */}
              {isMobileVariant && cameraActive && !isSwitchingCamera && (
                <button
                  onClick={handleSwitchCamera}
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    minWidth: "48px",
                    height: "48px",
                    borderRadius: "24px",
                    border: "none",
                    background: "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "0 14px",
                    cursor: "pointer",
                    zIndex: 100,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}
                >
                  <img
                    src={flipIcon}
                    alt="Flip camera"
                    style={{ 
                      width: "22px", 
                      height: "22px",
                      filter: "brightness(0) invert(1)",
                    }}
                  />
                  <span style={{
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}>
                    {isUsingBackCamera ? "Depan" : "Belakang"}
                  </span>
                </button>
              )}

              {/* Normal/Background Toggle - Mobile Only, inside stream */}
              {isMobileVariant && cameraActive && !isSwitchingCamera && (
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    display: "flex",
                    gap: "6px",
                    background: "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    padding: "6px 8px",
                    borderRadius: "20px",
                    zIndex: 100,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}
                >
                  <button
                    onClick={() => {
                      setFilterMode("original");
                      setShowBackgroundPanel(false);
                    }}
                    disabled={capturing}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "14px",
                      border: "none",
                      background: filterMode === "original" ? "#E8A889" : "transparent",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: capturing ? "not-allowed" : "pointer",
                      opacity: capturing ? 0.5 : 1,
                      transition: "all 0.2s ease",
                    }}
                  >
                    📷
                  </button>
                  <button
                    onClick={() => {
                      setFilterMode("blur");
                      setShowBackgroundPanel(true);
                    }}
                    disabled={capturing || isLoadingBlur}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "14px",
                      border: "none",
                      background: filterMode === "blur" ? "#E8A889" : "transparent",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: capturing || isLoadingBlur ? "not-allowed" : "pointer",
                      opacity: capturing || isLoadingBlur ? 0.5 : 1,
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    🎨
                    {isLoadingBlur && <span style={{ fontSize: "9px" }}>⏳</span>}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "1.05rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                alignItems: "center",
                padding: "2.5rem 1rem",
              }}
            >
              <div style={{ fontSize: "3.5rem", lineHeight: 1 }}>📷</div>
              <div style={{ fontWeight: 600 }}>Kamera belum aktif</div>
              <div style={{ fontSize: "0.9rem" }}>
                aktifkan kamera atau upload dari galeri
              </div>
              {cameraError && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    background: "rgba(255, 59, 48, 0.1)",
                    border: "1px solid rgba(255, 59, 48, 0.3)",
                    color: "#ef4444",
                    borderRadius: "10px",
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.85rem",
                    lineHeight: 1.4,
                    maxWidth: "320px",
                  }}
                >
                  {cameraError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Background Panel - Below stream for both mobile and desktop */}
        {cameraActive &&
          !isSwitchingCamera &&
          filterMode === "blur" &&
          !isLoadingBlur &&
          blurMode === "mediapipe" && (
            <>
              {showBackgroundPanel ? (
                <div
                  style={{
                    width: "100%",
                    maxWidth: isMobileVariant ? "100%" : "640px",
                    background: "rgba(15,23,42,0.95)",
                    backdropFilter: "blur(16px)",
                    padding: isMobileVariant ? "14px" : "18px",
                    borderRadius: "20px",
                    boxShadow: "0 18px 36px rgba(15,23,42,0.3)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "12px",
                      color: "#A78BFA",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    <span>🎨 Background Options</span>
                    <button
                      onClick={() => setShowBackgroundPanel(false)}
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        border: "none",
                        color: "#fff",
                        borderRadius: "12px",
                        padding: "6px 10px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      ✕ Tutup
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    <button
                      onClick={() => setBackgroundMode("blur")}
                      disabled={capturing}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "12px",
                        border: "none",
                        background:
                          backgroundMode === "blur"
                            ? "#8B5CF6"
                            : "rgba(255,255,255,0.1)",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: capturing ? "not-allowed" : "pointer",
                        opacity: capturing ? 0.5 : 1,
                      }}
                    >
                      🌫️ Blur
                    </button>
                    <button
                      onClick={() => setBackgroundMode("color")}
                      disabled={capturing}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "12px",
                        border: "none",
                        background:
                          backgroundMode === "color"
                            ? "#8B5CF6"
                            : "rgba(255,255,255,0.1)",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: capturing ? "not-allowed" : "pointer",
                        opacity: capturing ? 0.5 : 1,
                      }}
                    >
                      🎨 Color
                    </button>
                    <button
                      onClick={() => setBackgroundMode("image")}
                      disabled={capturing}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "12px",
                        border: "none",
                        background:
                          backgroundMode === "image"
                            ? "#8B5CF6"
                            : "rgba(255,255,255,0.1)",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: capturing ? "not-allowed" : "pointer",
                        opacity: capturing ? 0.5 : 1,
                      }}
                    >
                      🖼️ Image
                    </button>
                  </div>

                  {backgroundMode === "color" && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(6, 1fr)",
                        gap: "8px",
                      }}
                    >
                      {[
                        "#FFFFFF",
                        "#000000",
                        "#EC4899",
                        "#3B82F6",
                        "#8B5CF6",
                        "#10B981",
                        "#F59E0B",
                        "#EF4444",
                        "#6B7280",
                        "#14B8A6",
                        "#F97316",
                        "#6366F1",
                      ].map((color) => (
                        <button
                          key={color}
                          onClick={() => setBackgroundColor(color)}
                          disabled={capturing}
                          style={{
                            width: "100%",
                            aspectRatio: "1",
                            background: color,
                            border:
                              backgroundColor === color
                                ? "3px solid #A78BFA"
                                : "2px solid rgba(255,255,255,0.2)",
                            borderRadius: "10px",
                            cursor: capturing ? "not-allowed" : "pointer",
                            opacity: capturing ? 0.5 : 1,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {backgroundMode === "image" && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={capturing}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) =>
                              setBackgroundImage(ev.target?.result);
                            reader.readAsDataURL(file);
                          }
                        }}
                        style={{
                          padding: "8px",
                          background: "rgba(255,255,255,0.1)",
                          border: "2px dashed rgba(255,255,255,0.3)",
                          borderRadius: "10px",
                          color: "#fff",
                          fontSize: "13px",
                          cursor: capturing ? "not-allowed" : "pointer",
                          opacity: capturing ? 0.5 : 1,
                          width: "100%",
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowBackgroundPanel(true)}
                  style={{
                    background: "rgba(15,23,42,0.85)",
                    color: "#E2E8F0",
                    border: "none",
                    borderRadius: "14px",
                    padding: "10px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 12px 28px rgba(15,23,42,0.25)",
                    cursor: "pointer",
                  }}
                >
                  🎨 Buka pengaturan background
                </button>
              )}
            </>
          )}
      </div>
    );
  };

  const renderCaptureButton = (variant) => {
    const isMobileVariant = variant === "mobile";
    const disableCapture = isCaptureDisabled || !cameraActive;

    if (isMobileVariant) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.75rem 0",
          }}
        >
          <button
            onClick={handleCapture}
            disabled={disableCapture}
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              border: "none",
              background: disableCapture ? "#e2e8f0" : "#E8A889",
              color: "white",
              fontSize: "1.3rem",
              fontWeight: 700,
              boxShadow: disableCapture
                ? "none"
                : "0 16px 32px rgba(232,168,137,0.4)",
              cursor: disableCapture ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {capturedPhotos.length >= photosNeeded
              ? "🚫"
              : capturing
              ? `⏳ ${countdown ?? timer}s`
              : isVideoProcessing
              ? "🎬"
              : cameraActive
              ? "📸"
              : "📷"}
          </button>
        </div>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.6rem",
          padding: "1rem 0 0.35rem",
        }}
      >
        <button
          onClick={handleCapture}
          disabled={disableCapture}
          style={{
            padding: "0.85rem 1.9rem",
            borderRadius: "999px",
            border: "none",
            background: disableCapture ? "#e2e8f0" : "#1E293B",
            color: disableCapture ? "#94a3b8" : "#fff",
            fontSize: "1.05rem",
            fontWeight: 600,
            cursor: disableCapture ? "not-allowed" : "pointer",
            boxShadow: disableCapture
              ? "none"
              : "0 18px 36px rgba(15,23,42,0.2)",
            minWidth: "200px",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          {disableCapture && !cameraActive ? "Aktifkan kamera" : "Capture"}
        </button>

        <div
          style={{
            fontSize: "0.9rem",
            color: "#475569",
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          Tekan spasi untuk capture
        </div>

        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: hasReachedMaxPhotos ? "#ef4444" : "#475569",
            textAlign: "center",
          }}
        >
          Foto: {capturedPhotos.length}/{photosNeeded}
          {isDuplicateMode && <span style={{ color: "#8B5CF6", marginLeft: "4px" }}>🔁</span>}
          {hasReachedMaxPhotos && " - maksimal tercapai!"}
        </div>
      </div>
    );
  };

  const renderDesktopLayout = () => {
    const captureControls = renderCaptureButton("desktop");

    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#F4E6DA",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.2rem",
        }}
      >
        <section
          style={{
            background: "rgba(255,255,255,0.6)",
            borderRadius: "28px",
            padding: "2rem",
            display: "flex",
            justifyContent: "center",
            boxShadow: "0 40px 80px rgba(148,163,184,0.25)",
          }}
        >
          <div
            style={{
              width: "min(1100px, 100%)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.35rem",
                textAlign: "center",
              }}
            >
              <button
                type="button"
                onClick={() => navigate("/frames")}
                style={{
                  alignSelf: "flex-start",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.55rem 1.1rem",
                  borderRadius: "999px",
                  border: "none",
                  background: "#fff",
                  color: "#1E293B",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  boxShadow: "0 14px 28px rgba(15,23,42,0.12)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 18px 32px rgba(15,23,42,0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow =
                    "0 14px 28px rgba(15,23,42,0.12)";
                }}
              >
                <span style={{ fontSize: "1rem" }}>←</span>
                <span>Kembali</span>
              </button>
              <h1 style={headingStyles}>
                Pilih momen berhargamu bersama fremio
              </h1>
            </div>

            <div style={{ width: "100%", maxWidth: "640px" }}>
              {renderCameraControls("desktop")}
            </div>

            <div style={{ width: "100%", maxWidth: "820px" }}>
              {renderCaptureArea("desktop", captureSectionRef)}
            </div>

            <div style={{ width: "100%", maxWidth: "640px" }}>
              {captureControls}
            </div>

            <div
              ref={previewSectionRef}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
              }}
            >
              {renderPreviewPanel("desktop")}
            </div>
          </div>
        </section>

        {renderConfirmationModal()}
      </main>
    );
  };

  const renderMobileLayout = () => (
    <main
      style={{
        minHeight: "100vh",
        background: "#F4E6DA",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <section
        style={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          padding: "0.7rem 0.75rem 0.85rem",
          gap: "0.85rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/frames")}
            style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.45rem 0.95rem",
              borderRadius: "999px",
              border: "none",
              background: "#fff",
              color: "#1E293B",
              fontWeight: 600,
              fontSize: "0.9rem",
              boxShadow: "0 12px 24px rgba(15,23,42,0.12)",
              cursor: "pointer",
              marginBottom: "1.35rem",
            }}
          >
            <span style={{ fontSize: "0.95rem" }}>←</span>
            <span>Kembali</span>
          </button>
          <h1
            ref={mobileContentRef}
            style={{
              ...headingStyles,
              marginTop: "0.1rem",
            }}
          >
            Pilih momen berhargamu bersama fremio
          </h1>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.6)",
            borderRadius: "22px",
            padding: "0.95rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.9rem",
            boxShadow: "0 30px 60px rgba(148,163,184,0.25)",
          }}
        >
          {renderCameraControls("mobile")}
          {renderCaptureArea("mobile", captureSectionRef)}
          {renderCaptureButton("mobile")}
        </div>

        <div ref={previewSectionRef} style={{ width: "100%" }}>
          {renderPreviewPanel("mobile")}
        </div>
      </section>

      {renderConfirmationModal()}
    </main>
  );

  return (
    <>
      {isMobile ? renderMobileLayout() : renderDesktopLayout()}
      {renderEditorTransitionOverlay()}
    </>
  );
}
