import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import CanvasPreview from "../components/creator/CanvasPreview.jsx";
import PropertiesPanel from "../components/creator/PropertiesPanel.jsx";
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
    bringToFront,
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
      bringToFront: state.bringToFront,
      clearSelection: state.clearSelection,
      fitBackgroundPhotoToCanvas: state.fitBackgroundPhotoToCanvas,
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
    addElement(type);
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
        onClick: () => {
          selectElement("background");
          if (!backgroundPhotoElement) {
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
        onClick: () => addToolElement("photo"),
        isActive: selectedElement?.type === "photo",
      },
      {
        id: "text",
        label: "Add Text",
        onClick: () => addToolElement("text"),
        isActive: selectedElement?.type === "text",
      },
      {
        id: "shape",
        label: "Shape",
        onClick: () => addToolElement("shape"),
        isActive: selectedElement?.type === "shape",
      },
      {
        id: "upload",
        label: "Unggahan",
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
    ]
  );

  return (
    <div className="create-page">
      {toast && (
        <motion.div
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
        </motion.div>
      )}

      <div className="create-grid">
        <motion.aside
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
                onClick={button.onClick}
                className={`create-tools__button ${button.isActive ? "create-tools__button--active" : ""}`.trim()}
              >
                {button.label}
              </button>
            ))}
          </div>
        </motion.aside>

        <motion.section
          variants={panelMotion}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="create-preview"
        >
          <h2 className="create-preview__title">Preview</h2>
          <div className="create-preview__frame">
            <CanvasPreview
              elements={elements}
              selectedElementId={selectedElementId}
              canvasBackground={canvasBackground}
              onSelect={(id) => {
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
            />
          </div>
          <motion.button
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
          </motion.button>
        </motion.section>

        <motion.aside
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
            />
          </div>
        </motion.aside>
      </div>

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
