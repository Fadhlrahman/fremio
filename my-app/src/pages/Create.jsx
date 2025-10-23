import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import {
  Palette,
  Image as ImageIcon,
  Type as TypeIcon,
  Shapes as ShapesIcon,
  Upload as UploadIcon,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import ToolButton from "../components/creator/ToolButton.jsx";
import CanvasPreview from "../components/creator/CanvasPreview.jsx";
import PropertiesPanel from "../components/creator/PropertiesPanel.jsx";
import useCreatorStore from "../store/useCreatorStore.js";
import { useShallow } from "zustand/react/shallow";

const TEMPLATE_STORAGE_KEY = "fremio-creator-templates";

const panelMotion = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const toastStyles = {
  success:
    "text-emerald-700 bg-gradient-to-r from-emerald-50 to-emerald-100/80 border-2 border-emerald-200 shadow-[0_8px_32px_rgba(16,185,129,0.25),0_4px_12px_rgba(0,0,0,0.08)]",
  error:
    "text-rose-700 bg-gradient-to-r from-rose-50 to-rose-100/80 border-2 border-rose-200 shadow-[0_8px_32px_rgba(244,63,94,0.25),0_4px_12px_rgba(0,0,0,0.08)]",
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
    updateElement,
    selectElement,
    setCanvasBackground,
    removeElement,
    bringToFront,
    clearSelection,
  } = useCreatorStore(
    useShallow((state) => ({
      elements: state.elements,
      selectedElementId: state.selectedElementId,
      canvasBackground: state.canvasBackground,
      addElement: state.addElement,
      addUploadElement: state.addUploadElement,
      updateElement: state.updateElement,
      selectElement: state.selectElement,
      setCanvasBackground: state.setCanvasBackground,
      removeElement: state.removeElement,
      bringToFront: state.bringToFront,
      clearSelection: state.clearSelection,
    }))
  );

  const selectedElement = useMemo(() => {
    if (selectedElementId === "background") return "background";
    return elements.find((el) => el.id === selectedElementId) || null;
  }, [elements, selectedElementId]);

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    },
    []
  );

  const triggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === "string") {
        addUploadElement(dataUrl);
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
      setCanvasBackground(canvasBackground);
      return;
    }
    if (type === "upload") {
      triggerUpload();
      return;
    }
    addElement(type);
  };

  useEffect(() => {
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
    return () => window.removeEventListener("paste", handlePaste);
  }, [addUploadElement, showToast]);

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

  return (
    <div className="bg-gradient-to-b from-[#fdf7f4] via-white to-[#f7f1ed] py-10 lg:py-12">
      <div className="container mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-8 text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-rose-300/80">
            Fremio Creator
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Susun frame sesuai gayamu
          </h1>
        </motion.div>

        {toast && (
          <motion.div
            className="mb-6 flex justify-center"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <div
              className={`flex items-center gap-3 rounded-2xl px-6 py-4 text-sm font-bold shadow-2xl backdrop-blur-sm ${
                toastStyles[toast.type]
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2
                  size={20}
                  strokeWidth={2.5}
                  className="animate-bounce"
                />
              ) : (
                <AlertTriangle size={20} strokeWidth={2.5} />
              )}
              {toast.message}
            </div>
          </motion.div>
        )}

        <div
          id="creator-layout"
          className="creator-layout grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr_320px] lg:gap-8"
        >
          <motion.aside
            variants={panelMotion}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="creator-panel flex flex-col gap-6 overflow-hidden rounded-[32px] border border-[#e0b7a9]/20 bg-gradient-to-br from-white/95 via-white/90 to-[#fdf7f4]/80 p-7 shadow-[0_20px_60px_rgba(224,183,169,0.15),0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl"
          >
            <div className="flex w-full flex-col gap-3 rounded-3xl border border-[#e0b7a9]/10 bg-gradient-to-br from-white to-[#fdf7f4]/50 p-4 shadow-[0_4px_16px_rgba(224,183,169,0.08)]">
              <h3 className="bg-gradient-to-r from-[#e0b7a9] to-[#c89585] bg-clip-text text-center text-xl font-bold tracking-tight text-transparent">
                Tools
              </h3>
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#e0b7a9]/40 to-transparent" />
            </div>
            <div className="mt-1 grid flex-1 grid-rows-5 gap-4 rounded-3xl bg-gradient-to-br from-white/50 to-transparent p-3">
              <ToolButton
                label="Background"
                icon={Palette}
                active={selectedElementId === "background"}
                onClick={() => setCanvasBackground(canvasBackground)}
              />
              <ToolButton
                label="Area Foto"
                icon={ImageIcon}
                onClick={() => addToolElement("photo")}
              />
              <ToolButton
                label="Add Text"
                icon={TypeIcon}
                onClick={() => addToolElement("text")}
              />
              <ToolButton
                label="Shape"
                icon={ShapesIcon}
                onClick={() => addToolElement("shape")}
              />
              <ToolButton
                label="Unggahan"
                icon={UploadIcon}
                onClick={() => addToolElement("upload")}
              />
            </div>
          </motion.aside>

          <motion.section
            variants={panelMotion}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
            className="flex flex-col items-center gap-6 rounded-[32px] border border-[#e0b7a9]/20 bg-gradient-to-br from-white/95 via-white/90 to-[#fdf7f4]/80 p-7 shadow-[0_20px_60px_rgba(224,183,169,0.15),0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl"
          >
            <div className="flex w-full flex-col gap-3 rounded-3xl border border-[#e0b7a9]/10 bg-gradient-to-br from-white to-[#fdf7f4]/50 p-4 shadow-[0_4px_16px_rgba(224,183,169,0.08)]">
              <h3 className="bg-gradient-to-r from-[#e0b7a9] to-[#c89585] bg-clip-text text-center text-xl font-bold tracking-tight text-transparent">
                Preview
              </h3>
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#e0b7a9]/40 to-transparent" />
            </div>

            <div
              className="mt-6 w-full max-w-[420px] rounded-[28px] border border-[#e0b7a9]/10 bg-gradient-to-br from-white to-[#fdf7f4]/30 px-5 py-10 shadow-[0_12px_36px_rgba(224,183,169,0.12),0_4px_12px_rgba(0,0,0,0.04)] sm:px-7 sm:py-12"
              style={{ overflow: "visible" }}
            >
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
          </motion.section>

          <motion.aside
            variants={panelMotion}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
            className="creator-panel rounded-[32px] border border-[#e0b7a9]/20 bg-gradient-to-br from-white/95 via-white/90 to-[#fdf7f4]/80 p-7 shadow-[0_20px_60px_rgba(224,183,169,0.15),0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl"
          >
            <div className="flex w-full flex-col gap-3 rounded-3xl border border-[#e0b7a9]/10 bg-gradient-to-br from-white to-[#fdf7f4]/50 p-4 shadow-[0_4px_16px_rgba(224,183,169,0.08)]">
              <h3 className="bg-gradient-to-r from-[#e0b7a9] to-[#c89585] bg-clip-text text-center text-xl font-bold tracking-tight text-transparent">
                Properties
              </h3>
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#e0b7a9]/40 to-transparent" />
            </div>
            <div className="mt-6 space-y-6 rounded-3xl bg-gradient-to-br from-white/50 to-transparent p-4">
              <PropertiesPanel
                selectedElement={selectedElement}
                canvasBackground={canvasBackground}
                onBackgroundChange={(color) => setCanvasBackground(color)}
                onUpdateElement={updateElement}
                onDeleteElement={removeElement}
                clearSelection={clearSelection}
              />
            </div>
          </motion.aside>

          <motion.div
            variants={panelMotion}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.25 }}
            className="col-span-1 flex items-center justify-center lg:col-span-3"
          >
            <motion.button
              type="button"
              onClick={handleSaveTemplate}
              disabled={saving}
              className="group relative flex w-full max-w-md items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-[#e0b7a9] via-[#d4a99a] to-[#e0b7a9] bg-size-200 bg-pos-0 px-10 py-5 text-lg font-bold text-white shadow-[0_10px_0_#c9a193,0_15px_35px_rgba(224,183,169,0.4),0_5px_15px_rgba(0,0,0,0.1)] transition-all duration-300 hover:bg-pos-100 hover:shadow-[0_14px_0_#c9a193,0_20px_45px_rgba(224,183,169,0.5),0_8px_20px_rgba(0,0,0,0.15)] active:shadow-[0_5px_0_#c9a193,0_8px_20px_rgba(224,183,169,0.3),0_3px_10px_rgba(0,0,0,0.1)] disabled:pointer-events-none disabled:opacity-60"
              style={{ backgroundSize: "200% 100%" }}
              whileTap={{ y: 5, scale: 0.98 }}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

              {/* Pulse effect */}
              <div className="absolute inset-0 rounded-full bg-white opacity-0 transition-opacity duration-300 group-hover:animate-ping group-hover:opacity-20" />

              <span className="relative z-10 flex items-center gap-3">
                {saving ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span className="tracking-wide">Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={22}
                      strokeWidth={2.5}
                      className="transition-transform group-hover:scale-110 group-hover:rotate-12"
                    />
                    <span className="tracking-wide">Save Template</span>
                  </>
                )}
              </span>
            </motion.button>
          </motion.div>
        </div>
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
