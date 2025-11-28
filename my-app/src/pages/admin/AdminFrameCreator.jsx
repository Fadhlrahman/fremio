/**
 * AdminFrameCreator - Admin page for uploading frames
 * Identical to Create page but with Upload Frame button instead of Save Template
 */
import {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import html2canvas from "html2canvas";
import {
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  Type as TypeIcon,
  Shapes,
  UploadCloud,
  Maximize2,
  Upload,
} from "lucide-react";
import CanvasPreview from "../../components/creator/CanvasPreview.jsx";
import PropertiesPanel from "../../components/creator/PropertiesPanel.jsx";
import useCreatorStore from "../../store/useCreatorStore.js";
import { useShallow } from "zustand/react/shallow";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from "../../components/creator/canvasConstants.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { saveCustomFrame, getCustomFrameById, updateCustomFrame } from "../../services/customFrameService.js";
import "../Create.css";

const panelMotion = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function AdminFrameCreator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editFrameId = searchParams.get("edit");
  
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const uploadPurposeRef = useRef("upload");
  const previewFrameRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  // State
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingFrame, setLoadingFrame] = useState(false);
  const [toast, setToast] = useState(null);
  const [canvasAspectRatio, setCanvasAspectRatio] = useState("9:16");
  const [showCanvasSizeInProperties, setShowCanvasSizeInProperties] = useState(false);
  const [gradientColor1, setGradientColor1] = useState("#667eea");
  const [gradientColor2, setGradientColor2] = useState("#764ba2");
  const [isBackgroundLocked, setIsBackgroundLocked] = useState(false);
  const [pendingPhotoTool, setPendingPhotoTool] = useState(false);
  const [previewConstraints, setPreviewConstraints] = useState({
    maxWidth: 280,
    maxHeight: 500,
  });

  // Admin frame metadata
  const [frameName, setFrameName] = useState("");
  const [frameDescription, setFrameDescription] = useState("");
  const [frameCategories, setFrameCategories] = useState(["Fremio Series"]);

  // Available categories
  const availableCategories = [
    "Fremio Series",
    "Wedding",
    "Birthday", 
    "Graduation",
    "Event",
    "Music",
    "Custom"
  ];

  // Toggle category selection
  const toggleCategory = (category) => {
    setFrameCategories(prev => {
      if (prev.includes(category)) {
        // Don't allow removing if it's the last one
        if (prev.length === 1) return prev;
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  // Creator store
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
    resizeUploadImage,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    clearSelection,
    fitBackgroundPhotoToCanvas,
    setElements,
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
      resizeUploadImage: state.resizeUploadImage,
      bringToFront: state.bringToFront,
      sendToBack: state.sendToBack,
      bringForward: state.bringForward,
      sendBackward: state.sendBackward,
      clearSelection: state.clearSelection,
      fitBackgroundPhotoToCanvas: state.fitBackgroundPhotoToCanvas,
      setElements: state.setElements,
    }))
  );

  // Reset store on mount OR load frame for edit
  useEffect(() => {
    const loadFrameForEdit = async () => {
      if (editFrameId) {
        setLoadingFrame(true);
        setIsEditMode(true);
        try {
          console.log("📝 Loading frame for edit:", editFrameId);
          const frame = await getCustomFrameById(editFrameId);
          
          if (frame) {
            console.log("✅ Frame loaded:", frame);
            console.log("🔍 Frame layout:", frame.layout);
            console.log("🔍 Frame layout.elements:", frame.layout?.elements);
            
            // Set frame metadata
            setFrameName(frame.name || "");
            setFrameDescription(frame.description || "");
            
            // Parse categories
            if (frame.categories && Array.isArray(frame.categories)) {
              setFrameCategories(frame.categories);
            } else if (frame.category) {
              setFrameCategories(frame.category.split(", ").map(c => c.trim()));
            }
            
            // Set canvas background
            if (frame.canvasBackground || frame.layout?.backgroundColor) {
              setCanvasBackground(frame.canvasBackground || frame.layout?.backgroundColor || "#f7f1ed");
            }
            
            // Build elements from frame data
            const newElements = [];
            
            // Add background photo if available
            if (frame.imagePath || frame.image_url || frame.thumbnailUrl) {
              const imageUrl = frame.imagePath || frame.image_url || frame.thumbnailUrl;
              console.log("🖼️ Adding background photo:", imageUrl);
              newElements.push({
                id: "background-photo-1",
                type: "background-photo",
                x: 0,
                y: 0,
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                zIndex: 0,
                data: {
                  image: imageUrl,
                  objectFit: "cover",
                  label: "Background",
                }
              });
            }
            
            // Add photo slots
            if (frame.slots && Array.isArray(frame.slots)) {
              console.log("📸 Adding photo slots:", frame.slots.length);
              frame.slots.forEach((slot, index) => {
                newElements.push({
                  id: slot.id || `photo_${index + 1}`,
                  type: "photo",
                  x: slot.left * CANVAS_WIDTH,
                  y: slot.top * CANVAS_HEIGHT,
                  width: slot.width * CANVAS_WIDTH,
                  height: slot.height * CANVAS_HEIGHT,
                  zIndex: slot.zIndex || 2,
                  data: {
                    photoIndex: slot.photoIndex !== undefined ? slot.photoIndex : index,
                    borderRadius: slot.borderRadius || 0,
                  }
                });
              });
            }
            
            // Restore other elements (upload, text, shape) from layout.elements
            if (frame.layout?.elements && Array.isArray(frame.layout.elements)) {
              console.log("📦 Restoring other elements:", frame.layout.elements.length, frame.layout.elements);
              frame.layout.elements.forEach((el) => {
                console.log("🔄 Restoring element:", el.type, el.id);
                // Convert normalized positions back to absolute positions
                const restoredElement = {
                  ...el,
                  x: el.xNorm !== undefined ? el.xNorm * CANVAS_WIDTH : el.x,
                  y: el.yNorm !== undefined ? el.yNorm * CANVAS_HEIGHT : el.y,
                  width: el.widthNorm !== undefined ? el.widthNorm * CANVAS_WIDTH : el.width,
                  height: el.heightNorm !== undefined ? el.heightNorm * CANVAS_HEIGHT : el.height,
                };
                // Remove normalized properties
                delete restoredElement.xNorm;
                delete restoredElement.yNorm;
                delete restoredElement.widthNorm;
                delete restoredElement.heightNorm;
                newElements.push(restoredElement);
              });
            } else {
              console.log("⚠️ No layout.elements found in frame data");
            }
            
            console.log("📋 Total elements to set:", newElements.length, newElements.map(e => e.type));
            setElements(newElements);
            showToast("success", `Frame "${frame.name}" dimuat untuk diedit`);
          } else {
            showToast("error", "Frame tidak ditemukan");
            setIsEditMode(false);
          }
        } catch (error) {
          console.error("❌ Error loading frame:", error);
          showToast("error", "Gagal memuat frame: " + error.message);
          setIsEditMode(false);
        } finally {
          setLoadingFrame(false);
        }
      } else {
        // New frame mode - reset everything
        setElements([]);
        setCanvasBackground("#f7f1ed");
        clearSelection();
        setIsEditMode(false);
      }
    };
    
    loadFrameForEdit();
  }, [editFrameId]);

  // Toast helper
  const showToast = useCallback((type, message, duration = 3200) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, duration);
  }, []);

  // Selected element
  const selectedElement = useMemo(() => {
    if (selectedElementId === "background") return "background";
    return elements.find((el) => el.id === selectedElementId) || null;
  }, [elements, selectedElementId]);

  // Background photo element
  const backgroundPhotoElement = useMemo(
    () => elements.find((el) => el.type === "background-photo") || null,
    [elements]
  );

  // Canvas dimensions
  const getCanvasDimensions = useCallback((ratio) => {
    if (typeof ratio !== "string") return { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
    const [w, h] = ratio.split(":").map(Number);
    if (!w || !h) return { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
    if (h >= w) {
      return { width: CANVAS_WIDTH, height: Math.round((CANVAS_WIDTH * h) / w) };
    }
    return { width: Math.round((CANVAS_HEIGHT * w) / h), height: CANVAS_HEIGHT };
  }, []);

  // File upload handlers
  const triggerUpload = useCallback(() => {
    uploadPurposeRef.current = "upload";
    fileInputRef.current?.click();
  }, []);

  const triggerBackgroundUpload = useCallback(() => {
    uploadPurposeRef.current = "background";
    fileInputRef.current?.click();
  }, []);

  // Listen for background upload requests from PropertiesPanel
  useEffect(() => {
    const handleBackgroundUploadRequest = () => {
      triggerBackgroundUpload();
    };

    window.addEventListener(
      "creator:request-background-upload",
      handleBackgroundUploadRequest
    );

    return () => {
      window.removeEventListener(
        "creator:request-background-upload",
        handleBackgroundUploadRequest
      );
    };
  }, [triggerBackgroundUpload]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === "string") {
        if (uploadPurposeRef.current === "background") {
          const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(canvasAspectRatio);
          addBackgroundPhoto(dataUrl, { canvasWidth, canvasHeight });
          showToast("success", "Background foto diperbarui.", 2200);
        } else {
          addUploadElement(dataUrl);
        }
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  // Toggle background lock
  const toggleBackgroundLock = useCallback(() => {
    setIsBackgroundLocked((prev) => !prev);
    showToast("success", isBackgroundLocked ? "Background unlocked" : "Background locked", 1500);
  }, [isBackgroundLocked, showToast]);

  // Tool buttons
  const toolButtons = useMemo(
    () => [
      {
        id: "canvas-size",
        icon: Maximize2,
        label: "Ukuran Canvas",
        isActive: showCanvasSizeInProperties,
        onClick: () => {
          setShowCanvasSizeInProperties((prev) => !prev);
          clearSelection();
        },
      },
      {
        id: "background",
        icon: () => (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" opacity="0.3" />
          </svg>
        ),
        label: "Background",
        isActive: selectedElementId === "background",
        onClick: () => {
          setShowCanvasSizeInProperties(false);
          selectElement("background");
        },
      },
      {
        id: "photo",
        icon: ImageIcon,
        label: "Area Foto",
        isActive: false,
        onClick: () => {
          setShowCanvasSizeInProperties(false);
          setPendingPhotoTool(true);
          clearSelection();
        },
      },
      {
        id: "text",
        icon: TypeIcon,
        label: "Add Text",
        isActive: false,
        onClick: () => {
          setShowCanvasSizeInProperties(false);
          addElement("text");
        },
      },
      {
        id: "shape",
        icon: Shapes,
        label: "Shape",
        isActive: false,
        onClick: () => {
          setShowCanvasSizeInProperties(false);
          addElement("shape");
        },
      },
      {
        id: "upload",
        icon: UploadCloud,
        label: "Unggahan",
        isActive: false,
        onClick: () => {
          setShowCanvasSizeInProperties(false);
          triggerUpload();
        },
      },
    ],
    [showCanvasSizeInProperties, selectedElementId, addElement, selectElement, clearSelection, triggerUpload]
  );

  // Upload frame handler
  const handleUploadFrame = async () => {
    if (saving) return;

    // Validation
    if (!frameName.trim()) {
      showToast("error", "Nama frame harus diisi!");
      return;
    }

    const photoElements = elements.filter((el) => el.type === "photo");
    if (photoElements.length === 0) {
      showToast("error", "Tambahkan minimal 1 Area Foto!");
      return;
    }

    const backgroundPhoto = elements.find((el) => el.type === "background-photo");
    if (!backgroundPhoto) {
      showToast("error", "Upload gambar frame terlebih dahulu!");
      return;
    }

    setSaving(true);

    try {
      const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(canvasAspectRatio);

      // Get the original frame image from background-photo element
      // The image is stored in data.image by useCreatorStore
      const frameImageDataUrl = backgroundPhoto.data?.image || backgroundPhoto.data?.src || backgroundPhoto.src;
      
      console.log("🖼️ Background photo element:", backgroundPhoto);
      console.log("🖼️ Frame image data URL length:", frameImageDataUrl?.length || 0);
      
      // Check if it's a URL (edit mode with existing image) or data URL (new upload)
      const isExistingUrl = frameImageDataUrl?.startsWith("http");
      
      let frameImageBlob = null;
      if (!isExistingUrl && frameImageDataUrl) {
        // Convert data URL to blob for new upload
        frameImageBlob = await (await fetch(frameImageDataUrl)).blob();
        console.log("📸 Frame image blob size:", frameImageBlob.size, "bytes");
      }

      // Convert photo slots to normalized values
      const slots = photoElements.map((el, index) => ({
        id: el.id,
        left: el.x / canvasWidth,
        top: el.y / canvasHeight,
        width: el.width / canvasWidth,
        height: el.height / canvasHeight,
        zIndex: el.zIndex || 2,
        photoIndex: index,
        borderRadius: el.data?.borderRadius || 0,
      }));

      // Collect non-photo elements (upload, text, shape) for storage in layout
      // Exclude background-photo and photo elements as they are stored separately
      const otherElements = elements
        .filter(el => el.type !== "photo" && el.type !== "background-photo")
        .map(el => ({
          ...el,
          // Normalize positions to percentages for responsive storage
          xNorm: el.x / canvasWidth,
          yNorm: el.y / canvasHeight,
          widthNorm: el.width / canvasWidth,
          heightNorm: el.height / canvasHeight,
        }));

      console.log("📦 Other elements to save:", otherElements.length, otherElements.map(e => ({ type: e.type, id: e.id })));

      const frameData = {
        name: frameName.trim(),
        description: frameDescription.trim(),
        category: frameCategories.join(", "), // Multiple categories as comma-separated string
        categories: frameCategories, // Also store as array
        maxCaptures: photoElements.length,
        duplicatePhotos: false,
        slots,
        createdBy: user?.email || "admin",
        canvasBackground,
        canvasWidth,
        canvasHeight,
        // Store other elements and background in layout
        layout: {
          aspectRatio: canvasAspectRatio,
          orientation: "portrait",
          backgroundColor: canvasBackground,
          elements: otherElements, // Store upload/text/shape elements here
        },
      };

      console.log("💾 Frame data to save:", {
        ...frameData,
        layout: {
          ...frameData.layout,
          elementsCount: frameData.layout.elements.length
        }
      });

      let result;
      
      if (isEditMode && editFrameId) {
        // Update existing frame
        console.log("📝 Updating frame:", editFrameId);
        result = await updateCustomFrame(editFrameId, frameData, frameImageBlob);
        if (result.success) {
          showToast("success", `Frame "${frameName}" berhasil diupdate!`);
        }
      } else {
        // Create new frame
        console.log("➕ Creating new frame");
        if (!frameImageBlob) {
          throw new Error("Gambar frame tidak ditemukan! Pastikan sudah upload gambar di Background.");
        }
        result = await saveCustomFrame(frameData, frameImageBlob);
        if (result.success) {
          showToast("success", `Frame "${frameName}" berhasil diupload!`);
        }
      }

      if (result.success) {
        setFrameName("");
        setFrameDescription("");
        setFrameCategories(["Fremio Series"]);
        setTimeout(() => navigate("/admin/frames"), 1500);
      } else {
        showToast("error", result.message || "Gagal menyimpan frame");
      }
    } catch (error) {
      console.error("Upload error:", error);
      showToast("error", "Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="create-page">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* Toast */}
      {toast && (
        <Motion.div
          className="create-toast-wrapper"
          initial={{ opacity: 0, y: -12, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.94 }}
        >
          <div className={`create-toast ${toast.type === "success" ? "create-toast--success" : "create-toast--error"}`}>
            {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{toast.message}</span>
          </div>
        </Motion.div>
      )}

      <div className="create-grid">
        {/* Tools Panel */}
        <Motion.aside
          variants={panelMotion}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.05 }}
          className="create-panel create-panel--tools"
        >
          <h2 className="create-panel__title">Tools</h2>
          <div className="create-tools__list">
            {toolButtons.map((button) => {
              const IconComponent = button.icon;
              return (
                <button
                  key={button.id}
                  type="button"
                  onClick={button.onClick}
                  className={`create-tools__button ${button.isActive ? "create-tools__button--active" : ""}`}
                >
                  <IconComponent size={20} strokeWidth={2} />
                  <span>{button.label}</span>
                </button>
              );
            })}
          </div>

          {/* Frame Settings */}
          <div style={{ marginTop: "24px", borderTop: "1px solid #f0e6e0", paddingTop: "16px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "12px" }}>
              {isEditMode ? "✏️ Edit Frame" : "📋 Frame Settings"}
            </h3>
            
            {loadingFrame && (
              <div style={{ 
                padding: "12px", 
                background: "#f0f9ff", 
                borderRadius: "8px", 
                marginBottom: "12px",
                fontSize: "13px",
                color: "#0369a1"
              }}>
                ⏳ Memuat data frame...
              </div>
            )}
            
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "4px" }}>
                Nama Frame *
              </label>
              <input
                type="text"
                value={frameName}
                onChange={(e) => setFrameName(e.target.value)}
                placeholder="contoh: FremioSeries-Blue-6"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "13px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "4px" }}>
                Deskripsi
              </label>
              <textarea
                value={frameDescription}
                onChange={(e) => setFrameDescription(e.target.value)}
                placeholder="Deskripsi frame..."
                rows={2}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "13px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "8px" }}>
                Kategori (pilih satu atau lebih)
              </label>
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: "6px",
                padding: "8px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                backgroundColor: "#fafafa"
              }}>
                {availableCategories.map((cat) => (
                  <label 
                    key={cat}
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "8px",
                      cursor: "pointer",
                      padding: "4px 6px",
                      borderRadius: "6px",
                      backgroundColor: frameCategories.includes(cat) ? "#f0e6ff" : "transparent",
                      transition: "background-color 0.2s"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={frameCategories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      style={{
                        width: "16px",
                        height: "16px",
                        accentColor: "#8b5cf6",
                        cursor: "pointer"
                      }}
                    />
                    <span style={{ fontSize: "13px", color: "#374151" }}>{cat}</span>
                  </label>
                ))}
              </div>
              {frameCategories.length > 0 && (
                <div style={{ 
                  marginTop: "8px", 
                  fontSize: "11px", 
                  color: "#8b5cf6",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "4px"
                }}>
                  {frameCategories.map((cat) => (
                    <span 
                      key={cat}
                      style={{
                        background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "11px"
                      }}
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Motion.aside>

        {/* Preview Section */}
        <Motion.section
          variants={panelMotion}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="create-preview"
        >
          <h2 className="create-preview__title">Preview</h2>

          <div className="create-preview__body">
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
                  if (id === null) {
                    clearSelection();
                  } else if (id === "background") {
                    if (isBackgroundLocked) {
                      showToast("info", "Background dikunci.", 2000);
                      return;
                    }
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
                onResizeUpload={resizeUploadImage}
              />
            </div>
          </div>

          {/* Upload Button */}
          <Motion.button
            type="button"
            onClick={handleUploadFrame}
            disabled={saving || loadingFrame}
            className="create-save"
            whileTap={{ scale: 0.97 }}
            whileHover={{ y: -3 }}
            style={{
              background: isEditMode 
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
            }}
          >
            {saving ? (
              <>
                <svg className="create-save__spinner" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75" />
                </svg>
                {isEditMode ? "Menyimpan..." : "Mengupload..."}
              </>
            ) : (
              <>
                <Upload size={18} strokeWidth={2.5} />
                {isEditMode ? "Update Frame" : "Upload Frame"}
              </>
            )}
          </Motion.button>
        </Motion.section>

        {/* Properties Panel */}
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
              onBackgroundChange={setCanvasBackground}
              onUpdateElement={updateElement}
              onDeleteElement={removeElement}
              clearSelection={clearSelection}
              onSelectBackgroundPhoto={() => {
                if (isBackgroundLocked) {
                  showToast("info", "Background dikunci.", 2000);
                  return;
                }
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
              canvasAspectRatio={canvasAspectRatio}
              onCanvasAspectRatioChange={setCanvasAspectRatio}
              showCanvasSizeMode={showCanvasSizeInProperties}
              gradientColor1={gradientColor1}
              gradientColor2={gradientColor2}
              setGradientColor1={setGradientColor1}
              setGradientColor2={setGradientColor2}
              isBackgroundLocked={isBackgroundLocked}
              onToggleBackgroundLock={toggleBackgroundLock}
              pendingPhotoTool={pendingPhotoTool}
              onConfirmAddPhoto={(rows = 1, cols = 1) => {
                setPendingPhotoTool(false);
                const canvasW = CANVAS_WIDTH;
                const canvasH = CANVAS_HEIGHT;
                const gapX = 30, gapY = 30;
                const marginX = 65, marginY = 140;
                const availableWidth = canvasW - (2 * marginX) - ((cols - 1) * gapX);
                const availableHeight = canvasH - (2 * marginY) - ((rows - 1) * gapY);
                const photoWidth = Math.floor(availableWidth / cols);
                const photoHeight = Math.floor(availableHeight / rows);
                
                let lastAddedId = null;
                for (let row = 0; row < rows; row++) {
                  for (let col = 0; col < cols; col++) {
                    const x = marginX + (col * (photoWidth + gapX));
                    const y = marginY + (row * (photoHeight + gapY));
                    const newId = addElement("photo", { x, y, width: photoWidth, height: photoHeight });
                    if (newId) lastAddedId = newId;
                  }
                }
                if (lastAddedId) selectElement(lastAddedId);
              }}
              onCancelPhotoTool={() => setPendingPhotoTool(false)}
            />
          </div>
        </Motion.aside>
      </div>
    </div>
  );
}
