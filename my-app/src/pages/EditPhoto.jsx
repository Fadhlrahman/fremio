import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { getFrameConfig, FRAME_CONFIGS } from '../config/frameConfigs.js';
import { reloadFrameConfig as reloadFrameConfigFromManager } from '../config/frameConfigManager.js';
import frameProvider from '../utils/frameProvider.js';
import safeStorage from '../utils/safeStorage.js';
import QRCode from 'qrcode';
import { convertBlobToMp4, ensureFfmpeg } from '../utils/videoTranscoder.js';
import swapIcon from '../assets/swap.png';
import shiftIcon from '../assets/Shift.png';
// FremioSeries Imports.
import FremioSeriesBlue2 from '../assets/frames/FremioSeries/FremioSeries-2/FremioSeries-blue-2.png';
import FremioSeriesBabyblue3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-babyblue-3.png';
import FremioSeriesBlack3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-black-3.png';
import FremioSeriesBlue3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-blue-3.png';
import FremioSeriesCream3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-cream-3.png';
import FremioSeriesGreen3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-green-3.png';
import FremioSeriesMaroon3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-maroon-3.png';
import FremioSeriesOrange3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-orange-3.png';
import FremioSeriesPink3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-pink-3.png';
import FremioSeriesPurple3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-purple-3.png';
import FremioSeriesWhite3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-white-3.png';
import FremioSeriesBlue4 from '../assets/frames/FremioSeries/FremioSeries-4/FremioSeries-blue-4.png';
import EverythingYouAre3x2 from '../assets/frames/Everything You Are.png';

const FILTER_PRESETS = [
  { id: 'none', label: 'Original', description: 'Tanpa filter, warna asli foto', css: '' },
  { id: 'warm', label: 'Warm Glow', description: 'Tona hangat dan sedikit saturasi', css: 'sepia(0.15) saturate(1.2) hue-rotate(-5deg) contrast(1.05)' },
  { id: 'mono', label: 'Monokrom', description: 'Hitam putih klasik', css: 'grayscale(1) contrast(1.1)' },
  { id: 'vintage', label: 'Vintage', description: 'Nuansa retro lembut', css: 'sepia(0.4) saturate(0.9) brightness(1.05) contrast(0.95)' },
  { id: 'cool', label: 'Cool Breeze', description: 'Nada dingin dan tajam', css: 'hue-rotate(15deg) saturate(1.15) contrast(1.05)' },
  { id: 'vivid', label: 'Vivid', description: 'Warna lebih hidup dan kontras', css: 'saturate(1.35) contrast(1.15)' },
  { id: 'soft', label: 'Soft Pastel', description: 'Lembut dengan warna pastel', css: 'saturate(0.85) brightness(1.1)' },
  { id: 'dramatic', label: 'Dramatis', description: 'Kontras tinggi dengan bayangan tegas', css: 'contrast(1.3) brightness(0.95) saturate(1.05)' }
];

const FILTER_PRESET_MAP = FILTER_PRESETS.reduce((acc, preset) => {
  acc[preset.id] = preset;
  return acc;
}, {});

const FILTER_PIPELINES = {
  none: [],
  warm: [
    { type: 'sepia', amount: 0.15 },
    { type: 'saturate', amount: 1.2 },
    { type: 'hueRotate', amount: -5 },
    { type: 'contrast', amount: 1.05 }
  ],
  mono: [
    { type: 'grayscale', amount: 1 },
    { type: 'contrast', amount: 1.1 }
  ],
  vintage: [
    { type: 'sepia', amount: 0.4 },
    { type: 'saturate', amount: 0.9 },
    { type: 'brightness', amount: 1.05 },
    { type: 'contrast', amount: 0.95 }
  ],
  cool: [
    { type: 'hueRotate', amount: 15 },
    { type: 'saturate', amount: 1.15 },
    { type: 'contrast', amount: 1.05 }
  ],
  vivid: [
    { type: 'saturate', amount: 1.35 },
    { type: 'contrast', amount: 1.15 }
  ],
  soft: [
    { type: 'saturate', amount: 0.85 },
    { type: 'brightness', amount: 1.1 }
  ],
  dramatic: [
    { type: 'contrast', amount: 1.3 },
    { type: 'brightness', amount: 0.95 },
    { type: 'saturate', amount: 1.05 }
  ]
};

const ZIP_GENERATION_TIMEOUT_MS = 35000;
const DEFAULT_PREVIEW_WIDTH = 280;
const DEFAULT_PREVIEW_HEIGHT = DEFAULT_PREVIEW_WIDTH / (2 / 3);
const AUTO_SELECT_INITIAL_SLOT_KEY = 'editorAutoSelectFirstSlot';

// Helper function to detect mobile devices
const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

const detectCanvasFilterSupport = () => {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    return Boolean(context && typeof context.filter === 'string');
  } catch (error) {
    console.warn('⚠️ Canvas filter detection failed:', error);
    return false;
  }
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const applyPipelineToImageData = (imageData, pipeline) => {
  if (!imageData || !pipeline?.length) return;
  const data = imageData.data;
  const length = data.length;

  const applyBrightness = (amount) => {
    for (let i = 0; i < length; i += 4) {
      data[i] = clamp(data[i] * amount, 0, 255);
      data[i + 1] = clamp(data[i + 1] * amount, 0, 255);
      data[i + 2] = clamp(data[i + 2] * amount, 0, 255);
    }
  };

  const applyContrast = (amount) => {
    const factor = amount;
    const intercept = 128 * (1 - factor);
    for (let i = 0; i < length; i += 4) {
      data[i] = clamp(data[i] * factor + intercept, 0, 255);
      data[i + 1] = clamp(data[i + 1] * factor + intercept, 0, 255);
      data[i + 2] = clamp(data[i + 2] * factor + intercept, 0, 255);
    }
  };

  const applyGrayscale = (amount) => {
    const mix = clamp(amount, 0, 1);
    for (let i = 0; i < length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = clamp(gray * mix + data[i] * (1 - mix), 0, 255);
      data[i + 1] = clamp(gray * mix + data[i + 1] * (1 - mix), 0, 255);
      data[i + 2] = clamp(gray * mix + data[i + 2] * (1 - mix), 0, 255);
    }
  };

  const applySepia = (amount) => {
    const mix = clamp(amount, 0, 1);
    for (let i = 0; i < length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const sr = clamp(r * 0.393 + g * 0.769 + b * 0.189, 0, 255);
      const sg = clamp(r * 0.349 + g * 0.686 + b * 0.168, 0, 255);
      const sb = clamp(r * 0.272 + g * 0.534 + b * 0.131, 0, 255);
      data[i] = clamp(sr * mix + r * (1 - mix), 0, 255);
      data[i + 1] = clamp(sg * mix + g * (1 - mix), 0, 255);
      data[i + 2] = clamp(sb * mix + b * (1 - mix), 0, 255);
    }
  };

  const applySaturate = (amount) => {
    const scale = clamp(amount, 0, 4);
    for (let i = 0; i < length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = r * 0.299 + g * 0.587 + b * 0.114;
      data[i] = clamp(gray + (r - gray) * scale, 0, 255);
      data[i + 1] = clamp(gray + (g - gray) * scale, 0, 255);
      data[i + 2] = clamp(gray + (b - gray) * scale, 0, 255);
    }
  };

  const applyHueRotate = (degrees) => {
    const angle = (degrees * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let i = 0; i < length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      data[i] = clamp(
        r * (0.213 + cos * 0.787 - sin * 0.213) +
          g * (0.715 - cos * 0.715 - sin * 0.715) +
          b * (0.072 - cos * 0.072 + sin * 0.928),
        0,
        255
      );
      data[i + 1] = clamp(
        r * (0.213 - cos * 0.213 + sin * 0.143) +
          g * (0.715 + cos * 0.285 + sin * 0.140) +
          b * (0.072 - cos * 0.072 - sin * 0.283),
        0,
        255
      );
      data[i + 2] = clamp(
        r * (0.213 - cos * 0.213 - sin * 0.787) +
          g * (0.715 - cos * 0.715 + sin * 0.715) +
          b * (0.072 + cos * 0.928 + sin * 0.072),
        0,
        255
      );
    }
  };

  pipeline.forEach((step) => {
    if (!step) return;
    const { type, amount } = step;
    switch (type) {
      case 'brightness':
        applyBrightness(typeof amount === 'number' ? amount : 1);
        break;
      case 'contrast':
        applyContrast(typeof amount === 'number' ? amount : 1);
        break;
      case 'grayscale':
        applyGrayscale(typeof amount === 'number' ? amount : 1);
        break;
      case 'sepia':
        applySepia(typeof amount === 'number' ? amount : 1);
        break;
      case 'saturate':
        applySaturate(typeof amount === 'number' ? amount : 1);
        break;
      case 'hueRotate':
        applyHueRotate(typeof amount === 'number' ? amount : 0);
        break;
      default:
        break;
    }
  });
};

