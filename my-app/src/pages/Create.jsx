import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import {
  Palette,
  Image as ImageIcon,
  Type as TypeIcon,
  Shapes as ShapesIcon,
  Upload as UploadIcon,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import ToolButton from '../components/creator/ToolButton.jsx';
import CanvasPreview from '../components/creator/CanvasPreview.jsx';
import PropertiesPanel from '../components/creator/PropertiesPanel.jsx';
import useCreatorStore from '../store/useCreatorStore.js';
import { useShallow } from 'zustand/react/shallow';

const TEMPLATE_STORAGE_KEY = 'fremio-creator-templates';

const panelMotion = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 }
};

const toastStyles = {
  success:
    'text-emerald-600 bg-emerald-50 border border-emerald-100 shadow-[0_14px_30px_rgba(16,185,129,0.15)]',
  error:
    'text-rose-600 bg-rose-50 border border-rose-100 shadow-[0_14px_30px_rgba(244,63,94,0.15)]'
};

const initialTooltips = {
  success: 'Template tersimpan! 🎉',
  error: 'Gagal menyimpan template. Coba lagi.'
};

export default function Create() {
  const fileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

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
    clearSelection
  } = useCreatorStore(useShallow((state) => ({
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
    clearSelection: state.clearSelection
  })));

  const selectedElement = useMemo(() => {
    if (selectedElementId === 'background') return 'background';
    return elements.find((el) => el.id === selectedElementId) || null;
  }, [elements, selectedElementId]);

  const triggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === 'string') {
        addUploadElement(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTemplate = async () => {
    if (saving) return;
    const canvasNode = document.getElementById('creator-canvas');
    if (!canvasNode) return;

    setSaving(true);
    try {
      const canvasBitmap = await html2canvas(canvasNode, {
        backgroundColor: canvasBackground,
        useCORS: true,
        scale: 2
      });

      const previewDataUrl = canvasBitmap.toDataURL('image/png');
      const template = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        savedAt: new Date().toISOString(),
        canvasBackground,
        elements
      };

      const storedTemplates = JSON.parse(
        localStorage.getItem(TEMPLATE_STORAGE_KEY) || '[]'
      );

      const payload = [...storedTemplates, { ...template, preview: previewDataUrl }];
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(payload));

      setToast({ type: 'success', message: initialTooltips.success });
    } catch (error) {
      console.error('Failed to save template', error);
      setToast({ type: 'error', message: initialTooltips.error });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3200);
    }
  };

  const addToolElement = (type) => {
    if (type === 'background') {
      setCanvasBackground(canvasBackground);
      return;
    }
    if (type === 'upload') {
      triggerUpload();
      return;
    }
    addElement(type);
  };

  return (
    <div className="bg-gradient-to-b from-[#fdf7f4] via-white to-[#f7f1ed] py-10 lg:py-12">
      <div className="container mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
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
          <div className="mb-6 flex justify-center">
            <div
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${toastStyles[toast.type]}`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}
              {toast.message}
            </div>
          </div>
        )}

        <div
          id="creator-layout"
          className="creator-layout grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr_320px] lg:gap-6"
        >
          <motion.aside
            variants={panelMotion}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="creator-panel flex flex-col gap-4 rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur"
          >
            <h3 className="text-lg font-semibold text-slate-800">Tools</h3>
            <div className="mt-2 grid flex-1 grid-rows-5 gap-3">
              <ToolButton
                label="Background"
                icon={Palette}
                active={selectedElementId === 'background'}
                onClick={() => setCanvasBackground(canvasBackground)}
              />
              <ToolButton
                label="Area Foto"
                icon={ImageIcon}
                onClick={() => addToolElement('photo')}
              />
              <ToolButton
                label="Add Text"
                icon={TypeIcon}
                onClick={() => addToolElement('text')}
              />
              <ToolButton
                label="Shape"
                icon={ShapesIcon}
                onClick={() => addToolElement('shape')}
              />
              <ToolButton
                label="Unggahan"
                icon={UploadIcon}
                onClick={() => addToolElement('upload')}
              />
            </div>
          </motion.aside>

          <motion.section
            variants={panelMotion}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
            className="flex flex-col items-center gap-4 rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur"
          >
            <div className="flex w-full flex-col gap-2">
              <h3 className="text-center text-lg font-semibold text-slate-800">
                Preview
              </h3>
              <div className="h-px w-full bg-slate-300/70" />
            </div>

            <div className="mt-8 w-full max-w-[420px] px-4 py-8 sm:px-6 sm:py-10">
              <CanvasPreview
                elements={elements}
                selectedElementId={selectedElementId}
                canvasBackground={canvasBackground}
                onSelect={(id) => {
                  if (id === null) {
                    clearSelection();
                  } else if (id === 'background') {
                    selectElement('background');
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
            className="creator-panel rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur"
          >
            <h3 className="text-lg font-semibold text-slate-800">Properties</h3>
            <PropertiesPanel
              selectedElement={selectedElement}
              canvasBackground={canvasBackground}
              onBackgroundChange={(color) => setCanvasBackground(color)}
              onUpdateElement={updateElement}
              onDeleteElement={removeElement}
              clearSelection={clearSelection}
            />
          </motion.aside>

          <motion.div
            variants={panelMotion}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.25 }}
            className="col-span-1 flex items-center justify-center lg:col-span-3"
          >
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={saving}
              className="flex w-full max-w-md items-center justify-center gap-2 rounded-3xl border border-rose-100 bg-white/90 px-6 py-4 text-base font-semibold text-slate-800 shadow-[0_16px_40px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.18)] disabled:pointer-events-none disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Save Template'}
            </button>
          </motion.div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
