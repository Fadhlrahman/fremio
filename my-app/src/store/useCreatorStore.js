import { create } from 'zustand';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DEFAULT_UPLOAD_WIDTH,
  DEFAULT_UPLOAD_HEIGHT,
} from '../components/creator/canvasConstants.js';

const DEFAULT_BACKGROUND = '#f7f1ed';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const baseElement = (type, overrides = {}) => ({
  id: generateId(),
  type,
  x: 80,
  y: 80,
  width: 160,
  height: 160,
  rotation: 0,
  zIndex: 1,
  data: {},
  ...overrides
});

const defaultPropsByType = (type) => {
  switch (type) {
    case 'photo':
      return {
        width: 220,
        height: 280,
        data: {
          fill: '#d1e3f0',
          borderRadius: 24,
          stroke: '#ffffff',
          strokeWidth: 6,
          label: 'Foto'
        }
      };
    case 'text':
      return {
        width: 320,
        height: 90,
        data: {
          text: 'Judul Baru',
          fontSize: 28,
          fontFamily: '"DM Sans", sans-serif',
          color: '#1f2933',
          align: 'center',
          fontWeight: 600
        }
      };
    case 'shape':
      return {
        width: 200,
        height: 200,
        data: {
          fill: '#f4d3c2',
          borderRadius: 32,
          stroke: '#d9b9ab',
          strokeWidth: 2
        }
      };
    case 'upload':
      return {
        width: DEFAULT_UPLOAD_WIDTH,
        height: DEFAULT_UPLOAD_HEIGHT,
        data: {
          image: null,
          objectFit: 'cover',
          label: 'Unggahan'
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
    const id = get().addElement('upload', {
      x: Math.round((CANVAS_WIDTH - DEFAULT_UPLOAD_WIDTH) / 2),
      y: Math.round((CANVAS_HEIGHT - DEFAULT_UPLOAD_HEIGHT) / 2),
      data: {
        image: imageDataUrl,
        objectFit: 'cover',
        label: 'Unggahan'
      }
    });
    return id;
  },
  addBackgroundPhoto: (imageDataUrl, meta = {}) => {
    const state = get();
    const existing = state.elements.find((el) => el.type === 'background-photo');

    const metaRatio = Number(meta.aspectRatio);
    const ratioFromMeta = Number.isFinite(metaRatio) && metaRatio > 0 ? metaRatio : undefined;
    const derivedRatio = (() => {
      if (ratioFromMeta) return ratioFromMeta;
      const width = Number(meta.width);
      const height = Number(meta.height);
      if (width > 0 && height > 0) {
        return width / height;
      }
      if (existing?.data?.imageAspectRatio) {
        return existing.data.imageAspectRatio;
      }
      return CANVAS_WIDTH / CANVAS_HEIGHT;
    })();

    const size = computeContainedSize(derivedRatio);
    const position = centerWithinCanvas(size.width, size.height);

    const baseData = {
      ...existing?.data,
      image: imageDataUrl,
      objectFit: existing?.data?.objectFit ?? 'contain',
      imageAspectRatio: derivedRatio,
      label: existing?.data?.label ?? 'Background'
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
                width: size.width,
                height: size.height,
                ...position
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

    const id = state.addElement('background-photo', {
      ...position,
      zIndex: 0,
      data: baseData,
      width: size.width,
      height: size.height
    });

    set((prev) => ({
      elements: prev.elements.map((el) =>
        el.id === id
          ? {
              ...el,
              zIndex: 0
            }
          : { ...el, zIndex: (el.zIndex || 1) + 1 }
      ),
      lastZIndex: Math.max(prev.lastZIndex + 1, prev.elements.length + 1)
    }));
    return id;
  },
  fitBackgroundPhotoToCanvas: () => {
    const state = get();
    const background = state.elements.find((el) => el.type === 'background-photo');
    if (!background) {
      return;
    }
    const aspectRatio = Number(background.data?.imageAspectRatio) > 0
      ? background.data.imageAspectRatio
      : background.width > 0 && background.height > 0
      ? background.width / background.height
      : CANVAS_WIDTH / CANVAS_HEIGHT;
    const size = computeContainedSize(aspectRatio);
    const position = centerWithinCanvas(size.width, size.height);
    set((prev) => ({
      elements: prev.elements.map((el) =>
        el.id === background.id
          ? {
              ...el,
              width: size.width,
              height: size.height,
              ...position
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