export default function EditPhoto() {
  const isBrowser = typeof window !== 'undefined';

  const navigate = useNavigate();

  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [slotPhotos, setSlotPhotos] = useState({});
  const [slotVideos, setSlotVideos] = useState({});
  const [photoPositions, setPhotoPositions] = useState({});
  const [photoTransforms, setPhotoTransforms] = useState({});
  const [photoDimensions, setPhotoDimensions] = useState({});
  const [photoFilters, setPhotoFilters] = useState({});
  const [frameConfig, setFrameConfig] = useState(null);
  const [frameImage, setFrameImage] = useState(null);
  const [selectedFrame, setSelectedFrame] = useState('');
  const [swapModeActive, setSwapModeActive] = useState(false);
  const [swapSourceSlot, setSwapSourceSlot] = useState(null);
  const [selectedPhotoForEdit, setSelectedPhotoForEdit] = useState(null);
  const [draggedPhoto, setDraggedPhoto] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [panModeEnabled, setPanModeEnabled] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [debugMode, setDebugMode] = useState(false);
  const [configReloadKey, setConfigReloadKey] = useState(0);
  const [isReloading, setIsReloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [printCode, setPrintCode] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [hasDevAccess, setHasDevAccess] = useState(false);
  const [devAccessInitialized, setDevAccessInitialized] = useState(!isBrowser);
  const [devTokenInput, setDevTokenInput] = useState('');
  const [devAuthStatus, setDevAuthStatus] = useState({ loading: false, error: null, success: false });
  const [showDevUnlockPanel, setShowDevUnlockPanel] = useState(false);
  const framePreviewRef = useRef(null);
  const [framePreviewSize, setFramePreviewSize] = useState(() => ({
    width: DEFAULT_PREVIEW_WIDTH,
    height: DEFAULT_PREVIEW_HEIGHT
  }));
  const slotElementsRef = useRef(new Map());
  const slotObserverRef = useRef(null);
  const slotRefCallbacksRef = useRef({});
  const autoSelectedSlotRef = useRef(false);
  const [shouldAutoSelectInitialSlot, setShouldAutoSelectInitialSlot] = useState(() => {
    if (!isBrowser) return false;
    try {
      const flag = safeStorage.getItem(AUTO_SELECT_INITIAL_SLOT_KEY);
      if (flag === 'true') {
        safeStorage.removeItem(AUTO_SELECT_INITIAL_SLOT_KEY);
        return true;
      }
    } catch (error) {
      console.warn('⚠️ Failed to read editor auto-select flag', error);
    }
    return false;
  });
  const [slotMeasurements, setSlotMeasurements] = useState({});

  const [viewport, setViewport] = useState(() => ({
    width: isBrowser ? window.innerWidth : 1280,
    height: isBrowser ? window.innerHeight : 800
  }));

  useEffect(() => {
    if (!isBrowser) return;
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isBrowser]);

  useEffect(() => {
    if (!isBrowser) return;
    const node = framePreviewRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      setFramePreviewSize((prev) => {
        const next = { width: rect.width, height: rect.height };
        if (Math.abs(prev.width - next.width) < 0.5 && Math.abs(prev.height - next.height) < 0.5) {
          return prev;
        }
        return next;
      });
    };

    updateSize();

    let observer;
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(() => updateSize());
      observer.observe(node);
    } else {
      window.addEventListener('resize', updateSize);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      } else {
        window.removeEventListener('resize', updateSize);
      }
    };
  }, [isBrowser, viewport.width, viewport.height, frameConfig?.id]);

  const applySlotMeasurement = useCallback((slotIndex, width, height) => {
    if (!Number.isInteger(slotIndex)) return;
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) return;

    setSlotMeasurements((prev = {}) => {
      const existing = prev[slotIndex];
      if (existing && Math.abs(existing.width - width) < 0.5 && Math.abs(existing.height - height) < 0.5) {
        return prev;
      }
      return {
        ...prev,
        [slotIndex]: { width, height }
      };
    });
  }, []);

  const removeSlotMeasurement = useCallback((slotIndex) => {
    setSlotMeasurements((prev = {}) => {
      if (!Object.prototype.hasOwnProperty.call(prev, slotIndex)) {
        return prev;
      }
      const next = { ...prev };
      delete next[slotIndex];
      return next;
    });
  }, []);

  const assignSlotElement = useCallback((slotIndex, element) => {
    const map = slotElementsRef.current;
    const previousElement = map.get(slotIndex);
    if (previousElement === element) return;

    if (previousElement && slotObserverRef.current) {
      slotObserverRef.current.unobserve(previousElement);
    }

    if (element) {
      map.set(slotIndex, element);
      element.setAttribute('data-slot-index', String(slotIndex));
      if (slotObserverRef.current) {
        slotObserverRef.current.observe(element);
      }
      const rect = element.getBoundingClientRect();
      applySlotMeasurement(slotIndex, rect.width, rect.height);
    } else {
      map.delete(slotIndex);
      removeSlotMeasurement(slotIndex);
    }
  }, [applySlotMeasurement, removeSlotMeasurement]);

  const getSlotRef = useCallback((slotIndex) => {
    const cache = slotRefCallbacksRef.current;
    if (!cache[slotIndex]) {
      cache[slotIndex] = (element) => assignSlotElement(slotIndex, element);
    }
    return cache[slotIndex];
  }, [assignSlotElement]);

  useEffect(() => {
    if (!isBrowser) return;
    if (typeof ResizeObserver !== 'function') return;

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const target = entry.target;
        const slotAttr = target.getAttribute('data-slot-index');
        if (slotAttr === null || slotAttr === undefined) return;
        const slotIndex = Number(slotAttr);
        if (Number.isNaN(slotIndex)) return;
        const { width, height } = entry.contentRect;
        applySlotMeasurement(slotIndex, width, height);
      });
    });

    slotObserverRef.current = observer;
    slotElementsRef.current.forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
      slotObserverRef.current = null;
    };
  }, [isBrowser, applySlotMeasurement]);

  useEffect(() => {
    slotRefCallbacksRef.current = {};
    setSlotMeasurements({});
    const map = slotElementsRef.current;
    if (slotObserverRef.current) {
      map.forEach((element) => {
        if (element) {
          slotObserverRef.current.unobserve(element);
        }
      });
    }
    slotElementsRef.current = new Map();
  }, [frameConfig?.id]);

  const isMobile = viewport.width <= 768;
  const isCompact = viewport.height <= 720;

  const previewWidth = framePreviewSize.width || DEFAULT_PREVIEW_WIDTH;
  const previewHeight = framePreviewSize.height || DEFAULT_PREVIEW_HEIGHT;

  const canvasFilterSupported = useMemo(() => (isBrowser ? detectCanvasFilterSupport() : false), [isBrowser]);
  const isDevEnv = import.meta.env.DEV;
  const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  const getDevApiBaseUrl = () => {
    // Use HTTPS for backend in development (matches frontend)
    return 'https://localhost:3001';
  };

  const inferredBaseUrl = useMemo(() => {
    if (rawApiBaseUrl && rawApiBaseUrl.trim().length > 0) {
      return rawApiBaseUrl.trim();
    }

    if (isDevEnv) {
      return getDevApiBaseUrl();
    }

    if (isBrowser) {
      return window.location.origin;
    }

    return '';
  }, [isBrowser, isDevEnv, rawApiBaseUrl]);

  const apiBaseUrl = useMemo(() => inferredBaseUrl.replace(/\/$/, ''), [inferredBaseUrl]);

  useEffect(() => {
    if (devAccessInitialized) return;

    if (!isBrowser) {
      setDevAccessInitialized(true);
      return;
    }

    try {
      sessionStorage.removeItem('fremioDevAccess');
    } catch (error) {
      console.warn('⚠️ Failed to reset developer access flag from sessionStorage.', error);
    } finally {
      setHasDevAccess(false);
      setDevAccessInitialized(true);
    }
  }, [devAccessInitialized, isBrowser]);

  const resetSwapMode = useCallback(() => {
    setSwapModeActive(false);
    setSwapSourceSlot(null);
    setDraggedPhoto(null);
    setDragOverSlot(null);
  }, []);

  const beginSwapFromSlot = useCallback((slotIndex) => {
    setSwapSourceSlot(slotIndex);
    setSwapModeActive(true);
  }, []);

  const getSlotPhotosStorageKey = (id) => (id ? `slotPhotos:${id}` : null);
  const persistSlotPhotos = (id, data) => {
    const storageKey = getSlotPhotosStorageKey(id);
    if (!storageKey) return;
    try {
      safeStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn('⚠️ Failed to persist slotPhotos for', id, err);
    }
  };

  const getSlotVideosStorageKey = (id) => (id ? `slotVideos:${id}` : null);
  const persistSlotVideos = (id, data) => {
    const storageKey = getSlotVideosStorageKey(id);
    if (!storageKey) return;
    try {
      safeStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn('⚠️ Failed to persist slotVideos for', id, err);
    }
  };

  const clearCapturedMediaStorage = (frameId) => {
    if (!isBrowser) return;
    try {
      safeStorage.removeItem('capturedPhotos');
      safeStorage.removeItem('capturedVideos');
      const slotPhotosKey = getSlotPhotosStorageKey(frameId);
      const slotVideosKey = getSlotVideosStorageKey(frameId);
      if (slotPhotosKey) {
        safeStorage.removeItem(slotPhotosKey);
      }
      if (slotVideosKey) {
        safeStorage.removeItem(slotVideosKey);
      }
    } catch (err) {
      console.warn('⚠️ Failed to clear captured media storage:', err);
    }
  };

  useEffect(() => {
    resetSwapMode();
  }, [frameConfig?.id, resetSwapMode]);

  useEffect(() => {
    if (swapModeActive) {
      setPanModeEnabled(false);
    }
  }, [swapModeActive]);

  useEffect(() => {
    if (selectedPhotoForEdit === null) {
      setPanModeEnabled(false);
    }
  }, [selectedPhotoForEdit]);

  useEffect(() => {
    if (!panModeEnabled && isDraggingPhoto) {
      setIsDraggingPhoto(false);
    }
  }, [panModeEnabled, isDraggingPhoto]);

  useEffect(() => {
    return () => {
      try {
        safeStorage.removeItem('capturedPhotos');
        safeStorage.removeItem('capturedVideos');

        const frameId = frameConfig?.id || frameProvider.getCurrentFrameName();
        const slotPhotosKey = getSlotPhotosStorageKey(frameId);
        const slotVideosKey = getSlotVideosStorageKey(frameId);

        if (slotPhotosKey) {
          safeStorage.removeItem(slotPhotosKey);
        }
        if (slotVideosKey) {
          safeStorage.removeItem(slotVideosKey);
        }
      } catch (error) {
        console.warn('⚠️ Failed to clear captured media on editor exit', error);
      }
    };
  }, [frameConfig?.id]);

  const recordedClips = useMemo(() => {
    console.log('🔍 Building recordedClips from videos array:', videos);
    const clips = videos
      .map((clip, index) => {
        if (!clip) {
          console.log(`📹 Video ${index}: null/undefined`);
          return null;
        }
        
        // Check various ways video data might exist
        const hasDataUrl = !!clip.dataUrl;
        const hasBlob = !!clip.blob;
        const hasId = !!clip.id;
        
        console.log(`📹 Video ${index}:`, {
          hasDataUrl,
          hasBlob,
          hasId,
          type: typeof clip,
          keys: Object.keys(clip || {})
        });
        
        // Accept video if it has any of these indicators
        if (!hasDataUrl && !hasBlob && !hasId) {
          console.log(`⚠️ Video ${index}: No valid data source found`);
          return null;
        }
        
        return { index, clip };
      })
      .filter(Boolean);
    
    console.log('✅ recordedClips result:', clips.length, 'clips');
    return clips;
  }, [videos]);

  const pagePadding = useMemo(() => {
    if (!isMobile) {
      return '1.5rem';
    }

    const topPadding = `calc(env(safe-area-inset-top, 0px) + ${isCompact ? '0.75rem' : '1rem'})`;
    const sidePadding = 'clamp(0.75rem, 5vw, 1.5rem)';
    const bottomPadding = `calc(env(safe-area-inset-bottom, 0px) + ${isCompact ? '1rem' : '1.25rem'})`;

    return `${topPadding} ${sidePadding} ${bottomPadding}`;
  }, [isCompact, isMobile]);

  const photoVideoMap = useMemo(() => {
    const map = new Map();
    photos.forEach((photo, index) => {
      if (!photo) return;
      const video = videos[index];
      if (!video || !video.dataUrl) return;
      map.set(photo, {
        ...video,
        baseVideoIndex: index
      });
    });
    return map;
  }, [photos, videos]);

  const formatSeconds = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    return Number.isInteger(value) ? `${value}` : value.toFixed(1);
  };


  const getFilterCssValue = (filterId) => {
    const preset = FILTER_PRESET_MAP[filterId];
    return preset?.css ?? '';
  };

  const getSlotFilterCss = (slotIndex) => {
    if (slotIndex === null || slotIndex === undefined) return 'none';
    const filterId = resolveSlotFilterId(slotIndex);
    const rawCss = getFilterCssValue(filterId);
    if (typeof rawCss === 'string' && rawCss.trim().length > 0 && rawCss !== 'none') {
      return rawCss;
    }
    return 'none';
  };

  const resolveSlotFilterId = (slotIndex) => {
    if (slotIndex === null || slotIndex === undefined) return 'none';
    return Object.prototype.hasOwnProperty.call(photoFilters, slotIndex)
      ? photoFilters[slotIndex]
      : 'none';
  };

  const applyFilterToSlot = (slotIndex, filterId) => {
    if (slotIndex === null || slotIndex === undefined) return;
    setPhotoFilters((prev = {}) => {
      const next = { ...prev, [slotIndex]: filterId };
      return next;
    });
  };

  const applyFilterToAllSlots = (filterId) => {
    if (!frameConfig?.slots) return;
    setPhotoFilters((prev = {}) => {
      const next = { ...prev };
      frameConfig.slots.forEach((_, index) => {
        next[index] = filterId;
      });
      return next;
    });
  };

  const allSlotsShareFilter = (filterId) => {
    if (!frameConfig?.slots) return false;
    return frameConfig.slots.every((_, index) => resolveSlotFilterId(index) === filterId);
  };

  const anySlotHasFilter = () => {
    if (!frameConfig?.slots) return false;
    return frameConfig.slots.some((_, index) => resolveSlotFilterId(index) !== 'none');
  };

  const drawImageWithFilter = (ctx, image, dx, dy, dWidth, dHeight, options = {}) => {
    if (!ctx || !image) return;
    if (!Number.isFinite(dWidth) || !Number.isFinite(dHeight) || dWidth === 0 || dHeight === 0) {
      return;
    }

    const { filterId: filterIdOverride, filterCss: filterCssOverride } = options;
    const effectiveFilterId = filterIdOverride ?? 'none';
    const cssFilter = filterCssOverride ?? (effectiveFilterId === 'none' ? 'none' : getFilterCssValue(effectiveFilterId));

    if (canvasFilterSupported && cssFilter && cssFilter !== 'none') {
      ctx.filter = cssFilter;
      ctx.drawImage(image, dx, dy, dWidth, dHeight);
      ctx.filter = 'none';
      return;
    }

    if (!effectiveFilterId || effectiveFilterId === 'none') {
      ctx.drawImage(image, dx, dy, dWidth, dHeight);
      return;
    }

    const pipeline = FILTER_PIPELINES[effectiveFilterId];
    if (!pipeline || pipeline.length === 0) {
      ctx.drawImage(image, dx, dy, dWidth, dHeight);
      return;
    }

    if (typeof document === 'undefined') {
      ctx.drawImage(image, dx, dy, dWidth, dHeight);
      return;
    }

    const targetWidth = Math.max(1, Math.round(dWidth));
    const targetHeight = Math.max(1, Math.round(dHeight));

    const offscreen = document.createElement('canvas');
    offscreen.width = targetWidth;
    offscreen.height = targetHeight;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) {
      ctx.drawImage(image, dx, dy, dWidth, dHeight);
      return;
    }

    offCtx.imageSmoothingEnabled = ctx.imageSmoothingEnabled;
    if (ctx.imageSmoothingQuality) {
      offCtx.imageSmoothingQuality = ctx.imageSmoothingQuality;
    }

    offCtx.drawImage(image, 0, 0, targetWidth, targetHeight);
    const imageData = offCtx.getImageData(0, 0, targetWidth, targetHeight);
    applyPipelineToImageData(imageData, pipeline);
    offCtx.putImageData(imageData, 0, 0);

    ctx.drawImage(offscreen, dx, dy, dWidth, dHeight);
  };

  const getPhotoSourceForSlot = (slotIndex) => {
    if (!frameConfig || slotIndex === null || slotIndex === undefined) return null;

    if (frameConfig?.duplicatePhotos) {
      if (slotPhotos[slotIndex]) {
        return slotPhotos[slotIndex];
      }
      const duplicateSlot = frameConfig.slots?.[slotIndex];
      if (duplicateSlot) {
        const photoIndex = duplicateSlot.photoIndex !== undefined ? duplicateSlot.photoIndex : slotIndex;
        return photos[photoIndex] ?? null;
      }
      return null;
    }

    const slot = frameConfig.slots?.[slotIndex];
    if (!slot) return null;
    const photoIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
    return photos[photoIndex] ?? null;
  };

  const resolveVideoForPhoto = (photoData) => {
    if (!photoData) return null;
    const mapped = photoVideoMap.get(photoData);
    if (!mapped) return null;
    const { baseVideoIndex, ...rest } = mapped;
    return {
      ...rest,
      baseVideoIndex
    };
  };

  const getVideoSourceForSlot = (slotIndex) => {
    if (!frameConfig || slotIndex === null || slotIndex === undefined) return null;

    const slot = frameConfig.slots?.[slotIndex];
    if (!slot) return null;

    let targetPhoto = null;

    if (frameConfig?.duplicatePhotos) {
      targetPhoto = slotPhotos[slotIndex];
      if (!targetPhoto) {
        const fallbackIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
        targetPhoto = photos[fallbackIndex] ?? null;
      }
    } else {
      targetPhoto = slotPhotos[slotIndex];
      if (!targetPhoto) {
        const fallbackIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
        targetPhoto = photos[fallbackIndex] ?? null;
      }
    }

    const resolvedByPhoto = resolveVideoForPhoto(targetPhoto);
    if (resolvedByPhoto) {
      return {
        ...resolvedByPhoto,
        baseVideoIndex: resolvedByPhoto.baseVideoIndex ?? (slot.photoIndex !== undefined ? slot.photoIndex : slotIndex)
      };
    }

    const slotOverride = slotVideos[slotIndex];
    if (slotOverride && slotOverride.dataUrl) {
      const baseVideoIndex = slotOverride.baseVideoIndex ?? (slot.photoIndex !== undefined ? slot.photoIndex : slotIndex);
      return {
        ...slotOverride,
        baseVideoIndex
      };
    }

    if (frameConfig?.duplicatePhotos) {
      const sharedIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
      const sharedOverride = slotVideos[sharedIndex];
      if (sharedOverride && sharedOverride.dataUrl) {
        const baseVideoIndex = sharedOverride.baseVideoIndex ?? sharedIndex;
        return {
          ...sharedOverride,
          baseVideoIndex
        };
      }
    }

    const baseIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
    const fallbackVideo = videos[baseIndex];
    if (fallbackVideo && fallbackVideo.dataUrl) {
      return {
        ...fallbackVideo,
        baseVideoIndex: baseIndex
      };
    }

    return null;
  };

  const createImageFromDataUrl = (dataUrl) => new Promise((resolve, reject) => {
    if (!dataUrl) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (error) => {
      console.error('❌ Failed to load image:', error);
      resolve(null);
    };
    img.src = dataUrl;
  });

  const triggerBlobDownload = (blob, filename) => {
    console.log('📥 triggerBlobDownload called:', {
      hasBlob: !!blob,
      blobSize: blob?.size,
      blobType: blob?.type,
      filename
    });
    
    if (!blob) {
      console.warn('⚠️ No blob provided for download');
      return;
    }

    const isIOSDevice = (() => {
      if (typeof navigator === 'undefined') return false;
      const ua = navigator.userAgent || navigator.platform || '';
      const iOSPlatforms = /iPad|iPhone|iPod|iPadOS/i;
      const isTouchMac = /Macintosh/i.test(ua) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
      return iOSPlatforms.test(ua) || isTouchMac;
    })();
    
    console.log('📱 Device detection:', {
      isIOSDevice,
      userAgent: navigator.userAgent
    });

    const url = URL.createObjectURL(blob);
    console.log('📥 Blob URL created:', url);

    const triggerAnchorClick = (href, options = {}) => {
      const link = document.createElement('a');
      link.href = href;
      link.download = filename;
      if (options.target) link.target = options.target;
      if (options.rel) link.rel = options.rel;

      document.body.appendChild(link);

      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });

      const clickSucceeded = link.dispatchEvent(clickEvent);
      document.body.removeChild(link);
      return clickSucceeded;
    };

    if (isIOSDevice) {
      console.log('📱 iOS device - using iOS download flow');
      // Attempt direct anchor click. iOS often requires _blank target.
      const clicked = triggerAnchorClick(url, { target: '_blank', rel: 'noopener' });
      console.log('📥 Anchor click result:', clicked);
      
      if (!clicked) {
        console.log('📥 Anchor click failed, trying data URL fallback...');
        // Fallback: convert to data URL and assign window.location
        const reader = new FileReader();
        reader.onloadend = () => {
          console.log('📥 FileReader loaded, converting to data URL...');
          const dataUrl = reader.result;
          if (typeof dataUrl === 'string') {
            const opened = triggerAnchorClick(dataUrl, { target: '_blank', rel: 'noopener' });
            console.log('📥 Data URL anchor click result:', opened);
            if (!opened) {
              console.log('📥 Fallback to window.location.href with data URL');
              window.location.href = dataUrl;
            }
          } else {
            console.log('📥 Fallback to window.location.href with blob URL');
            window.location.href = url;
          }
        };
        reader.onerror = (error) => {
          console.warn('⚠️ Failed to convert blob to data URL for iOS download fallback:', error);
          window.location.href = url;
        };
        reader.readAsDataURL(blob);
      }

      // Delay revocation to allow browser to finish download/open.
      setTimeout(() => {
        console.log('📥 Revoking blob URL (iOS)');
        URL.revokeObjectURL(url);
      }, 4000);
      return;
    }

    console.log('💻 Non-iOS device - using standard download flow');
    const clicked = triggerAnchorClick(url);
    console.log('📥 Anchor click result:', clicked);
    
    if (!clicked) {
      console.log('📥 Fallback to window.location.href');
      window.location.href = url;
    }

    setTimeout(() => {
      console.log('📥 Revoking blob URL');
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const dataUrlToBlob = async (dataUrl) => {
    if (!dataUrl) return null;

    if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
      try {
        const commaIndex = dataUrl.indexOf(',');
        if (commaIndex === -1) {
          console.warn('⚠️ Invalid data URL: missing comma separator');
          return null;
        }

        const header = dataUrl.slice(0, commaIndex);
        const dataPortion = dataUrl.slice(commaIndex + 1);
        const isBase64 = /;base64/i.test(header);
        const mimeMatch = header.match(/^data:([^;]+)/i);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

        const decodeBase64 = (input) => {
          if (typeof atob === 'function') {
            return atob(input);
          }
          if (typeof Buffer !== 'undefined') {
            return Buffer.from(input, 'base64').toString('binary');
          }
          throw new Error('Base64 decoding is not supported in this environment');
        };

        let binaryString;
        if (isBase64) {
          binaryString = decodeBase64(dataPortion);
        } else {
          binaryString = decodeURIComponent(dataPortion);
        }

        const length = binaryString.length;
        const arrayBuffer = new Uint8Array(length);
        for (let i = 0; i < length; i += 1) {
          arrayBuffer[i] = binaryString.charCodeAt(i);
        }

        return new Blob([arrayBuffer], { type: mimeType });
      } catch (inlineError) {
        console.error('❌ Failed to parse inline data URL:', inlineError);
        return null;
      }
    }

    try {
      const response = await fetch(dataUrl);
      if (!response.ok) {
        console.warn('⚠️ Failed to fetch data URL for blob conversion');
        return null;
      }
      return await response.blob();
    } catch (error) {
      console.error('❌ Failed to convert data URL to blob:', error);
      return null;
    }
  };

  const downloadMediaBundle = async ({
    photoBlob,
    photoFilename,
    framedVideoResult,
    bundleName,
    extraMetadata = {}
  }) => {
    if (!photoBlob) {
      console.error('❌ Cannot build media bundle without photo blob');
      return { success: false, reason: 'missing-photo' };
    }

    try {
      const frameIdentifier = selectedFrame || 'frame';
      const timestampPart = bundleName || new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const rawBundleName = `fremio-${frameIdentifier}-${timestampPart}`;
      const safeBundleName = rawBundleName.replace(/[^a-zA-Z0-9-_]/g, '_');

      const zip = new JSZip();
      const rootFolder = zip.folder(safeBundleName);
      if (!rootFolder) {
        throw new Error('Failed to initialize bundle folder inside zip');
      }

      const photosFolder = rootFolder.folder('photos');
      if (!photosFolder) {
        throw new Error('Failed to create photos folder in bundle');
      }
      photosFolder.file(photoFilename, photoBlob, { binary: true });

      const videosFolder = rootFolder.folder('videos');
      if (!videosFolder) {
        throw new Error('Failed to create videos folder in bundle');
      }

      let videosAdded = 0;
      let framedVideoIncluded = false;
      const fallbackVideoDetails = [];

      if (framedVideoResult?.blob) {
        videosFolder.file(framedVideoResult.filename, framedVideoResult.blob, { binary: true });
        videosAdded += 1;
        framedVideoIncluded = true;
      }

      if (!framedVideoResult?.blob) {
        const rawClips = [];
        for (const { index, clip } of recordedClips) {
          if (!clip) continue;

          let sourceBlob = null;
          if (clip.blob instanceof Blob) {
            sourceBlob = clip.blob;
          } else if (clip.dataUrl) {
            sourceBlob = await dataUrlToBlob(clip.dataUrl);
          }

          if (!sourceBlob) {
            console.warn(`⚠️ Gagal menyiapkan blob video dari slot ${index + 1}, melewati fallback.`);
            continue;
          }

          const clipMime = (() => {
            if (typeof clip?.mimeType === 'string' && clip.mimeType.includes('/')) {
              return clip.mimeType;
            }
            if (typeof sourceBlob.type === 'string' && sourceBlob.type.includes('/')) {
              return sourceBlob.type;
            }
            return 'video/webm';
          })();

          const extension = (() => {
            if (!clipMime) return 'webm';
            const mimeExt = clipMime.split('/')[1] || 'webm';
            return mimeExt.split(';')[0] || 'webm';
          })();

          const rawFilename = `raw-slot-${index + 1}-${timestampPart}.${extension}`;
          rawClips.push({
            filename: rawFilename,
            blob: sourceBlob,
            mimeType: clipMime,
            slotIndex: index + 1,
            duration: clip?.duration ?? null
          });
        }

        if (rawClips.length) {
          const rawVideosFolder = videosFolder.folder('raw') || videosFolder;
          rawClips.forEach(({ filename, blob, slotIndex, mimeType, duration }) => {
            rawVideosFolder.file(filename, blob, { binary: true });
            fallbackVideoDetails.push({
              slotIndex,
              filename,
              mimeType,
              duration: typeof duration === 'number' && !Number.isNaN(duration) ? duration : null
            });
            videosAdded += 1;
          });
        }
      }

      if (!videosAdded) {
        videosFolder.file(
          'README.txt',
          `Tidak ada video yang tersedia untuk sesi ini.\nAlasan: ${framedVideoResult?.reason ?? 'video-belum-dibuat'}\n` +
          'Tidak ditemukan video rekaman mentah sebagai cadangan.'
        );
      }

      const metadata = {
        frame: selectedFrame,
        generatedAt: new Date().toISOString(),
        hasVideo: videosAdded > 0,
        videoFilesCount: videosAdded,
        framedVideoIncluded,
        fallbackRawVideos: fallbackVideoDetails,
        videoConvertedToMp4: Boolean(framedVideoResult?.convertedToMp4),
        slotsRendered: frameConfig?.slots?.length ?? 0,
        ...extraMetadata
      };
      rootFolder.file('metadata.json', JSON.stringify(metadata, null, 2));

      const generationController = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const zipPromise = zip.generateAsync({ type: 'blob', signal: generationController?.signal });

      const timeoutPromise = new Promise((_, reject) => {
        const timer = setTimeout(() => {
          if (generationController) {
            try {
              generationController.abort();
            } catch (abortError) {
              console.warn('⚠️ Failed to abort ZIP generation after timeout:', abortError);
            }
          }
          reject(new Error('zip-generation-timeout'));
        }, ZIP_GENERATION_TIMEOUT_MS);
        zipPromise.finally(() => clearTimeout(timer));
      });

      let zipBlob;
      try {
        zipBlob = await Promise.race([zipPromise, timeoutPromise]);
      } catch (zipError) {
        if (zipError?.message === 'zip-generation-timeout') {
          throw new Error('zip-generation-timeout');
        }
        throw zipError;
      }

      const zipFilename = `${safeBundleName}.zip`;
      triggerBlobDownload(zipBlob, zipFilename);
      console.log(`📦 Media bundle downloaded: ${zipFilename}`);

      return {
        success: true,
        filename: zipFilename,
        hasVideo: metadata.hasVideo,
        framedVideoIncluded,
        rawVideoCount: fallbackVideoDetails.length
      };
    } catch (bundleError) {
      const timeoutHit = bundleError?.message === 'zip-generation-timeout';
      console.error('❌ Failed to create media bundle, falling back to individual downloads:', bundleError);

      // Fallback: download individual assets so user still receives files
      if (photoBlob && photoFilename) {
        triggerBlobDownload(photoBlob, photoFilename);
      }
      if (framedVideoResult?.blob && framedVideoResult?.filename) {
        triggerBlobDownload(framedVideoResult.blob, framedVideoResult.filename);
      }

      return {
        success: false,
        reason: timeoutHit ? 'zip-generation-timeout' : 'bundle-failed',
        error: bundleError
      };
    }
  };

  const downloadRecordedCountdownClips = async (timestampSuffix = '') => {
    if (!recordedClips.length) {
      return {
        totalRequested: 0,
        downloaded: 0,
        mp4Downloads: 0,
        fallbackDownloads: 0
      };
    }

  let downloaded = 0;
  let mp4Downloads = 0;
  let fallbackDownloads = 0;
    const safeTimestamp = timestampSuffix || new Date().toISOString().replace(/[:.]/g, '-');

    for (const { index, clip } of recordedClips) {
      if (!clip?.dataUrl) continue;

      const blob = await dataUrlToBlob(clip.dataUrl);
      if (!blob) {
        console.warn(`⚠️ Skipping countdown clip ${index + 1}: failed to create blob`);
        continue;
      }

      const baseFilename = `fremio-countdown-${safeTimestamp}-slot-${index + 1}`;
      const targetDuration = (() => {
        if (typeof clip?.duration === 'number' && !Number.isNaN(clip.duration) && clip.duration > 0) {
          return clip.duration;
        }
        if (clip?.timer === 3) return 4;
        if (clip?.timer === 5) return 6;
        if (clip?.timer === 10) return 6;
        return 6;
      })();
      let finalBlob = blob;
      let finalExtension = 'mp4';

      if (!blob.type.includes('mp4')) {
        try {
          const mp4Blob = await convertBlobToMp4(blob, {
            outputPrefix: baseFilename,
            frameRate: 30,
            durationSeconds: targetDuration
          });
          if (mp4Blob) {
            finalBlob = mp4Blob;
            mp4Downloads += 1;
          } else {
            finalExtension = (clip?.mimeType && clip.mimeType.includes('/'))
              ? clip.mimeType.split('/')[1]
              : 'webm';
            fallbackDownloads += 1;
          }
        } catch (conversionError) {
          console.error(`❌ Failed to convert countdown clip ${index + 1} to MP4:`, conversionError);
          finalExtension = (clip?.mimeType && clip.mimeType.includes('/'))
            ? clip.mimeType.split('/')[1]
            : 'webm';
          fallbackDownloads += 1;
        }
      } else {
        mp4Downloads += 1; // already mp4
      }

      const filename = `${baseFilename}.${finalExtension}`;
      triggerBlobDownload(finalBlob, filename);
      downloaded += 1;
    }

    return {
      totalRequested: recordedClips.length,
      downloaded,
      mp4Downloads,
      fallbackDownloads
    };
  };

  const createRecorderFromStream = (stream, options = {}) => {
    if (!stream) return null;

    const preferredTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4;codecs=h264'
    ];

    let recorder = null;
    for (const mimeType of preferredTypes) {
      try {
        if (mimeType && MediaRecorder.isTypeSupported(mimeType)) {
          recorder = new MediaRecorder(stream, { mimeType, ...options });
          break;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to initialize MediaRecorder with ${mimeType}:`, error);
      }
    }

    if (!recorder) {
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (error) {
        console.error('❌ Failed to initialize MediaRecorder with default options:', error);
        return null;
      }
    }

    return recorder;
  };

  const handleDeveloperUnlock = async (event) => {
    event.preventDefault();
    if (hasDevAccess) return;

    const trimmedToken = devTokenInput.trim();
    if (!trimmedToken) {
      setDevAuthStatus({ loading: false, error: 'Masukkan token developer terlebih dahulu.', success: false });
      return;
    }

    setDevAuthStatus({ loading: true, error: null, success: false });

    try {
      const authUrl = `${apiBaseUrl}/api/dev/debug-auth`;
      console.log('🔐 Debug Auth URL:', authUrl);
      console.log('🔐 Debug Auth Token:', trimmedToken);
      console.log('🔐 API Base URL:', apiBaseUrl);

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: trimmedToken })
      });

      console.log('🔐 Debug Auth Response Status:', response.status);
      console.log('🔐 Debug Auth Response OK:', response.ok);

      const data = await response.json().catch((parseError) => {
        console.error('🔐 Failed to parse JSON response:', parseError);
        return {};
      });

      console.log('🔐 Debug Auth Response Data:', data);

      if (!response.ok || !data?.success) {
        const errorMessage = data?.error || 'Token developer tidak valid.';
        throw new Error(errorMessage);
      }

      setHasDevAccess(true);
      setDevTokenInput('');
      setDevAuthStatus({ loading: false, error: null, success: true });
      setShowDevUnlockPanel(false);
    } catch (error) {
      console.error('🔐 Debug Auth Error Details:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack
      });
      
      let userMessage = 'Gagal memverifikasi token developer.';
      
      if (error?.message?.includes('Failed to fetch')) {
        userMessage = 'Tidak dapat terhubung ke server. Pastikan backend berjalan di port 3001.';
      } else if (error?.name === 'TypeError') {
        userMessage = 'Network error: Tidak dapat menghubungi server backend.';
      } else if (error?.message) {
        userMessage = error.message;
      }
      
      setDevAuthStatus({
        loading: false,
        error: userMessage,
        success: false
      });
    }
  };

  const handleDeveloperLock = () => {
    setHasDevAccess(false);
    setDevTokenInput('');
    setDevAuthStatus({ loading: false, error: null, success: false });
    setShowDevUnlockPanel(false);
  };

  // Frame image mapping
  const getFrameImage = (frameId) => {
    const frameMap = {
      'FremioSeries-blue-2': FremioSeriesBlue2,
      'FremioSeries-babyblue-3': FremioSeriesBabyblue3,
      'FremioSeries-black-3': FremioSeriesBlack3,
      'FremioSeries-blue-3': FremioSeriesBlue3,
      'FremioSeries-cream-3': FremioSeriesCream3,
      'FremioSeries-green-3': FremioSeriesGreen3,
      'FremioSeries-maroon-3': FremioSeriesMaroon3,
      'FremioSeries-orange-3': FremioSeriesOrange3,
      'FremioSeries-pink-3': FremioSeriesPink3,
      'FremioSeries-purple-3': FremioSeriesPurple3,
      'FremioSeries-white-3': FremioSeriesWhite3,
      'FremioSeries-blue-4': FremioSeriesBlue4,
      'EverythingYouAre-3x2': EverythingYouAre3x2
    };
    return frameMap[frameId] || FremioSeriesBlue2;
  };

  // SMART ZOOM DEFAULT CALCULATION - SCALABLE FOR ALL PHOTO SIZES
  const calculateSmartDefaultScale = (photoImg, slotIndex, frameConfig) => {
    if (!frameConfig || !frameConfig.slots[slotIndex] || !photoImg) {
      console.log('⚠️ Missing data for smart scale calculation, using fallback scale 1.6');
      return 1.6;
    }
    
    const slot = frameConfig.slots[slotIndex];
    const photoAspectRatio = photoImg.width / photoImg.height;
    
    console.log(`🧮 Smart Scale Calculation for Slot ${slotIndex + 1} (${slot.id}):`);
    console.log(`  - Photo: ${photoImg.width}x${photoImg.height} (ratio: ${photoAspectRatio.toFixed(2)})`);
    console.log(`  - Slot: ${slot.width}x${slot.height} (ratio: ${(slot.width/slot.height).toFixed(2)})`);
    
  const slotPixels = getSlotPixelDimensions(slotIndex);
  const slotWidthPx = slotPixels?.width ?? slot.width * previewWidth;
  const slotHeightPx = slotPixels?.height ?? slot.height * previewHeight;
    
    console.log(`  - Slot in pixels: ${slotWidthPx.toFixed(1)}x${slotHeightPx.toFixed(1)}px`);
    
    // Calculate objectFit: contain behavior - how photo naturally fits in slot.
    const slotAspectRatio = slotWidthPx / slotHeightPx;
    
    let containedPhotoWidth, containedPhotoHeight;
    
    if (photoAspectRatio > slotAspectRatio) {
      // Photo is wider than slot - fit by width
      containedPhotoWidth = slotWidthPx;
      containedPhotoHeight = slotWidthPx / photoAspectRatio;
    } else {
      // Photo is taller than slot or same aspect - fit by height
      containedPhotoWidth = slotHeightPx * photoAspectRatio;
      containedPhotoHeight = slotHeightPx;
    }
    
    console.log(`  - Contained photo size: ${containedPhotoWidth.toFixed(1)}x${containedPhotoHeight.toFixed(1)}px`);
    
    // Step 3: Check height constraint
    // If contained photo height < slot height, we need to scale up
    const heightScale = containedPhotoHeight < slotHeightPx ? slotHeightPx / containedPhotoHeight : 1;
    
    // Step 4: Check width constraint 
    // If contained photo width < slot width, we need to scale up
    const widthScale = containedPhotoWidth < slotWidthPx ? slotWidthPx / containedPhotoWidth : 1;
    
    // Use the larger scale to ensure we fill the slot (minimize empty space)
    const fillScale = Math.max(heightScale, widthScale);
    
    // Apply slight buffer to ensure good coverage
    const smartScale = fillScale * 1.02; // 2% buffer for perfect fit
    
    console.log(`  - Height scale needed: ${heightScale.toFixed(2)}x`);
    console.log(`  - Width scale needed: ${widthScale.toFixed(2)}x`);
    console.log(`  - Fill scale (max): ${fillScale.toFixed(2)}x`);
    console.log(`  - Smart scale (with buffer): ${smartScale.toFixed(2)}x`);
    
    // Clamp between reasonable bounds
    const minScale = 1.0;
    const maxScale = 4.0; // Reasonable maximum
    
    const clampedScale = Math.max(minScale, Math.min(maxScale, smartScale));
    
    console.log(`  - Final clamped scale: ${clampedScale.toFixed(2)}x`);
    
    return clampedScale;
  };

  // Load photos and frame config on mount
  useEffect(() => {
    console.log('🔄 EditPhoto component mounting...');
    
    // Load selected frame from localStorage first
  const frameFromStorage = safeStorage.getItem('selectedFrame') || 'FremioSeries-blue-2';
    console.log('🖼️ Frame from localStorage:', frameFromStorage);
    
    // Load photos from localStorage
  const savedPhotos = safeStorage.getItem('capturedPhotos');
  const savedVideos = safeStorage.getItem('capturedVideos');
  console.log('📦 Raw savedPhotos from localStorage:', savedPhotos);
  console.log('🎬 Raw savedVideos from localStorage:', savedVideos);
    
    if (savedPhotos) {
      try {
        const parsedPhotos = JSON.parse(savedPhotos);
        console.log('📸 Parsed photos array:', parsedPhotos);
        console.log('📊 Number of photos:', parsedPhotos.length);

        let parsedVideos = [];
        if (savedVideos) {
          try {
            const maybeVideos = JSON.parse(savedVideos);
            if (Array.isArray(maybeVideos)) {
              parsedVideos = [...maybeVideos];
            }
          } catch (videoParseError) {
            console.warn('⚠️ Failed to parse capturedVideos from localStorage:', videoParseError);
          }
        }

        while (parsedVideos.length < parsedPhotos.length) {
          parsedVideos.push(null);
        }
        if (parsedVideos.length > parsedPhotos.length) {
          parsedVideos = parsedVideos.slice(0, parsedPhotos.length);
        }

        setPhotos(parsedPhotos);
        setVideos(parsedVideos);
        
        // Initialize photo positions with correct defaults for each frame type
        const positions = {};
        const transforms = {};
        
        // Get frame config to calculate proper default scales
        const frameConfigForDefaults = getFrameConfig(frameFromStorage);
        
  // For frames dengan duplicate photos, kita butuh transform untuk SEMUA slot
        if (frameConfigForDefaults?.duplicatePhotos && frameConfigForDefaults.slots) {
          // Initialize slot-specific photos for independent slot behavior
          const initialSlotPhotos = {};
          const initialSlotVideos = {};
          
          // Initialize transforms for all slots
          frameConfigForDefaults.slots.forEach((slot, slotIndex) => {
            const photoIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
            
            // For duplicate frames, both positions and transforms should use slotIndex as key
            positions[slotIndex] = 'center center';
            
            // Store photo for this specific slot
            initialSlotPhotos[slotIndex] = parsedPhotos[photoIndex];
            initialSlotVideos[slotIndex] = parsedVideos[photoIndex] || null;
            
            // Calculate proper default scale based on frame type
            let defaultScale = 1.6; // Standard auto-fill for portrait frames
            
            console.log(`📐 Setting slot ${slotIndex} (photo ${photoIndex}) default scale: ${defaultScale}`);
            
            // Create transform for this specific slot index
            transforms[slotIndex] = {
              scale: defaultScale,
              translateX: 0,
              translateY: 0,
              autoFillScale: defaultScale,
              userAdjusted: false
            };
          });
          
          const slotPhotosKey = getSlotPhotosStorageKey(frameFromStorage);
          const slotVideosKey = getSlotVideosStorageKey(frameFromStorage);

          if (slotPhotosKey) {
            safeStorage.removeItem(slotPhotosKey);
          }
          if (slotVideosKey) {
            safeStorage.removeItem(slotVideosKey);
          }

          // Set slot photos for duplicate-photo frames
          setSlotPhotos(initialSlotPhotos);
          setSlotVideos(initialSlotVideos);
          persistSlotPhotos(frameFromStorage, initialSlotPhotos);
          persistSlotVideos(frameFromStorage, initialSlotVideos);
          console.log('🎯 Initialized slot photos for duplicate frame:', Object.keys(initialSlotPhotos).length, 'slots');
        } else {
          // Standard initialization for non-duplicate frames (one transform per photo)
          parsedPhotos.forEach((_, index) => {
            positions[index] = 'center center';
            
            // Use standard auto-fill scale for all frames
            let defaultScale = 1.6; // Standard auto-fill for portrait frames
            console.log(`📐 Setting standard default scale: ${defaultScale}`);
            
            transforms[index] = {
              scale: defaultScale,
              translateX: 0,
              translateY: 0,
              autoFillScale: defaultScale,
              userAdjusted: false
            };
          });
        }
        
        setPhotoPositions(positions);
        setPhotoTransforms(transforms);
        
        console.log('✅ Loaded photos:', parsedPhotos.length);
      } catch (error) {
        console.error('❌ Error parsing photos:', error);
      }
    } else {
      console.log('⚠️ No saved photos found in localStorage');
    }

    // Special debugging for Testframe3
    if (frameFromStorage === 'Testframe3') {
      console.log(`🔍 ${frameFromStorage.toUpperCase()} LOADING DEBUG:`);
      console.log('  - selectedFrame value:', frameFromStorage);
  console.log('  - frameConfig from localStorage:', safeStorage.getItem('frameConfig'));
  console.log('  - capturedPhotos from localStorage:', safeStorage.getItem('capturedPhotos'));
    }
    
    setSelectedFrame(frameFromStorage);
    console.log('🖼️ Loading frame:', frameFromStorage);

    // Try primary config source
    let config = getFrameConfig(frameFromStorage);
    console.log('⚙️ Frame config result (primary):', config);

    // Fallback 1: use stored frameConfig JSON
    if (!config) {
  const storedConfigJson = safeStorage.getItem('frameConfig');
      if (storedConfigJson) {
        try {
          const parsed = JSON.parse(storedConfigJson);
          if (parsed?.id === frameFromStorage && parsed?.slots?.length) {
            config = parsed;
            console.log('🧰 Using stored frameConfig from localStorage');
          }
        } catch (e) {
          console.warn('⚠️ Could not parse stored frameConfig JSON', e);
        }
      }
    }

    // Fallback 2: ask frameProvider
    if (!config && frameProvider?.getCurrentConfig) {
      const providerCfg = frameProvider.getCurrentConfig();
      if (providerCfg?.id === frameFromStorage) {
        config = providerCfg;
        console.log('🧠 Using frameProvider currentConfig');
      }
    }

    if (config) {
      setFrameConfig(config);
      setFrameImage(getFrameImage(frameFromStorage));
      console.log('✅ Frame config loaded (final):', config);
      
      // Extra verification for Testframe3
      if (frameFromStorage === 'Testframe3') {
        console.log(`✅ ${frameFromStorage.toUpperCase()} successfully loaded:`);
        console.log('  - Config ID:', config.id);
        console.log('  - Max captures:', config.maxCaptures);
        console.log('  - Slots count:', config.slots?.length);
        console.log('  - Frame image:', getFrameImage(frameFromStorage));
      }
    } else {
      console.error('❌ Failed to resolve frame config after fallbacks for:', frameFromStorage);
      console.error('  - Available configs:', Object.keys(FRAME_CONFIGS || {}));
    }
  }, []);

  useEffect(() => {
    if (!frameConfig?.slots) return;

    setPhotoFilters((prev = {}) => {
      const next = {};
      let changed = false;

      frameConfig.slots.forEach((_, index) => {
        const existing = Object.prototype.hasOwnProperty.call(prev, index) ? prev[index] : 'none';
        next[index] = existing;
        if (prev[index] !== existing) {
          changed = true;
        }
      });

      if (!changed) {
        const prevKeys = Object.keys(prev);
        if (prevKeys.length !== frameConfig.slots.length) {
          changed = true;
        } else if (!prevKeys.every((key) => next[key] === prev[key])) {
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [frameConfig?.id, frameConfig?.slots?.length]);

  useEffect(() => {
    if (!frameConfig?.slots?.length) {
      autoSelectedSlotRef.current = false;
      return;
    }
    if (swapModeActive) return;

    const slotHasPhoto = (slot, index) => {
      if (!slot) return false;

      if (frameConfig.duplicatePhotos) {
        const slotPhoto = slotPhotos?.[index];
        return typeof slotPhoto === 'string' && slotPhoto.length > 0;
      }

      const resolvedPhotoIndex = slot.photoIndex !== undefined ? slot.photoIndex : index;
      const photoValue = photos?.[resolvedPhotoIndex];
      return typeof photoValue === 'string' && photoValue.length > 0;
    };

    if (selectedPhotoForEdit !== null) {
      const activeSlot = frameConfig.slots[selectedPhotoForEdit];
      if (!slotHasPhoto(activeSlot, selectedPhotoForEdit)) {
        autoSelectedSlotRef.current = false;
        setSelectedPhotoForEdit(null);
      } else {
        autoSelectedSlotRef.current = true;
      }
      return;
    }

    if (!shouldAutoSelectInitialSlot) {
      autoSelectedSlotRef.current = false;
      return;
    }

    let firstEditableSlot = -1;
    for (let index = 0; index < frameConfig.slots.length; index += 1) {
      if (slotHasPhoto(frameConfig.slots[index], index)) {
        firstEditableSlot = index;
        break;
      }
    }

    if (firstEditableSlot === -1) {
      autoSelectedSlotRef.current = false;
      return;
    }

    if (!autoSelectedSlotRef.current) {
      autoSelectedSlotRef.current = true;
      setShouldAutoSelectInitialSlot(false);
      // Do not auto-select a slot on initial load; wait for explicit user interaction.
    }
  }, [frameConfig?.id, frameConfig?.slots?.length, frameConfig?.duplicatePhotos, photos, slotPhotos, swapModeActive, selectedPhotoForEdit, shouldAutoSelectInitialSlot]);

  // Initialize auto-fill scale when frameConfig is loaded
  useEffect(() => {
    if (frameConfig && photos.length > 0) {
      console.log('🎯 Auto-fitting photos to slots with smart calculation...');
      photos.forEach(async (_, index) => {
        await initializePhotoScale(index);
      });
    }
  }, [frameConfig, photos.length]);

  // Listen for frame changes from frameProvider
  useEffect(() => {
    const checkFrameChange = () => {
      const currentFrameFromProvider = frameProvider.currentFrame;
  const currentFrameFromStorage = safeStorage.getItem('selectedFrame');
      
      if (currentFrameFromProvider && currentFrameFromProvider !== selectedFrame) {
        console.log('🔄 Frame changed via frameProvider:', currentFrameFromProvider);
        setSelectedFrame(currentFrameFromProvider);
        
        const config = getFrameConfig(currentFrameFromProvider);
        if (config) {
          setFrameConfig(config);
          setFrameImage(getFrameImage(currentFrameFromProvider));
          console.log('✅ Updated frame config:', config);
        }
      } else if (currentFrameFromStorage && currentFrameFromStorage !== selectedFrame) {
        console.log('🔄 Frame changed via localStorage:', currentFrameFromStorage);
        setSelectedFrame(currentFrameFromStorage);
        
        const config = getFrameConfig(currentFrameFromStorage);
        if (config) {
          setFrameConfig(config);
          setFrameImage(getFrameImage(currentFrameFromStorage));
          console.log('✅ Updated frame config:', config);
        }
      }
    };

    // Check immediately
    checkFrameChange();
    
    // Set up polling to check for changes (since we don't have events)
    const interval = setInterval(checkFrameChange, 500);
    
    return () => clearInterval(interval);
  }, [selectedFrame]);

  const performSlotSwap = async (sourceSlotIndex, targetSlotIndex) => {
    if (sourceSlotIndex === targetSlotIndex) {
      console.log('⚠️ Swap ignored: identical source and target slot');
      return false;
    }

    if (!frameConfig?.slots) {
      console.warn('⚠️ Swap aborted: missing frame slot configuration');
      return false;
    }

    if (frameConfig.duplicatePhotos) {
      const newSlotPhotos = { ...slotPhotos };
      const newSlotVideos = { ...slotVideos };

      const srcSlot = frameConfig.slots[sourceSlotIndex];
      const dstSlot = frameConfig.slots[targetSlotIndex];
      if (!srcSlot || !dstSlot) {
        console.warn('⚠️ Swap aborted: slot definition missing');
        return false;
      }

      const resolveBaseIndex = (slot, fallback) => (
        slot?.photoIndex !== undefined ? slot.photoIndex : fallback
      );

      const srcBaseIndex = resolveBaseIndex(srcSlot, sourceSlotIndex);
      const dstBaseIndex = resolveBaseIndex(dstSlot, targetSlotIndex);

      const srcImage = Object.prototype.hasOwnProperty.call(newSlotPhotos, sourceSlotIndex)
        ? newSlotPhotos[sourceSlotIndex]
        : photos[srcBaseIndex] ?? null;
      const dstImage = Object.prototype.hasOwnProperty.call(newSlotPhotos, targetSlotIndex)
        ? newSlotPhotos[targetSlotIndex]
        : photos[dstBaseIndex] ?? null;

      const srcVideo = Object.prototype.hasOwnProperty.call(newSlotVideos, sourceSlotIndex)
        ? newSlotVideos[sourceSlotIndex]
        : videos[srcBaseIndex] ?? null;
      const dstVideo = Object.prototype.hasOwnProperty.call(newSlotVideos, targetSlotIndex)
        ? newSlotVideos[targetSlotIndex]
        : videos[dstBaseIndex] ?? null;

      if (!srcImage && !dstImage) {
        console.warn('⚠️ Swap aborted: both duplicate slots empty');
        return false;
      }

      newSlotPhotos[sourceSlotIndex] = dstImage ?? null;
      newSlotPhotos[targetSlotIndex] = srcImage ?? null;
      newSlotVideos[sourceSlotIndex] = dstVideo ?? null;
      newSlotVideos[targetSlotIndex] = srcVideo ?? null;

      setSlotPhotos(newSlotPhotos);
      setSlotVideos(newSlotVideos);
      persistSlotPhotos(frameConfig?.id, newSlotPhotos);

      setTimeout(async () => {
        const affectedSlots = [sourceSlotIndex, targetSlotIndex];
        for (const slotIdx of affectedSlots) {
          const newPhotoForSlot = newSlotPhotos[slotIdx];
          if (!newPhotoForSlot) continue;

          try {
            const smartScale = await calculateSmartScaleAsync(newPhotoForSlot, slotIdx);
            setPhotoTransforms((prev = {}) => ({
              ...prev,
              [slotIdx]: {
                scale: smartScale,
                translateX: 0,
                translateY: 0,
                autoFillScale: smartScale,
                userAdjusted: false
              }
            }));
            console.log(`✨ Updated smart scale for slot ${slotIdx + 1}: ${smartScale.toFixed(2)}x`);
          } catch (error) {
            console.error(`❌ Failed to update smart scale for slot ${slotIdx + 1}:`, error);
          }
        }
      }, 100);

      console.log(`🔄 Swapped duplicate slots ${sourceSlotIndex + 1} ↔ ${targetSlotIndex + 1}`);
      return true;
    }

    const newPhotos = [...photos];
    const newVideos = [...videos];
    const newSlotVideos = { ...slotVideos };
    const newPhotoPositions = { ...photoPositions };
    const newPhotoTransforms = { ...photoTransforms };

    const swapArrayValue = (arr, a, b) => {
      const temp = arr[a];
      arr[a] = arr[b];
      arr[b] = temp;
    };

    swapArrayValue(newPhotos, sourceSlotIndex, targetSlotIndex);
    swapArrayValue(newVideos, sourceSlotIndex, targetSlotIndex);

    const sourceSlotHasVideo = Object.prototype.hasOwnProperty.call(newSlotVideos, sourceSlotIndex);
    const targetSlotHasVideo = Object.prototype.hasOwnProperty.call(newSlotVideos, targetSlotIndex);
    if (sourceSlotHasVideo || targetSlotHasVideo) {
      const tempSlotVideo = newSlotVideos[sourceSlotIndex];
      newSlotVideos[sourceSlotIndex] = newSlotVideos[targetSlotIndex];
      newSlotVideos[targetSlotIndex] = tempSlotVideo;
    }

    const tempPos = newPhotoPositions[sourceSlotIndex];
    newPhotoPositions[sourceSlotIndex] = newPhotoPositions[targetSlotIndex];
    newPhotoPositions[targetSlotIndex] = tempPos;

    const tempTransform = newPhotoTransforms[sourceSlotIndex];
    newPhotoTransforms[sourceSlotIndex] = newPhotoTransforms[targetSlotIndex];
    newPhotoTransforms[targetSlotIndex] = tempTransform;

    setPhotos(newPhotos);
    setVideos(newVideos);
    if (sourceSlotHasVideo || targetSlotHasVideo) {
      setSlotVideos(newSlotVideos);
      persistSlotVideos(frameConfig?.id, newSlotVideos);
    }
    setPhotoPositions(newPhotoPositions);
    setPhotoTransforms(newPhotoTransforms);
    safeStorage.setItem('capturedPhotos', JSON.stringify(newPhotos));
    safeStorage.setItem('capturedVideos', JSON.stringify(newVideos));

    if (frameConfig) {
      setTimeout(async () => {
        await initializePhotoScale(sourceSlotIndex);
        await initializePhotoScale(targetSlotIndex);
      }, 100);
    }

    persistSlotVideos(frameConfig?.id, newSlotVideos);

    console.log(`🔄 Swapped slots ${sourceSlotIndex + 1} ↔ ${targetSlotIndex + 1}`);
    return true;
  };

  const handleSlotClick = (slotIndex) => {
    if (swapModeActive) {
      if (swapSourceSlot === null) {
        beginSwapFromSlot(slotIndex);
        return;
      }

      if (swapSourceSlot === slotIndex) {
        resetSwapMode();
        return;
      }

      performSlotSwap(swapSourceSlot, slotIndex).then((success) => {
        if (success) {
          setSelectedPhotoForEdit(slotIndex);
        }
        resetSwapMode();
      });
      return;
    }

    setSelectedPhotoForEdit((prev) => (prev === slotIndex ? null : slotIndex));
  };

  const resolveSlotPhotoDimensions = useCallback((slotIndex) => {
    if (photoDimensions?.[slotIndex]?.width && photoDimensions?.[slotIndex]?.height) {
      return photoDimensions[slotIndex];
    }

    const slotMeta = frameConfig?.slots?.[slotIndex];
    if (slotMeta?.photoIndex !== undefined) {
      const shared = photoDimensions?.[slotMeta.photoIndex];
      if (shared?.width && shared?.height) {
        return shared;
      }
    }

    return null;
  }, [photoDimensions, frameConfig]);

  // Fungsi untuk menghitung ukuran slot dalam pixel.
  const getSlotPixelDimensions = useCallback((slotIndex) => {
    const slot = frameConfig?.slots?.[slotIndex];
    if (!slot) return null;
    const measurement = slotMeasurements?.[slotIndex] || null;
    const width = measurement?.width ?? slot.width * Math.max(previewWidth, 1);
    const height = measurement?.height ?? slot.height * Math.max(previewHeight, 1);
    return { width, height };
  }, [frameConfig?.slots, slotMeasurements, previewWidth, previewHeight]);

  const getSlotPanMetrics = useCallback((slotIndex) => {
    const slot = frameConfig?.slots?.[slotIndex];
    if (!slot) return null;

    const slotPixels = getSlotPixelDimensions(slotIndex);
    const slotWidthPx = slotPixels?.width ?? slot.width * Math.max(previewWidth, 1);
    const slotHeightPx = slotPixels?.height ?? slot.height * Math.max(previewHeight, 1);

    if (!Number.isFinite(slotWidthPx) || slotWidthPx <= 0 || !Number.isFinite(slotHeightPx) || slotHeightPx <= 0) {
      return null;
    }

    const slotAspectRatio = slotWidthPx / slotHeightPx;
    let photoAspectRatio = 4 / 3;
    const dimensions = resolveSlotPhotoDimensions(slotIndex);
    if (dimensions?.width && dimensions?.height) {
      photoAspectRatio = dimensions.width / dimensions.height;
    }

    let containedWidthPx;
    let containedHeightPx;

    if (frameConfig?.id === 'Testframe4') {
      containedWidthPx = slotWidthPx;
      containedHeightPx = slotWidthPx / photoAspectRatio;
    } else if (photoAspectRatio > slotAspectRatio) {
      containedWidthPx = slotWidthPx;
      containedHeightPx = slotWidthPx / photoAspectRatio;
    } else {
      containedHeightPx = slotHeightPx;
      containedWidthPx = slotHeightPx * photoAspectRatio;
    }

    return {
      slotWidthPx,
      slotHeightPx,
      slotAspectRatio,
      photoAspectRatio,
      containedWidthPx,
      containedHeightPx
    };
  }, [frameConfig?.id, frameConfig?.slots, getSlotPixelDimensions, previewHeight, previewWidth, resolveSlotPhotoDimensions]);

  const calculateCoverageScaleForSlot = useCallback((slotIndex) => {
    const metrics = getSlotPanMetrics(slotIndex);
    if (!metrics) {
      const fallbackTransform = photoTransforms?.[slotIndex];
      const fallbackScale = fallbackTransform?.autoFillScale || 1;
      return Math.max(1, fallbackScale);
    }

    const { slotWidthPx, slotHeightPx, containedWidthPx, containedHeightPx } = metrics;

    if (!containedWidthPx || !containedHeightPx) {
      const fallbackTransform = photoTransforms?.[slotIndex];
      const fallbackScale = fallbackTransform?.autoFillScale || 1;
      return Math.max(1, fallbackScale);
    }

    const heightScale = containedHeightPx ? slotHeightPx / containedHeightPx : 1;
    const widthScale = containedWidthPx ? slotWidthPx / containedWidthPx : 1;

    const fillScale = Math.max(heightScale, widthScale, 1);
    const clamped = Math.max(1, Math.min(fillScale, 6));

    console.log(`🔍 Coverage scale for slot ${slotIndex + 1}: ${clamped.toFixed(2)}x (height: ${heightScale.toFixed(2)}x, width: ${widthScale.toFixed(2)}x)`);
    return clamped;
  }, [getSlotPanMetrics, photoTransforms]);

  const adjustPanForEdgeBoundaries = useCallback((current, proposedScale, slotIndex) => {
    const baseTransform = (current && typeof current === 'object') ? current : {};
    const metrics = getSlotPanMetrics(slotIndex);
    if (!metrics) {
      return {
        ...baseTransform,
        translateX: 0,
        translateY: 0
      };
    }

    const { slotWidthPx, slotHeightPx, containedWidthPx, containedHeightPx } = metrics;

    const scale = (typeof proposedScale === 'number' && Number.isFinite(proposedScale) && proposedScale > 0)
      ? proposedScale
      : (typeof baseTransform?.scale === 'number' && Number.isFinite(baseTransform.scale) && baseTransform.scale > 0
        ? baseTransform.scale
        : 1);

    const halfSlotWidth = slotWidthPx / 2;
    const halfSlotHeight = slotHeightPx / 2;
    const halfImageWidth = (containedWidthPx * scale) / 2;
    const halfImageHeight = (containedHeightPx * scale) / 2;

    let maxActualTranslateX = Math.max(0, halfImageWidth - halfSlotWidth);
    let maxActualTranslateY = Math.max(0, halfImageHeight - halfSlotHeight);

    const epsilon = 0.25;
    maxActualTranslateX = Math.max(0, maxActualTranslateX - epsilon);
    maxActualTranslateY = Math.max(0, maxActualTranslateY - epsilon);

    if (frameConfig?.id === 'Testframe4') {
      maxActualTranslateX *= 0.85;
      maxActualTranslateY *= 1.35;
    }

    const safeScale = scale > 0 ? scale : 1;
    const maxTranslateX = maxActualTranslateX > 0 ? maxActualTranslateX / safeScale : 0;
    const maxTranslateY = maxActualTranslateY > 0 ? maxActualTranslateY / safeScale : 0;

    const clampTranslate = (value, max) => {
      if (!Number.isFinite(max) || max <= 0) {
        return 0;
      }
      const numericValue = Number.isFinite(value) ? value : 0;
      const bounded = clamp(numericValue, -max, max);
      if (Math.abs(bounded) < 0.0001) {
        return 0;
      }
      return Number(bounded.toFixed(4));
    };

    return {
      ...baseTransform,
      translateX: clampTranslate(baseTransform?.translateX, maxTranslateX),
      translateY: clampTranslate(baseTransform?.translateY, maxTranslateY)
    };
  }, [frameConfig?.id, getSlotPanMetrics]);

  // Calculate maximum zoom out scale (minimum scale before gaps appear)
  const calculateMaxZoomOutScale = (slotIndex) => calculateCoverageScaleForSlot(slotIndex);

  // Calculate auto-fit scale untuk fit vertical height (ujung atas-bawah foto terlihat)
  const calculateAutoFillScale = (slotIndex) => {
    if (!frameConfig || !frameConfig.slots[slotIndex]) return 1.6;
    
    // Try to get photo image for smart calculation
    const photoImg = getPhotoImageForSlot(slotIndex);
    
    if (photoImg) {
      // Use smart calculation with actual photo dimensions
      const smartScale = calculateSmartDefaultScale(photoImg, slotIndex, frameConfig);
      const coverageScale = calculateCoverageScaleForSlot(slotIndex);
      return Math.max(coverageScale, smartScale);
    }
    
    // Fallback to original logic if photo not available
    const slot = frameConfig.slots[slotIndex];
    
    // Special handling for Testframe4 landscape slots
    if (frameConfig?.id === 'Testframe4') {
      // Testframe4 default to zoom out maksimum + 6 zoom in steps
      console.log(`🎯 Testframe4 slot ${slotIndex + 1}: Setting to MAX ZOOM OUT + 6 zoom in steps`);
      
      const maxZoomOutScale = calculateMaxZoomOutScale(slotIndex);
      
      // Each zoom step is 0.1x increment (same as handlePhotoZoom delta)
      const zoomInSteps = 6;
      const zoomIncrement = 0.1;
      const defaultScale = maxZoomOutScale + (zoomInSteps * zoomIncrement);
      
  const coverageScale = calculateCoverageScaleForSlot(slotIndex);
  const adjustedScale = Math.max(defaultScale, coverageScale);
  console.log(`📏 Testframe4 Slot ${slotIndex + 1}: Default scale = ${adjustedScale.toFixed(2)}x (min coverage: ${coverageScale.toFixed(2)}x)`);
  return adjustedScale;
    }
    
    // Original logic for portrait frames (Testframe1, 2, 3)
    // Default scale for when photo image not available
  const coverageScale = calculateCoverageScaleForSlot(slotIndex);
  const fallbackScale = 1.6; // Conservative default
  return Math.max(coverageScale, fallbackScale);
  };

  const generateFramedVideo = async ({ loadedPhotos, canvasWidth, canvasHeight, timestamp, skipDownload = false }) => {
    const mobileDevice = isMobileDevice(); // Detect mobile once at the start
    
    console.log('🎬 === GENERATE FRAMED VIDEO START ===');
    console.log('🎬 Input params:', {
      loadedPhotosCount: loadedPhotos.length,
      canvasWidth,
      canvasHeight,
      timestamp,
      skipDownload,
      isMobile: mobileDevice
    });
    
    if (!isBrowser) {
      console.log('🎬 Skipping framed video generation outside browser environment');
      return { success: false, reason: 'no-browser' };
    }

    if (!frameConfig?.slots || frameConfig.slots.length === 0) {
      console.warn('🎬 Frame configuration missing slots; skipping framed video generation');
      return { success: false, reason: 'no-frame-slots' };
    }
    console.log('🎬 Frame config has', frameConfig.slots.length, 'slots');

    const slotVideoInfos = frameConfig.slots.map((_, index) => getVideoSourceForSlot(index));
    console.log('🎬 Slot video infos:', slotVideoInfos.map((info, i) => ({
      slot: i,
      hasVideo: !!info?.dataUrl,
      mirrored: info?.mirrored
    })));
    
    const hasVideo = slotVideoInfos.some((info) => info && info.dataUrl);
    if (!hasVideo) {
      console.log('🎬 No recorded videos available for framing. Skipping video export.');
      return { success: false, reason: 'no-source-video' };
    }
    console.log('✅ Has video sources, proceeding...');

    const imageCache = new Map();
    loadedPhotos.forEach(({ img, index }) => {
      const photoDataUrl = photos[index];
      if (photoDataUrl && img) {
        imageCache.set(photoDataUrl, img);
      }
    });

    const getImageElement = async (dataUrl) => {
      if (!dataUrl) return null;
      if (imageCache.has(dataUrl)) return imageCache.get(dataUrl);
      const img = await createImageFromDataUrl(dataUrl);
      if (img) {
        imageCache.set(dataUrl, img);
      }
      return img;
    };

    const slotPhotoElements = await Promise.all(frameConfig.slots.map(async (slot, slotIndex) => {
      let photoData;
      if (frameConfig.duplicatePhotos) {
        const slotSpecificPhoto = slotPhotos[slotIndex];
        if (slotSpecificPhoto) {
          photoData = slotSpecificPhoto;
        } else {
          const photoIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
          photoData = photos[photoIndex];
        }
      } else {
        const targetIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
        photoData = photos[targetIndex];
      }
      if (!photoData) return null;
      return getImageElement(photoData);
    }));

    let frameOverlayImage = null;
    if (frameImage) {
      frameOverlayImage = await getImageElement(frameImage);
    }

    const ensureVideoReady = (video, slotNumber) => new Promise((resolve) => {
      let resolved = false;

      const finalize = () => {
        if (resolved) return;
        resolved = true;
        video.onloadedmetadata = null;
        video.oncanplay = null;
        video.onerror = null;
        resolve(video.readyState >= 2);
      };

      video.onloadedmetadata = () => {
        if (video.readyState >= 1) {
          try {
            video.currentTime = 0;
          } catch (resetError) {
            console.warn('⚠️ Unable to reset recorded video timeline:', resetError);
          }
        }
      };

      video.oncanplay = () => {
        finalize();
      };

      video.onerror = (event) => {
        console.error(`❌ Failed to load recorded video for slot ${slotNumber}:`, event);
        finalize();
      };

      if (video.readyState >= 2) {
        finalize();
      }
    });

    const videoElementCache = new Map();
    const slotVideoElements = [];

    for (let i = 0; i < slotVideoInfos.length; i++) {
      const info = slotVideoInfos[i];
      if (!info || !info.dataUrl) {
        slotVideoElements.push(null);
        continue;
      }

      const baseKey = info.baseVideoIndex ?? i;

      if (videoElementCache.has(baseKey)) {
        slotVideoElements.push(videoElementCache.get(baseKey));
        continue;
      }

      const video = document.createElement('video');
      video.src = info.dataUrl;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.setAttribute('playsinline', '');

      const isReady = await ensureVideoReady(video, i + 1);

      if (!isReady || !Number.isFinite(video.duration) || video.duration <= 0) {
        console.warn(`⚠️ Recorded video for slot ${i + 1} is not ready or has invalid duration; skipping`);
        slotVideoElements.push(null);
        continue;
      }

      video.loop = false;

      const entry = { video, info, baseVideoIndex: baseKey };
      videoElementCache.set(baseKey, entry);
      slotVideoElements.push(entry);
    }

    const activeVideos = Array.from(videoElementCache.values()).filter(Boolean);
    if (!activeVideos.length) {
      console.warn('🎬 No playable recorded videos after preparation; skipping video export');
      return { success: false, reason: 'no-playable-video' };
    }

    const TIMER_PLAYBACK_TARGETS = {
      3: 4,
      5: 6,
      10: 6
    };
    // Shorter duration for mobile to speed up processing
  const DEFAULT_TARGET_DURATION = mobileDevice ? 3.5 : 6; // shorter duration for mobile stability
    console.log(`🎬 Max video duration: ${DEFAULT_TARGET_DURATION}s (${mobileDevice ? 'mobile' : 'desktop'})`);

    const clampDuration = (value, hardCap = DEFAULT_TARGET_DURATION) => {
      if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
        return null;
      }
      if (typeof hardCap === 'number' && hardCap > 0) {
        return Math.min(value, hardCap);
      }
      return value;
    };

    const getTargetDuration = (entry) => {
      if (!entry) return 0;

      const timerTarget = (() => {
        const timer = entry.info?.timer;
        if (typeof timer === 'number' && TIMER_PLAYBACK_TARGETS[timer]) {
          return TIMER_PLAYBACK_TARGETS[timer];
        }
        return null;
      })();

      if (timerTarget) {
        return timerTarget;
      }

      const infoDuration = clampDuration(entry.info?.duration, DEFAULT_TARGET_DURATION);
      if (infoDuration) {
        return infoDuration;
      }

      const mediaDuration = clampDuration(entry.video?.duration, DEFAULT_TARGET_DURATION);
      if (mediaDuration) {
        return mediaDuration;
      }

      return DEFAULT_TARGET_DURATION;
    };

    const slotTargetDurations = slotVideoElements.map(getTargetDuration);
    const maxDuration = slotTargetDurations.reduce((max, value) => Math.max(max, value), 0);
    if (!maxDuration) {
      console.warn('🎬 Recorded videos report zero duration; skipping framed video export');
      return { success: false, reason: 'zero-duration' };
    }

    const videoCanvas = document.createElement('canvas');
    videoCanvas.width = canvasWidth;
    videoCanvas.height = canvasHeight;
    const videoCtx = videoCanvas.getContext('2d');

    const PREVIEW_WIDTH = Math.max(previewWidth, 1);
    const PREVIEW_HEIGHT = Math.max(previewHeight, 1);
    const SCALE_RATIO = canvasWidth / PREVIEW_WIDTH;

    const getMediaDimensions = (media) => {
      if (!media) return null;
      if (media.videoWidth && media.videoHeight) {
        return { width: media.videoWidth, height: media.videoHeight };
      }
      if (media.naturalWidth && media.naturalHeight) {
        return { width: media.naturalWidth, height: media.naturalHeight };
      }
      if (media.width && media.height) {
        return { width: media.width, height: media.height };
      }
      return null;
    };

    const getSlotTransform = (slotIndex, isVideo = false) => {
      if (!isVideo) {
        const existingPhotoTransform = photoTransforms?.[slotIndex];
        if (existingPhotoTransform) {
          return existingPhotoTransform;
        }
      }

      if (isVideo) {
        return {
          scale: null,
          translateX: 0,
          translateY: 0,
          autoFillScale: null
        };
      }

      const fallback = calculateAutoFillScale(slotIndex) || 1.6;
      return {
        scale: fallback,
        translateX: 0,
        translateY: 0,
        autoFillScale: fallback
      };
    };

    const calculateDefaultVideoScale = ({
      mediaWidth,
      mediaHeight,
      displayWidth,
      displayHeight,
      slotWidth,
      slotHeight
    }) => {
      if (!mediaWidth || !mediaHeight || !displayWidth || !displayHeight || !slotWidth || !slotHeight) {
        return 1;
      }

      const isPortraitVideo = mediaHeight >= mediaWidth;
      const targetSlotDimension = isPortraitVideo ? slotWidth : slotHeight;
      const currentDisplayDimension = isPortraitVideo ? displayWidth : displayHeight;

      if (!targetSlotDimension || !currentDisplayDimension) {
        return 1;
      }

      let computedScale = targetSlotDimension / currentDisplayDimension;

      if (computedScale > 1) {
        computedScale = 1;
      }

      const MIN_SCALE = 0.2;
      const clampedScale = Math.max(MIN_SCALE, computedScale);

      return Number(clampedScale.toFixed(4));
    };

    const drawMediaInSlot = (media, slotIndex, options = {}) => {
      if (!media) return;
      const slot = frameConfig.slots[slotIndex];
      if (!slot) return;

      const dimensions = getMediaDimensions(media);
      if (!dimensions) return;

      const isVideoMedia = media instanceof HTMLVideoElement;
      const transform = getSlotTransform(slotIndex, isVideoMedia);
      const { mirrored = false, filterCssOverride, filterIdOverride } = options;
      const resolvedFilterId = filterIdOverride ?? resolveSlotFilterId(slotIndex);
      const slotFilterCss = (() => {
        if (filterCssOverride !== undefined) {
          return filterCssOverride;
        }
        if (!resolvedFilterId || resolvedFilterId === 'none') {
          return 'none';
        }
        const cssValue = getFilterCssValue(resolvedFilterId);
        return cssValue && cssValue.trim().length > 0 ? cssValue : 'none';
      })();

      const previewSlotX = slot.left * PREVIEW_WIDTH;
      const previewSlotY = slot.top * PREVIEW_HEIGHT;
      const previewSlotWidth = slot.width * PREVIEW_WIDTH;
      const previewSlotHeight = slot.height * PREVIEW_HEIGHT;

      const slotX = previewSlotX * SCALE_RATIO;
      const slotY = previewSlotY * SCALE_RATIO;
      const slotWidth = previewSlotWidth * SCALE_RATIO;
      const slotHeight = previewSlotHeight * SCALE_RATIO;

      const imgAspectRatio = dimensions.width / dimensions.height;
      const slotAspectRatio = slot.width / slot.height;

      let mediaDisplayWidth;
      let mediaDisplayHeight;
      if (imgAspectRatio > slotAspectRatio) {
        mediaDisplayWidth = slotWidth;
        mediaDisplayHeight = slotWidth / imgAspectRatio;
      } else {
        mediaDisplayWidth = slotHeight * imgAspectRatio;
        mediaDisplayHeight = slotHeight;
      }

      const slotCenterX = slotX + (slotWidth / 2);
      const slotCenterY = slotY + (slotHeight / 2);

      const scaledTranslateX = (transform.translateX || 0) * SCALE_RATIO;
      const scaledTranslateY = (transform.translateY || 0) * SCALE_RATIO;

      let transformScale = transform?.scale;
      if (!(typeof transformScale === 'number' && Number.isFinite(transformScale) && transformScale > 0)) {
        if (isVideoMedia) {
          transformScale = calculateDefaultVideoScale({
            mediaWidth: dimensions.width,
            mediaHeight: dimensions.height,
            displayWidth: mediaDisplayWidth,
            displayHeight: mediaDisplayHeight,
            slotWidth,
            slotHeight
          });
        } else {
          const fallbackScale = calculateAutoFillScale(slotIndex) || 1.6;
          transformScale = fallbackScale;
        }
      }

      const finalWidth = mediaDisplayWidth * transformScale;
      const finalHeight = mediaDisplayHeight * transformScale;
      const finalX = slotCenterX - (finalWidth / 2) + scaledTranslateX;
      const finalY = slotCenterY - (finalHeight / 2) + scaledTranslateY;

      videoCtx.save();
      videoCtx.beginPath();
      videoCtx.rect(slotX, slotY, slotWidth, slotHeight);
      videoCtx.clip();
      const shouldMirrorVideo = isVideoMedia && !mirrored;
      if (shouldMirrorVideo) {
        videoCtx.save();
        videoCtx.translate(finalX + finalWidth, finalY);
        videoCtx.scale(-1, 1);
        drawImageWithFilter(videoCtx, media, 0, 0, finalWidth, finalHeight, {
          filterId: resolvedFilterId,
          filterCss: slotFilterCss
        });
        videoCtx.restore();
      } else {
        drawImageWithFilter(videoCtx, media, finalX, finalY, finalWidth, finalHeight, {
          filterId: resolvedFilterId,
          filterCss: slotFilterCss
        });
      }
      videoCtx.restore();
    };

    const drawCompositeFrame = () => {
      videoCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      videoCtx.fillStyle = '#2563eb';
      videoCtx.fillRect(0, 0, canvasWidth, canvasHeight);

      frameConfig.slots.forEach((_, slotIndex) => {
        const videoEntry = slotVideoElements[slotIndex];
        if (videoEntry && videoEntry.video.readyState >= 2) {
          drawMediaInSlot(videoEntry.video, slotIndex, {
            mirrored: Boolean(videoEntry.info?.mirrored)
          });
        } else {
          const fallbackImage = slotPhotoElements[slotIndex];
          if (fallbackImage) {
            drawMediaInSlot(fallbackImage, slotIndex);
          }
        }
      });

      if (frameOverlayImage) {
        videoCtx.drawImage(frameOverlayImage, 0, 0, canvasWidth, canvasHeight);
      }
    };

    const encodeWithFfmpegFallback = async () => {
      console.log('🎬 Falling back to FFmpeg-based encoder');
      let cleanupArtifacts = async () => {};
      try {
        const ffmpeg = await ensureFfmpeg();
        if (!ffmpeg) {
          console.error('❌ FFmpeg instance unavailable');
          return { success: false, reason: 'ffmpeg-unavailable' };
        }

        setSaveStatusMessage('🎞️ Merender video dengan mode kompatibilitas...');

        const fallbackFrameRate = Math.max(12, Math.min(21, Math.round(frameRate * 0.8)));
        const totalDuration = maxDuration + 0.25;
        const padDigits = Math.max(4, String(Math.ceil(totalDuration * fallbackFrameRate) + 2).length);
        const framePrefix = `frame_${timestamp}`;
        const framePattern = `${framePrefix}_%0${padDigits}d.jpg`;
        const capturedFrameNames = [];
        let outputName = null;

  cleanupArtifacts = async () => {
          await Promise.all(capturedFrameNames.map(async (name) => {
            try {
              await ffmpeg.deleteFile(name);
            } catch (cleanupError) {
              // ignore cleanup errors
            }
          }));
          if (outputName) {
            try {
              await ffmpeg.deleteFile(outputName);
            } catch (cleanupError) {
              // ignore
            }
          }
        };

        await Promise.all(activeVideos.map(async ({ video }) => {
          try {
            video.currentTime = 0;
            if (video.paused) {
              await video.play();
            }
          } catch (error) {
            console.warn('⚠️ FFmpeg fallback: video playback start issue', error);
          }
        }));

        const fallbackStart = performance.now();
        let framesCaptured = 0;

        const captureFrameToFfmpeg = async (frameName) => {
          const blob = await new Promise((resolve, reject) => {
            videoCanvas.toBlob((b) => {
              if (!b) {
                reject(new Error('Frame capture returned empty blob'));
              } else {
                resolve(b);
              }
            }, 'image/jpeg', 0.9);
          });

          const frameData = new Uint8Array(await blob.arrayBuffer());
          await ffmpeg.writeFile(frameName, frameData);
          capturedFrameNames.push(frameName);
        };

        while (true) {
          drawCompositeFrame();

          const frameName = `${framePrefix}_${String(framesCaptured).padStart(padDigits, '0')}.jpg`;
          await captureFrameToFfmpeg(frameName);
          framesCaptured += 1;

          const elapsed = (performance.now() - fallbackStart) / 1000;
          const allVideosEnded = slotVideoElements.every((entry, index) => {
            if (!entry) return true;
            const duration = slotTargetDurations[index] || maxDuration;
            return entry.video.ended || entry.video.currentTime >= duration;
          });

          if (elapsed >= totalDuration || allVideosEnded) {
            break;
          }

          const targetNextTimestamp = framesCaptured / fallbackFrameRate;
          const waitMs = Math.max(0, (targetNextTimestamp - elapsed) * 1000);
          if (waitMs > 16) {
            await new Promise((resolve) => setTimeout(resolve, waitMs));
          } else {
            await new Promise((resolve) => requestAnimationFrame(resolve));
          }
        }

        activeVideos.forEach(({ video }) => {
          try {
            video.pause();
          } catch (pauseError) {
            console.warn('⚠️ FFmpeg fallback: failed to pause video', pauseError);
          }
        });

        if (!capturedFrameNames.length) {
          console.error('❌ FFmpeg fallback captured zero frames');
          return { success: false, reason: 'ffmpeg-no-frames' };
        }

        outputName = `fallback_${timestamp}.mp4`;
        try {
          await ffmpeg.exec([
            '-framerate', String(fallbackFrameRate),
            '-start_number', '0',
            '-i', framePattern,
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-pix_fmt', 'yuv420p',
            '-movflags', 'faststart',
            outputName
          ]);
        } catch (encodeError) {
          console.error('❌ FFmpeg fallback encoding failed:', encodeError);
          await cleanupArtifacts();
          return { success: false, reason: 'ffmpeg-encode-failed', error: encodeError };
        }

        const outputData = await ffmpeg.readFile(outputName);
        if (!outputData) {
          console.error('❌ FFmpeg fallback produced empty output');
          await cleanupArtifacts();
          return { success: false, reason: 'ffmpeg-output-empty' };
        }

        const outputUint8 = outputData instanceof Uint8Array ? outputData : new Uint8Array(outputData);
        const finalVideoBlob = new Blob([outputUint8], { type: 'video/mp4' });
        const videoFilename = `photobooth-${selectedFrame}-${timestamp}.mp4`;

        if (!skipDownload) {
          triggerBlobDownload(finalVideoBlob, videoFilename);
          console.log('✅ FFmpeg fallback download triggered');
        }

        await cleanupArtifacts();

        return {
          success: true,
          blob: finalVideoBlob,
          filename: videoFilename,
          duration: maxDuration,
          convertedToMp4: true,
          encoder: 'ffmpeg'
        };
      } catch (fallbackError) {
        console.error('❌ FFmpeg fallback failed:', fallbackError);
        try {
          // Attempt cleanup before returning failure
          await cleanupArtifacts();
        } catch (cleanupError) {
          // ignore cleanup failures in error path
        }
        return { success: false, reason: 'ffmpeg-fallback-error', error: fallbackError };
      }
    };

    // Lower bitrate and frame rate for mobile to speed up processing
    const videoBitrate = mobileDevice ? 1_600_000 : 5_000_000; // optimized bitrate for mobile
    const frameRate = mobileDevice ? 21 : 30; // lower fps on mobile to reduce workload
    console.log(`🎬 Video settings: ${videoBitrate/1_000_000}Mbps @ ${frameRate}fps (${mobileDevice ? 'mobile' : 'desktop'})`);
    
    const stream = videoCanvas.captureStream(frameRate);
    const recorder = createRecorderFromStream(stream, { videoBitsPerSecond: videoBitrate });
    if (!recorder) {
      console.warn('🎬 Unable to initialize MediaRecorder; switching to FFmpeg fallback');
      return await encodeWithFfmpegFallback();
    }

    const recordedChunks = [];
    const recordingPromise = new Promise((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };
      recorder.onerror = (event) => {
        console.error('❌ MediaRecorder error during framed video creation:', event);
        reject(event.error || new Error('MediaRecorder error'));
      };
      recorder.onstop = () => {
        try {
          const mimeType = recorder.mimeType || 'video/webm';
          resolve(new Blob(recordedChunks, { type: mimeType }));
        } catch (blobError) {
          reject(blobError);
        }
      };
    });

    recorder.start();

    await Promise.all(activeVideos.map(async ({ video }) => {
      try {
        video.currentTime = 0;
        if (video.paused) {
          await video.play();
        }
      } catch (error) {
        console.warn('⚠️ Video playback interrupted during framed video render:', error);
      }
    }));

    const animationStart = performance.now();
    const totalDuration = maxDuration + 0.25;
    let animationFrameId = null;
    let recorderStopped = false;

    const stopRecording = () => {
      if (recorderStopped) return;
      recorderStopped = true;
      slotVideoElements.forEach((entry) => {
        if (entry?.video) {
          try {
            entry.video.pause();
          } catch (pauseError) {
            console.warn('⚠️ Failed to pause video during cleanup:', pauseError);
          }
        }
      });
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };

    const renderFrame = () => {
      drawCompositeFrame();

      const elapsed = (performance.now() - animationStart) / 1000;
      const allVideosEnded = slotVideoElements.every((entry, index) => {
        if (!entry) return true;
        const duration = slotTargetDurations[index] || maxDuration;
        return entry.video.ended || entry.video.currentTime >= duration;
      });

      if (elapsed >= totalDuration || allVideosEnded) {
        stopRecording();
        return;
      }

      animationFrameId = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    let videoBlob;
    try {
      videoBlob = await recordingPromise;
    } catch (recordingError) {
      console.error('❌ Failed to finalize framed video recording:', recordingError);
      stopRecording();
      const fallbackResult = await encodeWithFfmpegFallback();
      if (fallbackResult?.success) {
        return fallbackResult;
      }
      return fallbackResult || { success: false, reason: 'recording-finalize-failed', error: recordingError };
    }

    let finalVideoBlob = videoBlob;
    let videoFilename = `photobooth-${selectedFrame}-${timestamp}.webm`;
    let convertedToMp4 = false;

    // Skip MP4 conversion on mobile devices to avoid stuck/timeout issues
    if (!videoBlob.type.includes('mp4') && !mobileDevice) {
      try {
        console.log('🔄 Converting video to MP4 (desktop only)...');
        const mp4Blob = await convertBlobToMp4(videoBlob, {
          outputPrefix: `photobooth-${selectedFrame}`,
          frameRate: 30,
          durationSeconds: Math.max(0.1, maxDuration)
        });
        if (mp4Blob) {
          finalVideoBlob = mp4Blob;
          videoFilename = `photobooth-${selectedFrame}-${timestamp}.mp4`;
          convertedToMp4 = true;
          console.log('✅ MP4 conversion successful');
        } else {
          console.warn('⚠️ MP4 conversion failed; falling back to original WebM download.');
        }
      } catch (conversionError) {
        console.error('❌ MP4 conversion threw an error; falling back to WebM download.', conversionError);
      }
    } else if (mobileDevice) {
      console.log('📱 Mobile device detected - skipping MP4 conversion, using WebM directly');
    }

    console.log('🎬 Final video blob:', {
      size: finalVideoBlob.size,
      type: finalVideoBlob.type,
      filename: videoFilename
    });
    
    if (!skipDownload) {
      console.log('📥 Triggering download for:', videoFilename);
      try {
        triggerBlobDownload(finalVideoBlob, videoFilename);
        console.log('✅ Download triggered successfully!');
      } catch (downloadError) {
        console.error('❌ Download failed:', downloadError);
        throw downloadError;
      }
      console.log('🎬 Framed video saved successfully!');
    } else {
      console.log('🎬 Framed video ready for bundling (download skipped).');
    }
    
    console.log('🎬 === GENERATE FRAMED VIDEO END ===');
    return {
      success: true,
      blob: finalVideoBlob,
      filename: videoFilename,
      duration: maxDuration,
      convertedToMp4
    };
  };

  // Helper function to get photo image for a slot - ASYNC VERSION
  const getPhotoImageForSlot = (slotIndex) => {
    try {
      const recordedDimensions = photoDimensions?.[slotIndex];
      if (recordedDimensions?.width && recordedDimensions?.height) {
        return recordedDimensions;
      }

      const slotMeta = frameConfig?.slots?.[slotIndex];
      if (slotMeta?.photoIndex !== undefined) {
        const sharedDimensions = photoDimensions?.[slotMeta.photoIndex];
        if (sharedDimensions?.width && sharedDimensions?.height) {
          return sharedDimensions;
        }
      }

      if (!photos || photos.length === 0) return null;

      let photoIndex = slotIndex;
      if (frameConfig?.duplicatePhotos && slotMeta?.photoIndex !== undefined) {
        photoIndex = slotMeta.photoIndex;
      }

      const hasPhotoInSlot = frameConfig?.duplicatePhotos
        ? Boolean(slotPhotos?.[slotIndex] || photos?.[photoIndex])
        : Boolean(photos?.[photoIndex]);

      if (!hasPhotoInSlot) return null;

      return {
        width: 1600,
        height: 1200
      };
    } catch (error) {
      console.log('⚠️ Could not get photo image for smart scale calculation:', error);
      return null;
    }
  };

  // Async function to load photo and calculate smart scale
  const calculateSmartScaleAsync = async (photoDataUrl, slotIndex) => {
    return new Promise((resolve) => {
      if (!photoDataUrl || !frameConfig?.slots[slotIndex]) {
        resolve(1.6); // fallback
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        const slotMeta = frameConfig?.slots?.[slotIndex];
        setPhotoDimensions((prev = {}) => {
          let changed = false;
          const next = { ...prev };

          const assignDimensions = (key) => {
            if (key === undefined || key === null) return;
            const existing = prev[key];
            if (!existing || existing.width !== img.width || existing.height !== img.height) {
              next[key] = { width: img.width, height: img.height };
              changed = true;
            }
          };

          assignDimensions(slotIndex);
          if (slotMeta?.photoIndex !== undefined) {
            assignDimensions(slotMeta.photoIndex);
          }

          return changed ? next : prev;
        });
        
        const smartScale = calculateSmartDefaultScale(img, slotIndex, frameConfig);
        console.log(`✨ Async smart scale for slot ${slotIndex + 1}: ${smartScale.toFixed(2)}x`);
        resolve(smartScale);
      };
      img.onerror = () => {
        console.warn(`⚠️ Failed to load image for smart scale calculation`);
        resolve(1.6); // fallback
      };
      img.src = photoDataUrl;
    });
  };

  // Update photo transforms with smart scale when photos are loaded
  const updateSmartScales = async () => {
    if (!photos || photos.length === 0 || !frameConfig) return;
    
    console.log('🧮 Calculating smart scales for all slots...');
    
    const updates = {};
    
    // For duplicate photo frames, process all slots
    if (frameConfig.duplicatePhotos && frameConfig.slots) {
      for (let slotIndex = 0; slotIndex < frameConfig.slots.length; slotIndex++) {
        const slot = frameConfig.slots[slotIndex];
        
        // Use slotPhotos if available (for independent slots), otherwise use photos array
        const photoForSlot = slotPhotos[slotIndex] || photos[slot.photoIndex];
        
        if (photoForSlot) {
          try {
            const smartScale = await calculateSmartScaleAsync(photoForSlot, slotIndex);

            // Keep existing transforms if they exist, only update scale when user hasn't adjusted manually
            const existingTransform = photoTransforms[slotIndex] || { translateX: 0, translateY: 0 };
            const wasUserAdjusted = Boolean(existingTransform.userAdjusted);

            if (wasUserAdjusted && typeof existingTransform.scale === 'number') {
              const merged = {
                ...existingTransform,
                autoFillScale: smartScale
              };

              if (merged.autoFillScale !== existingTransform.autoFillScale) {
                updates[slotIndex] = merged;
              }
            } else {
              updates[slotIndex] = {
                ...existingTransform,
                scale: smartScale,
                autoFillScale: smartScale,
                userAdjusted: false
              };
            }
            console.log(`✨ Smart scale for slot ${slotIndex + 1}: ${smartScale.toFixed(2)}x`);
          } catch (error) {
            console.warn(`⚠️ Failed to calculate smart scale for slot ${slotIndex + 1}:`, error);
          }
        }
      }
    } else {
      // Standard processing for non-duplicate frames
      for (let i = 0; i < photos.length; i++) {
        try {
          const smartScale = await calculateSmartScaleAsync(photos[i], i);

          // Keep existing transforms if they exist, only update scale when user hasn't adjusted manually
          const existingTransform = photoTransforms[i] || { translateX: 0, translateY: 0 };
          const wasUserAdjusted = Boolean(existingTransform.userAdjusted);

          if (wasUserAdjusted && typeof existingTransform.scale === 'number') {
            const merged = {
              ...existingTransform,
              autoFillScale: smartScale
            };

            if (merged.autoFillScale !== existingTransform.autoFillScale) {
              updates[i] = merged;
            }
          } else {
            updates[i] = {
              ...existingTransform,
              scale: smartScale,
              autoFillScale: smartScale,
              userAdjusted: false
            };
          }
        } catch (error) {
          console.error(`❌ Error calculating smart scale for photo ${i + 1}:`, error);
        }
      }
    }
    
    if (Object.keys(updates).length > 0) {
      setPhotoTransforms(prev => ({
        ...prev,
        ...updates
      }));
      console.log('✅ Smart scales updated for', Object.keys(updates).length, 'slots');
    }
  };

  // Effect to update smart scales when photos or frame config changes
  useEffect(() => {
    if (photos.length > 0 && frameConfig) {
      // Small delay to ensure everything is properly loaded
      const timer = setTimeout(() => {
        updateSmartScales();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [photos, frameConfig?.id]);

  useEffect(() => {
    if (!frameConfig?.duplicatePhotos) return;
    if (!slotPhotos || Object.keys(slotPhotos).length === 0) return;

    const entries = Object.entries(slotPhotos).filter(([, value]) => Boolean(value));
    if (entries.length === 0) return;

    let cancelled = false;

    const syncSlotTransforms = async () => {
      for (const [slotKey, photoDataUrl] of entries) {
        const slotIndex = Number(slotKey);
        if (!Number.isInteger(slotIndex) || !photoDataUrl) continue;

        try {
          const smartScale = await calculateSmartScaleAsync(photoDataUrl, slotIndex);
          if (cancelled) return;

          setPhotoTransforms((prev = {}) => {
            const previous = prev[slotIndex] || {
              translateX: 0,
              translateY: 0,
              scale: smartScale,
              autoFillScale: smartScale,
              userAdjusted: false
            };

            const requiredScale = Math.max(smartScale, calculateCoverageScaleForSlot(slotIndex));
            const wasUserAdjusted = Boolean(previous.userAdjusted);
            const targetScale = wasUserAdjusted && typeof previous.scale === 'number'
              ? previous.scale
              : requiredScale;

            const bounded = adjustPanForEdgeBoundaries(
              { ...previous, scale: targetScale },
              targetScale,
              slotIndex
            );

            const merged = {
              ...previous,
              ...bounded,
              autoFillScale: requiredScale,
              ...(wasUserAdjusted
                ? { userAdjusted: true }
                : { scale: requiredScale, userAdjusted: false })
            };

            if (
              previous.scale === merged.scale &&
              previous.translateX === merged.translateX &&
              previous.translateY === merged.translateY &&
              previous.autoFillScale === merged.autoFillScale &&
              previous.userAdjusted === merged.userAdjusted
            ) {
              return prev;
            }

            return {
              ...prev,
              [slotIndex]: merged
            };
          });
        } catch (error) {
          console.warn(`⚠️ Failed to update transforms for slot ${slotIndex + 1}:`, error);
        }
      }
    };

    syncSlotTransforms();

    return () => {
      cancelled = true;
    };
  }, [frameConfig?.duplicatePhotos, frameConfig?.id, slotPhotos, calculateCoverageScaleForSlot, adjustPanForEdgeBoundaries]);

  useEffect(() => {
    if (!hasDevAccess && debugMode) {
      setDebugMode(false);
    }
  }, [hasDevAccess, debugMode]);

  useEffect(() => {
    if (!isBrowser || !devAccessInitialized) return;
    if (hasDevAccess) {
      sessionStorage.setItem('fremioDevAccess', 'granted');
    } else {
      sessionStorage.removeItem('fremioDevAccess');
    }
  }, [hasDevAccess, isBrowser, devAccessInitialized]);

  useEffect(() => {
    if (hasDevAccess) {
      setShowDevUnlockPanel(false);
    }
  }, [hasDevAccess]);

  useEffect(() => {
    if (!isBrowser || hasDevAccess || !devAccessInitialized) return;

    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return;
      const modifierPressed = event.ctrlKey || event.metaKey;
      if (modifierPressed && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        setShowDevUnlockPanel(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasDevAccess, isBrowser, devAccessInitialized]);

  useEffect(() => {
    if (!isBrowser || hasDevAccess || showDevUnlockPanel || !devAccessInitialized) return;

    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('devtools') === 'unlock') {
        setShowDevUnlockPanel(true);
      }
    } catch (err) {
      console.warn('⚠️ Unable to parse query params for dev unlock', err);
    }
  }, [hasDevAccess, isBrowser, showDevUnlockPanel, devAccessInitialized]);

  // Helper function to get photo image for a slot - SYNC VERSION FOR IMMEDIATE USE

  const calculateAutoFillScale_ORIGINAL = (slotIndex) => {
    if (!frameConfig || !frameConfig.slots[slotIndex]) return 1;
    
    const slot = frameConfig.slots[slotIndex];
    
    // Dynamic calculation based on frame type
    const slotAspectRatio = slot.width / slot.height;
    let photoAspectRatio = 4 / 3; // Default camera landscape ratio

    const dimensions = resolveSlotPhotoDimensions(slotIndex);
    if (dimensions?.width && dimensions?.height) {
      photoAspectRatio = dimensions.width / dimensions.height;
    }
    
    // Special handling for Testframe4 landscape slots
    if (frameConfig?.id === 'Testframe4') {
      // Testframe4 default to zoom out maksimum + 6 zoom in steps
      console.log(`🎯 Testframe4 slot ${slotIndex + 1}: Setting to MAX ZOOM OUT + 6 zoom in steps`);
      
      const maxZoomOutScale = calculateMaxZoomOutScale(slotIndex);
      
      // Each zoom step is 0.1x increment (same as handlePhotoZoom delta)
      const zoomInSteps = 6;
      const zoomIncrement = 0.1;
      const defaultScale = maxZoomOutScale + (zoomInSteps * zoomIncrement);
      
      console.log(`📏 Testframe4 Slot ${slotIndex + 1}: Default scale = ${defaultScale.toFixed(2)}x (max zoom out: ${maxZoomOutScale.toFixed(2)}x + ${zoomInSteps} steps)`);
      return defaultScale;
    }
    
    // Original logic for portrait frames (Testframe1, 2, 3)
    // Untuk foto landscape (4:3) dalam slot portrait:
    // Kita ingin foto fit berdasarkan HEIGHT agar seluruh tinggi foto terlihat
    
    // objectFit: contain akan otomatis fit foto dalam slot
    // Kita perlu scale tambahan agar foto mengisi slot height dengan optimal
    
    // Simple approach: scale berdasarkan aspect ratio difference
    // Jika foto landscape masuk slot portrait:
    // Foto akan fit by height (atas-bawah pas), ada space kiri-kanan
    // Scale factor untuk mengoptimalkan tinggi
    const heightFitScale = 1.4; // Base scale untuk height fit
    
    // Adjustment berdasarkan ukuran slot
    const slotSizeAdjustment = 1 / slot.height; // Semakin kecil slot, semakin besar scale
    const finalScale = heightFitScale + (slotSizeAdjustment * 0.3);
    
    // Clamp antara 1.2x - 2.2x untuk range yang reasonable
    const clampedScale = Math.max(1.2, Math.min(2.2, finalScale));
    
    console.log(`📏 Slot ${slotIndex + 1}: Vertical-fit scale = ${clampedScale.toFixed(2)}x (slot: ${(slot.width*100).toFixed(0)}%×${(slot.height*100).toFixed(0)}%)`);
    
    return clampedScale;
  };

  // Initialize auto-fit scale for a photo with smart calculation
  const initializePhotoScale = async (photoIndex) => {
    if (!photos[photoIndex] || !frameConfig) {
      console.warn(`⚠️ Cannot initialize photo scale for slot ${photoIndex + 1}: missing photo or frame config`);
      return;
    }

    try {
      // Use smart scale calculation for better fitting
      const smartScale = await calculateSmartScaleAsync(photos[photoIndex], photoIndex);
      console.log(`🔧 Initializing photo ${photoIndex + 1} with smart scale: ${smartScale.toFixed(2)}x`);

      // For duplicate-photo frames, apply the same smart scale to ALL slots that reference this photoIndex
      if (frameConfig?.duplicatePhotos && Array.isArray(frameConfig.slots)) {
        setPhotoTransforms(prev => {
          const next = { ...prev };
          frameConfig.slots.forEach((slot, slotIndex) => {
            const slotPhotoIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
            if (slotPhotoIndex === photoIndex) {
              next[slotIndex] = {
                scale: smartScale,
                translateX: 0,
                translateY: 0,
                autoFillScale: smartScale,
                userAdjusted: false
              };
            }
          });
          return next;
        });
      } else {
        // Standard behavior: apply to this single index
        setPhotoTransforms(prev => ({
          ...prev,
          [photoIndex]: {
            scale: smartScale,
            translateX: 0,
            translateY: 0,
            autoFillScale: smartScale,
            userAdjusted: false
          }
        }));
      }
    } catch (error) {
      console.error(`❌ Error initializing smart scale for photo ${photoIndex + 1}:`, error);
      
      // Fallback to basic auto-fit scale
      const autoFitScale = calculateAutoFillScale(photoIndex);
      console.log(`🔧 Fallback: Initializing photo ${photoIndex + 1} with auto-fit scale: ${autoFitScale.toFixed(2)}x`);

      if (frameConfig?.duplicatePhotos && Array.isArray(frameConfig.slots)) {
        // Apply fallback consistently to all related slots
        setPhotoTransforms(prev => {
          const next = { ...prev };
          frameConfig.slots.forEach((slot, slotIndex) => {
            const slotPhotoIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
            if (slotPhotoIndex === photoIndex) {
              next[slotIndex] = {
                scale: autoFitScale,
                translateX: 0,
                translateY: 0,
                autoFillScale: autoFitScale,
                userAdjusted: false
              };
            }
          });
          return next;
        });
      } else {
        setPhotoTransforms(prev => ({
          ...prev,
          [photoIndex]: {
            scale: autoFitScale,
            translateX: 0,
            translateY: 0,
            autoFillScale: autoFitScale,
            userAdjusted: false
          }
        }));
      }
    }
  };
  const calculateSlotDimensions = (frameConfig, slotIndex) => {
    const slot = frameConfig.slots[slotIndex];
    if (!slot) return null;

    const slotPixels = getSlotPixelDimensions(slotIndex);
    const FRAME_WIDTH = Math.max(previewWidth, 1); // px - ukuran frame di preview
    const FRAME_HEIGHT = Math.max(previewHeight, 1); // px - aspect ratio 2:3
    const slotWidthPx = slotPixels?.width ?? slot.width * FRAME_WIDTH;
    const slotHeightPx = slotPixels?.height ?? slot.height * FRAME_HEIGHT;
    
    return {
      left: slot.left * FRAME_WIDTH,      // px dari kiri
      top: slot.top * FRAME_HEIGHT,       // px dari atas  
      width: slotWidthPx,                 // lebar slot dalam px
      height: slotHeightPx,               // tinggi slot dalam px
      aspectRatio: slot.width / slot.height // rasio slot
    };
  };

  // Fungsi untuk menghitung style photo viewport (preserving full image)
  const calculatePhotoCropStyle = (frameConfig, slotIndex) => {
    const slotDimensions = calculateSlotDimensions(frameConfig, slotIndex);
    if (!slotDimensions) return {};

    const transform = photoTransforms[slotIndex] || { scale: 1, translateX: 0, translateY: 0 };
    const metrics = getSlotPanMetrics(slotIndex);

    const baseWidthPx = Number.isFinite(metrics?.containedWidthPx)
      ? metrics.containedWidthPx
      : slotDimensions.width;
    const baseHeightPx = Number.isFinite(metrics?.containedHeightPx)
      ? metrics.containedHeightPx
      : slotDimensions.height;

    const scale = Number.isFinite(transform?.scale) && transform.scale > 0 ? transform.scale : 1;
    const translateX = Number.isFinite(transform?.translateX) ? transform.translateX : 0;
    const translateY = Number.isFinite(transform?.translateY) ? transform.translateY : 0;

    return {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: `${baseWidthPx}px`,
      height: `${baseHeightPx}px`,
      transformOrigin: 'center center',
      transform: `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${scale})`,
      objectFit: 'cover',
      objectPosition: 'center',
      userSelect: 'none',
      transition: isDraggingPhoto ? 'none' : 'transform 0.18s ease-out',
      willChange: 'transform'
    };
  };

  // Fungsi untuk reload frame config secara live  
  const reloadFrameConfig = async () => {
    if (isReloading) return; // Prevent multiple calls
    
    setIsReloading(true);
    
    try {
  const frameId = safeStorage.getItem('selectedFrame') || 'Testframe1';
      console.log('🔄 Attempting to reload config via manager for:', frameId);
      const newConfig = await reloadFrameConfigFromManager(frameId);
      if (newConfig) {
        setFrameConfig(newConfig);
  safeStorage.setItem('frameConfig', JSON.stringify(newConfig));
        setConfigReloadKey(prev => prev + 1);
        console.log('✅ Frame config reloaded (manager):', newConfig);
        // Re-apply smart scale after config reload
        setTimeout(async () => {
          for (const [index] of photos.entries()) {
            await initializePhotoScale(index);
          }
        }, 150);
      } else {
        console.warn('⚠️ Manager reload returned null, using fallback getFrameConfig');
        const fallback = getFrameConfig(frameId);
        if (fallback) {
          setFrameConfig(fallback);
          safeStorage.setItem('frameConfig', JSON.stringify(fallback));
          setConfigReloadKey(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('❌ Failed to reload frame config:', error);
    } finally {
      setIsReloading(false);
    }
  };

  // Handle photo zoom (dengan edge-to-edge boundaries)
  const handlePhotoZoom = (photoIndex, delta) => {
    setPhotoTransforms(prev => {
      const current = prev[photoIndex] || { scale: 1, translateX: 0, translateY: 0, autoFillScale: 1, userAdjusted: false };
      const autoFillScale = Math.max(
        calculateCoverageScaleForSlot(photoIndex),
        current.autoFillScale || calculateAutoFillScale(photoIndex)
      );
      
      const slot = frameConfig?.slots[photoIndex];
      if (!slot) return prev;

      const minimumScale = calculateCoverageScaleForSlot(photoIndex);
      const maxScale = Math.max(4, minimumScale + 3);
      const proposedScale = current.scale + delta * 0.1;
      const newScale = Math.max(minimumScale, Math.min(maxScale, proposedScale));
      
      // Auto-adjust pan untuk maintain edge-to-edge setelah zoom
  const adjustedTransform = adjustPanForEdgeBoundaries({ ...current, scale: newScale }, newScale, photoIndex);
      
      console.log(`🔍 Photo ${photoIndex + 1}: Zoom ${delta > 0 ? 'IN' : 'OUT'} to ${newScale.toFixed(2)}x (min allowed: ${minimumScale.toFixed(2)}x)`);
      
      return {
        ...prev,
        [photoIndex]: {
          ...adjustedTransform,
          scale: newScale,
          autoFillScale: autoFillScale,
          userAdjusted: true
        }
      };
    });
  };

  useEffect(() => {
    setPhotoTransforms((prev = {}) => {
      let changed = false;
      const next = { ...prev };

      Object.entries(prev).forEach(([key, transform]) => {
        const slotIndex = Number(key);
        if (!Number.isInteger(slotIndex)) return;
        const scale = (transform && typeof transform.scale === 'number' && Number.isFinite(transform.scale))
          ? transform.scale
          : 1;
        const bounded = adjustPanForEdgeBoundaries(transform, scale, slotIndex);
        if (!bounded) return;
        const prevX = transform?.translateX ?? 0;
        const prevY = transform?.translateY ?? 0;
        if (bounded.translateX !== prevX || bounded.translateY !== prevY) {
          next[slotIndex] = {
            ...transform,
            translateX: bounded.translateX,
            translateY: bounded.translateY
          };
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [adjustPanForEdgeBoundaries, slotMeasurements, frameConfig?.id]);

    // Handle photo pan (dengan edge-to-edge boundaries)
  const handlePhotoPan = (photoIndex, deltaX, deltaY) => {
    if (!panModeEnabled) return;

    setPhotoTransforms(prev => {
  const current = prev[photoIndex] || { scale: 1, translateX: 0, translateY: 0, autoFillScale: 1, userAdjusted: false };
      const autoFillScale = current.autoFillScale || 1;
      const scale = current.scale;

      const candidateTransform = {
        ...current,
        translateX: current.translateX + deltaX,
        translateY: current.translateY + deltaY,
        scale
      };

      const boundedTransform = adjustPanForEdgeBoundaries(candidateTransform, scale, photoIndex);

      return {
        ...prev,
        [photoIndex]: {
          ...boundedTransform,
          autoFillScale,
          userAdjusted: true
        }
      };
    });
  };

  // Reset photo transform (ke auto-fit optimal)
  const resetPhotoTransform = (photoIndex) => {
    const autoFillScale = calculateAutoFillScale(photoIndex);
    console.log(`🔄 Reset Photo ${photoIndex + 1} to auto-fit: ${autoFillScale.toFixed(2)}x with centered position`);
    
    setPhotoTransforms(prev => ({
      ...prev,
      [photoIndex]: { 
        scale: autoFillScale, 
        translateX: 0, // Reset ke center
        translateY: 0, // Reset ke center
        autoFillScale: autoFillScale,
        userAdjusted: false
      }
    }));
  };

  // Handle mouse down for pan
  const handlePhotoMouseDown = (e, photoIndex) => {
    if (!panModeEnabled) return;

    if (selectedPhotoForEdit === photoIndex && (e.button === 0 || e.button === undefined)) {
      setIsDraggingPhoto(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  // Handle mouse move for pan
  const handlePhotoMouseMove = (e, photoIndex) => {
    if (!panModeEnabled) return;

    if (isDraggingPhoto && selectedPhotoForEdit === photoIndex) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      handlePhotoPan(photoIndex, deltaX * 0.5, deltaY * 0.5); // Reduce sensitivity
      setDragStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  // Handle mouse up for pan
  const handlePhotoMouseUp = () => {
    setIsDraggingPhoto(false);
  };

  // Debug: Calculate slot dimensions in pixels
  const calculateSlotPixels = (frameConfig, slotIndex) => {
    const slot = frameConfig.slots[slotIndex];
    if (!slot) return null;
    const FRAME_WIDTH = Math.max(previewWidth, 1); // px
    const FRAME_HEIGHT = Math.max(previewHeight, 1); // px
    const slotPixels = getSlotPixelDimensions(slotIndex);
    const slotWidthPx = slotPixels?.width ?? slot.width * FRAME_WIDTH;
    const slotHeightPx = slotPixels?.height ?? slot.height * FRAME_HEIGHT;
    
    return {
      left: Math.round(slot.left * FRAME_WIDTH),
      top: Math.round(slot.top * FRAME_HEIGHT),
      width: Math.round(slotWidthPx),
      height: Math.round(slotHeightPx),
      aspectRatio: slot.aspectRatio,
      calculatedRatio: (slot.width * FRAME_WIDTH) / (slot.height * FRAME_HEIGHT)
    };
  };

  // Debug function untuk melihat state saat save
  const debugSaveState = () => {
    if (!hasDevAccess) return;
    console.log('🔍 DEBUG SAVE STATE:');
    console.log('📷 Photos:', photos);
    console.log('🖼️ Frame Config:', frameConfig);
    console.log('🎯 Selected Frame:', selectedFrame);
    console.log('🔧 Photo Transforms:', photoTransforms);
    console.log('🖼️ Frame Image:', frameImage);
  };

  // Check if user has videos from camera (not from file upload)
  const hasVideosFromCamera = useMemo(() => {
    return recordedClips.length > 0;
  }, [recordedClips]);

  const savePhotoOnly = async () => {
    console.log('📸 Saving photo only...');
    console.log('📊 State check:', {
      photosCount: photos.length,
      photosPreview: photos.map((p, i) => ({ index: i, hasData: !!p, length: p?.length, prefix: p?.substring(0, 30) })),
      slotPhotosKeys: Object.keys(slotPhotos),
      slotPhotosPreview: Object.entries(slotPhotos).map(([k, v]) => ({ slot: k, hasData: !!v, length: v?.length, prefix: v?.substring(0, 30) })),
      frameConfigSlots: frameConfig?.slots?.length,
      frameConfigSlotsDetail: frameConfig?.slots?.map((s, i) => ({ index: i, photoIndex: s.photoIndex })),
      isDuplicateFrame: frameConfig?.duplicatePhotos,
      frameConfigId: frameConfig?.id,
      selectedFrame: selectedFrame,
      frameImage: frameImage?.substring(0, 50)
    });
    setSaveStatusMessage('📸 Menyiapkan foto dengan frame...');
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    let frameAspectRatio, canvasWidth, canvasHeight;
    
    if (frameConfig.id === 'Testframe4') {
      frameAspectRatio = 2 / 3;
      canvasWidth = 800;
      canvasHeight = canvasWidth / frameAspectRatio;
    } else {
      frameAspectRatio = 2 / 3;
      canvasWidth = 800;
      canvasHeight = canvasWidth / frameAspectRatio;
    }
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Use white background instead of blue
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    if (!frameConfig || !frameConfig.slots) {
      setSaveStatusMessage('⚠️ Tidak ada foto untuk disimpan.');
      alert('No photos to save');
      return;
    }
    
    // Check if we have photos - either in photos array or slotPhotos object
    const hasPhotos = photos.length > 0 || Object.keys(slotPhotos).length > 0;
    if (!hasPhotos) {
      setSaveStatusMessage('⚠️ Tidak ada foto untuk disimpan.');
      alert('No photos to save');
      return;
    }
    
    // Load and render photos - support both photos array and slotPhotos object
    const loadBasePhoto = (photoDataUrl, index) =>
      new Promise((resolve) => {
        if (!photoDataUrl) {
          resolve({ img: null, index });
          return;
        }
        const img = new Image();
        img.onload = () => resolve({ img, index });
        img.onerror = () => resolve({ img: null, index });
        img.src = photoDataUrl;
      });
    
    // Render photos to canvas - iterate through slots instead of photos
    const normalizeSlotValue = (value) => {
      if (typeof value !== 'number' || Number.isNaN(value)) return 0;
      if (value > 1) return value / 100;
      if (value < 0) return 0;
      return value;
    };

    const resolveTransformForSlot = (slotIndex, slot) => {
      if (photoTransforms?.[slotIndex]) {
        return photoTransforms[slotIndex];
      }
      const photoIndex = Number.isInteger(slot?.photoIndex) ? slot.photoIndex : slotIndex;
      if (photoTransforms?.[photoIndex]) {
        return photoTransforms[photoIndex];
      }
      return null;
    };

    let renderedCount = 0;
    
    for (let slotIndex = 0; slotIndex < frameConfig.slots.length; slotIndex++) {
      const slot = frameConfig.slots[slotIndex];
      
      // For duplicate-photo frames, use slotPhotos; otherwise use photos array
      const photoForSlot = slotPhotos[slotIndex] || photos[slot.photoIndex];
      
      console.log(`🎯 Slot ${slotIndex}: photoForSlot=${!!photoForSlot}, slotPhotos=${!!slotPhotos[slotIndex]}, photos[${slot.photoIndex}]=${!!photos[slot.photoIndex]}`);
      
      if (!photoForSlot) {
        console.warn(`⚠️ No photo for slot ${slotIndex}`);
        continue;
      }
      
      // Validate photo data
      if (typeof photoForSlot !== 'string' || !photoForSlot.startsWith('data:image/')) {
        console.error(`❌ Invalid photo data for slot ${slotIndex}:`, photoForSlot?.substring(0, 50));
        continue;
      }
      
      console.log(`📦 Photo data for slot ${slotIndex}:`, {
        type: typeof photoForSlot,
        length: photoForSlot.length,
        prefix: photoForSlot.substring(0, 30)
      });
      
      // Load the photo
      const { img } = await loadBasePhoto(photoForSlot, slotIndex);
      if (!img) {
        console.warn(`⚠️ Failed to load image for slot ${slotIndex}`);
        continue;
      }
      
      // Verify image loaded successfully
      if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
        console.error(`❌ Image loaded but invalid for slot ${slotIndex}:`, {
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        });
        continue;
      }
      
      console.log(`✅ Successfully loaded photo for slot ${slotIndex}`, {
        imgWidth: img.width,
        imgHeight: img.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
      
      {
        const normalizedLeft = normalizeSlotValue(slot.left);
        const normalizedTop = normalizeSlotValue(slot.top);
        const normalizedWidth = normalizeSlotValue(slot.width);
        const normalizedHeight = normalizeSlotValue(slot.height);

        const slotX = normalizedLeft * canvasWidth;
        const slotY = normalizedTop * canvasHeight;
        const slotWidth = normalizedWidth * canvasWidth;
        const slotHeight = normalizedHeight * canvasHeight;

        const slotCenterX = slotX + slotWidth / 2;
        const slotCenterY = slotY + slotHeight / 2;

        const slotAspectRatio = slotWidth / Math.max(slotHeight, 1);
        const photoAspectRatio = img.naturalWidth / Math.max(img.naturalHeight, 1);

        let basePhotoWidth = slotWidth;
        let basePhotoHeight = slotHeight;

        if (frameConfig?.id === 'Testframe4') {
          basePhotoWidth = slotWidth;
          basePhotoHeight = slotWidth / Math.max(photoAspectRatio, 0.0001);
        } else if (photoAspectRatio > slotAspectRatio) {
          basePhotoWidth = slotWidth;
          basePhotoHeight = slotWidth / Math.max(photoAspectRatio, 0.0001);
        } else {
          basePhotoHeight = slotHeight;
          basePhotoWidth = slotHeight * photoAspectRatio;
        }

        const metrics = typeof getSlotPanMetrics === 'function' ? getSlotPanMetrics(slotIndex) : null;
        const previewBaseWidth = metrics?.containedWidthPx ?? metrics?.slotWidthPx ?? basePhotoWidth;
        const previewBaseHeight = metrics?.containedHeightPx ?? metrics?.slotHeightPx ?? basePhotoHeight;

        const transform = resolveTransformForSlot(slotIndex, slot) || { scale: 1.0, translateX: 0, translateY: 0 };
        const scale = Number.isFinite(transform?.scale) && transform.scale > 0 ? transform.scale : 1;
        const translateX = Number.isFinite(transform?.translateX) ? transform.translateX : 0;
        const translateY = Number.isFinite(transform?.translateY) ? transform.translateY : 0;

        const translateRatioX = previewBaseWidth ? translateX / previewBaseWidth : 0;
        const translateRatioY = previewBaseHeight ? translateY / previewBaseHeight : 0;

        const baseTranslateX = translateRatioX * basePhotoWidth;
        const baseTranslateY = translateRatioY * basePhotoHeight;

        const finalPhotoWidth = basePhotoWidth * scale;
        const finalPhotoHeight = basePhotoHeight * scale;
        const finalPhotoX = slotCenterX - finalPhotoWidth / 2 + baseTranslateX * scale;
        const finalPhotoY = slotCenterY - finalPhotoHeight / 2 + baseTranslateY * scale;

        console.log(`📐 Slot ${slotIndex} dimensions:`, {
          slotX: Math.round(slotX),
          slotY: Math.round(slotY),
          slotWidth: Math.round(slotWidth),
          slotHeight: Math.round(slotHeight),
          basePhotoWidth: Math.round(basePhotoWidth),
          basePhotoHeight: Math.round(basePhotoHeight),
          finalPhotoWidth: Math.round(finalPhotoWidth),
          finalPhotoHeight: Math.round(finalPhotoHeight)
        });

        console.log(`🔧 Transform for slot ${slotIndex}:`, {
          scale,
          translateX,
          translateY,
          translateRatioX,
          translateRatioY,
          appliedTranslateX: baseTranslateX * scale,
          appliedTranslateY: baseTranslateY * scale
        });

        const slotFilterId = resolveSlotFilterId(slotIndex);
        console.log(`🎨 Drawing photo for slot ${slotIndex} at (${Math.round(finalPhotoX)}, ${Math.round(finalPhotoY)}) with size ${Math.round(finalPhotoWidth)}x${Math.round(finalPhotoHeight)}, scale=${scale.toFixed(2)}, filter=${slotFilterId}`);

        // Draw photo with clipping
        ctx.save();

        if (debugMode) {
          ctx.fillStyle = `hsl(${slotIndex * 60}, 70%, 50%)`;
          ctx.fillRect(slotX, slotY, slotWidth, slotHeight);
          console.log(`🎨 Test color drawn for slot ${slotIndex}`);
        }

        ctx.beginPath();
        ctx.rect(slotX, slotY, slotWidth, slotHeight);
        ctx.clip();

        try {
          console.log(`🖼️ Attempting direct drawImage for slot ${slotIndex}...`);
          ctx.drawImage(img, finalPhotoX, finalPhotoY, finalPhotoWidth, finalPhotoHeight);
          console.log(`✅ Direct drawImage succeeded for slot ${slotIndex}`);

          if (slotFilterId && slotFilterId !== 'none') {
            console.log(`🎨 Applying filter ${slotFilterId} for slot ${slotIndex}...`);
            ctx.globalCompositeOperation = 'source-over';
            drawImageWithFilter(ctx, img, finalPhotoX, finalPhotoY, finalPhotoWidth, finalPhotoHeight, {
              filterId: slotFilterId
            });
            console.log(`✅ Filter applied for slot ${slotIndex}`);
          }
        } catch (err) {
          console.error(`❌ Error drawing image for slot ${slotIndex}:`, err, err.stack);
        }

        ctx.restore();
        renderedCount += 1;
        console.log(`✅ Rendered photo ${renderedCount} for slot ${slotIndex}`);
      }
    }
    
    console.log(`✅ Rendered ${renderedCount} photos to canvas`);
    
    // Optional: Draw debug rectangles to verify photo positions (comment out for production)
    if (debugMode) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 3;
      frameConfig.slots.forEach((slot, index) => {
        const x = (slot.left / 100) * canvasWidth;
        const y = (slot.top / 100) * canvasHeight;
        const w = (slot.width / 100) * canvasWidth;
        const h = (slot.height / 100) * canvasHeight;
        ctx.strokeRect(x, y, w, h);
      });
      console.log('🔴 Debug rectangles drawn');
    }
    
    // Render frame overlay
    if (frameImage) {
      console.log('🖼️ Loading frame overlay:', frameImage);
      const frameImgElement = new Image();
      await new Promise((resolve) => {
        frameImgElement.onload = () => {
          console.log('✅ Frame overlay loaded, drawing...');
          ctx.drawImage(frameImgElement, 0, 0, canvasWidth, canvasHeight);
          console.log('✅ Frame overlay drawn');
          resolve();
        };
        frameImgElement.onerror = (err) => {
          console.error('❌ Failed to load frame overlay:', err);
          resolve();
        };
        frameImgElement.src = frameImage;
      });
    } else {
      console.warn('⚠️ No frameImage available');
    }
    
    // Save photo
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    console.log('💾 Creating blob from canvas...');
    const photoBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('❌ Failed to create blob');
          reject(new Error('Failed to generate image blob'));
          return;
        }
        console.log('✅ Blob created:', blob.size, 'bytes');
        resolve(blob);
      }, 'image/png', 0.95);
    });
    
    const photoFilename = `photobooth-${selectedFrame}-${timestamp}.png`;
    console.log('📥 Triggering download:', photoFilename);
    triggerBlobDownload(photoBlob, photoFilename);
    
    setSaveStatusMessage('✅ Foto berhasil disimpan!');
    alert('Photo saved successfully!');
    clearCapturedMediaStorage(selectedFrame);
  setTimeout(() => setSaveStatusMessage(''), 3000);
  };

  const saveVideoOnly = async () => {
    const mobileDevice = isMobileDevice();
    console.log('🎥 [1/6] Starting saveVideoOnly...');
    console.log('📱 Device info:', {
      userAgent: navigator.userAgent,
      isMobile: mobileDevice
    });
    setSaveStatusMessage('🎥 Menyiapkan video dengan frame...');
    
    if (!hasVideosFromCamera) {
      console.error('❌ No videos from camera available');
      setSaveStatusMessage('⚠️ Belum ada video dari kamera untuk disimpan.');
      alert('No video available. Videos are only available when using the camera.');
      setTimeout(() => setSaveStatusMessage(''), 3000);
      return;
    }
    console.log('✅ Has videos from camera:', recordedClips.length);
    
    // Check video durations and warn if too long on mobile
    if (mobileDevice && videos && videos.length > 0) {
      const totalEstimatedDuration = videos.length * 4; // Assume avg 4s per video
      if (totalEstimatedDuration > 15) {
        console.warn('⚠️ Videos might be too long for mobile processing');
        const proceed = window.confirm(
          `You have ${videos.length} videos which might take a while to process on mobile. Continue anyway?`
        );
        if (!proceed) {
          setSaveStatusMessage('⏸️ Rendering dibatalkan.');
          setTimeout(() => setSaveStatusMessage(''), 3000);
          return;
        }
      }
    }
    
    // Load photos first
    console.log('🎥 [2/6] Loading photos...');
    setSaveStatusMessage('🖼️ Memuat foto dan frame...');
    const loadBasePhoto = (photoDataUrl, index) =>
      new Promise((resolve) => {
        if (!photoDataUrl) {
          console.warn(`⚠️ Photo ${index} has no data`);
          resolve({ img: null, index });
          return;
        }
        const img = new Image();
        img.onload = () => {
          console.log(`✅ Photo ${index} loaded: ${img.width}x${img.height}`);
          resolve({ img, index });
        };
        img.onerror = (error) => {
          console.error(`❌ Photo ${index} failed to load:`, error);
          resolve({ img: null, index });
        };
        img.src = photoDataUrl;
      });
    
    const loadedPhotos = await Promise.all(photos.map(loadBasePhoto));
    console.log('✅ [3/6] Photos loaded:', loadedPhotos.filter(p => p.img).length, 'of', photos.length);
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    
    // Canvas settings for video - smaller size for mobile  
    let frameAspectRatio, canvasWidth, canvasHeight;
    
    // Use smaller canvas for mobile to speed up processing
    const baseWidth = mobileDevice ? 540 : 880; // 540px mobile, 880px desktop
    
    if (frameConfig.id === 'Testframe4') {
      frameAspectRatio = 2 / 3;
      canvasWidth = baseWidth;
      canvasHeight = canvasWidth / frameAspectRatio;
    } else {
      frameAspectRatio = 2 / 3;
      canvasWidth = baseWidth;
      canvasHeight = canvasWidth / frameAspectRatio;
    }
    console.log('✅ [4/6] Canvas configured:', canvasWidth, 'x', canvasHeight, `(${mobileDevice ? 'mobile' : 'desktop'})`);
    
    // Generate framed video for all devices (mobile optimized internally)
    console.log('🧮 [5/6] Generating framed video with overlay...');
    setSaveStatusMessage('🎞️ Merender video dengan frame. Mohon tunggu...');
    const framedVideoResult = await generateFramedVideo({
      loadedPhotos,
      canvasWidth,
      canvasHeight,
      timestamp,
      skipDownload: false
    });
    
    console.log('🎥 [6/6] Video generation result:', framedVideoResult);
    
    if (framedVideoResult && framedVideoResult.success) {
      console.log('✅ Video saved successfully!');
      setSaveStatusMessage('✅ Video berhasil disimpan dengan frame!');
      alert('Video saved successfully!');
      clearCapturedMediaStorage(selectedFrame);
      setTimeout(() => setSaveStatusMessage(''), 4000);
    } else if (framedVideoResult && framedVideoResult.reason === 'recorder-init-failed') {
      console.error('❌ Video generation failed due to recorder init issue:', framedVideoResult);
      setSaveStatusMessage('❌ Perangkat tidak mendukung perekaman kanvas otomatis.');
      alert('Perangkat ini belum mendukung perekaman video dengan frame secara langsung. Silakan gunakan desktop atau peramban yang lebih baru.');
    } else {
      console.error('❌ Video generation failed:', framedVideoResult);
      setSaveStatusMessage('❌ Gagal merender video. Coba ulangi.');
      alert('Failed to generate video. Please try again.');
    }
  };

  const handleSavePhoto = async () => {
    if (isSaving) return;
    
    if (hasDevAccess) {
      debugSaveState();
    }
    
    setIsSaving(true);
    try {
      await savePhotoOnly();
    } catch (error) {
      console.error('❌ Save photo error:', error);
      alert('Failed to save photo. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVideo = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    setSaveStatusMessage('⚙️ Menyiapkan proses render video...');
    try {
  // Timeout thresholds tuned for devices (90s mobile, 60s desktop)
      const mobileDevice = isMobileDevice();
      const timeoutMs = mobileDevice ? 90000 : 60000; // 90s mobile, 60s desktop
      console.log(`⏱️ Video generation timeout set to ${timeoutMs/1000}s (${mobileDevice ? 'mobile' : 'desktop'})`);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Video generation timeout')), timeoutMs);
      });
      
      await Promise.race([saveVideoOnly(), timeoutPromise]);
    } catch (error) {
      console.error('❌ Save video error:', error);
      if (error.message === 'Video generation timeout') {
        setSaveStatusMessage('⏱️ Rendering melebihi batas waktu. Coba kurangi durasi video.');
        alert('Video generation took too long. Please try with shorter videos or fewer photos.');
      } else {
        setSaveStatusMessage('❌ Gagal menyimpan video. Silakan coba lagi.');
        alert('Failed to save video. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return; // Prevent multiple saves
    
    if (hasDevAccess) {
      debugSaveState(); // Debug current state
    }
    
    setIsSaving(true);
    try {
      console.log('🎪 Starting save process...');
      console.log('🔧 Current photoTransforms state:', photoTransforms);
      console.log('🔧 PhotoTransforms keys:', Object.keys(photoTransforms));
      console.log('🔧 Photos length:', photos.length);
      console.log('📷 Photos available:', photos.length);
      console.log('🖼️ Frame config:', frameConfig);
      console.log('🎯 Selected frame:', selectedFrame);
      
      // DEBUG: Check frameConfig slots untuk Testframe4
      if (frameConfig.id === 'Testframe4') {
        console.log('🔍 TESTFRAME4 DEBUG - Slot configurations:');
        frameConfig.slots.forEach((slot, index) => {
          console.log(`  Slot ${index + 1}:`, {
            left: slot.left + '%',
            top: slot.top + '%', 
            width: slot.width + '%',
            height: slot.height + '%'
          });
        });
      }
      
      // Create canvas untuk menggabungkan frame dan foto
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size sesuai frame aspect ratio dari preview
      let frameAspectRatio, canvasWidth, canvasHeight;
      
      // Dynamic sizing based on frame type
      if (frameConfig.id === 'Testframe4') {
        // Testframe4 has portrait frame but landscape slots
        frameAspectRatio = 2 / 3; // Portrait frame like others
        canvasWidth = 800;
        canvasHeight = canvasWidth / frameAspectRatio; // 800 / (2/3) = 1200
        console.log('🎯 Testframe4 canvas sizing: portrait frame with landscape slots');
      } else {
        // Other frames (Testframe1, 2, 3)
        frameAspectRatio = 2 / 3; // Frame portrait 2:3 ratio seperti di preview
        canvasWidth = 800;
        canvasHeight = canvasWidth / frameAspectRatio; // 800 / (2/3) = 1200
      }
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      console.log('✅ Canvas created with aspect ratio:', canvasWidth, 'x', canvasHeight, `(${frameConfig.id})`);
      
      // Fill background dengan frame color (blue) seperti di preview
      ctx.fillStyle = '#2563eb'; // Blue color like the frame
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      console.log('✅ Canvas background filled with blue frame color');
      
      if (!frameConfig || !frameConfig.slots) {
        console.error('❌ Frame configuration not found or invalid');
        alert('Frame configuration not found');
        return;
      }
      
      if (photos.length === 0) {
        console.error('❌ No photos to save');
        alert('No photos to save');
        return;
      }
      
      // Load semua foto yang diperlukan
      console.log('📸 Loading photos for canvas...');
      console.log('📷 Photos data check:');
      console.log('Photos array length:', photos.length);
      console.log('Photos array:', photos);
      
      photos.forEach((photo, index) => {
        console.log(`Photo ${index + 1}:`, {
          hasData: !!photo,
          dataType: typeof photo,
          dataLength: photo ? photo.length : 0,
          startsWithData: photo ? photo.startsWith('data:') : false,
          preview: photo ? `${photo.substring(0, 50)}...` : 'NO DATA'
        });
      });

      const loadBasePhoto = (photoDataUrl, index) =>
        new Promise((resolve) => {
          if (!photoDataUrl) {
            console.warn(`⚠️ Photo ${index + 1}: No data URL`);
            resolve({ img: null, index });
            return;
          }
          const img = new Image();
          img.onload = () => {
            console.log(`✅ Photo ${index + 1}: Loaded (${img.width}x${img.height})`);
            resolve({ img, index });
          };
          img.onerror = (error) => {
            console.error(`❌ Photo ${index + 1}: Failed to load`, error);
            resolve({ img: null, index });
          };
          img.src = photoDataUrl;
        });

      const loadedPhotos = await Promise.all(photos.map(loadBasePhoto));
      console.log('📸 Base photos loaded:', loadedPhotos.filter((p) => p.img).length, 'of', loadedPhotos.length);

      const getSlotSourcePhoto = (slotIndex) => {
        if (Object.prototype.hasOwnProperty.call(slotPhotos || {}, slotIndex)) {
          return slotPhotos[slotIndex];
        }
        const slot = frameConfig?.slots?.[slotIndex];
        if (!slot) return null;
        const fallbackIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
        return photos[fallbackIndex] ?? null;
      };

      const slotEntries = (frameConfig?.slots || [])
        .map((slot, slotIndex) => ({
          slot,
          slotIndex,
          photoSource: getSlotSourcePhoto(slotIndex),
        }))
        .filter((entry) => entry.slot && entry.photoSource);

      if (!slotEntries.length) {
        console.error('❌ No slot/photo pairs available for rendering');
        alert('Tidak ada foto yang dapat dirender. Pastikan minimal satu foto dipilih.');
        return;
      }

      const loadSlotImage = (dataUrl, slotIndex) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = (error) => {
            console.error(`❌ Slot ${slotIndex + 1}: Failed to load photo`, error);
            resolve(null);
          };
          img.src = dataUrl;
        });

      const slotImages = await Promise.all(
        slotEntries.map(async (entry) => ({
          ...entry,
          img: await loadSlotImage(entry.photoSource, entry.slotIndex),
        }))
      );

      let renderedCount = 0;
  const PREVIEW_WIDTH = Math.max(previewWidth, 1);
  const PREVIEW_HEIGHT = Math.max(previewHeight, 1);
      const SCALE_RATIO = canvasWidth / PREVIEW_WIDTH;

      slotImages.forEach(({ slot, slotIndex, img }) => {
        if (!img) {
          console.warn(`⚠️ Slot ${slotIndex + 1}: Image missing after load, skipping`);
          return;
        }

        const defaultScale = frameConfig.id === 'Testframe4' ? 1.1 : 1.6;
        const transform = photoTransforms[slotIndex] || { scale: defaultScale, translateX: 0, translateY: 0 };

        const previewSlotX = slot.left * PREVIEW_WIDTH;
        const previewSlotY = slot.top * PREVIEW_HEIGHT;
        const previewSlotWidth = slot.width * PREVIEW_WIDTH;
        const previewSlotHeight = slot.height * PREVIEW_HEIGHT;

        const slotX = previewSlotX * SCALE_RATIO;
        const slotY = previewSlotY * SCALE_RATIO;
        const slotWidth = previewSlotWidth * SCALE_RATIO;
        const slotHeight = previewSlotHeight * SCALE_RATIO;

        const imgAspectRatio = img.width / img.height;
        const slotAspectRatio = slotWidth / slotHeight;

        const photoDisplayWidth = imgAspectRatio > slotAspectRatio ? slotWidth : slotHeight * imgAspectRatio;
        const photoDisplayHeight = imgAspectRatio > slotAspectRatio ? slotWidth / imgAspectRatio : slotHeight;

        const slotCenterX = slotX + slotWidth / 2;
        const slotCenterY = slotY + slotHeight / 2;

        const translateX = (transform.translateX ?? transform.x ?? 0) * SCALE_RATIO;
        const translateY = (transform.translateY ?? transform.y ?? 0) * SCALE_RATIO;
        const scale = transform.scale ?? 1;

        ctx.save();
        ctx.beginPath();
        ctx.rect(slotX, slotY, slotWidth, slotHeight);
        ctx.clip();

        const finalPhotoWidth = photoDisplayWidth * scale;
        const finalPhotoHeight = photoDisplayHeight * scale;
        const finalPhotoX = slotCenterX - finalPhotoWidth / 2 + translateX;
        const finalPhotoY = slotCenterY - finalPhotoHeight / 2 + translateY;

        const slotFilterId = resolveSlotFilterId(slotIndex);
        drawImageWithFilter(ctx, img, finalPhotoX, finalPhotoY, finalPhotoWidth, finalPhotoHeight, {
          filterId: slotFilterId,
        });

        ctx.restore();
        renderedCount += 1;
        console.log(`✅ Slot ${slotIndex + 1}: Rendered with transform`, transform);
      });

      console.log(`Photos rendering complete: ${renderedCount} photos rendered`);
      
      // Render frame overlay on top of photos
      if (frameImage) {
        console.log('Rendering frame overlay...');
        
        try {
          const frameImgElement = new Image();
          await new Promise((resolve, reject) => {
            frameImgElement.onload = () => {
              console.log(`✅ Frame image loaded: ${frameImgElement.width}x${frameImgElement.height}`);
              
              // Draw frame overlay on top of everything
              ctx.drawImage(frameImgElement, 0, 0, canvasWidth, canvasHeight);
              console.log('✅ Frame overlay rendered successfully');
              resolve();
            };
            frameImgElement.onerror = (error) => {
              console.error('❌ Failed to load frame image:', error);
              resolve(); // Continue without frame instead of failing
            };
            frameImgElement.src = frameImage;
          });
        } catch (error) {
          console.error('❌ Frame rendering error:', error);
          // Continue without frame
        }
      } else {
        console.warn('⚠️ No frame image to render');
      }
      
      console.log(`🎨 Final rendering complete: ${renderedCount} photos + frame overlay`);
      
      // Debug: Log canvas final state
      console.log('🔍 Canvas final state - creating blob...');
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');

      let photoBlob;
      try {
        photoBlob = await new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to generate image blob'));
              return;
            }
            resolve(blob);
          }, 'image/png', 0.95);
        });
      } catch (blobError) {
        console.error('❌ Failed to generate blob from canvas:', blobError);
        alert('Failed to generate image');
        return;
      }

      const photoFilename = `photobooth-${selectedFrame}-${timestamp}.png`;
      console.log('✅ Blob created:', photoBlob.size, 'bytes');
      console.log('🗃️ Preparing bundled download for photo and video...');

      let framedVideoResult = null;
      try {
        framedVideoResult = await generateFramedVideo({
          loadedPhotos,
          canvasWidth,
          canvasHeight,
          timestamp,
          skipDownload: true
        });
      } catch (videoError) {
        console.error('⚠️ Failed to generate framed video:', videoError);
      }

      const bundleResult = await downloadMediaBundle({
        photoBlob,
        photoFilename,
        framedVideoResult,
        bundleName: timestamp,
        extraMetadata: {
          videoSuccess: Boolean(framedVideoResult?.success),
          videoReason: framedVideoResult?.reason ?? null
        }
      });

      const confirmationMessageParts = ['Media berhasil disiapkan!'];
      if (bundleResult.success) {
        confirmationMessageParts.push('Folder ZIP berisi foto dan video telah diunduh.');
        if (!bundleResult.hasVideo) {
          confirmationMessageParts.push('Video tidak tersedia di dalam bundle.');
        } else if (!bundleResult.framedVideoIncluded && bundleResult.rawVideoCount > 0) {
          confirmationMessageParts.push('Video asli dari setiap slot ikut dimasukkan sebagai cadangan.');
        } else if (bundleResult.framedVideoIncluded && bundleResult.rawVideoCount > 0) {
          confirmationMessageParts.push('Selain video utama, rekaman mentah tiap slot juga disertakan.');
        }
      } else {
        if (bundleResult.reason === 'zip-generation-timeout') {
          confirmationMessageParts.push('Pembuatan ZIP memakan waktu terlalu lama sehingga dibatalkan, foto dan video diunduh terpisah.');
        } else {
          confirmationMessageParts.push('Gagal membuat ZIP, file diunduh secara terpisah.');
        }
      }

      if (framedVideoResult && !framedVideoResult.success) {
        confirmationMessageParts.push('Framed video tidak dapat dibuat untuk sesi ini.');
      }

      alert(confirmationMessageParts.join(' '));
      clearCapturedMediaStorage(selectedFrame);
      
    } catch (error) {
      console.error('❌ Save error:', error);
      alert('Failed to save photo. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate unique print code
  const generatePrintCode = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `FREMIO-${timestamp}-${random}`;
  };

  // Upload photo and generate QR code
  const uploadPhotoForPrint = async (canvas) => {
    try {
      setIsUploading(true);
      
      // Convert canvas to blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png', 0.95);
      });
      
      // Generate unique code
      const uniqueCode = generatePrintCode();
      
      // Create FormData
      const formData = new FormData();
      formData.append('photo', blob, `fremio-${uniqueCode}.png`);
      formData.append('code', uniqueCode);
      formData.append('frameType', selectedFrame);
      formData.append('timestamp', new Date().toISOString());
      
      // For now, simulate backend with local storage (replace with actual API later)
      // Upload to your backend (you'll need to implement this endpoint)
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/upload-for-print`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        // Fallback: create local URL for testing
        const fileUrl = URL.createObjectURL(blob);
        
        // Generate QR code
        const qrCodeDataUrl = await QRCode.toDataURL(uniqueCode, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        return {
          code: uniqueCode,
          qrCode: qrCodeDataUrl,
          downloadUrl: fileUrl
        };
      }
      
      const result = await response.json();
      
      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(uniqueCode, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return {
        code: uniqueCode,
        qrCode: qrCodeDataUrl,
        downloadUrl: result.downloadUrl
      };
      
    } catch (error) {
      console.error('Upload error:', error);
      
      // Fallback for demo purposes
      const uniqueCode = generatePrintCode();
      const qrCodeDataUrl = await QRCode.toDataURL(uniqueCode, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return {
        code: uniqueCode,
        qrCode: qrCodeDataUrl,
        downloadUrl: '#demo'
      };
    } finally {
      setIsUploading(false);
    }
  };

  const handlePrint = async () => {
    try {
      console.log('🖨️ Starting print process...');
      
      // Reuse canvas generation logic from handleSave
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size (same as handleSave)
      let frameAspectRatio = 2 / 3;
      const canvasWidth = 800;
      const canvasHeight = canvasWidth / frameAspectRatio;
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      // Fill background
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Render photos (reuse logic from handleSave)
      if (frameConfig?.duplicatePhotos && selectedFrame === 'Testframe2') {
        // Handle Testframe2 with slot-based photos
        const frameSlots = frameConfig.slots || [];
        
        for (let slotIndex = 0; slotIndex < frameSlots.length; slotIndex++) {
          const slot = frameSlots[slotIndex];
          
          // ✅ PERBAIKAN: Gunakan slotPhotos yang actual (setelah drag & drop)
          let actualPhotoSrc;
          
          if (slotPhotos[slotIndex]) {
            // Slot sudah di-assign foto specific (dari drag & drop atau manual assignment)
            actualPhotoSrc = slotPhotos[slotIndex];
          } else {
            // Fallback ke config default photoIndex
            const photoIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
            actualPhotoSrc = photos[photoIndex];
          }
          
          if (actualPhotoSrc) {
            const img = new Image();
            await new Promise((resolve) => {
              img.onload = () => {
                const transform = photoTransforms[slotIndex] || { translateX: 0, translateY: 0, scale: 1 };
                
                ctx.save();
                
                const slotX = slot.x * canvasWidth / 100;
                const slotY = slot.y * canvasHeight / 100;
                const slotWidth = slot.width * canvasWidth / 100;
                const slotHeight = slot.height * canvasHeight / 100;
                
                // Create clipping region
                ctx.beginPath();
                ctx.rect(slotX, slotY, slotWidth, slotHeight);
                ctx.clip();
                
                // Calculate scaled dimensions
                const scaledWidth = slotWidth * transform.scale;
                const scaledHeight = slotHeight * transform.scale;
                
                // Calculate position with transform offset
                const imgX = slotX + (slotWidth - scaledWidth) / 2 + (transform.translateX || 0);
                const imgY = slotY + (slotHeight - scaledHeight) / 2 + (transform.translateY || 0);
                
                const slotFilterId = resolveSlotFilterId(slotIndex);
                drawImageWithFilter(ctx, img, imgX, imgY, scaledWidth, scaledHeight, {
                  filterId: slotFilterId
                });
                ctx.restore();
                resolve();
              };
              img.src = actualPhotoSrc;
            });
          }
        }
      } else {
        // Handle regular frames
        const frameSlots = frameConfig?.slots || [];
        
        for (let i = 0; i < frameSlots.length && i < photos.length; i++) {
          if (photos[i]) {
            const img = new Image();
            await new Promise((resolve) => {
              img.onload = () => {
                const slot = frameSlots[i];
                const transform = photoTransforms[i] || { x: 0, y: 0, scale: 1 };
                
                ctx.save();
                
                const slotX = slot.x * canvasWidth / 100;
                const slotY = slot.y * canvasHeight / 100;
                const slotWidth = slot.width * canvasWidth / 100;
                const slotHeight = slot.height * canvasHeight / 100;
                
                // Create clipping region
                ctx.beginPath();
                ctx.rect(slotX, slotY, slotWidth, slotHeight);
                ctx.clip();
                
                // Calculate scaled dimensions
                const scaledWidth = slotWidth * transform.scale;
                const scaledHeight = slotHeight * transform.scale;
                
                // Calculate position with transform offset
                const imgX = slotX + (slotWidth - scaledWidth) / 2 + transform.x;
                const imgY = slotY + (slotHeight - scaledHeight) / 2 + transform.y;
                
                const slotFilterId = resolveSlotFilterId(i);
                drawImageWithFilter(ctx, img, imgX, imgY, scaledWidth, scaledHeight, {
                  filterId: slotFilterId
                });
                ctx.restore();
                resolve();
              };
              img.src = photos[i];
            });
          }
        }
      }
      
      // Render frame overlay
      if (frameImage) {
        const frameImg = new Image();
        await new Promise((resolve) => {
          frameImg.onload = () => {
            ctx.drawImage(frameImg, 0, 0, canvasWidth, canvasHeight);
            resolve();
          };
          frameImg.src = frameImage;
        });
      }
      
      // Upload and generate QR code
      const printData = await uploadPhotoForPrint(canvas);
      
      setPrintCode(printData);
      setShowPrintModal(true);
      
      console.log('✅ Print code generated:', printData.code);
      
    } catch (error) {
      console.error('❌ Print error:', error);
      alert('Failed to prepare photo for printing. Please try again.');
    }
  };

  const renderSavePrintControls = ({ forceMobileLayout = false, marginTopOverride } = {}) => {
    const useMobileLayout = forceMobileLayout || isMobile;
    const containerMarginTop = marginTopOverride !== undefined
      ? marginTopOverride
      : useMobileLayout
        ? '1rem'
        : '0.5rem';

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: useMobileLayout ? '0.75rem' : '0.85rem',
          width: '100%',
          marginTop: containerMarginTop
        }}
      >
        {hasDevAccess && !useMobileLayout && (
        <button
          onClick={debugSaveState}
          style={{
            background: '#f0f0f0',
            border: '1px solid #ccc',
            color: '#666',
            borderRadius: '15px',
            padding: '0.5rem 1rem',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          🔍 Debug Save Data
        </button>
      )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%'
          }}
        >
          {useMobileLayout ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                background: '#fff',
                borderRadius: '999px',
                border: '1px solid rgba(148,163,184,0.35)',
                boxShadow: '0 18px 30px rgba(15,23,42,0.18)',
                overflow: 'hidden',
                width: '100%',
                maxWidth: isCompact ? '280px' : '320px',
                gap: '1px'
              }}
            >
              <button
                onClick={handleSavePhoto}
                disabled={isSaving}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  padding: isCompact ? '0.82rem 0.5rem' : '0.9rem 0.75rem',
                  fontSize: isCompact ? '0.9rem' : '0.95rem',
                  fontWeight: 700,
                  color: isSaving ? '#94a3b8' : '#111827',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  transition: 'color 0.2s ease',
                  letterSpacing: '-0.01em'
                }}
              >
                {isSaving ? '💾 Saving…' : '📸 Save Photo'}
              </button>
              <div
                style={{
                  width: '1px',
                  background: 'rgba(148,163,184,0.5)'
                }}
              />
              <button
                onClick={handleSaveVideo}
                disabled={isSaving || !hasVideosFromCamera}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  padding: isCompact ? '0.82rem 0.5rem' : '0.9rem 0.75rem',
                  fontSize: isCompact ? '0.9rem' : '0.95rem',
                  fontWeight: 700,
                  color: (isSaving || !hasVideosFromCamera) ? '#94a3b8' : '#111827',
                  cursor: (isSaving || !hasVideosFromCamera) ? 'not-allowed' : 'pointer',
                  transition: 'color 0.2s ease',
                  letterSpacing: '-0.01em',
                  opacity: (isSaving || !hasVideosFromCamera) ? 0.5 : 1
                }}
              >
                {isSaving ? '🎥 Saving...' : '🎥 Save Video'}
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              width: '100%'
            }}>
              <button
                onClick={handleSavePhoto}
                disabled={isSaving}
                style={{
                  background: isSaving ? '#f5f5f5' : '#E8A889',
                  border: 'none',
                  color: isSaving ? '#999' : 'white',
                  borderRadius: '25px',
                  padding: '0.8rem 2rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: isSaving ? 0.7 : 1,
                  flex: 1
                }}
                onMouseEnter={(e) => {
                  if (!isSaving) {
                    e.target.style.background = '#d49673';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSaving) {
                    e.target.style.background = '#E8A889';
                  }
                }}
              >
                {isSaving ? '💾 Saving...' : '📸 Save Photo'}
              </button>
              
              <button
                onClick={handleSaveVideo}
                disabled={isSaving || !hasVideosFromCamera}
                style={{
                  background: (isSaving || !hasVideosFromCamera) ? '#f5f5f5' : '#fff',
                  border: `2px solid ${(isSaving || !hasVideosFromCamera) ? '#ccc' : '#E8A889'}`,
                  color: (isSaving || !hasVideosFromCamera) ? '#999' : '#E8A889',
                  borderRadius: '25px',
                  padding: '0.8rem 2rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: (isSaving || !hasVideosFromCamera) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: (isSaving || !hasVideosFromCamera) ? 0.5 : 1,
                  flex: 1
                }}
                onMouseEnter={(e) => {
                  if (!isSaving && hasVideosFromCamera) {
                    e.target.style.background = '#E8A889';
                    e.target.style.color = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSaving && hasVideosFromCamera) {
                    e.target.style.background = '#fff';
                    e.target.style.color = '#E8A889';
                  }
                }}
              >
                {isSaving ? '🎥 Saving...' : '🎥 Save Video'}
              </button>
            </div>
          )}
        </div>

        {saveStatusMessage && (
          <div
            style={{
              marginTop: '0.35rem',
              fontSize: useMobileLayout ? '0.85rem' : '0.9rem',
              color: '#1f2937',
              textAlign: 'center',
              maxWidth: '360px'
            }}
          >
            {saveStatusMessage}
          </div>
        )}
      </div>
    );
  };

  const renderSavingOverlay = () => {
    if (!isSaving) return null;

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.82)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '2rem'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            padding: '2.25rem 2.75rem',
            borderRadius: '28px',
            background: 'rgba(255,255,255,0.12)',
            boxShadow: '0 24px 80px rgba(15,23,42,0.45)',
            color: 'white',
            textAlign: 'center',
            maxWidth: 'min(460px, 90vw)'
          }}
        >
          <div style={{ fontSize: '2.25rem' }}>💾</div>
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              letterSpacing: '0.015em'
            }}
          >
            Menyimpan hasilmu…
          </div>
          <div
            style={{
              fontSize: '1rem',
              lineHeight: 1.5,
              opacity: 0.85
            }}
          >
            Mohon tunggu, file sedang diproses.
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f5f1eb 0%, #e8ddd4 100%)',
          padding: pagePadding
        }}
      >
            <div
              style={{
                display: 'flex',
                justifyContent: isMobile ? 'center' : 'flex-start',
                marginBottom: isMobile ? '1.1rem' : '1.25rem'
              }}
            >
              <div
                style={isMobile ? {
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.35rem 0.45rem',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, rgba(250,242,235,0.92) 0%, rgba(242,225,210,0.92) 100%)',
                  boxShadow: '0 14px 32px rgba(15,23,42,0.12)',
                  backdropFilter: 'blur(6px)'
                } : {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.9rem'
                }}
              >
                <button
                  type="button"
                  onClick={() => navigate('/take-moment')}
                  aria-label="Kembali ke halaman pengambilan foto"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: isMobile ? '0.55rem 1.05rem' : '0.55rem 1.1rem',
                    borderRadius: '999px',
                    border: 'none',
                    background: '#fff',
                    color: '#1E293B',
                    fontWeight: 600,
                    fontSize: isMobile ? '0.9rem' : '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 14px 28px rgba(15,23,42,0.12)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.transform = 'translateY(-1px)';
                    event.currentTarget.style.boxShadow = '0 18px 32px rgba(15,23,42,0.18)';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.transform = 'none';
                    event.currentTarget.style.boxShadow = '0 14px 28px rgba(15,23,42,0.12)';
                  }}
                >
                  <span style={{ fontSize: isMobile ? '0.95rem' : '1rem' }}>←</span>
                  <span>Kembali</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/frames')}
                  aria-label="Pilih frame yang berbeda"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: isMobile ? '0.55rem 1.1rem' : '0.6rem 1.2rem',
                    borderRadius: '999px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: isMobile ? '0.9rem' : '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 18px 34px rgba(15,23,42,0.24)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.transform = 'translateY(-1px)';
                    event.currentTarget.style.boxShadow = '0 22px 40px rgba(15,23,42,0.3)';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.transform = 'none';
                    event.currentTarget.style.boxShadow = '0 18px 34px rgba(15,23,42,0.24)';
                  }}
                >
                  <span style={{ fontSize: isMobile ? '0.95rem' : '1rem' }}>🎨</span>
                  <span>Pilih frame lain</span>
                </button>
              </div>
            </div>
        {/* Main Editor Layout */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '1.4rem' : '2rem',
          maxWidth: isMobile ? '100%' : '890px',
          margin: '0 auto'
        }}
      >
        
        {/* Center Panel - Preview */}
          <div
            style={{
              background: isMobile
                ? 'linear-gradient(145deg, rgba(255,255,255,0.94) 0%, rgba(250,239,230,0.94) 100%)'
                : '#fff',
              borderRadius: '20px',
              padding: isMobile
                ? 'clamp(1.1rem, 4.5vw, 1.5rem)'
                : '1.35rem',
              textAlign: 'center',
              boxShadow: isMobile ? '0 18px 34px rgba(15,23,42,0.08)' : 'none',
              border: isMobile ? '1px solid rgba(255,255,255,0.45)' : 'none'
            }}
        >
          <h3
            style={{
              marginBottom: isMobile ? '1.15rem' : '1.6rem',
              fontSize: isMobile ? '1.3rem' : '1.3rem',
              fontWeight: '700',
              color: '#1E293B',
              letterSpacing: '-0.01em'
            }}
          >
            Preview
          </h3>
          
          {/* Frame Preview Area */}
          <div
            style={{
              background: isMobile ? '#f2dcd3' : '#f8f9fa',
              borderRadius: '22px',
              padding: isMobile
                ? '1.75rem 1.3rem'
                : '2.25rem 1.5rem',
              marginBottom: isMobile ? '1rem' : '1.1rem',
              minHeight: isMobile ? '360px' : '420px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: isMobile ? 'inset 0 2px 8px rgba(255,255,255,0.45)' : 'none'
            }}
          >
            {swapModeActive && swapSourceSlot !== null && (
              <div
                style={{
                  position: 'absolute',
                  top: isMobile ? '12px' : '18px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(232, 168, 137, 0.95)',
                  color: '#fff',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: isMobile ? '0.75rem' : '0.85rem',
                  fontWeight: 600,
                  boxShadow: '0 6px 16px rgba(232, 168, 137, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  zIndex: 20
                }}
              >
                <span>Pilih slot lain untuk menukar dengan Slot {swapSourceSlot + 1}</span>
                <button
                  type="button"
                  onClick={resetSwapMode}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '0.15rem 0.6rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
              </div>
            )}
            {frameConfig && frameImage ? (
              <div
                ref={framePreviewRef}
                style={{
                  position: 'relative',
                  width: isMobile
                    ? 'min(280px, 82vw)'
                    : '280px',
                  aspectRatio: '2/3',
                  maxWidth: '100%',
                  margin: '0 auto'
                }}
              >
                {/* Frame Image - RIGID, tidak berubah */}
                <img
                  src={frameImage}
                  alt={frameConfig.name}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    zIndex: 10,
                    pointerEvents: 'none'
                  }}
                  draggable={false}
                />
                
                {/* Photo Slots - menyesuaikan dengan frame rigid */}
                {frameConfig.slots.map((slot, slotIndex) => {
                  const isSwapSource = swapModeActive && swapSourceSlot === slotIndex;
                  const isSwapCandidate = swapModeActive && swapSourceSlot !== null && swapSourceSlot !== slotIndex;
                  const isSelectedForEdit = !swapModeActive && selectedPhotoForEdit === slotIndex;
                  const isActiveSlot = selectedPhotoForEdit === slotIndex;
                  const canPanThisSlot = !swapModeActive && panModeEnabled && isActiveSlot;
                  const isDraggingThisPhoto = canPanThisSlot && isDraggingPhoto;
                  const imageCursor = swapModeActive
                    ? (isSwapSource ? 'not-allowed' : 'pointer')
                    : canPanThisSlot
                      ? (isDraggingThisPhoto ? 'grabbing' : 'grab')
                      : isSelectedForEdit
                        ? 'pointer'
                        : 'pointer';
                  const borderStyle = isSwapSource
                    ? '3px solid #E8A889'
                    : isSwapCandidate
                      ? '2px dashed rgba(232, 168, 137, 0.8)'
                      : isSelectedForEdit
                        ? '2px solid rgba(232, 168, 137, 0.6)'
                        : 'none';
                  const backgroundColor = isSwapSource
                    ? 'rgba(232, 168, 137, 0.25)'
                    : isSwapCandidate
                      ? 'rgba(232, 168, 137, 0.12)'
                      : isSelectedForEdit
                        ? 'rgba(255, 255, 255, 0.95)'
                        : '#f8f9fa';

                  const resolvedPhotoIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
                  const slotHasCustomPhoto = frameConfig?.duplicatePhotos && slotPhotos[slotIndex];
                  const photoSrc = slotHasCustomPhoto ? slotPhotos[slotIndex] : photos[resolvedPhotoIndex];
                  const slotFilterId = resolveSlotFilterId(slotIndex);
                  const filterCssValue = getFilterCssValue(slotFilterId);
                  const photoStyle = calculatePhotoCropStyle(frameConfig, slotIndex);

                  return (
                    <div
                      ref={getSlotRef(slotIndex)}
                      data-slot-index={slotIndex}
                      key={slot.id}
                      style={{
                        position: 'absolute',
                        left: `${slot.left * 100}%`,
                        top: `${slot.top * 100}%`,
                        width: `${slot.width * 100}%`,
                        height: `${slot.height * 100}%`,
                        zIndex: 5,
                        overflow: 'hidden',
                        backgroundColor,
                        border: borderStyle,
                        transition: 'all 0.25s ease',
                        boxSizing: 'border-box',
                        aspectRatio: slot.aspectRatio ? slot.aspectRatio.replace(':', '/') : '4/5',
                        cursor: swapModeActive ? (isSwapSource ? 'not-allowed' : 'pointer') : 'pointer'
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSwapSource}
                      onClick={() => handleSlotClick(slotIndex)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleSlotClick(slotIndex);
                        }
                      }}
                    >
                      {photoSrc ? (
                        <div
                          style={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            overflow: 'hidden'
                          }}
                        >
                          <img
                            src={photoSrc}
                            alt={`Photo ${resolvedPhotoIndex + 1}${slot.photoIndex !== undefined ? ' (duplicate)' : ''}`}
                            style={{
                              ...photoStyle,
                              cursor: imageCursor,
                              filter: filterCssValue && filterCssValue !== 'none' ? filterCssValue : 'none',
                              pointerEvents: swapModeActive ? 'none' : 'auto'
                            }}
                            draggable={false}
                            onWheel={(e) => {
                              if (swapModeActive) return;
                              if (selectedPhotoForEdit === slotIndex) {
                                e.preventDefault();
                                const delta = e.deltaY > 0 ? -1 : 1;
                                handlePhotoZoom(slotIndex, delta);
                              }
                            }}
                            onMouseDown={(e) => {
                              if (swapModeActive) return;
                              handlePhotoMouseDown(e, slotIndex);
                            }}
                            onMouseMove={(e) => {
                              if (swapModeActive) return;
                              handlePhotoMouseMove(e, slotIndex);
                            }}
                            onMouseUp={(e) => {
                              if (swapModeActive) return;
                              handlePhotoMouseUp(e);
                            }}
                            onMouseLeave={(e) => {
                              if (swapModeActive) return;
                              handlePhotoMouseUp(e);
                            }}
                          />

                          {/* Editing controls rendered outside slot for layering */}
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: '#9ca3af',
                            fontSize: '0.7rem',
                            textAlign: 'center',
                            fontWeight: 500
                          }}
                        >
                          Slot {slotIndex + 1}
                        </div>
                      )}
                    </div>
                  );
                })}

                {selectedPhotoForEdit !== null && !swapModeActive && frameConfig.slots[selectedPhotoForEdit] && (() => {
                  const activeSlot = frameConfig.slots[selectedPhotoForEdit];
                  const overlayPadding = isMobile ? (isCompact ? '8px' : '10px') : '12px';
                  const overlayTopPercent = (activeSlot.top + activeSlot.height) * 100;
                  const overlayGap = isMobile ? '0.45rem' : '0.65rem';
                  const transformValue = (photoTransforms[selectedPhotoForEdit]?.scale || 1).toFixed(1);

                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${activeSlot.left * 100}%`,
                        top: `${overlayTopPercent}%`,
                        width: `${activeSlot.width * 100}%`,
                        pointerEvents: 'none',
                        zIndex: 30,
                        display: 'flex',
                        justifyContent: 'center',
                        paddingTop: overlayPadding,
                        boxSizing: 'border-box',
                        transform: `translateY(${overlayGap})`
                      }}
                    >
                      <div
                        style={{
                          pointerEvents: 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          gap: isMobile ? '6px' : '8px',
                          background: 'rgba(0, 0, 0, 0.78)',
                          backdropFilter: 'blur(20px)',
                          borderRadius: '16px',
                          padding: isMobile ? '6px 10px' : '6px 12px',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          boxShadow: '0 10px 28px rgba(0, 0, 0, 0.28)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPanModeEnabled((prev) => !prev);
                          }}
                          aria-pressed={panModeEnabled}
                          title={panModeEnabled ? 'Mode geser aktif' : 'Aktifkan mode geser'}
                          style={{
                            background: panModeEnabled ? 'rgba(148, 233, 209, 0.35)' : 'rgba(255, 255, 255, 0.14)',
                            border: panModeEnabled ? '1px solid rgba(148, 233, 209, 0.65)' : '1px solid rgba(255, 255, 255, 0.18)',
                            width: isMobile ? '30px' : '32px',
                            height: isMobile ? '30px' : '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: panModeEnabled ? '0 8px 18px rgba(56, 189, 248, 0.35)' : '0 4px 12px rgba(0, 0, 0, 0.15)'
                          }}
                        >
                          <img
                            src={shiftIcon}
                            alt="Mode geser"
                            style={{
                              width: isMobile ? '15px' : '16px',
                              height: isMobile ? '15px' : '16px',
                              opacity: panModeEnabled ? 1 : 0.85
                            }}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            beginSwapFromSlot(selectedPhotoForEdit);
                          }}
                          style={{
                            background: 'rgba(232, 168, 137, 0.92)',
                            border: 'none',
                            width: isMobile ? '30px' : '32px',
                            height: isMobile ? '30px' : '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 6px 16px rgba(232, 168, 137, 0.45)'
                          }}
                        >
                          <img
                            src={swapIcon}
                            alt="Tukar slot"
                            style={{ width: isMobile ? '14px' : '15px', height: isMobile ? '14px' : '15px' }}
                          />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePhotoZoom(selectedPhotoForEdit, -1);
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.14)',
                            border: 'none',
                            color: 'white',
                            width: isMobile ? '24px' : '26px',
                            height: isMobile ? '24px' : '26px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          −
                        </button>

                        <div
                          style={{
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 600,
                            minWidth: '36px',
                            textAlign: 'center',
                            background: 'rgba(255, 255, 255, 0.14)',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.15)'
                          }}
                        >
                          {transformValue}x
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePhotoZoom(selectedPhotoForEdit, 1);
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.14)',
                            border: 'none',
                            color: 'white',
                            width: isMobile ? '24px' : '26px',
                            height: isMobile ? '24px' : '26px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          +
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resetPhotoTransform(selectedPhotoForEdit);
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.14)',
                            border: 'none',
                            color: 'white',
                            width: isMobile ? '26px' : '28px',
                            height: isMobile ? '26px' : '28px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px'
                          }}
                        >
                          ↺
                        </button>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Debug Overlay */}
                {hasDevAccess && debugMode && frameConfig.slots.map((slot, slotIndex) => {
                  const pixels = calculateSlotPixels(frameConfig, slotIndex);
                  return (
                    <div
                      key={`debug_${slot.id}`}
                      style={{
                        position: 'absolute',
                        left: `${slot.left * 100}%`,
                        top: `${slot.top * 100}%`,
                        width: `${slot.width * 100}%`,
                        height: `${slot.height * 100}%`,
                        border: '2px dashed #ff0000',
                        background: 'rgba(255, 0, 0, 0.1)',
                        zIndex: 15,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        color: '#ff0000',
                        textAlign: 'center',
                        pointerEvents: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      {slot.id}<br/>
                      {pixels.width}x{pixels.height}px<br/>
                      AR: {pixels.calculatedRatio.toFixed(2)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                color: '#666',
                fontSize: '1.1rem',
                textAlign: 'center'
              }}>
                {frameConfig ? 'Loading frame...' : 'No frame selected'}
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: isMobile ? (isCompact ? '0.5rem' : '0.75rem') : '1.1rem',
              background: isMobile
                ? 'linear-gradient(145deg, rgba(255,255,255,0.96) 0%, rgba(248,240,232,0.96) 100%)'
                : 'rgba(255, 255, 255, 0.92)',
              borderRadius: '18px',
              padding: isMobile ? (isCompact ? '1rem' : '1.25rem') : '1.5rem',
              border: '1px solid rgba(148,163,184,0.25)',
              boxShadow: '0 18px 34px rgba(15,23,42,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: hasDevAccess && debugMode ? '1.25rem' : '1rem'
            }}
          >
            {hasDevAccess && debugMode && (
              <div style={{ textAlign: 'center' }}>
                <h3
                  style={{
                    fontSize: isMobile ? (isCompact ? '1.15rem' : '1.22rem') : '1.18rem',
                    fontWeight: 700,
                    color: '#1E293B'
                  }}
                >
                  Debug Info
                </h3>
              </div>
            )}

            {hasDevAccess && debugMode ? (
              frameConfig && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '0.75rem' : '0.5rem',
                    justifyContent: isMobile ? 'center' : 'space-between', 
                    alignItems: isMobile ? 'stretch' : 'center',
                    fontSize: '0.9rem'
                  }}>
                    <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
                      <strong>Frame:</strong> {frameConfig.name}<br/>
                      <strong>Max Captures:</strong> {frameConfig.maxCaptures}<br/>
                      <strong>Layout Ratio:</strong> {frameConfig.layout.aspectRatio}
                    </div>
                    <div style={{ display: 'flex', gap: '0.45rem', justifyContent: 'center' }}>
                      <button
                        onClick={reloadFrameConfig}
                        disabled={isReloading}
                        style={{
                          padding: '6px 12px',
                          fontSize: '11px',
                          backgroundColor: isReloading ? '#6c757d' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: isReloading ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold',
                          opacity: isReloading ? 0.7 : 1
                        }}
                      >
                        {isReloading ? '⏳ Loading...' : '🔄 Reload Config'}
                      </button>
                      <button
                        onClick={() => {
                          console.log('=== DRAG & DROP DEBUG ===');
                          console.log('draggedPhoto:', draggedPhoto);
                          console.log('dragOverSlot:', dragOverSlot);
                          console.log('slotPhotos:', slotPhotos);
                          console.log('photoTransforms:', photoTransforms);
                          console.log('frameConfig.duplicatePhotos:', frameConfig?.duplicatePhotos);
                          console.log('photos.length:', photos?.length);
                          console.log('frameConfig.slots.length:', frameConfig?.slots?.length);
                        }}
                        style={{
                          padding: '6px 12px',
                          fontSize: '11px',
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        🔍 Debug D&D
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table 
                      key={`debug-table-${configReloadKey}`}
                      style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '480px' }}
                    >
                      <thead>
                        <tr style={{ background: '#f0f0f0' }}>
                          <th style={{ border: '1px solid #ddd', padding: '6px' }}>Slot</th>
                          <th style={{ border: '1px solid #ddd', padding: '6px' }}>Position (%)</th>
                          <th style={{ border: '1px solid #ddd', padding: '6px' }}>Size (px)</th>
                          <th style={{ border: '1px solid #ddd', padding: '6px' }}>Ratio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {frameConfig.slots.map((slot, index) => {
                          const pixels = calculateSlotPixels(frameConfig, index);
                          const isRatioCorrect = Math.abs(pixels.calculatedRatio - 0.8) < 0.01;
                          return (
                            <tr key={slot.id}>
                              <td style={{ border: '1px solid #ddd', padding: '6px' }}>{slot.id}</td>
                              <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                                L:{(slot.left * 100).toFixed(0)}% T:{(slot.top * 100).toFixed(0)}%<br/>
                                W:{(slot.width * 100).toFixed(0)}% H:{(slot.height * 100).toFixed(0)}%
                              </td>
                              <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                                {pixels.width}×{pixels.height}px
                              </td>
                              <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                                {pixels.calculatedRatio.toFixed(2)}<br/>
                                {!isRatioCorrect && <span style={{ color: 'red' }}>⚠️</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.85rem', 
                    background: '#f8f9fa', 
                    borderRadius: '10px', 
                    fontSize: '0.8rem' 
                  }}>
                    <strong>Instructions:</strong><br/>
                    • Red boxes show slot positions<br/>
                    • Aspect ratio should be 0.80 for 4:5<br/>
                    • Adjust coordinates in frameConfigs.js
                  </div>
                </div>
              )
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.1rem'
                }}
              >
                {devAccessInitialized && (
                  hasDevAccess ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      padding: '0.9rem',
                      background: '#f8f9fa',
                      borderRadius: '12px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <button
                        type="button"
                        onClick={() => setDebugMode(!debugMode)}
                        style={{
                          background: debugMode ? '#ff6b6b' : '#ffffff',
                          color: debugMode ? '#fff' : '#555',
                          border: '1px solid rgba(0,0,0,0.1)',
                          borderRadius: '12px',
                          padding: '0.75rem',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {debugMode ? 'Sembunyikan Debug' : 'Tampilkan Debug'}
                      </button>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#2e7d32',
                        textAlign: 'center',
                        fontWeight: 600
                      }}>
                        Developer tools unlocked
                      </div>
                      {!isDevEnv && (
                        <button
                          type="button"
                          onClick={handleDeveloperLock}
                          style={{
                            background: '#ffffff',
                            color: '#555',
                            border: '1px solid #e0e0e0',
                            borderRadius: '10px',
                            padding: '0.55rem 0.75rem',
                            fontSize: '0.78rem',
                            cursor: 'pointer'
                          }}
                        >
                          Lock Developer Tools
                        </button>
                      )}
                    </div>
                  ) : (
                    showDevUnlockPanel && (
                      <div style={{
                        padding: '0.9rem',
                        background: '#fff7e6',
                        borderRadius: '12px',
                        border: '1px dashed #f0c36d',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.7rem'
                      }}>
                        <div style={{
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: '#8c6d1f',
                          textAlign: 'center'
                        }}>
                          Developer Access Required
                        </div>
                        <p style={{
                          fontSize: '0.75rem',
                          color: '#9a7b00',
                          margin: 0,
                          textAlign: 'center'
                        }}>
                          Masukkan token developer untuk membuka tools debug.
                        </p>
                        <form onSubmit={handleDeveloperUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <input
                            type="password"
                            value={devTokenInput}
                            onChange={(e) => setDevTokenInput(e.target.value)}
                            placeholder="Developer token"
                            style={{
                              borderRadius: '10px',
                              border: '1px solid #e0c48a',
                              padding: '0.6rem 0.8rem',
                              fontSize: '0.85rem'
                            }}
                          />
                          <button
                            type="submit"
                            disabled={devAuthStatus.loading}
                            style={{
                              background: '#E8A889',
                              color: 'white',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '0.6rem 0.8rem',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              cursor: devAuthStatus.loading ? 'wait' : 'pointer',
                              opacity: devAuthStatus.loading ? 0.7 : 1
                            }}
                          >
                            {devAuthStatus.loading ? 'Checking...' : 'Unlock Tools'}
                          </button>
                        </form>
                        {devAuthStatus.error && (
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#b00020',
                            textAlign: 'center'
                          }}>
                            {devAuthStatus.error}
                          </div>
                        )}
                        {devAuthStatus.success && (
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#2e7d32',
                            textAlign: 'center'
                          }}>
                            Developer tools unlocked for this session.
                          </div>
                        )}
                      </div>
                    )
                  )
                )}

                <div style={isMobile ? {
                  display: 'flex',
                  gap: '0.65rem',
                  overflowX: 'auto',
                  paddingBottom: '0.3rem',
                  scrollSnapType: 'x mandatory',
                  WebkitOverflowScrolling: 'touch'
                } : {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                  gap: '0.5rem'
                }}>
                  {FILTER_PRESETS.map((preset) => {
                    let isSelected = false;
                    if (selectedPhotoForEdit !== null) {
                      isSelected = resolveSlotFilterId(selectedPhotoForEdit) === preset.id;
                    } else if (frameConfig?.slots?.length) {
                      isSelected = allSlotsShareFilter(preset.id);
                    }
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          if (selectedPhotoForEdit !== null) {
                            applyFilterToSlot(selectedPhotoForEdit, preset.id);
                          } else {
                            applyFilterToAllSlots(preset.id);
                          }
                        }}
                        style={{
                          border: isSelected ? '2px solid #E8A889' : '1px solid #e5e7eb',
                          borderRadius: '10px',
                          padding: '0.55rem 0.45rem',
                          background: '#fff',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 5px 14px rgba(232, 168, 137, 0.25)' : 'none',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.4rem',
                          opacity: 1,
                          minWidth: isMobile ? '120px' : 'auto',
                          scrollSnapAlign: isMobile ? 'start' : 'unset'
                        }}
                      >
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '8px',
                          backgroundColor: '#f0f0f0',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <div style={{
                            width: '100%',
                            height: '100%',
                            backgroundImage: 'linear-gradient(135deg, #d7d7d7, #ffffff)',
                            filter: preset.css && preset.css !== 'none' ? preset.css : 'none'
                          }} />
                        </div>
                        <div style={{
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          color: '#333',
                          textAlign: 'center'
                        }}>
                          {preset.label}
                        </div>
                        <div style={{
                          fontSize: '0.65rem',
                          color: '#777',
                          textAlign: 'center',
                          lineHeight: '1.15'
                        }}>
                          {preset.description}
                        </div>
                      </button>
                    );
                  })}
                </div>

              </div>
            )}

            <div
              style={{
                marginTop: isMobile ? '0.75rem' : '1rem'
              }}
            >
              {renderSavePrintControls({
                forceMobileLayout: isMobile,
                marginTopOverride: 0
              })}
            </div>
          </div>
        </div>
      
      {/* Debug Panel - only show if Testframe3 is selected */}
      {selectedFrame === 'Testframe3' && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#ff6b6b',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
          zIndex: 1000,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            🔍 {selectedFrame.toUpperCase()} DEBUG
          </div>
          <div>Frame: {selectedFrame}</div>
          <div>Photos: {photos.length}</div>
          <div>Frame Config: {frameConfig ? '✅' : '❌'}</div>
          <div>Max Captures: {frameConfig?.maxCaptures || 'N/A'}</div>
          <button
            onClick={() => {
              console.log(`🔍 ${selectedFrame.toUpperCase()} COMPLETE DEBUG:`);
              console.log('  - selectedFrame:', selectedFrame);
              console.log('  - frameConfig:', frameConfig);
              console.log('  - photos:', photos);
              console.log('  - photoTransforms:', photoTransforms);
              console.log('  - localStorage selectedFrame:', safeStorage.getItem('selectedFrame'));
              console.log('  - localStorage frameConfig:', safeStorage.getItem('frameConfig'));
              console.log('  - localStorage capturedPhotos:', safeStorage.getItem('capturedPhotos'));
            }}
            style={{
              background: 'white',
              color: '#ff6b6b',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              marginTop: '8px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Log Debug Info
          </button>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && printCode && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{
              marginBottom: '1rem',
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#333'
            }}>
              🖨️ Ready to Print
            </h3>
            
            <p style={{
              color: '#666',
              marginBottom: '1.5rem',
              fontSize: '0.9rem'
            }}>
              Scan QR code with tablet to print
            </p>
            
            {/* QR Code */}
            <div style={{
              background: '#f8f9fa',
              padding: '1.5rem',
              borderRadius: '15px',
              marginBottom: '1.5rem',
              border: '2px solid #e9ecef'
            }}>
              <img 
                src={printCode.qrCode} 
                alt="Print QR Code"
                style={{
                  width: '200px',
                  height: '200px',
                  margin: '0 auto',
                  display: 'block'
                }}
              />
            </div>
            
            {/* Print Code */}
            <div style={{
              background: '#f8f9fa',
              padding: '1rem',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#333',
              fontFamily: 'monospace',
              letterSpacing: '1px'
            }}>
              {printCode.code}
            </div>
            
            {/* Instructions */}
            <div style={{
              fontSize: '0.8rem',
              color: '#666',
              marginBottom: '1.5rem',
              lineHeight: '1.5'
            }}>
              <p>📱 Open tablet printer app</p>
              <p>📷 Scan the QR code above</p>
              <p>🖨️ Your photo will print automatically</p>
            </div>
            
            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  setPrintCode(null);
                }}
                style={{
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  color: '#666',
                  borderRadius: '15px',
                  padding: '0.8rem 1.5rem',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Close
              </button>
              
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(printCode.code);
                    alert('Print code copied to clipboard!');
                  } catch (error) {
                    console.error('Copy failed:', error);
                  }
                }}
                style={{
                  background: '#E8A889',
                  border: 'none',
                  color: 'white',
                  borderRadius: '15px',
                  padding: '0.8rem 1.5rem',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Copy Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

      </div>

      {renderSavingOverlay()}
    </>
  );
}