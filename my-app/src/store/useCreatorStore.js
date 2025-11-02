import { create } from 'zustand';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DEFAULT_UPLOAD_WIDTH,
  DEFAULT_UPLOAD_HEIGHT,
} from '../components/creator/canvasConstants.js';

const DEFAULT_BACKGROUND = '#f7f1ed';

const REFERENCE_CANVAS_WIDTH = 480;
const REFERENCE_CANVAS_HEIGHT = 853;
const WIDTH_SCALE = CANVAS_WIDTH / REFERENCE_CANVAS_WIDTH;
const HEIGHT_SCALE = CANVAS_HEIGHT / REFERENCE_CANVAS_HEIGHT;
const AVERAGE_SCALE = (WIDTH_SCALE + HEIGHT_SCALE) / 2;

const scaleWidthValue = (value) => Math.round(value * WIDTH_SCALE);
const scaleHeightValue = (value) => Math.round(value * HEIGHT_SCALE);
const scaleUniformValue = (value) => Math.round(value * AVERAGE_SCALE);

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const baseElement = (type, overrides = {}) => ({
  id: generateId(),
  type,
  x: scaleWidthValue(80),
  y: scaleHeightValue(80),
  width: scaleWidthValue(160),
  height: scaleHeightValue(160),
  rotation: 0,
  zIndex: 1,
  isLocked: false,
  data: {},
  ...overrides
});

const defaultPropsByType = (type) => {
  switch (type) {
    case 'photo':
      return {
        width: scaleWidthValue(220),
        height: scaleHeightValue(280),
        data: {
          fill: '#d1e3f0',
          borderRadius: scaleUniformValue(24),
          stroke: null,
          strokeWidth: 0,
          label: 'Foto'
        }
      };
    case 'text':
      return {
        width: scaleWidthValue(320),
        height: scaleHeightValue(90),
        data: {
          text: 'Judul Baru',
          fontSize: scaleUniformValue(28),
          fontFamily: 'Inter',
          color: '#1f2933',
          align: 'center',
          fontWeight: 600
        }
      };
    case 'shape':
      return {
        width: scaleWidthValue(200),
        height: scaleHeightValue(200),
        data: {
          fill: '#f4d3c2',
          borderRadius: scaleUniformValue(32),
          stroke: null,
          strokeWidth: 0
        }
      };
    case 'upload':
      return {
        width: DEFAULT_UPLOAD_WIDTH,
        height: DEFAULT_UPLOAD_HEIGHT,
        data: {
          image: null,
          objectFit: 'contain',
          label: 'Unggahan',
          fill: '#d1e3f0',
          borderRadius: scaleUniformValue(24),
          stroke: null,
          strokeWidth: 0
        }
      };
    case 'background-photo':
      return {
        x: 0,
        y: 0,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        zIndex: 0,
        data: {
          image: null,
          objectFit: 'contain',
          aspectRatio: CANVAS_WIDTH / CANVAS_HEIGHT,
          label: 'Background'
        }
      };
    default:
      return {};
  }
};

const computeContainedSize = (aspectRatio, maxWidth = CANVAS_WIDTH, maxHeight = CANVAS_HEIGHT) => {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return { width: maxWidth, height: maxHeight };
  }

  let width = maxWidth;
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
};

const centerWithinCanvas = (width, height) => ({
  x: Math.round((CANVAS_WIDTH - width) / 2),
  y: Math.round((CANVAS_HEIGHT - height) / 2),
});

console.log('[useCreatorStore] Store module loaded');

