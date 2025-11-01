import { useMemo, useRef, useState, useEffect, useCallback, useLayoutEffect } from "react";
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
import { useShallow } from "zustand/react/shallow";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../components/creator/canvasConstants.js";
import "./Create.css";

const TEMPLATE_STORAGE_KEY = "fremio-creator-templates";

const panelMotion = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const TOAST_MESSAGES = {
  saveSuccess: "Template tersimpan! 🎉",
  saveError: "Gagal menyimpan template. Coba lagi.",
  pasteSuccess: "Gambar ditempel ke kanvas.",
  pasteError: "Gagal menempel gambar. Pastikan clipboard berisi gambar.",
  deleteSuccess: "Elemen dihapus dari kanvas.",
};

export default function Create() {
  const fileInputRef = useRef(null);
  const uploadPurposeRef = useRef("upload");
  const toastTimeoutRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [activeMobileProperty, setActiveMobileProperty] = useState(null);
  const [canvasAspectRatio, setCanvasAspectRatio] = useState("9:16"); // Story Instagram default
  const previewFrameRef = useRef(null);
  const [previewConstraints, setPreviewConstraints] = useState({
    maxWidth: 320,
    maxHeight: 440,
  });

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
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    clearSelection,
    fitBackgroundPhotoToCanvas,
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
      bringToFront: state.bringToFront,
      sendToBack: state.sendToBack,
      bringForward: state.bringForward,
      sendBackward: state.sendBackward,
      clearSelection: state.clearSelection,
      fitBackgroundPhotoToCanvas: state.fitBackgroundPhotoToCanvas,
    }))
  );

  const selectedElement = useMemo(() => {
    if (selectedElementId === "background") return "background";
    return elements.find((el) => el.id === selectedElementId) || null;
  }, [elements, selectedElementId]);

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

  useEffect(() => {
    if (!backgroundPhotoElement) {
      return;
    }

    if (!backgroundPhotoElement.data?.imageAspectRatio) {
      const inferredRatio =
        backgroundPhotoElement.width > 0 && backgroundPhotoElement.height > 0
          ? backgroundPhotoElement.width / backgroundPhotoElement.height
          : CANVAS_WIDTH / CANVAS_HEIGHT;
      updateElement(backgroundPhotoElement.id, {
        data: { imageAspectRatio: inferredRatio },
      });
    }
  }, [backgroundPhotoElement, updateElement]);

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
          addBackgroundPhoto(dataUrl, metadata);
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
      const canvasBitmap = await html2canvas(canvasNode, {
        backgroundColor: canvasBackground,
        useCORS: true,
        scale: 2,
      });

      const previewDataUrl = canvasBitmap.toDataURL("image/png");
      const template = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        savedAt: new Date().toISOString(),
        canvasBackground,
        elements,
      };

      const storedTemplates = JSON.parse(
        localStorage.getItem(TEMPLATE_STORAGE_KEY) || "[]"
      );

      const payload = [
        ...storedTemplates,
        { ...template, preview: previewDataUrl },
      ];
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(payload));

      showToast("success", TOAST_MESSAGES.saveSuccess);
    } catch (error) {
      console.error("Failed to save template", error);
      showToast("error", TOAST_MESSAGES.saveError);
    } finally {
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

  const toolButtons = useMemo(
    () => [
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
    ],
    [
      addToolElement,
      selectElement,
      selectedElement?.type,
      selectedElementId,
      backgroundPhotoElement,
      triggerBackgroundUpload,
      isMobileView,
    ]
  );

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
                    fitBackgroundPhotoToCanvas();
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
                  fitBackgroundPhotoToCanvas();
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
