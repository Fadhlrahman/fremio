import { create } from 'zustand';

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
        width: 240,
        height: 320,
        data: {
          image: null,
          objectFit: 'cover',
          label: 'Unggahan'
        }
      };
    default:
      return {};
  }
};

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
    const element = baseElement(type, {
      ...defaults,
      ...extra,
      data: mergedData,
      zIndex: nextZ
    });
    set((state) => ({
      elements: [...state.elements, element],
      selectedElementId: element.id,
      lastZIndex: nextZ
    }));
    return element.id;
  },
  addUploadElement: (imageDataUrl) => {
    const id = get().addElement('upload', {
      data: {
        image: imageDataUrl,
        objectFit: 'cover',
        label: 'Unggahan'
      }
    });
    return id;
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
