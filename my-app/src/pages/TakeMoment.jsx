import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import frameProvider from "../utils/frameProvider.js";
import safeStorage from "../utils/safeStorage.js";
import flipIcon from "../assets/flip.png";
import fremioLogo from "../assets/logo.svg";

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
  { maxWidth = 600, maxHeight = 600, quality = 0.8 }
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
  { quality = 0.8, maxWidth = 600, maxHeight = 600 } = {}
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
  const isMobile = useIsMobile();

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const activeRecordingRef = useRef(null);
  const captureSectionRef = useRef(null);
  const previewSectionRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [capturedVideos, setCapturedVideos] = useState([]);
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [timer, setTimer] = useState(TIMER_OPTIONS[0]);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);

  const capturedPhotosRef = useRef(capturedPhotos);
  const capturedVideosRef = useRef(capturedVideos);
  const previousCaptureCountRef = useRef(0);
  const previousCameraActiveRef = useRef(null);

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
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState(4 / 3);
  const [maxCaptures, setMaxCaptures] = useState(4);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [isUsingBackCamera, setIsUsingBackCamera] = useState(false);
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const [isEditorTransitioning, setIsEditorTransitioning] = useState(false);
  const [cameraError, setCameraError] = useState(null);

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
    switch (frameName) {
      case "Testframe4":
        return {
          primary: { quality: 0.85, maxWidth: 700, maxHeight: 500 },
          moderate: { quality: 0.75, maxWidth: 600, maxHeight: 450 },
          emergency: { quality: 0.5, maxWidth: 360, maxHeight: 360 },
        };
      case "Testframe2":
        return {
          primary: { quality: 0.95, maxWidth: 800, maxHeight: 800 },
          moderate: { quality: 0.6, maxWidth: 400, maxHeight: 400 },
          emergency: { quality: 0.5, maxWidth: 360, maxHeight: 360 },
        };
      default:
        return {
          primary: { quality: 0.75, maxWidth: 500, maxHeight: 500 },
          moderate: { quality: 0.6, maxWidth: 400, maxHeight: 400 },
          emergency: { quality: 0.5, maxWidth: 360, maxHeight: 360 },
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

  const runStorageWrite = useCallback(() => {
    if (!safeStorage.isAvailable()) return;
    const payload = latestStoragePayloadRef.current;
    if (!payload?.photos) return;

    const photosPayload = Array.isArray(payload.photos)
      ? payload.photos.map((entry) => {
          if (!entry) return null;
          if (typeof entry === "string") return entry;

          const { dataUrl, previewUrl } = entry;
          if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
            return dataUrl;
          }
          if (
            typeof previewUrl === "string" &&
            previewUrl.startsWith("data:")
          ) {
            return previewUrl;
          }
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

    try {
      if (!hasPersistablePhotos && !hasPersistableVideos) {
        safeStorage.removeItem("capturedPhotos");
        safeStorage.removeItem("capturedVideos");
      } else {
        safeStorage.setJSON("capturedPhotos", photosPayload);
        safeStorage.setJSON("capturedVideos", videosPayload);
      }
    } catch (error) {
      console.error("❌ Failed to persist captured media", error);
      alert(
        "Penyimpanan penuh atau tidak tersedia. Silakan kurangi foto yang disimpan."
      );
    } finally {
      latestStoragePayloadRef.current = { photos: null, videos: null };
    }
  }, [sanitizeVideosForStorage]);

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

    setCapturedPhotos([]);
    setCapturedVideos([]);

    if (!safeStorage.isAvailable()) return;

    clearScheduledStorage();
    latestStoragePayloadRef.current = { photos: null, videos: null };
    safeStorage.removeItem("capturedPhotos");
    safeStorage.removeItem("capturedVideos");
  }, [cleanupCapturedPhotoPreview, clearScheduledStorage]);

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

  useEffect(() => {
    clearCapturedMedia();

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
      });
  }, [clearCapturedMedia]);

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
      maxCaptures > 0 &&
      currentCount >= maxCaptures &&
      previousCount < maxCaptures &&
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
  }, [capturedPhotos.length, isMobile, maxCaptures]);

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

  const shouldMirrorVideo = useMemo(
    () => !isUsingBackCamera,
    [isUsingBackCamera]
  );
  const hasReachedMaxPhotos = capturedPhotos.length >= maxCaptures;
  const isCaptureDisabled =
    capturing || isVideoProcessing || hasReachedMaxPhotos;

  const determineVideoBitrate = (recordSeconds) => {
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

    return {
      id,
      blob,
      dataUrl: videoSource.dataUrl ?? null,
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
      isConverting: Boolean(
        blob && !(videoSource.dataUrl && videoSource.dataUrl.length > 0)
      ),
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

      const constraints = {
        audio: false,
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: desiredFacingMode,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraStreamRef.current = stream;
      setCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current
            .play()
            .then(() => {})
            .catch((error) => {
              console.error("❌ video play failed", error);
            });
        }
      }, 100);
    } catch (error) {
      console.error("❌ Error accessing camera", error);
      setCameraError(error.message);
      alert(`Error accessing camera: ${error.message}`);
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
          alert("Tidak ada foto yang bisa diproses dari galeri.");
          return;
        }

        const availableSlots = Math.max(0, maxCaptures - capturedPhotos.length);
        const acceptedEntries = availableSlots
          ? validEntries.slice(0, availableSlots)
          : [];
        const discardedEntries = availableSlots
          ? validEntries.slice(availableSlots)
          : validEntries;
        discardedEntries.forEach((entry) => cleanupCapturedPhotoPreview(entry));

        if (!acceptedEntries.length) {
          alert("Jumlah foto sudah mencapai batas maksimum untuk frame ini.");
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
      } catch (error) {
        console.error("❌ Failed to process uploaded photos", error);
        alert("Gagal memproses foto dari galeri. Coba pilih file lain.");
      } finally {
        event.target.value = "";
      }
    },
    [
      capturedPhotos,
      capturedVideos,
      cleanupCapturedPhotoPreview,
      maxCaptures,
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

      const recordingStream = baseStream.clone();

      const stopRecordingStream = () => {
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

      let recorder;
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

            resolve({
              blob,
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
    if (!videoRef.current) {
      throw new Error("Video element is not ready for capture");
    }

    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to access 2D context for capture canvas");
    }

    if (shouldMirrorVideo) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -width, 0, width, height);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, width, height);
    }

    const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
    const previewUrl = URL.createObjectURL(blob);

    const payload = {
      blob,
      previewUrl,
      width,
      height,
      capturedAt: Date.now(),
    };

    replaceCurrentPhoto(payload);
    setShowConfirmation(true);
    return payload;
  }, [replaceCurrentPhoto, shouldMirrorVideo]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || capturing || isVideoProcessing) return;
    if (!cameraActive) {
      alert("Aktifkan kamera terlebih dahulu sebelum mengambil foto.");
      return;
    }
    if (hasReachedMaxPhotos) {
      alert(`Maksimal ${maxCaptures} foto sudah tercapai untuk frame ini!`);
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

    setCapturing(true);
    setIsVideoProcessing(true);
    replaceCurrentVideo(null);

    const recordingController = startVideoRecording(effectiveTimer);
    if (recordingController) {
      recordingController.promise
        .then((videoData) => {
          replaceCurrentVideo(videoData);
        })
        .catch((error) => {
          console.error("❌ Failed to record video", error);
          alert("Perekaman video gagal. Silakan coba lagi.");
        })
        .finally(() => {
          setIsVideoProcessing(false);
        });
    } else {
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
              alert("Gagal mengambil foto. Silakan coba lagi.");
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

    let willReachMax = false;

    try {
      if (!currentPhoto.blob) {
        throw new Error("Current photo blob is missing");
      }

      const previewUrl = URL.createObjectURL(currentPhoto.blob);
      const photoEntry = {
        id: generatePhotoEntryId(),
        blob: currentPhoto.blob,
        dataUrl: null,
        previewUrl,
        width: currentPhoto.width ?? null,
        height: currentPhoto.height ?? null,
        capturedAt: currentPhoto.capturedAt ?? Date.now(),
        sizeBytes:
          typeof currentPhoto.blob.size === "number"
            ? currentPhoto.blob.size
            : null,
        source: "camera",
      };

      const basePhotos = Array.isArray(capturedPhotosRef.current)
        ? [...capturedPhotosRef.current]
        : [];
      const baseVideos = Array.isArray(capturedVideosRef.current)
        ? [...capturedVideosRef.current]
        : [];

      const appendedPhotos = [...basePhotos, photoEntry];
      const trimmedPhotos = appendedPhotos.slice(0, maxCaptures);
      const overflowPhotos = appendedPhotos.slice(maxCaptures);
      overflowPhotos.forEach((entry) => cleanupCapturedPhotoPreview(entry));

      const insertedIndex = trimmedPhotos.findIndex(
        (entry) => entry?.id === photoEntry.id
      );

      let preparedVideoEntry = null;
      if (currentVideo?.blob || currentVideo?.dataUrl) {
        const targetIndex =
          insertedIndex === -1 ? trimmedPhotos.length - 1 : insertedIndex;
        preparedVideoEntry = createCapturedVideoEntry(
          currentVideo,
          Math.max(0, targetIndex)
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
      scheduleStorageWrite(trimmedPhotos, trimmedVideos);

      willReachMax = trimmedPhotos.length >= maxCaptures;
    } catch (error) {
      console.error("❌ Error processing captured media", error);
      alert("Gagal memproses foto. Silakan coba lagi.");
      return;
    } finally {
      replaceCurrentPhoto(null);
      replaceCurrentVideo(null);
      setShowConfirmation(false);
      setIsVideoProcessing(false);

      if (cameraActive && willReachMax) {
        stopCamera();
      }
    }
  }, [
    cameraActive,
    capturedPhotosRef,
    capturedVideosRef,
    currentPhoto,
    currentVideo,
    createCapturedVideoEntry,
    maxCaptures,
    replaceCurrentPhoto,
    replaceCurrentVideo,
    cleanupCapturedPhotoPreview,
    scheduleStorageWrite,
    stopCamera,
  ]);

  const handleRetakePhoto = useCallback(() => {
    replaceCurrentPhoto(null);
    replaceCurrentVideo(null);
    setIsVideoProcessing(false);
    setShowConfirmation(false);
  }, [replaceCurrentPhoto, replaceCurrentVideo]);

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
    if (capturedPhotos.length < maxCaptures) {
      alert(
        `Anda perlu mengambil ${maxCaptures} foto untuk frame ini. Saat ini baru ${capturedPhotos.length} foto.`
      );
      return;
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
      quality: 0.8,
      maxWidth: 600,
      maxHeight: 600,
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
      const results = [];
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        if (!entry) {
          results.push(null);
          continue;
        }

        if (entry.dataUrl) {
          results.push({
            ...entry,
            blob: null,
            isConverting: false,
            conversionError: false,
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
            `Video ${index + 1} tidak memiliki data untuk diproses.`
          );
        }

        try {
          const dataUrl = await blobToDataURL(entry.blob);
          results.push({
            ...entry,
            dataUrl,
            blob: null,
            isConverting: false,
            conversionError: false,
            sizeBytes:
              typeof entry.sizeBytes === "number"
                ? entry.sizeBytes
                : entry.blob.size ?? null,
          });
        } catch (error) {
          console.error("❌ Gagal mengonversi video untuk editor", error);
          throw new Error(`Video ${index + 1} gagal diproses.`);
        }
      }
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
      alert("Foto gagal diproses. Mohon ulangi pengambilan atau coba lagi.");
      clearProcessingIndicator();
      return;
    }

    if (convertedPhotos.some((entry) => !entry || !entry.dataUrl)) {
      alert("Foto masih diproses. Mohon tunggu sebentar dan coba lagi.");
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
      alert(error?.message || "Video gagal diproses. Silakan coba lagi.");
      clearProcessingIndicator();
      return;
    }

    if (convertedVideos.some((entry) => entry && !entry.dataUrl)) {
      alert(
        "Video masih diproses atau gagal tersimpan. Mohon tunggu sebentar dan coba lagi."
      );
      clearProcessingIndicator();
      return;
    }

    const frameConfig = frameProvider.getCurrentConfig();
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
      const photoPayloadSource = convertedPhotos.map(
        (entry) => entry?.dataUrl ?? null
      );
      if (photoPayloadSource.some((value) => !value)) {
        throw new Error("Foto tidak lengkap untuk disimpan.");
      }

      flushStorageWrite();
      cleanUpStorage();

      const basePayload = preparePayload(photoPayloadSource, convertedVideos);
      const storageSize = calculateStorageSize(basePayload);

      if (parseFloat(storageSize.mb) > 4) {
        const emergencyCompressedBase = await compressPhotosArray(
          photoPayloadSource,
          {
            quality: frameName === "Testframe4" ? 0.7 : 0.6,
            maxWidth: frameName === "Testframe4" ? 500 : 400,
            maxHeight: frameName === "Testframe4" ? 400 : 400,
          }
        );
        const emergencyPayload = preparePayload(
          emergencyCompressedBase,
          convertedVideos
        );
        safeStorage.setJSON("capturedPhotos", emergencyPayload.photos);
        safeStorage.setJSON("capturedVideos", emergencyPayload.videos);
      } else {
        safeStorage.setJSON("capturedPhotos", basePayload.photos);
        safeStorage.setJSON("capturedVideos", basePayload.videos);
      }

      if (frameConfig) {
        try {
          safeStorage.setItem("selectedFrame", frameConfig.id);
          safeStorage.setJSON("frameConfig", frameConfig);
        } catch (error) {
          console.error(
            "❌ QuotaExceededError when saving frame config",
            error
          );
          alert(
            "Warning: Could not save frame configuration due to storage limits."
          );
        }
      }
    } catch (error) {
      console.error("❌ Gagal menyimpan data sebelum masuk editor", error);
      alert(
        error?.message || "Terjadi kesalahan saat menyiapkan data untuk editor."
      );
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
    navigate("/edit-photo");
  }, [
    capturedPhotos,
    capturedPhotosRef,
    capturedVideosRef,
    cleanUpStorage,
    flushStorageWrite,
    getFrameCompressionProfile,
    maxCaptures,
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
              {capturedPhotos.length}/{maxCaptures}
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
                    aspectRatio: videoAspectRatio.toString(),
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
          disabled={capturedPhotos.length < maxCaptures}
          style={{
            width: "100%",
            padding: isMobileVariant ? "0.75rem" : "0.65rem",
            background:
              capturedPhotos.length >= maxCaptures ? "#1E293B" : "#d7dde5",
            color: "white",
            border: "none",
            borderRadius: "999px",
            fontSize: isMobileVariant ? "0.95rem" : "0.88rem",
            fontWeight: 600,
            cursor:
              capturedPhotos.length >= maxCaptures ? "pointer" : "not-allowed",
            boxShadow: isMobileVariant
              ? "0 8px 16px rgba(0,0,0,0.1)"
              : "0 14px 28px rgba(30,41,59,0.15)",
            transition: "transform 0.2s ease",
            opacity: capturedPhotos.length >= maxCaptures ? 1 : 0.7,
          }}
        >
          {capturedPhotos.length >= maxCaptures
            ? "✨ Edit Photos"
            : `📝 ${capturedPhotos.length}/${maxCaptures} foto`}
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

    const containerStyle = isMobileVariant
      ? {
          display: "grid",
          gridTemplateColumns: "auto auto auto",
          justifyContent: "center",
          justifyItems: "center",
          alignItems: "center",
          columnGap: "1.05rem",
          rowGap: "0.3rem",
          marginBottom: "0.85rem",
          width: "100%",
        }
      : {
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
            if (capturedPhotos.length >= maxCaptures) return;
            fileInputRef.current?.click();
          }}
          disabled={capturedPhotos.length >= maxCaptures}
          title={
            capturedPhotos.length >= maxCaptures
              ? "Maksimal foto sudah tercapai"
              : "Pilih file dari galeri"
          }
          style={{
            padding: isMobileVariant ? "0.65rem 0.85rem" : "0.7rem 1.35rem",
            background:
              capturedPhotos.length >= maxCaptures ? "#f1f5f9" : "#fff",
            color: capturedPhotos.length >= maxCaptures ? "#94a3b8" : "#333",
            border: "1px solid #e2e8f0",
            borderRadius: "999px",
            fontSize: isMobileVariant ? "0.92rem" : "1rem",
            fontWeight: 500,
            cursor:
              capturedPhotos.length >= maxCaptures ? "not-allowed" : "pointer",
            boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            justifySelf: isMobileVariant ? "center" : "start",
            gridColumn: "1",
          }}
        >
          {capturedPhotos.length >= maxCaptures
            ? "Max photos reached"
            : isMobileVariant
            ? "Upload dari galeri"
            : `Choose file (${maxCaptures - capturedPhotos.length} left)`}
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
                padding: isMobileVariant ? "0.5rem 0.85rem" : "0.6rem 1rem",
                borderRadius: "999px",
                border: "1px solid #e2e8f0",
                background: "#fff",
                color: "#333",
                fontSize: isMobileVariant ? "0.95rem" : "1rem",
                cursor: capturing ? "not-allowed" : "pointer",
                boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
                minWidth: isMobileVariant ? "132px" : undefined,
              }}
            >
              {TIMER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} detik
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div
            style={{
              gridColumn: "2",
              justifySelf: "center",
              minHeight: isMobileVariant ? "48px" : 0,
            }}
          />
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
        ref={sectionRef}
        style={{
          background: "#fff",
          borderRadius: isMobileVariant ? "18px" : "20px",
          overflow: "hidden",
          position: "relative",
          minHeight: isMobileVariant ? "min(320px, 56vh)" : "320px",
          height: isMobileVariant ? "min(320px, 56vh)" : undefined,
          maxWidth: isMobileVariant ? "100%" : "640px",
          width: "100%",
          margin: "0 auto",
          aspectRatio: isMobileVariant ? undefined : "4 / 3",
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
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: shouldMirrorVideo ? "scaleX(-1)" : "none",
                background: "#000",
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
            {cameraError && (
              <div
                style={{
                  position: "absolute",
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
            {isMobileVariant && cameraActive && !isSwitchingCamera && (
              <button
                onClick={handleSwitchCamera}
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "14px",
                  width: "44px",
                  height: "44px",
                  borderRadius: "22px",
                  border: "none",
                  background: "rgba(15,23,42,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={flipIcon}
                  alt="Flip camera"
                  style={{ width: "20px", height: "20px" }}
                />
              </button>
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
            gap: "0.65rem",
            padding: "0.95rem 0",
          }}
        >
          <div
            style={{
              fontSize: "0.9rem",
              fontWeight: 600,
              color: hasReachedMaxPhotos ? "#ef4444" : "#475569",
              textAlign: "center",
            }}
          >
            Foto: {capturedPhotos.length}/{maxCaptures}
            {hasReachedMaxPhotos && " - maksimal tercapai!"}
          </div>

          <button
            onClick={handleCapture}
            disabled={disableCapture}
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              border: "none",
              background: disableCapture ? "#e2e8f0" : "#E8A889",
              color: "white",
              fontSize: "1.4rem",
              fontWeight: 700,
              boxShadow: disableCapture
                ? "none"
                : "0 20px 40px rgba(232,168,137,0.4)",
              cursor: disableCapture ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {capturedPhotos.length >= maxCaptures
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
          Foto: {capturedPhotos.length}/{maxCaptures}
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
                <span style={headingLineOneStyle}>Pilih momen berhargamu</span>
                <span style={headingLineTwoStyle}>
                  bersama
                  <img src={fremioLogo} alt="Fremio" style={headingLogoStyle} />
                </span>
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
            style={{
              ...headingStyles,
              marginTop: "0.1rem",
            }}
          >
            <span style={headingLineOneStyle}>Pilih momen berhargamu</span>
            <span style={headingLineTwoStyle}>
              bersama
              <img src={fremioLogo} alt="Fremio" style={headingLogoStyle} />
            </span>
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
