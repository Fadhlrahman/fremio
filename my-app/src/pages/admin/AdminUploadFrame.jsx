import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { motion as Motion } from "framer-motion";
import {
  Upload,
  FileImage,
  Plus,
  Trash2,
  Save,
  Eye,
  CheckCircle,
  ArrowLeft,
  Settings,
  Layers,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import "../../styles/admin.css";
import "./AdminUploadFrame.css";
import { saveCustomFrame, getStorageInfo, getCustomFrameById } from "../../services/customFrameService";
import { quickDetectSlots } from "../../utils/slotDetector";

const panelMotion = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function AdminUploadFrame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editFrameId = searchParams.get("edit");
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);

  // State declarations FIRST
  const [frameName, setFrameName] = useState("");
  const [frameDescription, setFrameDescription] = useState("");
  const [frameCategory, setFrameCategory] = useState("custom");
  const [maxCaptures, setMaxCaptures] = useState(3);
  const [duplicatePhotos, setDuplicatePhotos] = useState(false);

  // Frame image
  const [frameImageFile, setFrameImageFile] = useState(null);
  const [frameImagePreview, setFrameImagePreview] = useState("");

  // Slots configuration
  const [slots, setSlots] = useState([]);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);

  // UI State
  const [saving, setSaving] = useState(false);
  const [activePanel, setActivePanel] = useState("upload"); // upload, slots, settings
  const [showFrameSettings, setShowFrameSettings] = useState(true);
  const [toast, setToast] = useState(null);

  // Toast helper
  const showToast = (type, message, duration = 3000) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), duration);
  };

  console.log("🎨 AdminUploadFrame component rendered");
  console.log("👤 Current user:", user);
  console.log("✏️ Edit mode:", editFrameId ? `Editing frame ${editFrameId}` : "New frame");
  
  // Get Firebase storage info on mount
  useEffect(() => {
    getStorageInfo(); // Just call it for debugging
  }, []); // Run only once on mount

  // Load frame data when in edit mode
  useEffect(() => {
    const loadFrameForEdit = async () => {
      if (!editFrameId) return;
      
      setIsEditMode(true);
      
      try {
        console.log("📥 Loading frame for edit:", editFrameId);
        const frame = await getCustomFrameById(editFrameId);
        
        if (frame) {
          console.log("✅ Frame loaded:", frame);
          
          // Set basic info
          setFrameName(frame.name || "");
          setFrameDescription(frame.description || "");
          setFrameCategory(frame.category || "custom");
          setMaxCaptures(frame.maxCaptures || frame.slots?.length || 3);
          setDuplicatePhotos(frame.duplicatePhotos || false);
          
          // Set frame image preview
          if (frame.imagePath || frame.thumbnailUrl) {
            setFrameImagePreview(frame.imagePath || frame.thumbnailUrl);
          }
          
          // Set slots
          if (frame.slots && frame.slots.length > 0) {
            setSlots(frame.slots);
            console.log("📍 Slots loaded:", frame.slots.length);
          }
        } else {
          console.error("❌ Frame not found:", editFrameId);
          alert("Frame tidak ditemukan!");
          navigate("/admin/frames");
        }
      } catch (error) {
        console.error("❌ Error loading frame:", error);
        alert("Gagal memuat frame: " + error.message);
      }
    };
    
    loadFrameForEdit();
  }, [editFrameId, navigate]);

  // Handle frame image upload with auto slot detection
  const handleImageUpload = async (e) => {
    console.log("🖼️ handleImageUpload triggered");
    const file = e.target.files[0];
    console.log("📁 Selected file:", file);

    if (!file) {
      console.log("❌ No file selected");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/png")) {
      console.log("❌ Invalid file type:", file.type);
      alert("Hanya file PNG yang diperbolehkan");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.log("❌ File too large:", file.size, "bytes");
      alert(
        `File terlalu besar! Maksimal 5MB.\n\nUkuran file: ${(
          file.size /
          1024 /
          1024
        ).toFixed(2)}MB\n\nSilakan compress image terlebih dahulu.`
      );
      return;
    }

    console.log("✅ Valid PNG file:", file.name, "Size:", file.size, "bytes");
    setFrameImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = async () => {
      console.log("✅ Preview created successfully");
      setFrameImagePreview(reader.result);

      // Auto-detect slots from transparent areas
      console.log("🔍 Starting automatic slot detection...");
      setAutoDetecting(true);

      try {
        const detectedSlots = await quickDetectSlots(reader.result);
        console.log("✅ Auto-detected slots:", detectedSlots.length);

        if (detectedSlots.length > 0) {
          setSlots(detectedSlots);
          setMaxCaptures(detectedSlots.length);
          alert(
            `🎯 Berhasil mendeteksi ${detectedSlots.length} slot foto secara otomatis!\n\n` +
              `Anda dapat edit posisi slot jika perlu, atau langsung upload frame.`
          );
        } else {
          console.log("⚠️ No slots detected, user can add manually");
          alert(
            "⚠️ Tidak ada area transparan yang terdeteksi.\n\n" +
              "Gunakan tombol 'Add Slot' untuk menambah slot secara manual."
          );
        }
      } catch (error) {
        console.error("❌ Error detecting slots:", error);
        alert(
          "⚠️ Gagal mendeteksi slot otomatis.\n\n" +
            "Gunakan tombol 'Add Slot' untuk menambah slot secara manual."
        );
      } finally {
        setAutoDetecting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add new slot
  const addSlot = () => {
    const newSlot = {
      id: `slot_${slots.length + 1}`,
      left: 0.1,
      top: 0.1,
      width: 0.4,
      height: 0.3,
      aspectRatio: "4:5",
      zIndex: 2,
      photoIndex: slots.length % maxCaptures,
    };
    setSlots([...slots, newSlot]);
  };

  // Update slot configuration
  const updateSlot = (index, field, value) => {
    const updatedSlots = [...slots];
    updatedSlots[index] = {
      ...updatedSlots[index],
      [field]:
        field === "left" ||
        field === "top" ||
        field === "width" ||
        field === "height"
          ? parseFloat(value)
          : value,
    };
    setSlots(updatedSlots);
  };

  // Delete slot
  const deleteSlot = (index) => {
    const newSlots = slots.filter((_, i) => i !== index);
    setSlots(newSlots);
    // Update maxCaptures to match slot count
    setMaxCaptures(newSlots.length);
  };

  // Save frame
  const handleSaveFrame = async () => {
    console.log("🔥 handleSaveFrame called");
    console.log("📝 Frame name:", frameName);
    console.log("🖼️ Frame image file:", frameImageFile);
    console.log("📍 Slots:", slots);

    // Validation
    if (!frameName.trim()) {
      alert("Nama frame harus diisi");
      return;
    }

    if (!frameImageFile) {
      alert("Upload gambar frame terlebih dahulu");
      return;
    }

    if (slots.length === 0) {
      alert("Tambahkan minimal 1 slot foto");
      return;
    }

    setSaving(true);
    console.log("💾 Starting save process...");

    // Add timeout protection
    const timeoutId = setTimeout(() => {
      console.error("⏰ Save timeout after 30 seconds");
      setSaving(false);
      alert(
        "❌ Timeout: Proses simpan terlalu lama.\n\n" +
        "Kemungkinan penyebab:\n" +
        "- File image terlalu besar\n" +
        "- LocalStorage penuh\n" +
        "- Browser memory issue\n\n" +
        "Coba:\n" +
        "1. Compress image (< 500KB)\n" +
        "2. Clear browser cache\n" +
        "3. Reload page dan coba lagi"
      );
    }, 30000); // 30 seconds timeout

    try {
      // Create frame configuration object with unique ID (name + timestamp)
      const uniqueId = frameName.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
      
      // IMPORTANT: Use slots.length as the source of truth for maxCaptures
      const actualMaxCaptures = slots.length;
      console.log("📊 Actual slot count:", actualMaxCaptures);
      
      const frameConfig = {
        id: uniqueId,
        name: frameName,
        description: frameDescription,
        category: frameCategory,
        maxCaptures: actualMaxCaptures, // Use actual slot count
        duplicatePhotos,
        slots: slots.map((slot, idx) => ({
          ...slot,
          left: parseFloat(slot.left),
          top: parseFloat(slot.top),
          width: parseFloat(slot.width),
          height: parseFloat(slot.height),
          zIndex: parseInt(slot.zIndex),
          photoIndex: idx, // Re-index based on actual position
        })),
        layout: {
          aspectRatio: "9:16",
          orientation: "portrait",
          backgroundColor: "#ffffff",
        },
      };

      console.log("📦 Frame config created:", frameConfig);

      // Always use LocalStorage mode for admin uploads to avoid Firebase permission issues
      console.log("💾 Using LocalStorage mode (Admin Direct Upload)");
      
      const result = await saveCustomFrame(
        {
          ...frameConfig,
          createdBy: user?.email || "admin",
        },
        frameImageFile
      );

      console.log("✅ Save result:", result);

      if (result.success) {
        clearTimeout(timeoutId); // Clear timeout on success
        
        alert(
          "✅ Frame berhasil disimpan ke Firebase!\n\n" +
          "Frame ID: " + (result.frameId || frameConfig.id) + "\n\n" +
          "Frame sekarang tersedia di halaman Frames untuk semua user."
        );
        navigate("/admin/frames");
      } else {
        clearTimeout(timeoutId);
        throw new Error(result.message || "Failed to save frame");
      }
    } catch (error) {
      clearTimeout(timeoutId); // Clear timeout on error
      console.error("❌ Error saving frame:", error);
      console.error("❌ Error stack:", error.stack);
      
      // Better error message
      let errorMessage = error.message;
      
      if (error.message.includes("quota") || error.message.includes("Quota")) {
        errorMessage = 
          "❌ LocalStorage Penuh!\n\n" +
          "Solusi:\n" +
          "1. Compress image Anda (<200KB)\n" +
          "2. Hapus frame lama di console:\n" +
          "   window.storageDebug.clearFrames(true)\n" +
          "3. Clear browser cache\n\n" +
          "Tips: Gunakan tinypng.com untuk compress image";
      }
      
      alert("Gagal menyimpan frame:\n\n" + errorMessage);
    } finally {
      setSaving(false);
      console.log("🏁 Save process completed");
    }
  };

  // Tool buttons for the sidebar
  const toolButtons = [
    {
      id: "upload",
      label: "Upload Frame",
      icon: Upload,
      isActive: activePanel === "upload",
    },
    {
      id: "slots",
      label: "Photo Slots",
      icon: Layers,
      isActive: activePanel === "slots",
    },
    {
      id: "settings",
      label: "Frame Settings",
      icon: Settings,
      isActive: activePanel === "settings",
    },
  ];

  // Convert aspect ratio string to CSS value
  const getAspectRatioCSS = (ratio) => {
    switch (ratio) {
      case "1:1": return "1/1";
      case "4:5": return "4/5";
      case "3:4": return "3/4";
      case "16:9": return "16/9";
      case "9:16": return "9/16";
      default: return "4/5";
    }
  };

  return (
    <div className="admin-upload-page">
      {/* Toast Notification */}
      {toast && (
        <Motion.div
          className="admin-upload-toast-wrapper"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <div
            className={`admin-upload-toast ${
              toast.type === "success"
                ? "admin-upload-toast--success"
                : "admin-upload-toast--error"
            }`}
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

      <div className="admin-upload-grid">
        {/* Left Panel - Tools */}
        <Motion.aside
          variants={panelMotion}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.05 }}
          className="admin-upload-panel--tools"
        >
          <h2 className="admin-upload-panel__title">Tools</h2>
          <div className="admin-upload-tools__list">
            {toolButtons.map((button) => {
              const IconComponent = button.icon;
              return (
                <button
                  key={button.id}
                  type="button"
                  onClick={() => setActivePanel(button.id)}
                  className={`admin-upload-tools__button ${
                    button.isActive ? "admin-upload-tools__button--active" : ""
                  }`.trim()}
                >
                  <IconComponent size={20} strokeWidth={2} />
                  <span>{button.label}</span>
                </button>
              );
            })}

            <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid rgba(224,183,169,0.3)" }}>
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="admin-upload-tools__button"
              >
                <ArrowLeft size={20} strokeWidth={2} />
                <span>Kembali</span>
              </button>
            </div>
          </div>
        </Motion.aside>

        {/* Center - Preview */}
        <Motion.section
          variants={panelMotion}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="admin-upload-preview"
        >
          <h2 className="admin-upload-preview__title">
            {isEditMode ? "Edit Frame" : "Upload Frame"}
          </h2>

          <div className="admin-upload-preview__body">
            <div className="admin-upload-preview__frame">
              {frameImagePreview ? (
                <>
                  {/* Frame Image */}
                  <img
                    src={frameImagePreview}
                    alt="Frame Preview"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      zIndex: 3,
                    }}
                  />
                  {/* Slot overlays */}
                  {slots.map((slot, index) => (
                    <div
                      key={index}
                      className={`admin-upload-preview-slot ${
                        selectedSlotIndex === index ? "admin-upload-preview-slot--selected" : ""
                      }`}
                      style={{
                        left: `${slot.left * 100}%`,
                        top: `${slot.top * 100}%`,
                        width: `${slot.width * 100}%`,
                        aspectRatio: getAspectRatioCSS(slot.aspectRatio),
                        zIndex: 1,
                      }}
                      onClick={() => {
                        setSelectedSlotIndex(index);
                        setActivePanel("slots");
                      }}
                    >
                      <span className="admin-upload-preview-slot__label">
                        Slot {index + 1}
                      </span>
                    </div>
                  ))}
                  {/* Success badge */}
                  <div className="admin-upload-badge admin-upload-badge--success" style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    zIndex: 10,
                  }}>
                    <CheckCircle size={14} />
                    Uploaded
                  </div>
                </>
              ) : (
                /* Upload Zone */
                <div
                  className={`admin-upload-zone ${autoDetecting ? "admin-upload-zone--active" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png"
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                  />
                  {autoDetecting ? (
                    <>
                      <div className="admin-upload-zone__icon">
                        <Eye size={64} />
                      </div>
                      <p className="admin-upload-zone__title">Mendeteksi slot...</p>
                      <p className="admin-upload-zone__subtitle">Mencari area transparan pada frame</p>
                    </>
                  ) : (
                    <>
                      <div className="admin-upload-zone__icon">
                        <Upload size={64} />
                      </div>
                      <p className="admin-upload-zone__title">Upload Frame PNG</p>
                      <p className="admin-upload-zone__subtitle">Klik untuk memilih file (max 5MB)</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <Motion.button
            type="button"
            onClick={handleSaveFrame}
            disabled={saving || !frameName || !frameImageFile || slots.length === 0}
            className="admin-upload-save"
            whileTap={{ scale: 0.97 }}
            whileHover={{ y: -3 }}
          >
            {saving ? (
              <>
                <svg
                  className="admin-upload-save__spinner"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    style={{ opacity: 0.25 }}
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    style={{ opacity: 0.75 }}
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Menyimpan...
              </>
            ) : (
              <>
                <Save size={18} strokeWidth={2.5} />
                Simpan Frame
              </>
            )}
          </Motion.button>
        </Motion.section>

        {/* Right Panel - Properties */}
        <Motion.aside
          variants={panelMotion}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.15 }}
          className="admin-upload-panel--properties"
        >
          <h2 className="admin-upload-panel__title">Properties</h2>
          <div className="admin-upload-panel__body">
            {/* Frame Settings Section */}
            {activePanel === "settings" && (
              <div>
                <div className="admin-upload-properties__section">
                  <label className="admin-upload-properties__label">Nama Frame *</label>
                  <input
                    type="text"
                    value={frameName}
                    onChange={(e) => setFrameName(e.target.value)}
                    className="admin-upload-properties__input"
                    placeholder="contoh: FremioSeries-red-3"
                  />
                </div>

                <div className="admin-upload-properties__section">
                  <label className="admin-upload-properties__label">Deskripsi</label>
                  <textarea
                    value={frameDescription}
                    onChange={(e) => setFrameDescription(e.target.value)}
                    rows={3}
                    className="admin-upload-properties__input"
                    style={{ resize: "vertical" }}
                    placeholder="Deskripsi frame..."
                  />
                </div>

                <div className="admin-upload-properties__section">
                  <label className="admin-upload-properties__label">Kategori</label>
                  <select
                    value={frameCategory}
                    onChange={(e) => setFrameCategory(e.target.value)}
                    className="admin-upload-properties__select"
                  >
                    <option value="custom">Custom</option>
                    <option value="fremio-series">Fremio Series</option>
                    <option value="inspired-by">Inspired By</option>
                    <option value="music">Music</option>
                    <option value="seasonal">Seasonal</option>
                  </select>
                </div>

                <div className="admin-upload-properties__section">
                  <label className="admin-upload-properties__label">Jumlah Foto</label>
                  <input
                    type="number"
                    value={maxCaptures}
                    onChange={(e) => setMaxCaptures(parseInt(e.target.value) || 1)}
                    min="1"
                    max="10"
                    className="admin-upload-properties__input"
                  />
                </div>

                <div className="admin-upload-properties__section">
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={duplicatePhotos}
                      onChange={(e) => setDuplicatePhotos(e.target.checked)}
                      style={{ width: "18px", height: "18px" }}
                    />
                    <span style={{ fontSize: "13px", color: "#5c4941" }}>Duplikasi foto ke semua slot</span>
                  </label>
                </div>
              </div>
            )}

            {/* Upload Panel */}
            {activePanel === "upload" && (
              <div>
                <div className="admin-upload-properties__section">
                  <label className="admin-upload-properties__label">Frame Image</label>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="admin-upload-btn admin-upload-btn--secondary"
                    style={{ width: "100%" }}
                  >
                    <Upload size={18} />
                    {frameImageFile ? "Ganti File" : "Pilih File PNG"}
                  </button>
                  
                  {frameImageFile && (
                    <div className="admin-upload-file-info">
                      <FileImage size={20} className="admin-upload-file-info__icon" />
                      <div className="admin-upload-file-info__details">
                        <p className="admin-upload-file-info__name">{frameImageFile.name}</p>
                        <p className="admin-upload-file-info__size">
                          {(frameImageFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {frameImagePreview && (
                  <div className="admin-upload-properties__section">
                    <button
                      onClick={async () => {
                        setAutoDetecting(true);
                        try {
                          const detectedSlots = await quickDetectSlots(frameImagePreview);
                          if (detectedSlots.length > 0) {
                            setSlots(detectedSlots);
                            setMaxCaptures(detectedSlots.length);
                            showToast("success", `Berhasil mendeteksi ${detectedSlots.length} slot!`);
                          } else {
                            showToast("error", "Tidak ada area transparan terdeteksi");
                          }
                        } catch (error) {
                          console.error("❌ Error re-detecting slots:", error);
                          showToast("error", "Gagal mendeteksi slot");
                        } finally {
                          setAutoDetecting(false);
                        }
                      }}
                      disabled={autoDetecting}
                      className="admin-upload-btn admin-upload-btn--secondary"
                      style={{ width: "100%", opacity: autoDetecting ? 0.6 : 1 }}
                    >
                      <Eye size={18} />
                      {autoDetecting ? "Mendeteksi..." : "Re-detect Slots"}
                    </button>
                  </div>
                )}

                {/* Quick Frame Settings in Upload Panel */}
                <div className="admin-upload-frame-settings">
                  <div
                    className="admin-upload-frame-settings__header"
                    onClick={() => setShowFrameSettings(!showFrameSettings)}
                  >
                    <span className="admin-upload-frame-settings__title">
                      <Settings size={16} />
                      Frame Settings
                    </span>
                    <ChevronDown
                      size={18}
                      className={`admin-upload-frame-settings__toggle ${showFrameSettings ? "admin-upload-frame-settings__toggle--open" : ""}`}
                    />
                  </div>
                  {showFrameSettings && (
                    <div className="admin-upload-frame-settings__body">
                      <div>
                        <label className="admin-upload-properties__label" style={{ marginBottom: "6px" }}>Nama Frame *</label>
                        <input
                          type="text"
                          value={frameName}
                          onChange={(e) => setFrameName(e.target.value)}
                          className="admin-upload-properties__input"
                          placeholder="contoh: FremioSeries-red-3"
                        />
                      </div>
                      <div>
                        <label className="admin-upload-properties__label" style={{ marginBottom: "6px" }}>Kategori</label>
                        <select
                          value={frameCategory}
                          onChange={(e) => setFrameCategory(e.target.value)}
                          className="admin-upload-properties__select"
                        >
                          <option value="custom">Custom</option>
                          <option value="fremio-series">Fremio Series</option>
                          <option value="inspired-by">Inspired By</option>
                          <option value="music">Music</option>
                          <option value="seasonal">Seasonal</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Slots Panel */}
            {activePanel === "slots" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <span className="admin-upload-properties__label" style={{ margin: 0 }}>
                    Photo Slots ({slots.length})
                  </span>
                  <button
                    onClick={addSlot}
                    className="admin-upload-btn admin-upload-btn--primary"
                    style={{ padding: "8px 12px", fontSize: "12px" }}
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>

                {slots.length === 0 ? (
                  <div className="admin-upload-empty">
                    <Layers size={40} className="admin-upload-empty__icon" />
                    <p className="admin-upload-empty__title">
                      {frameImagePreview ? "Slot akan terdeteksi otomatis" : "Upload frame terlebih dahulu"}
                    </p>
                    <p className="admin-upload-empty__subtitle">
                      {frameImagePreview
                        ? "Klik 'Re-detect' atau tambahkan manual"
                        : "Area transparan akan terdeteksi sebagai slot"}
                    </p>
                  </div>
                ) : (
                  slots.map((slot, index) => (
                    <div
                      key={index}
                      className={`admin-upload-slot-card ${selectedSlotIndex === index ? "admin-upload-slot-card--selected" : ""}`}
                      onClick={() => setSelectedSlotIndex(index)}
                    >
                      <div className="admin-upload-slot-card__header">
                        <span className="admin-upload-slot-card__title">Slot {index + 1}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSlot(index);
                          }}
                          className="admin-upload-slot-card__delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="admin-upload-slot-card__grid">
                        <div className="admin-upload-slot-card__field">
                          <label className="admin-upload-slot-card__field-label">Kiri</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={slot.left}
                            onChange={(e) => updateSlot(index, "left", e.target.value)}
                            className="admin-upload-slot-card__field-input"
                          />
                        </div>
                        <div className="admin-upload-slot-card__field">
                          <label className="admin-upload-slot-card__field-label">Atas</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={slot.top}
                            onChange={(e) => updateSlot(index, "top", e.target.value)}
                            className="admin-upload-slot-card__field-input"
                          />
                        </div>
                        <div className="admin-upload-slot-card__field">
                          <label className="admin-upload-slot-card__field-label">Lebar</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={slot.width}
                            onChange={(e) => updateSlot(index, "width", e.target.value)}
                            className="admin-upload-slot-card__field-input"
                          />
                        </div>
                        <div className="admin-upload-slot-card__field">
                          <label className="admin-upload-slot-card__field-label">Tinggi</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={slot.height}
                            onChange={(e) => updateSlot(index, "height", e.target.value)}
                            className="admin-upload-slot-card__field-input"
                          />
                        </div>
                        <div className="admin-upload-slot-card__field" style={{ gridColumn: "span 2" }}>
                          <label className="admin-upload-slot-card__field-label">Aspect Ratio</label>
                          <select
                            value={slot.aspectRatio || "4:5"}
                            onChange={(e) => updateSlot(index, "aspectRatio", e.target.value)}
                            className="admin-upload-slot-card__field-input"
                            style={{ cursor: "pointer" }}
                          >
                            <option value="4:5">4:5 (Portrait)</option>
                            <option value="1:1">1:1 (Square)</option>
                            <option value="16:9">16:9 (Landscape)</option>
                            <option value="3:4">3:4 (Portrait)</option>
                            <option value="9:16">9:16 (Tall)</option>
                          </select>
                        </div>
                        <div className="admin-upload-slot-card__field" style={{ gridColumn: "span 2" }}>
                          <label className="admin-upload-slot-card__field-label">Index Foto</label>
                          <select
                            value={slot.photoIndex}
                            onChange={(e) => updateSlot(index, "photoIndex", e.target.value)}
                            className="admin-upload-slot-card__field-input"
                            style={{ cursor: "pointer" }}
                          >
                            {Array.from({ length: maxCaptures }, (_, i) => (
                              <option key={i} value={i}>Foto {i + 1}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="admin-upload-actions">
              <button
                onClick={() => navigate("/admin/frames")}
                className="admin-upload-btn admin-upload-btn--secondary"
              >
                Batal
              </button>
              <button
                onClick={handleSaveFrame}
                disabled={saving || !frameName || !frameImageFile || slots.length === 0}
                className="admin-upload-btn admin-upload-btn--primary"
                style={{ opacity: saving ? 0.6 : 1 }}
              >
                <Save size={16} />
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </Motion.aside>
      </div>
    </div>
  );
}