export const useCreatorStore = create((set, get) => ({
  elements: [],
  selectedElementId: null,
  canvasBackground: DEFAULT_BACKGROUND,
  lastZIndex: 1,
  addElement: (type, extra = {}) => {
    const defaults = defaultPropsByType(type);
    const mergedData = {
      ...(defaults.data || {}),
      ...(extra.data || {})
    };
    const nextZ = get().lastZIndex + 1;
    const desiredZ = typeof extra.zIndex === 'number' ? extra.zIndex : nextZ;
    const element = baseElement(type, {
      ...defaults,
      ...extra,
      data: mergedData,
      zIndex: desiredZ
    });
    set((state) => ({
      elements: [...state.elements, element],
      selectedElementId: element.id,
      lastZIndex: desiredZ > state.lastZIndex ? desiredZ : state.lastZIndex
    }));
    return element.id;
  },
  addUploadElement: (imageDataUrl) => {
    // Create image to get dimensions
    const img = new Image();
    img.src = imageDataUrl;
    
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const state = get();
      
      // Target size is 1/3 of canvas for display
      const targetWidth = CANVAS_WIDTH / 3;
      const targetHeight = CANVAS_HEIGHT / 3;
      
      let width, height;
      
      // Scale to fit within 1/3 canvas while maintaining aspect ratio
      if (img.width / targetWidth > img.height / targetHeight) {
        // Width is the limiting factor
        width = targetWidth;
        height = width / aspectRatio;
      } else {
        // Height is the limiting factor
        height = targetHeight;
        width = height * aspectRatio;
      }
      
      // Create display version (smaller)
      const displayCanvas = document.createElement('canvas');
      displayCanvas.width = Math.round(width);
      displayCanvas.height = Math.round(height);
      const displayCtx = displayCanvas.getContext('2d');
      displayCtx.drawImage(img, 0, 0, Math.round(width), Math.round(height));
      const displayImageDataUrl = displayCanvas.toDataURL('image/png', 0.95);
      
      const elements = state.elements;
      const uploadElement = elements.find(el => el.data?.image === imageDataUrl && el.type === 'upload');
      
      if (uploadElement) {
        // Center the element on canvas
        const x = Math.round((CANVAS_WIDTH - width) / 2);
        const y = Math.round((CANVAS_HEIGHT - height) / 2);
        
        set({
          elements: elements.map(el => 
            el.id === uploadElement.id 
              ? { 
                  ...el, 
                  width: Math.round(width),
                  height: Math.round(height),
                  x,
                  y,
                  data: {
                    ...el.data,
                    image: displayImageDataUrl, // Use smaller version for display
                    originalImage: imageDataUrl, // Keep original for high-quality resize
                    imageAspectRatio: aspectRatio,
                    objectFit: 'contain'
                  }
                }
              : el
          )
        });
      }
    };
    
    const id = get().addElement('upload', {
      x: Math.round((CANVAS_WIDTH - DEFAULT_UPLOAD_WIDTH) / 2),
      y: Math.round((CANVAS_HEIGHT - DEFAULT_UPLOAD_HEIGHT) / 2),
      data: {
        image: imageDataUrl,
        objectFit: 'contain',
        label: 'Unggahan'
      }
    });
    return id;
  },
  addBackgroundPhoto: (imageDataUrl, meta = {}) => {
    const state = get();
    const existing = state.elements.find((el) => el.type === 'background-photo');

    // Get canvas dimensions from meta or use defaults
    const canvasWidth = meta.canvasWidth || CANVAS_WIDTH;
    const canvasHeight = meta.canvasHeight || CANVAS_HEIGHT;

    // Load image to get actual dimensions
    const img = new Image();
    img.src = imageDataUrl;
    
    const processImage = () => {
      const aspectRatio = img.width / img.height;
      const canvasAspectRatio = canvasWidth / canvasHeight;
      
      // Calculate size to COVER canvas (not contain)
      // Image must be >= canvas size on all sides
      let width, height;
      
      if (aspectRatio > canvasAspectRatio) {
        // Image is wider than canvas - match height, let width overflow
        height = canvasHeight;
        width = height * aspectRatio;
      } else {
        // Image is taller/same as canvas - match width, let height overflow
        width = canvasWidth;
        height = width / aspectRatio;
      }
      
      // Center the image so it covers canvas
      const x = Math.round((canvasWidth - width) / 2);
      const y = Math.round((canvasHeight - height) / 2);

      const baseData = {
        image: imageDataUrl,
        objectFit: 'cover',
        imageAspectRatio: aspectRatio,
        label: 'Background'
      };

      if (existing) {
        set({
          elements: state.elements.map((el) =>
            el.id === existing.id
              ? {
                  ...el,
                  zIndex: 0,
                  data: {
                    ...el.data,
                    ...baseData
                  },
                  width: Math.round(width),
                  height: Math.round(height),
                  x,
                  y
                }
              : {
                  ...el,
                  zIndex: el.zIndex === undefined ? 1 : Math.max(el.zIndex, 1)
                }
          ),
          selectedElementId: existing.id
        });
        return existing.id;
      }

      const id = get().addElement('background-photo', {
        x,
        y,
        zIndex: 0,
        data: baseData,
        width: Math.round(width),
        height: Math.round(height)
      });

      set((prev) => ({
        elements: prev.elements.map((el) =>
          el.id === id
            ? { ...el, zIndex: 0 }
            : { ...el, zIndex: (el.zIndex || 1) + 1 }
        ),
        lastZIndex: Math.max(prev.lastZIndex + 1, prev.elements.length + 1)
      }));
      
      return id;
    };

    // If image already loaded, process immediately
    if (img.complete) {
      return processImage();
    }
    
    // Otherwise wait for load
    img.onload = processImage;
    
    // Return placeholder ID for existing, or create placeholder
    if (existing) {
      set({
        elements: state.elements.map((el) =>
          el.id === existing.id
            ? {
                ...el,
                data: {
                  ...el.data,
                  image: imageDataUrl,
                  label: 'Background'
                }
              }
            : el
        )
      });
      return existing.id;
    }

    // Create placeholder with temp dimensions
    const metaRatio = Number(meta.aspectRatio);
    const ratioFromMeta = Number.isFinite(metaRatio) && metaRatio > 0 ? metaRatio : undefined;
    const derivedRatio = ratioFromMeta || canvasWidth / canvasHeight;
    const size = computeContainedSize(derivedRatio);
    const position = centerWithinCanvas(size.width, size.height);

    const id = get().addElement('background-photo', {
      ...position,
      zIndex: 0,
      data: {
        image: imageDataUrl,
        objectFit: 'cover',
        label: 'Background'
      },
      width: size.width,
      height: size.height
    });

    set((prev) => ({
      elements: prev.elements.map((el) =>
        el.id === id
          ? { ...el, zIndex: 0 }
          : { ...el, zIndex: (el.zIndex || 1) + 1 }
      ),
      lastZIndex: Math.max(prev.lastZIndex + 1, prev.elements.length + 1)
    }));
    
    return id;
  },
  fitBackgroundPhotoToCanvas: (meta = {}) => {
    const state = get();
    const background = state.elements.find((el) => el.type === 'background-photo');
    if (!background) {
      return;
    }
    
    // Use dynamic canvas dimensions from meta or fallback to constants
    const canvasWidth = meta.canvasWidth || CANVAS_WIDTH;
    const canvasHeight = meta.canvasHeight || CANVAS_HEIGHT;
    
    const aspectRatio = Number(background.data?.imageAspectRatio) > 0
      ? background.data.imageAspectRatio
      : background.width > 0 && background.height > 0
      ? background.width / background.height
      : canvasWidth / canvasHeight;
    
    // Use COVER mode - image must fill entire canvas
    const canvasAspectRatio = canvasWidth / canvasHeight;
    let width, height;
    
    if (aspectRatio > canvasAspectRatio) {
      // Image is wider - match height, let width overflow
      height = canvasHeight;
      width = height * aspectRatio;
    } else {
      // Image is taller/same - match width, let height overflow
      width = canvasWidth;
      height = width / aspectRatio;
    }
    
    const position = {
      x: Math.round((canvasWidth - width) / 2),
      y: Math.round((canvasHeight - height) / 2)
    };
    
    set((prev) => ({
      elements: prev.elements.map((el) =>
        el.id === background.id
          ? {
              ...el,
              width: Math.round(width),
              height: Math.round(height),
              ...position,
              data: {
                ...el.data,
                objectFit: 'cover'
              }
            }
          : el
      ),
      selectedElementId: background.id
    }));
  },
  updateElement: (id, changes) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id
          ? {
              ...el,
              ...changes,
              data: changes.data ? { ...el.data, ...changes.data } : el.data
            }
          : el
      )
    }));
  },
  updateElementData: (id, data) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id
          ? {
              ...el,
              data: {
                ...el.data,
                ...data
              }
            }
          : el
      )
    }));
  },
  resizeUploadImage: (id, newWidth, newHeight) => {
    const element = get().elements.find((el) => el.id === id);
    if (!element || element.type !== 'upload' || !element.data?.originalImage) {
      return;
    }

    const img = new Image();
    img.src = element.data.originalImage; // Use original high-quality image
    
    img.onload = () => {
      // Create canvas with new dimensions
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(newWidth);
      canvas.height = Math.round(newHeight);
      const ctx = canvas.getContext('2d');
      
      // Use high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw resized image from original
      ctx.drawImage(img, 0, 0, Math.round(newWidth), Math.round(newHeight));
      const resizedImageDataUrl = canvas.toDataURL('image/png', 0.95);
      
      // Update element with resized image
      get().updateElement(id, {
        data: {
          image: resizedImageDataUrl
          // Keep originalImage unchanged for future resizes
        }
      });
    };
  },
  selectElement: (id) => {
    set({ selectedElementId: id });
  },
  removeElement: (id) => {
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedElementId:
        state.selectedElementId === id ? null : state.selectedElementId
    }));
  },
  duplicateElement: (id) => {
    const element = get().elements.find((el) => el.id === id);
    if (!element) return;
    
    const duplicate = {
      ...element,
      id: generateId(),
      x: element.x + 20,
      y: element.y + 20,
      zIndex: get().lastZIndex + 1,
    };
    
    set((state) => ({
      elements: [...state.elements, duplicate],
      lastZIndex: state.lastZIndex + 1,
      selectedElementId: duplicate.id,
    }));
  },
  toggleLock: (id) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, isLocked: !el.isLocked } : el
      ),
    }));
  },
  bringToFront: (id) => {
    const target = get().elements.find((el) => el.id === id);
    if (target?.type === 'background-photo') {
      set({ selectedElementId: id });
      return;
    }
    const nextZ = get().lastZIndex + 1;
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id
          ? {
              ...el,
              zIndex: nextZ
            }
          : el
      ),
      lastZIndex: nextZ
    }));
  },
  sendToBack: (id) => {
    const target = get().elements.find((el) => el.id === id);
    if (target?.type === 'background-photo') {
      return;
    }
    const allElements = get().elements;
    const minZ = Math.min(...allElements.filter(el => el.type !== 'background-photo').map(el => el.zIndex || 1));
    const nextZ = Math.max(1, minZ - 1);
    
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id
          ? {
              ...el,
              zIndex: nextZ
            }
          : el
      )
    }));
  },
  bringForward: (id) => {
    const target = get().elements.find((el) => el.id === id);
    if (target?.type === 'background-photo') {
      return;
    }
    const allElements = get().elements;
    const sorted = allElements
      .filter(el => el.type !== 'background-photo')
      .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));
    
    const currentIndex = sorted.findIndex(el => el.id === id);
    if (currentIndex === -1 || currentIndex === sorted.length - 1) {
      return;
    }
    
    const nextElement = sorted[currentIndex + 1];
    const currentZ = target.zIndex || 1;
    const nextZ = nextElement.zIndex || 1;
    
    set((state) => ({
      elements: state.elements.map((el) => {
        if (el.id === id) {
          return { ...el, zIndex: nextZ };
        }
        if (el.id === nextElement.id) {
          return { ...el, zIndex: currentZ };
        }
        return el;
      })
    }));
  },
  sendBackward: (id) => {
    const target = get().elements.find((el) => el.id === id);
    if (target?.type === 'background-photo') {
      return;
    }
    const allElements = get().elements;
    const sorted = allElements
      .filter(el => el.type !== 'background-photo')
      .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));
    
    const currentIndex = sorted.findIndex(el => el.id === id);
    if (currentIndex === -1 || currentIndex === 0) {
      return;
    }
    
    const prevElement = sorted[currentIndex - 1];
    const currentZ = target.zIndex || 1;
    const prevZ = prevElement.zIndex || 1;
    
    set((state) => ({
      elements: state.elements.map((el) => {
        if (el.id === id) {
          return { ...el, zIndex: prevZ };
        }
        if (el.id === prevElement.id) {
          return { ...el, zIndex: currentZ };
        }
        return el;
      })
    }));
  },
  setCanvasBackground: (color) => {
    set({ canvasBackground: color, selectedElementId: 'background' });
  },
  setElements: (elements) => {
    const maxZ = elements.reduce(
      (max, el) => (el.zIndex && el.zIndex > max ? el.zIndex : max),
      1
    );
    set({ elements, lastZIndex: maxZ });
  },
  clearSelection: () => set({ selectedElementId: null }),
  reset: () => set({
    elements: [],
    selectedElementId: null,
    canvasBackground: DEFAULT_BACKGROUND,
    lastZIndex: 1
  })
}));

export default useCreatorStore;
